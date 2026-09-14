import { getStripe } from '@/lib/stripe/server';
import { getAdminClient } from '@/lib/supabase/server';

// =============================================================================
// Giving a booking's money back
// =============================================================================
// Two callers need this and they must not drift apart: /api/stripe/refund (an
// operator settling a dispute) and /api/trip/cancel (a traveller who is no
// longer flying). Duplicating it is how one of them ends up refunding the
// sender without reversing the traveller's transfer — money out of the Jibly
// balance, and a booking record that disagrees with Stripe.
//
// Which of the two operations applies is decided by payment_status, not by the
// caller, because the caller usually does not know: capture happens when the
// traveller ACCEPTS, so whether a cancellation owes a void or a real refund
// depends on a decision someone else made, possibly days earlier.

/** The columns any release needs. Select exactly these. */
export type ReleasableBooking = {
  id: string;
  payment_intent_id: string | null;
  payment_status: string;
  payment_amount: number | null;
  transfer_id: string | null;
  transfer_amount: number | null;
  refunded_amount: number | null;
};

export const RELEASE_COLUMNS =
  'id, payment_intent_id, payment_status, payment_amount, transfer_id, transfer_amount, refunded_amount';

export type ReleaseResult =
  /** No payment ever existed, or it was already voided/refunded. */
  | { kind: 'nothing_owed'; detail: string }
  /** A hold was voided. No money ever left the sender's account. */
  | { kind: 'authorization_released' }
  /** Money was taken and has been given back. */
  | {
      kind: 'refunded';
      refundId: string;
      reversalId: string | null;
      refundedCents: number;
      totalRefundedCents: number;
      fullyRefunded: boolean;
    }
  /** Stripe refused. The caller decides whether that is fatal. */
  | { kind: 'failed'; code: string; message: string };

/**
 * Turn a Stripe error into something safe to put in a response body.
 *
 * Stripe's messages are written for developers and can name internal ids, so
 * only a short machine code crosses the boundary — the real error goes to the
 * server log. Same reasoning as /api/connect/onboard.
 */
function safeCode(e: any): string {
  const raw = e?.code ?? e?.raw?.code ?? 'stripe_error';
  return /^[a-z0-9_]{1,64}$/i.test(String(raw)) ? String(raw) : 'stripe_error';
}

/**
 * Void an uncaptured authorisation. Nothing moves; the sender's bank may show
 * a pending line for a few days before the issuer drops it.
 */
export async function releaseAuthorization(
  booking: ReleasableBooking
): Promise<ReleaseResult> {
  if (!booking.payment_intent_id) {
    return { kind: 'nothing_owed', detail: 'no_payment_intent' };
  }
  try {
    await getStripe().paymentIntents.cancel(booking.payment_intent_id);
  } catch (e: any) {
    // Already cancelled on Stripe's side is the outcome we wanted, not a
    // failure — it happens when a retry follows a request that in fact
    // succeeded, and when an authorisation expires on its own after ~7 days.
    if (e?.code === 'payment_intent_unexpected_state') {
      await getAdminClient()
        .from('booking_intents')
        .update({ payment_status: 'canceled' })
        .eq('id', booking.id);
      return { kind: 'authorization_released' };
    }
    console.error('[release] authorization', e?.type, e?.code, e?.message);
    return { kind: 'failed', code: safeCode(e), message: e?.message ?? '' };
  }

  const { error } = await getAdminClient()
    .from('booking_intents')
    .update({ payment_status: 'canceled' })
    .eq('id', booking.id);
  if (error) {
    // Stripe is the source of truth and it has released the hold. A stale row
    // is worth shouting about but not worth telling the caller the release
    // failed — retrying would not fix the row and might confuse the sender.
    console.error('[release] Stripe voided but DB sync failed:', error.message);
  }
  return { kind: 'authorization_released' };
}

/**
 * Give back money that was actually taken.
 *
 * @param amountCents partial amount; omit for everything still outstanding.
 */
