import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { syncConnectAccount } from '@/lib/stripe/connect';
import { transferToTraveler } from '@/lib/stripe/payout';
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
        await syncConnectAccount(account);

        // Newly payable → settle anything we owe them. This is the retry path
        // for payouts skipped as 'not_onboarded' at capture time.
        if (account.payouts_enabled && account.metadata?.userId) {
          await retryPendingPayouts(account.metadata.userId);
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

/**
 * Pay out every captured booking of this traveler that never got transferred.
 * Bounded to 50 so a pathological account can't stall the webhook past
 * Stripe's timeout — the rest are picked up on the next account.updated.
 */
async function retryPendingPayouts(travelerUserId: string): Promise<void> {
  const admin = getAdminClient();
  const { data: pending } = await admin
    .from('booking_intents')
    .select('id, traveler_user_id, payment_intent_id, payment_amount, transfer_id')
    .eq('traveler_user_id', travelerUserId)
    .eq('payment_status', 'captured')
    .is('transfer_id', null)
    .limit(50);

  if (!pending?.length) return;

  console.log(
    `[stripe/webhook] retrying ${pending.length} payout(s) for ${travelerUserId}`
  );

  const stripe = getStripe();
  for (const booking of pending) {
    if (!booking.payment_intent_id || !booking.payment_amount) continue;
    // We need the charge id for source_transaction, and it isn't stored on the
    // booking — re-read the PaymentIntent to get it.
    const pi = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
    await transferToTraveler({
      bookingIntentId: booking.id,
      travelerUserId,
      existingTransferId: booking.transfer_id,
      amountCents: booking.payment_amount,
      chargeId:
        typeof pi.latest_charge === 'string'
          ? pi.latest_charge
          : pi.latest_charge?.id ?? null,
    });
  }
}
