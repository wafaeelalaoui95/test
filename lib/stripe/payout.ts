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
        // itself refuses the second transfer for the same booking.
        idempotencyKey: `payout_${bookingIntentId}`,
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