export async function refundBooking(
  booking: ReleasableBooking,
  opts: { amountCents?: number; reason?: string } = {}
): Promise<ReleaseResult> {
  if (booking.payment_status !== 'captured') {
    return { kind: 'nothing_owed', detail: 'not_captured' };
  }
  if (!booking.payment_intent_id || !booking.payment_amount) {
    return { kind: 'nothing_owed', detail: 'no_payment' };
  }

  const alreadyRefunded = booking.refunded_amount ?? 0;
  const remaining = booking.payment_amount - alreadyRefunded;
  if (remaining <= 0) {
    return { kind: 'nothing_owed', detail: 'already_refunded' };
  }

  const amount = opts.amountCents ?? remaining;
  if (amount > remaining) {
    return {
      kind: 'failed',
      code: 'amount_too_large',
      message: `Cannot refund more than the remaining ${remaining} cents`,
    };
  }

  const stripe = getStripe();
  try {
    // Reverse the traveller's cut FIRST. If this fails we want to know before
    // the sender is made whole, rather than after — a refund we cannot claw
    // back from the traveller is a loss we absorb.
    let reversalId: string | null = null;
    if (booking.transfer_id && booking.transfer_amount) {
      // Proportional: a 50% refund reverses 50% of the traveller's share, so a
      // partial refund doesn't take the whole payout back.
      const reverseAmount = Math.floor(
        (booking.transfer_amount * amount) / booking.payment_amount
      );
      if (reverseAmount > 0) {
        const reversal = await stripe.transfers.createReversal(
          booking.transfer_id,
          { amount: reverseAmount, metadata: { bookingIntentId: booking.id } },
          { idempotencyKey: `reversal_${booking.id}_${alreadyRefunded}_${amount}` }
        );
        reversalId = reversal.id;
      }
    }

    const refund = await stripe.refunds.create(
      {
        payment_intent: booking.payment_intent_id,
        amount,
        metadata: { bookingIntentId: booking.id, reason: opts.reason ?? '' },
      },
      // Keyed on the amount refunded SO FAR, so a genuine second partial refund
      // gets its own key while an accidental double-submit does not.
      { idempotencyKey: `refund_${booking.id}_${alreadyRefunded}_${amount}` }
    );

    const total = alreadyRefunded + amount;
    const fullyRefunded = total >= booking.payment_amount;

    const { error } = await getAdminClient()
      .from('booking_intents')
      .update({
        refunded_amount: total,
        refunded_at: new Date().toISOString(),
        // Only call it 'refunded' once nothing is left owed.
        payment_status: fullyRefunded ? 'refunded' : 'captured',
      })
      .eq('id', booking.id);
    if (error) {
      console.error('[release] DB update failed after Stripe refund:', error);
    }

    return {
      kind: 'refunded',
      refundId: refund.id,
      reversalId,
      refundedCents: amount,
      totalRefundedCents: total,
      fullyRefunded,
    };
  } catch (e: any) {
    console.error('[release] refund', e?.type, e?.code, e?.message);
    return { kind: 'failed', code: safeCode(e), message: e?.message ?? '' };
  }
}

/**
 * Return whatever this booking is holding, whichever form it is in.
 *
 * The one entry point a cancellation should use: it does not need to know
 * whether the traveller had accepted yet, and getting that test wrong is
 * exactly the bug this replaces — the old trip cancellation released only
 * 'authorized' bookings and silently kept the money for every accepted one.
 */
export async function releaseBookingFunds(
  booking: ReleasableBooking,
  opts: { reason?: string } = {}
): Promise<ReleaseResult> {
  switch (booking.payment_status) {
    case 'authorized':
      return releaseAuthorization(booking);
    case 'captured':
      return refundBooking(booking, { reason: opts.reason });
    default:
      // unpaid (a traveller's proposal the sender never paid for), canceled,
      // failed, refunded — nothing is being held.
      return { kind: 'nothing_owed', detail: booking.payment_status };
  }
}
