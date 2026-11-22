import type { Translations } from '@/lib/i18n/translations';

/**
 * What a person sees when a server call fails. NEVER the raw error: route
 * errors are codes and English developer text ("Unauthorized",
 * "booking_not_payable", a Stripe API message) and mean nothing to a sender
 * or traveller. Every message here is a sentence in their language that says
 * what to do next. The raw code still goes to the console for us.
 */
export function friendlyError(
  t: Translations,
  code?: string | null,
  status?: number
): string {
  if (code) console.warn('[user-error]', status ?? '', code);
  const c = (code ?? '').toLowerCase();
  if (status === 401 || c === 'unauthorized') return t.err_session_expired;
  if (c === 'identity_required') return t.gate_identity_required;
  if (c === 'trip_not_open' || c === 'trip not found' || c === 'cannot book your own trip') {
    return t.err_trip_unavailable;
  }
  if (
    status === 404 ||
    status === 409 ||
    ['booking_not_payable', 'state_changed', 'not_allowed', 'not_your_move', 'forbidden'].includes(c)
  ) {
    return t.err_booking_changed;
  }
  return t.err_payment_setup;
}
