#!/usr/bin/env node
/**
 * Delete the platform's connected accounts and start over.
 *
 * Three days of debugging left a dashboard full of half-finished accounts —
 * several per person, none payable — which makes it impossible to tell which
 * account the app is actually using. This clears them.
 *
 * SAFETY. Deleting a connected account is irreversible and takes its KYC with
 * it, so this refuses to touch an account that looks real:
 *   - payouts_enabled, or
 *   - a non-zero balance in any currency
 * Those are skipped and listed. Everything else is fair game.
 *
 * It also never deletes without being asked twice: the default run is a dry
 * run that only prints what it would do.
 *
 *   node scripts/reset-connect-accounts.mjs           # list only
 *   node scripts/reset-connect-accounts.mjs --yes     # actually delete
 *   node scripts/reset-connect-accounts.mjs --yes --force   # include skipped
 *
 * Needs STRIPE_SECRET_KEY in the environment. It reads the key; it is never
 * printed, and nothing here sends it anywhere but Stripe.
 *
 *   PowerShell:  $env:STRIPE_SECRET_KEY = "sk_live_..."
 *   bash:        export STRIPE_SECRET_KEY="sk_live_..."
 *
 * AFTER running this, clear the columns that point at the deleted accounts —
 * see scripts/reset-connect-accounts.sql. Doing only one half leaves the app
 * holding ids Stripe no longer knows, which is the exact failure that produced
 * "not connected to your platform or does not exist".
 */

import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(
    'STRIPE_SECRET_KEY is not set.\n' +
      '  PowerShell:  $env:STRIPE_SECRET_KEY = "sk_..."\n' +
      '  bash:        export STRIPE_SECRET_KEY="sk_..."'
  );
  process.exit(1);
}

const APPLY = process.argv.includes('--yes');
const FORCE = process.argv.includes('--force');
const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });

const mode = key.startsWith('sk_live_') ? 'LIVE' : 'TEST';

function balanceTotal(account) {
  // A deleted account's money is gone with it. Any non-zero balance means
  // something real happened here.
  const b = account.balance ?? null;
  if (!b) return 0;
  const sum = (rows) =>
    (rows ?? []).reduce((n, row) => n + Math.abs(row.amount ?? 0), 0);
  return sum(b.available) + sum(b.pending) + sum(b.connect_reserved);
}

async function main() {
  console.log(`Mode: ${mode}${APPLY ? '' : '   (dry run — nothing will be deleted)'}\n`);

  const accounts = [];
  for await (const account of stripe.accounts.list({ limit: 100 })) {
    accounts.push(account);
  }

  if (!accounts.length) {
    console.log('No connected accounts.');
    return;
  }

  const keep = [];
  const drop = [];

  for (const a of accounts) {
    // balance isn't included in list responses; retrieve to be sure before
    // doing something irreversible.
    let full = a;
    try {
      full = await stripe.accounts.retrieve(a.id);
    } catch {
      /* fall back to the list copy */
    }
    const money = balanceTotal(full);
    const live = full.payouts_enabled === true;
    (live || money > 0 ? keep : drop).push({ a: full, money, live });
  }

  const label = ({ a, money, live }) =>
    `  ${a.id}  ${(a.email ?? a.business_profile?.name ?? '—').padEnd(32)}` +
    ` ${a.country ?? '??'}  ${a.type ?? '?'}` +
    `${live ? '  payouts_enabled' : ''}${money ? `  balance:${money}` : ''}`;

  if (keep.length) {
    console.log(`Skipping ${keep.length} account(s) that look real:`);
    keep.forEach((r) => console.log(label(r)));
    if (!FORCE) console.log('  (pass --force to delete these too)\n');
    else console.log('  --force given: these WILL be deleted too\n');
  }

  const targets = FORCE ? [...drop, ...keep] : drop;
  console.log(`${APPLY ? 'Deleting' : 'Would delete'} ${targets.length} account(s):`);
  targets.forEach((r) => console.log(label(r)));

  if (!APPLY) {
    console.log('\nDry run. Re-run with --yes to delete.');
    return;
  }

  console.log('');
  let ok = 0;
  const failed = [];
  for (const { a } of targets) {
    try {
      await stripe.accounts.del(a.id);
      ok++;
      console.log(`  deleted ${a.id}`);
    } catch (e) {
      failed.push([a.id, e?.message ?? String(e)]);
      console.log(`  FAILED  ${a.id}: ${e?.message}`);
    }
  }

  console.log(`\nDeleted ${ok}/${targets.length}.`);
  if (failed.length) {
    console.log('Failed:');
    failed.forEach(([id, msg]) => console.log(`  ${id}: ${msg}`));
  }
  console.log(
    '\nNow run scripts/reset-connect-accounts.sql in Supabase, or the app will\n' +
      'keep handing Stripe account ids that no longer exist.'
  );
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
