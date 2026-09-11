#!/usr/bin/env node
/**
 * Does a Stripe Identity check actually settle a connected account's KYC?
 *
 * This is the one assumption the accounts-first reorder rests on, and the one
 * thing no amount of reading proves: `related_person` ties a VerificationSession
 * to a connected account's Person, and Stripe documents it for a Person "who's
 * required to provide a document". Whether Stripe ALSO accepts the link when
 * nothing is outstanding decides how much the fallback in
 * /api/identity/create-session has to carry. Run this against a test key and
 * find out in ninety seconds.
 *
 *   node scripts/check-identity-link.mjs --create
 *       Opens a throwaway connected account, fills in the same details our
 *       form collects, prints what Stripe then wants, and tries to create a
 *       linked verification. TEST KEYS ONLY — it creates real objects.
 *
 *   node scripts/check-identity-link.mjs --account acct_123
 *       Read-only. What is Stripe waiting on for this account, is its Person
 *       verified, and would our flow show a document step? Safe on live keys;
 *       this is how to inspect a traveler who is stuck.
 *
 *   node scripts/check-identity-link.mjs --account acct_123 --link
 *       Also creates the linked verification and prints the hosted URL. On a
 *       live key this is a real, billable check against a real person — it
 *       asks for --yes as well.
 *
 * Options: --country FR (default FR, any country the platform can open)
 *
 * Needs STRIPE_SECRET_KEY in the environment. It reads the key; it is never
 * printed, and nothing here sends it anywhere but Stripe.
 *
 *   PowerShell:  $env:STRIPE_SECRET_KEY = "sk_test_..."
 *   bash:        export STRIPE_SECRET_KEY="sk_test_..."
 *
 * WALKING THE FLOW. In test mode the verification isn't really examined —
 * Stripe's hosted page offers predefined outcomes to pick from instead of
 * wanting a real passport. Open the URL this prints, choose the verified
 * case, then re-run with --account <the same account> to see whether
 * individual.verification.document left currently_due. That transition, and
 * nothing else, is the proof that one upload now covers both systems.
 */

