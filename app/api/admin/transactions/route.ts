import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';
import { getStripe } from '@/lib/stripe/server';
import { splitAmount } from '@/lib/stripe/connect';

/**
 * GET /api/admin/transactions
 *
 * Every booking that involved money, and where that money ended up.
 *
 * This did not exist, and its absence was felt: /api/admin/overview reports
 * only what is UNPAID, so a payout that went out correctly left no trace
 * anywhere an operator could look. Stripe is no better on its own — Connect →
 * Transfers lists the payouts, but a connected account id is not a person, and
 * the PaymentIntent carries no traveler at all (in the broadcast flow nobody
 * has accepted yet when the sender pays). The only place the two halves met
 * was scripts/inspect-payments.sql, which is a file, not a screen.
 *
 * So: the bookings from our database, the processing fees from Stripe, joined
 * on the PaymentIntent. Read-only.
 */
export const dynamic = 'force-dynamic';

// Enough to cover the operator's scroll without making the page wait on
// several thousand rows nobody reads.
const LIMIT = 200;
// Stripe pages at 100. Three pages covers LIMIT bookings with room for charges
// that belong to no booking, and bounds the wait if the account is busy.
const FEE_PAGES = 3;

export async function GET() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) {
    // Same shape as any unknown route — an operator console shouldn't confirm
    // its own existence to someone who isn't one.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const admin = getAdminClient();

  const { data: bookings, error } = await admin
    .from('booking_intents')
    .select(
      'id, created_at, sender_id, traveler_user_id, payment_intent_id, payment_amount, ' +
        'transfer_id, transfer_amount, platform_fee_amount, transferred_at, payment_status, ' +
        'received_confirmed_at, archived_at, pickup_city, destination_city'
    )
    // 'unpaid' never reached Stripe, so there is nothing to account for.
    .neq('payment_status', 'unpaid')
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error('[admin/transactions] query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const rows = bookings ?? [];

  // ---- the people ---------------------------------------------------------
  const ids = [
    ...new Set(rows.flatMap((b: any) => [b.sender_id, b.traveler_user_id]).filter(Boolean)),
  ] as string[];

  const { data: people } = ids.length
    ? await admin
        .from('profiles')
        // The payout flags come along because the answer to "why has this one
        // not been paid" is almost always here, and an operator should not
        // have to open a second screen to find it.
        .select('id, full_name, stripe_account_id, stripe_payouts_enabled')
        .in('id', ids)
    : { data: [] as any[] };

  const profileById = new Map((people ?? []).map((p: any) => [p.id, p]));
  const nameOf = (id: string | null) =>
    (id && profileById.get(id)?.full_name) || null;

  // ---- what Stripe took ---------------------------------------------------
  // One list call per 100 charges rather than a retrieve per booking: the fee
  // lives on the charge's balance transaction, and expanding it inline keeps
  // this to a handful of requests no matter how many rows are shown.
  //
  // Best-effort by design. If Stripe is unreachable the table still renders
  // with the columns we own — a missing fee is a dash, not an error page.
  const feeByIntent = new Map<string, number>();
  try {
    const stripe = getStripe();
    let startingAfter: string | undefined;
    for (let page = 0; page < FEE_PAGES; page++) {
      const charges = await stripe.charges.list({
        limit: 100,
        expand: ['data.balance_transaction'],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const charge of charges.data) {
        const pi =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        const bt =
          typeof charge.balance_transaction === 'object'
            ? charge.balance_transaction
            : null;
        // An unsettled charge has no balance transaction yet, so its fee is
        // not final. Leaving it out reports it as unknown rather than as zero.
        if (pi && bt) feeByIntent.set(pi, bt.fee ?? 0);
      }
      if (!charges.has_more) break;
      startingAfter = charges.data[charges.data.length - 1]?.id;
      if (!startingAfter) break;
    }
  } catch (e: any) {
    console.error('[admin/transactions] Stripe fees unavailable:', e?.message);
  }

  // ---- the join -----------------------------------------------------------
  const transactions = rows.map((b: any) => {
    const paid = b.payment_amount ?? 0;
    const traveler = profileById.get(b.traveler_user_id);

    // Once a transfer exists these are facts, recorded when it went out. Before
    // that they are only an expectation, so derive them the same way the payout
    // will — an operator looking at a pending row still needs to see what it is
    // worth, even though the split is whatever the fee constants say on the day.
    const travelerCents =
      b.transfer_amount ?? (paid ? splitAmount(paid).travelerCents : null);
    const jiblyCents =
      b.platform_fee_amount ?? (paid ? splitAmount(paid).feeCents : null);

    const stripeFee = b.payment_intent_id
      ? feeByIntent.get(b.payment_intent_id) ?? null
      : null;

    return {
      id: b.id,
      createdAt: b.created_at,
      route:
        b.pickup_city && b.destination_city
          ? `${b.pickup_city} → ${b.destination_city}`
          : null,
      sender: nameOf(b.sender_id),
      traveler: nameOf(b.traveler_user_id),
      paidCents: paid,
      stripeFeeCents: stripeFee,
      jiblyFeeCents: jiblyCents,
      // What the commission is actually worth once Stripe has been paid. Null
      // rather than a guess when the fee isn't known yet.
      netCents:
        jiblyCents != null && stripeFee != null ? jiblyCents - stripeFee : null,
      travelerCents,
      paymentStatus: b.payment_status,
      transferId: b.transfer_id,
      transferredAt: b.transferred_at,
      deliveredAt: b.received_confirmed_at,
      archived: !!b.archived_at,
      // Why this row is where it is. Same taxonomy as inspect-payments.sql, so
      // the screen and the script can never disagree.
      state: b.transfer_id
        ? 'paid_out'
        : b.payment_status === 'refunded'
          ? 'refunded'
          : b.payment_status === 'canceled'
            ? 'canceled'
            : b.payment_status === 'authorized'
              ? 'authorized'
              : !b.traveler_user_id
                ? 'no_traveler'
                : !b.received_confirmed_at
                  ? 'in_transit'
                  : traveler?.stripe_payouts_enabled !== true
                    ? 'waiting_payout_setup'
                    : 'transfer_pending',
      // Only meaningful on a row that is waiting: how far the traveler got.
      travelerHasAccount: !!traveler?.stripe_account_id,
      travelerPayable: traveler?.stripe_payouts_enabled === true,
    };
  });

  // Totals over what is shown, so the header and the table can never disagree.
  const sum = (pick: (t: (typeof transactions)[number]) => number | null) =>
    transactions.reduce((s, t) => s + (pick(t) ?? 0), 0);

  return NextResponse.json({
    transactions,
    // True when there are older bookings than the ones returned — the table
    // says so rather than quietly presenting a partial ledger as the whole.
    truncated: rows.length === LIMIT,
    totals: {
      count: transactions.length,
      paidCents: sum((t) => t.paidCents),
      stripeFeeCents: sum((t) => t.stripeFeeCents),
      jiblyFeeCents: sum((t) => t.jiblyFeeCents),
      netCents: sum((t) => t.netCents),
      // Only money that actually left the platform. Summing every row's share
      // would count parcels still in transit as already paid.
      travelerPaidCents: sum((t) => (t.transferId ? t.travelerCents : 0)),
      owedCents: sum((t) =>
        !t.transferId &&
        (t.state === 'waiting_payout_setup' || t.state === 'transfer_pending')
          ? t.travelerCents
          : 0
      ),
    },
  });
}
