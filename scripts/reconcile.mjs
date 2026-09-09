#!/usr/bin/env node
/**
 * Per-booking P&L: who paid, who got paid, what Stripe took, what Jibly kept.
 *
 * Neither system can answer this alone, which is why it needs a script:
 *   - Stripe knows the fees but not the people. The PaymentIntent carries only
 *     userId and bookingIntentId, and in the broadcast flow the traveler isn't
 *     even chosen yet when the sender pays — so there is no name to put on it.
 *   - Supabase knows the people and the commission, but never sees Stripe's
 *     processing fee. It isn't stored anywhere in the database.
 *
 * So: read the bookings from Supabase, then ask Stripe what each one actually
 * cost. Read-only on both sides — this moves nothing and writes nothing.
 *
 *   node scripts/reconcile.mjs                  # table on stdout
 *   node scripts/reconcile.mjs --csv            # also write reconcile.csv
 *   node scripts/reconcile.mjs --csv books.csv  # ...under another name
 *   node scripts/reconcile.mjs --since 2026-01-01
 *   node scripts/reconcile.mjs --all            # include archived bookings
 *
 * Needs, in the environment:
 *   STRIPE_SECRET_KEY            same mode as the data you want (live vs test)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY    the money columns are service-role only
 *
 *   PowerShell:  $env:STRIPE_SECRET_KEY = "sk_live_..."
 *   bash:        export STRIPE_SECRET_KEY="sk_live_..."
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ---- environment ----------------------------------------------------------

const missing = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
].filter((k) => !process.env[k]);

if (missing.length) {
  console.error(`Missing: ${missing.join(', ')}`);
  console.error('  PowerShell:  $env:STRIPE_SECRET_KEY = "sk_..."');
  console.error('  bash:        export STRIPE_SECRET_KEY="sk_..."');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---- arguments ------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : null;
};

const since = value('--since');
const includeArchived = flag('--all');
const wantCsv = flag('--csv');
const csvPath = value('--csv') ?? 'reconcile.csv';

// ---- the bookings ---------------------------------------------------------

let query = db
  .from('booking_intents')
  .select(
    'id, created_at, sender_id, traveler_user_id, payment_intent_id, payment_amount, ' +
      'transfer_id, transfer_amount, platform_fee_amount, payment_status, received_confirmed_at, archived_at'
  )
  // 'unpaid' never reached Stripe, so there is nothing to reconcile.
  .neq('payment_status', 'unpaid')
  .not('payment_intent_id', 'is', null)
  .order('created_at', { ascending: false });

// Archived bookings are ones a human wrote off. They still hold real money, so
// they belong in a P&L on request — just not in the default view.
if (!includeArchived) query = query.is('archived_at', null);
if (since) query = query.gte('created_at', since);

const { data: bookings, error } = await query;
if (error) {
  console.error('Supabase query failed:', error.message);
  process.exit(1);
}
if (!bookings?.length) {
  console.log('No paid bookings match.');
  process.exit(0);
}

// ---- names ----------------------------------------------------------------

// One round trip for every profile mentioned, rather than one per booking.
const userIds = [
  ...new Set(bookings.flatMap((b) => [b.sender_id, b.traveler_user_id]).filter(Boolean)),
];
const { data: profiles } = await db
  .from('profiles')
  .select('id, full_name')
  .in('id', userIds);

const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

// Emails live in auth.users, which PostgREST does not expose — so they come
// from the admin API instead, cached because senders repeat.
const emailById = new Map();
async function emailFor(userId) {
  if (!userId) return '';
  if (emailById.has(userId)) return emailById.get(userId);
  const { data } = await db.auth.admin.getUserById(userId);
  const email = data?.user?.email ?? '';
  emailById.set(userId, email);
  return email;
}

const who = async (userId) => {
  if (!userId) return '—';
  return nameById.get(userId) || (await emailFor(userId)) || userId.slice(0, 8);
};

// ---- what Stripe actually charged -----------------------------------------

const eur = (cents) => (cents / 100).toFixed(2);

/**
 * The processing fee for one booking, from the charge's balance transaction —
 * the only place Stripe states what it kept. Expanded in a single retrieve so
 * this stays one API call per booking.
 */
