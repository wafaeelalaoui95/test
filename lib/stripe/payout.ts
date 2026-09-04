import { getStripe } from './server';
import { splitAmount } from './connect';
import { getAdminClient } from '@/lib/supabase/server';

export type PayoutResult =
  | { status: 'sent'; transferId: string; travelerCents: number; feeCents: number }
  | { status: 'already_sent'; transferId: string }
  | { status: 'skipped'; reason: 'no_traveler' | 'not_onboarded' | 'no_charge' }
  | { status: 'failed'; reason: string };

/**
 * Move the traveler's share of a captured booking onto their connected
 * account. Idempotent and non-throwing: every failure mode is returned as a
 * value, because the callers (capture route, webhook retry) have already taken
 * the sender's money and must not surface a payout problem as a payment
 * problem.
 *
 * The commission stays behind in the Jibly balance simply by not being
 * transferred — with separate charges and transfers there is no
 * application_fee to declare.
 */
export async function transferToTraveler(params: {
  bookingIntentId: string;
  travelerUserId: string | null;
  existingTransferId: string | null;
  amountCents: number;
  chargeId: string | null;
}): Promise<PayoutResult> {
  const { bookingIntentId, travelerUserId, existingTransferId, amountCents, chargeId } =
    params;

  // Idempotency: never pay the same booking twice. This is the single most
  // expensive bug available in this file, so it is the first check.
  if (existingTransferId) {
    return { status: 'already_sent', transferId: existingTransferId };
  }
  if (!travelerUserId) {
    console.warn(`[payout] booking ${bookingIntentId} has no traveler to pay`);
    return { status: 'skipped', reason: 'no_traveler' };
  }
  if (!chargeId) {
    // Without the charge we cannot set source_transaction, and the transfer
    // would draw on the platform's general balance instead of these funds.
    console.warn(`[payout] booking ${bookingIntentId} has no charge id`);
    return { status: 'skipped', reason: 'no_charge' };
  }

  const admin = getAdminClient();
  const { data: traveler } = await admin
    .from('profiles')
    .select('stripe_account_id, stripe_payouts_enabled')
    .eq('id', travelerUserId)
    .maybeSingle();

  if (!traveler?.stripe_account_id || !traveler.stripe_payouts_enabled) {
    // Expected, not exceptional: the traveler can finish onboarding later and
    // the webhook will retry. The money is held by us until then.
    console.warn(
      `[payout] traveler ${travelerUserId} not payable yet (booking ${bookingIntentId})`
    );
    return { status: 'skipped', reason: 'not_onboarded' };
  }

  const { feeCents, travelerCents } = splitAmount(amountCents);

  try {
    const transfer = await getStripe().transfers.create(
      {
        amount: travelerCents,
        currency: 'eur',
        destination: traveler.stripe_account_id,
        // Ties the transfer to the specific charge, so Stripe releases it as
        // those funds settle rather than drawing on our floating balance.
        source_transaction: chargeId,
        description: `Jibly payout · booking ${bookingIntentId}`,
        metadata: { bookingIntentId, travelerUserId },
      },
      {
        // Belt-and-braces against a double capture racing this function: Stripe
        // itself refuses a second transfer for the same booking.
        //
        // Scoped to the destination as well, because a booking can legitimately
        // need paying twice: reverse a transfer, and the traveler is owed again.
        // Keyed on the booking alone, Stripe answered that second attempt from
        // its 24-hour idempotency cache — the parameters no longer matched
        // (a recreated account has a new id), so it refused outright and the
        // traveler stayed unpaid with the sweep reporting success.
        //
        // Paying the same account twice for one booking is still blocked, by
        // the existingTransferId check at the top of this function. That is the
        // real guard; this one only stops a race.
        idempotencyKey: `payout_${bookingIntentId}_${traveler.stripe_account_id}`,
      }
    );

    const { error } = await admin
      .from('booking_intents')
      .update({
        transfer_id: transfer.id,
        transfer_amount: travelerCents,
        platform_fee_amount: feeCents,
        transferred_at: new Date().toISOString(),
      })
      .eq('id', bookingIntentId);

    if (error) {
      // Money moved but we failed to record it. The idempotency key above is
      // what stops a retry from paying twice, so log the key explicitly.
      console.error(
        `[payout] transfer ${transfer.id} sent but NOT recorded for booking ${bookingIntentId}:`,
        error
      );
    }

    return { status: 'sent', transferId: transfer.id, travelerCents, feeCents };
  } catch (e: any) {
    console.error(`[payout] transfer failed for ${bookingIntentId}:`, e?.message);
    return { status: 'failed', reason: e?.message ?? 'transfer failed' };
  }
}

/**
 * Pay out every delivered booking of this traveler that never got transferred.
 *
 * The retry path for payouts skipped as 'not_onboarded' at delivery time: the
 * traveler carried the parcel before sorting their bank details, so the money
 * stayed in the platform balance waiting for them to finish.
 *
 * Called from the account.updated webhook and from /api/connect/status. The
 * second caller matters more than it looks: the webhook only fires when Stripe
 * decides something changed, so without it a traveler could complete setup,
 * see "all set", and still not be paid until some unrelated event happened to
 * fire. transferToTraveler is idempotent, so calling this often is harmless.
 *
 * Bounded to 50 so a pathological account can't stall the webhook past
 * Stripe's timeout — the rest are picked up on the next call.
 */
export async function retryPendingPayouts(
  travelerUserId: string
): Promise<{ attempted: number; sent: number; failed: number; skipped: number }> {
  const tally = { attempted: 0, sent: 0, failed: 0, skipped: 0 };
  const admin = getAdminClient();
  const { data: pending } = await admin
    .from('booking_intents')
    .select('id, traveler_user_id, payment_intent_id, payment_amount, transfer_id')
    .eq('traveler_user_id', travelerUserId)
    .eq('payment_status', 'captured')
    .is('transfer_id', null)
    // DELIVERED ONLY. Capture happens when the traveler accepts, so 'captured'
    // on its own says nothing about whether the parcel arrived — without this
    // filter, a traveler finishing payout setup would be paid for every parcel
    // they had merely agreed to carry.
    .not('received_confirmed_at', 'is', null)
    .limit(50);

  if (!pending?.length) return tally;

  console.log(`[payout] retrying ${pending.length} payout(s) for ${travelerUserId}`);

  const stripe = getStripe();
  for (const booking of pending) {
    if (!booking.payment_intent_id || !booking.payment_amount) {
      tally.skipped++;
      continue;
    }
    tally.attempted++;
    // We need the charge id for source_transaction, and it isn't stored on the
    // booking — re-read the PaymentIntent to get it.
    const pi = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
    // transferToTraveler reports every failure as a RETURN VALUE, never a
    // throw — so a caller that only counts exceptions reports success while
    // the traveler goes unpaid. That is exactly what happened: the sweep said
    // "failed: 0" on a run where the only transfer it attempted was refused.
    const result = await transferToTraveler({
      bookingIntentId: booking.id,
      travelerUserId,
      existingTransferId: booking.transfer_id,
      amountCents: booking.payment_amount,
      chargeId:
        typeof pi.latest_charge === 'string'
          ? pi.latest_charge
          : pi.latest_charge?.id ?? null,
    });

    if (result.status === 'sent' || result.status === 'already_sent') tally.sent++;
    else if (result.status === 'failed') tally.failed++;
    else tally.skipped++;
  }

  return tally;
}
