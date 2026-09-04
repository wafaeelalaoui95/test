import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { syncConnectAccount } from '@/lib/stripe/connect';
import { retryPendingPayouts } from '@/lib/stripe/payout';
import { getAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/stripe/webhook
 *
 * The payments + Connect webhook. Separate from /api/identity/webhook because
 * it takes its own signing secret (one per endpoint in Stripe) and a different
 * set of events.
 *
 * Two jobs:
 *   1. Keep booking_intents.payment_status honest even when the request that
 *      triggered the change died before writing to our DB. Before this existed,
 *      a capture that succeeded at Stripe but failed the DB write left the row
 *      permanently wrong — with real money already moved.
 *   2. Retry payouts. A traveler who finishes Connect onboarding after their
 *      first delivery gets paid on account.updated, without anyone noticing
 *      they had been skipped.
 *
 * Bookings are located by payment_intent_id, NOT by metadata.bookingIntentId:
 * the sender authorises their card before the booking row exists (see
 * /api/booking/record-authorization), so that metadata field is an empty
 * string on every PaymentIntent we create.
 *
 * Env: STRIPE_WEBHOOK_SECRET and STRIPE_CONNECT_WEBHOOK_SECRET — see the
 * comment on the secret list below for why there are two.
 */
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  // Two Stripe destinations point at this one route, each with its own signing
  // secret:
  //   STRIPE_WEBHOOK_SECRET         — "Your account" scope: the payment_intent.*
  //                                   events for charges made to the platform
  //   STRIPE_CONNECT_WEBHOOK_SECRET — "Connected accounts" scope: account.updated
  //                                   for our travelers' Express accounts
  //
  // They must be separate destinations in Stripe (v1 connected-account events
  // are not delivered to the "Your account" scope), so we try each secret and
  // accept the event if any verifies. Only the matching one can succeed —
  // constructEvent is an HMAC check, so this is not a weakening.
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter((s): s is string => !!s);

  if (!secrets.length) {
    console.error(
      '[stripe/webhook] no signing secret configured (STRIPE_WEBHOOK_SECRET / STRIPE_CONNECT_WEBHOOK_SECRET)'
    );
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event | null = null;
  let lastError = '';
  for (const secret of secrets) {
    try {
      event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
      break;
    } catch (e: any) {
      lastError = e?.message ?? 'unknown';
    }
  }

  if (!event) {
    // Say WHICH secrets were available. "Neither matched" and "only one was
    // configured, and the event came from the other destination" produce the
    // identical Stripe error message, and they have completely different fixes.
    console.error(
      '[stripe/webhook] signature verification FAILED against %d secret(s) ' +
        '(platform=%s, connect=%s):',
      secrets.length,
      process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'MISSING',
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET ? 'set' : 'MISSING',
      lastError
    );
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = getAdminClient();

  try {
    switch (event.type) {
      // ---- Connect account reached a new state (KYC done, payouts enabled) --
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        // Use the id the sync actually wrote to, not account.metadata.userId.
        // The metadata can be absent, or point at a profile that no longer
        // exists — in which case this used to skip the retry silently and the
        // traveler was never paid.
        const travelerUserId = await syncConnectAccount(account);

        // Newly payable → settle anything we owe them. This is the retry path
        // for payouts skipped as 'not_onboarded' at capture time.
        if (account.payouts_enabled && travelerUserId) {
          await retryPendingPayouts(travelerUserId);
        }
        break;
      }

      // ---- A transfer was sent back ----------------------------------------
      // Reversing in the dashboard left the booking still claiming PAID OUT,
      // and transfer_id being set is what stops the payout being retried — so
      // the parcel was recorded as settled while the traveler had nothing, and
      // nothing would ever try again. It happened twice in one day.
      //
      // Clearing the columns puts the booking back where it was: owed, and
      // eligible for the next sweep.
      case 'transfer.reversed': {
        const transfer = event.data.object as Stripe.Transfer;

        // Partial reversals leave part of the money with the traveler. Treat
        // only a full reversal as "not paid" — anything else needs a human,
        // and silently marking it unpaid would pay the remainder twice.
        if (transfer.amount_reversed < transfer.amount) {
          console.warn(
            `[stripe/webhook] transfer ${transfer.id} partially reversed ` +
              `(${transfer.amount_reversed}/${transfer.amount}) — left as is, needs a human`
          );
          break;
        }

        const { data: cleared, error } = await admin
          .from('booking_intents')
          .update({
            transfer_id: null,
            transfer_amount: null,
            platform_fee_amount: null,
            transferred_at: null,
          })
          .eq('transfer_id', transfer.id)
          .select('id');

        if (error) {
          console.error('[stripe/webhook] reversal cleanup failed:', error.message);
        } else if (cleared?.length) {
          console.log(
            `[stripe/webhook] transfer ${transfer.id} reversed — booking ${cleared[0].id} is owed again`
          );
        }
        break;
      }

      // ---- The traveler's bank, at last ------------------------------------
      // A transfer puts money in their Stripe balance; a payout is what
      // reaches their bank, and nothing recorded whether it ever did. These
      // events arrive on the connected-account destination, so event.account
      // names whose payout it is.
      //
      // 'failed' is the one worth having: a mistyped IBAN or a closed account
      // is otherwise discovered when the traveler writes to ask where their
      // money is.
      case 'payout.paid':
      case 'payout.failed':
      case 'payout.canceled':
      case 'payout.updated': {
        const payout = event.data.object as Stripe.Payout;
        const acct = event.account;
        // No event.account means this is one of Jibly's OWN payouts to its own
        // bank, which this table is not about.
        if (!acct) break;

        const { data: owner } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_account_id', acct)
          .maybeSingle();

        const { error } = await admin.from('traveler_payouts').upsert({
          id: payout.id,
          stripe_account_id: acct,
          user_id: owner?.id ?? null,
          amount_cents: payout.amount,
          currency: payout.currency,
          status: payout.status,
          arrival_date: payout.arrival_date
            ? new Date(payout.arrival_date * 1000).toISOString()
            : null,
          failure_code: payout.failure_code ?? null,
          failure_message: payout.failure_message ?? null,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          console.error('[stripe/webhook] payout upsert failed:', error.message);
        }

        if (payout.status === 'failed') {
          // Loud on purpose. Someone carried a parcel and their money bounced.
          console.error(
            `[stripe/webhook] PAYOUT FAILED for ${acct} (user ${owner?.id ?? 'unknown'}): ` +
              `${payout.failure_code ?? 'no code'} — ${payout.failure_message ?? 'no message'}`
          );
        }
        break;
      }

      // ---- Capture confirmed by Stripe -------------------------------------
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await admin
          .from('booking_intents')
          .update({ payment_status: 'captured', payment_amount: pi.amount })
          .eq('payment_intent_id', pi.id);
        break;
      }

      // ---- Authorisation released ------------------------------------------
      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await admin
          .from('booking_intents')
          .update({ payment_status: 'canceled' })
          .eq('payment_intent_id', pi.id);
        break;
      }

      // ---- Card declined at capture ----------------------------------------
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await admin
          .from('booking_intents')
          .update({ payment_status: 'failed' })
          .eq('payment_intent_id', pi.id);
        break;
      }

      default:
        // Unhandled events are fine — Stripe sends plenty we didn't subscribe
        // to caring about. Acknowledge so it stops retrying.
        break;
    }
  } catch (e: any) {
    // Return 500 so Stripe retries with backoff rather than dropping the event.
    console.error(`[stripe/webhook] handler failed for ${event.type}:`, e?.message);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