async function chargeFacts(paymentIntentId) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge.balance_transaction'],
  });
  const charge = typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
  const bt = charge && typeof charge.balance_transaction === 'object'
    ? charge.balance_transaction
    : null;

  return {
    // What the sender was actually charged, per Stripe rather than per our
    // mirror of it. They agree in every case seen so far; when they don't,
    // Stripe is right and the difference is worth knowing about.
    gross: charge?.amount ?? pi.amount_received ?? pi.amount ?? 0,
    stripeFee: bt?.fee ?? 0,
    refunded: charge?.amount_refunded ?? 0,
    // A charge with no balance transaction has not settled yet — the fee is
    // not final, so report it as unknown rather than as zero.
    settled: !!bt,
  };
}

/**
 * Cross-border transfers cost money — paying a traveler in Morocco is not
 * free the way paying one inside SEPA is. That fee lands on the transfer's own
 * balance transaction, and leaving it out overstates what Jibly kept.
 */
async function transferFee(transferId) {
  if (!transferId) return 0;
  try {
    const t = await stripe.transfers.retrieve(transferId, {
      expand: ['balance_transaction'],
    });
    return typeof t.balance_transaction === 'object'
      ? Math.abs(t.balance_transaction.fee ?? 0)
      : 0;
  } catch {
    return 0;
  }
}

// Sequential on purpose: a burst of parallel requests is how you meet a rate
// limit, and there will never be many bookings.
const rows = [];
for (const b of bookings) {
  const { gross, stripeFee, refunded, settled } = await chargeFacts(b.payment_intent_id);
  const xferFee = await transferFee(b.transfer_id);

  // What the traveler got. Before the transfer exists there is no fact to
  // report, only our intention — so leave it empty rather than guess.
  const travelerNet = b.transfer_amount ?? null;

  // Jibly's commission. platform_fee_amount is written at transfer time and is
  // the real figure; before that, derive it so a pending booking still shows
  // what it is expected to earn.
  const jiblyFee =
    b.platform_fee_amount ?? (travelerNet != null ? gross - travelerNet : null);

  rows.push({
    date: (b.created_at ?? '').slice(0, 10),
    booking: b.id.slice(0, 8),
    sender: await who(b.sender_id),
    traveler: await who(b.traveler_user_id),
    paid: gross,
    stripeFee,
    jiblyFee,
    // The number that actually matters: commission minus everything Stripe
    // took to earn it. Refunds make this negative, because Stripe does not
    // return the processing fee on a refund.
    net: jiblyFee == null ? null : jiblyFee - stripeFee - xferFee,
    travelerNet,
    status: !settled
      ? 'not settled'
      : refunded
        ? refunded >= gross ? 'REFUNDED' : 'partly refunded'
        : b.transfer_id
          ? 'paid out'
          : b.received_confirmed_at
            ? 'OWED — delivered, no transfer'
            : 'held (in transit)',
  });
}

// ---- output ---------------------------------------------------------------

const money = (c) => (c == null ? '—' : eur(c));

const table = rows.map((r) => ({
  Date: r.date,
  Booking: r.booking,
  Sender: r.sender,
  Traveler: r.traveler,
  'Paid €': money(r.paid),
  'Stripe €': money(r.stripeFee),
  'Jibly €': money(r.jiblyFee),
  'Net Jibly €': money(r.net),
  'Traveler €': money(r.travelerNet),
  Status: r.status,
}));

console.table(table);

const sum = (pick) => rows.reduce((s, r) => s + (pick(r) ?? 0), 0);
console.log(
  `\n${rows.length} booking(s)  ·  ` +
    `collected €${eur(sum((r) => r.paid))}  ·  ` +
    `Stripe took €${eur(sum((r) => r.stripeFee))}  ·  ` +
    `commission €${eur(sum((r) => r.jiblyFee))}  ·  ` +
    `NET €${eur(sum((r) => r.net))}  ·  ` +
    `travelers €${eur(sum((r) => r.travelerNet))}`
);

const owed = rows.filter((r) => r.status.startsWith('OWED'));
if (owed.length) {
  // Not a P&L line — money you are holding that belongs to someone else.
  console.log(
    `\n⚠  ${owed.length} delivered booking(s) with no transfer: ${owed
      .map((r) => `${r.booking} (${r.traveler})`)
      .join(', ')}`
  );
}

if (wantCsv) {
  const { writeFileSync } = await import('node:fs');
  const headers = Object.keys(table[0]);
  // Quote everything: names contain commas, and a CSV that opens wrong in
  // Excel is worse than no CSV at all.
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(','),
    ...table.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');
  writeFileSync(csvPath, csv);
  console.log(`\nWrote ${csvPath}`);
}
