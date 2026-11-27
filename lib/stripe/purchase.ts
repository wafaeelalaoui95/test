import type Stripe from 'stripe';
import { MAX_DECLARED_VALUE_EUR } from '@/lib/constants';

// =============================================================================
// "The traveller buys the item for me"
// =============================================================================
// The sender pays the item's price on top of the service. That part is:
//   - FIXED: the traveller is reimbursed exactly the price the sender gave,
//     whatever the shop charged. Jibly has no way to check a receipt, so a
//     ceiling would only ever be claimed in full.
//   - COMMISSION-FREE: Jibly's fee is taken on the service only.
//
// Where the number lives: /api/stripe/create-payment-intent writes it into the
// PaymentIntent metadata as `purchaseCents`, and every payout reads it back
// from there. The purchase_price columns on the booking and the request are
// for display; a browser that edits them changes nothing anyone is paid.

/** Highest item price a sender may ask a traveller to advance. */
export const MAX_PURCHASE_EUR = MAX_DECLARED_VALUE_EUR;

/**
 * The item's share of a PaymentIntent, in cents. 0 for an ordinary booking.
 * Never more than the amount itself, so a corrupt value cannot make the
 * service share negative.
 */
export function purchaseCentsOf(pi: Pick<Stripe.PaymentIntent, 'metadata' | 'amount'>): number {
  const raw = Number(pi.metadata?.purchaseCents ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(Math.round(raw), pi.amount);
}
