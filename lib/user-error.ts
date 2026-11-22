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

/**
 * The general version, for any screen: turns whatever was thrown (a Supabase
 * error, a fetch failure, a route code) into a sentence, or `fallback` — the
 * screen's own "could not do X" line — when nothing more precise applies.
 *
 * A message we wrote ourselves (`throw new Error(t.something)`) passes
 * through unchanged. Anything else is technical and only reaches the console.
 */
export function userMessage(t: Translations, err: unknown, fallback: string): string {
  const e = (err ?? {}) as { message?: unknown; code?: unknown; status?: unknown };
  const msg = typeof e.message === 'string' ? e.message : '';
  if (msg && (Object.values(t) as unknown[]).includes(msg)) return msg;

  const code = typeof e.code === 'string' ? e.code.toLowerCase() : '';
  const status = typeof e.status === 'number' ? e.status : undefined;
  console.warn('[user-error]', status ?? '', code, msg);
  const s = `${code} ${msg}`.toLowerCase();

  // Supabase Auth (sign-in, sign-up, password reset).
  if (code === 'invalid_credentials' || s.includes('invalid login credentials')) return t.err_invalid_credentials;
  if (code === 'email_not_confirmed' || s.includes('email not confirmed')) return t.err_email_not_confirmed;
  if (code === 'weak_password' || s.includes('password should')) return t.err_weak_password;
  if (code === 'same_password' || s.includes('should be different from the old')) return t.err_same_password;
  if (code === 'email_address_invalid' || /email address .* is invalid|invalid email/.test(s)) return t.err_invalid_email;
  if (code === 'user_already_exists' || code === 'email_exists' || s.includes('already registered')) return t.err_account_exists;
  if (status === 429 || /rate.?limit|too many/.test(s)) return t.err_too_many_attempts;

  // Transport.
  if (/failed to fetch|networkerror|load failed|network request failed|timed out/.test(s)) return t.err_network;

  // Signed out underneath the page.
  if (
    status === 401 ||
    /unauthorized|not authenticated|jwt expired|invalid jwt|auth session missing|refresh token/.test(s)
  ) {
    return t.err_session_expired;
  }
  return fallback;
}