import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(
    'STRIPE_SECRET_KEY is not set.\n' +
      '  PowerShell:  $env:STRIPE_SECRET_KEY = "sk_test_..."\n' +
      '  bash:        export STRIPE_SECRET_KEY="sk_test_..."'
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const value = (flag, fallback = null) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const CREATE = has('--create');
const LINK = has('--link');
const YES = has('--yes');
const ACCOUNT = value('--account');
const COUNTRY = (value('--country', 'FR') ?? 'FR').toUpperCase();

// Must match lib/stripe/server.ts. related_person does not exist before
// Basil, so an older pin here would fail in a way that looks like Stripe
// refusing the link rather than us asking the wrong version for it.
const API_VERSION = '2025-08-27.basil';
const stripe = new Stripe(key, { apiVersion: API_VERSION });

const LIVE = key.startsWith('sk_live_');

if (!CREATE && !ACCOUNT) {
  console.error(
    'Nothing to do. Pass --create for a throwaway account, or --account acct_… to inspect one.'
  );
  process.exit(1);
}
if (CREATE && LIVE) {
  console.error(
    'Refusing to --create on a LIVE key. This opens a connected account that\n' +
      'cannot be fully deleted once it has KYC on it. Use a test key.'
  );
  process.exit(1);
}
if (LINK && LIVE && !YES) {
  console.error(
    'Refusing to --link on a LIVE key without --yes. This creates a real,\n' +
      'billable identity check against a real person.'
  );
  process.exit(1);
}

/** The same suffix match lib/stripe/onboarding.ts uses. */
const IDENTITY_SUFFIXES = [
  '.verification.document',
  '.verification.proof_of_liveness',
];
const isIdentityRequirement = (r) =>
  IDENTITY_SUFFIXES.some((s) => r.endsWith(s));

function report(account) {
  const req = account.requirements ?? {};
  const due = [
    ...new Set([...(req.currently_due ?? []), ...(req.past_due ?? [])]),
  ];

  console.log(`\naccount    ${account.id}  (${account.country}, ${account.type})`);
  console.log(`person     ${account.individual?.id ?? '— none —'}`);
  console.log(
    `verified   ${account.individual?.verification?.status ?? 'unknown'}`
  );
  console.log(`payouts    ${account.payouts_enabled ? 'enabled' : 'no'}`);
  console.log(`currently_due       ${JSON.stringify(req.currently_due ?? [])}`);
  console.log(`eventually_due      ${JSON.stringify(req.eventually_due ?? [])}`);
  console.log(
    `pending_verification ${JSON.stringify(req.pending_verification ?? [])}`
  );

  const identityDue = due.filter(isIdentityRequirement);
  console.log(
    identityDue.length
      ? `\n→ Stripe wants a document: ${identityDue.join(', ')}`
      : '\n→ No document outstanding.'
  );
  return { identityDue, personId: account.individual?.id ?? null };
}

async function makeAccount() {
  console.log(`Creating a ${COUNTRY} connected account…`);
  const account = await stripe.accounts.create({
    type: 'custom',
    country: COUNTRY,
    business_type: 'individual',
    capabilities: { transfers: { requested: true } },
    business_profile: {
      mcc: '4215',
      product_description:
        'Throwaway account created by scripts/check-identity-link.mjs',
    },
    metadata: { createdBy: 'check-identity-link.mjs' },
  });

  // The same fields /api/connect/details submits. Stripe judges a person from
  // these and only asks for an ID when they aren't enough, so the document
  // requirement — if it is coming — appears after this call, not before.
  console.log('Submitting name, date of birth and address…');
  return stripe.accounts.update(account.id, {
    individual: {
      first_name: 'Test',
      last_name: 'Traveller',
      dob: { day: 1, month: 1, year: 1990 },
      address: {
        line1: '1 Test Street',
        city: 'Paris',
        postal_code: '75001',
      },
      email: 'test-traveller@example.com',
    },
  });
}

async function tryLink(account, personId) {
  if (!personId) {
    console.log(
      '\nNo Person on this account, so there is nothing to link to. Our route\n' +
        'falls back to an unlinked verification in exactly this case.'
    );
    return;
  }

  console.log(`\nCreating a VerificationSession linked to ${personId}…`);
  const params = {
    type: 'document',
    options: { document: { require_matching_selfie: true, require_live_capture: true } },
    metadata: { createdBy: 'check-identity-link.mjs' },
  };

  try {
    const session = await stripe.identity.verificationSessions.create({
      ...params,
      related_person: { account: account.id, person: personId },
    });
    console.log(`\n  ACCEPTED — ${session.id}`);
    console.log(`  related_person: ${JSON.stringify(session.related_person)}`);
    console.log(`\n  Open this and pick a test outcome:\n  ${session.url}`);
    console.log(
      `\n  Then: node scripts/check-identity-link.mjs --account ${account.id}`
    );
    console.log(
      '  A document requirement that has left currently_due is the whole point.'
    );
  } catch (e) {
    const param = e?.param ?? e?.raw?.param ?? '';
    const linkRejected =
      String(param).startsWith('related_person') ||
      /related_person/i.test(e?.message ?? '');
    console.log(`\n  REJECTED — ${e?.code ?? e?.type}: ${e?.message}`);
    console.log(`  param: ${param || '—'}`);
    console.log(
      linkRejected
        ? '\n  This is the case /api/identity/create-session falls back on: the\n' +
            '  traveler still gets verified, just unlinked, and the payouts flow\n' +
            '  offers a linked check once Stripe does ask for the document.'
        : '\n  NOT a link rejection — our route would rethrow this one.'
    );
  }
}

async function main() {
  console.log(`Stripe ${LIVE ? 'LIVE' : 'TEST'} mode, API ${API_VERSION}`);

  const account = CREATE
    ? await makeAccount()
    : await stripe.accounts.retrieve(ACCOUNT);

  const { identityDue, personId } = report(account);

  if (CREATE || LINK) {
    await tryLink(account, personId);
  } else if (identityDue.length) {
    console.log(
      '\nRe-run with --link to create the linked verification for this account.'
    );
  }

  if (CREATE) {
    console.log(
      `\nClean up when done:  stripe accounts delete ${account.id}` +
        '\n(or scripts/reset-connect-accounts.mjs, which skips anything real)'
    );
  }
}

main().catch((e) => {
  console.error(`\nFailed: ${e?.type ?? ''} ${e?.code ?? ''} ${e?.message}`);
  process.exit(1);
});
