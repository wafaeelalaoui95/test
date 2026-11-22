import { MIN_COMPENSATION_EUR } from '@/lib/constants';
import { priceBreakdown } from '@/lib/utils';

// =============================================================================
// Price bargaining — the rules, in one place
// =============================================================================
// A sender and a traveller can agree a price other than the listed one, by
// counter-offers rather than chat (no conversation opens before money is
// committed). Imported by the browser to decide which buttons to draw and by
// the server routes to decide what to accept, so the two cannot disagree.
//
// Every price here is the TOTAL the sender pays, Jibly's fee included — the
// same figure as booking_intents.proposed_price. The traveller is shown their
// net (travelerNetFromTotal) on their own screens.
//
// The state lives on booking_intents:
//   proposed_price      the price currently on the table
//   original_price      the starting point: the trip's listed total, or the
//                       traveller's first offer on a request
//   price_pending_by    who made the price now on the table and is waiting:
//                         'sender'   → the traveller must answer
//                         'traveler' → the sender must answer
//                         null       → no bargaining (the original flows)
//   sender_countered / traveler_countered
//                       each side gets ONE counter-proposal of its own. A
//                       sender's first offer below a listed trip counts as
//                       theirs; a traveller's first offer on a request does not.
//
// Money follows one rule: whoever proposes a price as the SENDER authorises
// their card at that price (nothing is charged). The traveller accepting it
// captures it. When the TRAVELLER proposes, the sender accepts by paying, and
// that payment is captured straight away (/api/booking/record-authorization).

/** The lowest total a sender may offer: the traveller still nets the minimum listing price. */
export const MIN_OFFER_TOTAL_EUR = priceBreakdown(MIN_COMPENSATION_EUR).total; // 17.75

export type NegotiationFields = {
  status: 'pending' | 'confirmed' | 'cancelled' | string;
  initiated_by: 'sender' | 'traveler' | string;
  proposed_price: number | string;
  original_price?: number | string | null;
  price_pending_by?: 'sender' | 'traveler' | null;
  sender_countered?: boolean | null;
  traveler_countered?: boolean | null;
  payment_status?: string | null;
};

/** Euros to the cent, without float dust. */
export function roundEuros(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

/** Whose move it is on a pending booking, or null once it is settled. */
export function awaitingParty(b: NegotiationFields): 'sender' | 'traveler' | null {
  if (b.status !== 'pending') return null;
  if (b.price_pending_by === 'sender') return 'traveler';
  if (b.price_pending_by === 'traveler') return 'sender';
  return b.initiated_by === 'traveler' ? 'sender' : 'traveler';
}

/** True while a price other than the starting one is being discussed. */
export function isNegotiating(b: NegotiationFields): boolean {
  return b.status === 'pending' && !!b.price_pending_by;
}

/**
 * The sender may counter a traveller's price: their move, nothing paid yet,
 * and they have not used their counter. (On a trip they used it by offering.)
 */
export function canSenderCounter(b: NegotiationFields): boolean {
  return (
    awaitingParty(b) === 'sender' &&
    !b.sender_countered &&
    (b.payment_status ?? 'unpaid') === 'unpaid' &&
    Number(b.proposed_price) > MIN_OFFER_TOTAL_EUR
  );
}

/**
 * The traveller may counter only a price the SENDER proposed (a plain booking
 * at the listed price is not up for discussion), once.
 */
export function canTravelerCounter(b: NegotiationFields): boolean {
  return (
    awaitingParty(b) === 'traveler' &&
    b.price_pending_by === 'sender' &&
    !b.traveler_countered &&
    b.payment_status === 'authorized' &&
    (b.original_price == null || Number(b.original_price) > Number(b.proposed_price))
  );
}

export type OfferError =
  | 'below_minimum'
  | 'not_lower'
  | 'not_higher'
  | 'above_original'
  | 'invalid_amount';

/**
 * A sender's price: at least the minimum and strictly below what is on the
 * table (offering more than asked is not a negotiation).
 */
export function checkSenderOffer(amount: number, current: number): OfferError | null {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000) return 'invalid_amount';
  const a = roundEuros(amount);
  if (a < MIN_OFFER_TOTAL_EUR) return 'below_minimum';
  if (a >= roundEuros(current)) return 'not_lower';
  return null;
}

/**
 * A traveller's counter: above the sender's price, and never above where the
 * traveller started — they cannot ask for more than their own listing.
 */
export function checkTravelerCounter(
  amount: number,
  current: number,
  original: number | null | undefined
): OfferError | null {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000) return 'invalid_amount';
  const a = roundEuros(amount);
  if (a <= roundEuros(current)) return 'not_higher';
  if (original != null && a > roundEuros(Number(original))) return 'above_original';
  return null;
}
