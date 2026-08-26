/**
 * Countries a traveler's bank account can be in for us to pay them.
 *
 * This is NARROWER than the Dashboard's onboarding country list, and
 * deliberately so. Stripe will happily create a connected account in, say, the
 * UAE or Japan — but our platform is UK-registered, and cross-border transfers
 * only work within the UK, EEA, Switzerland, US and Canada. Anywhere else fails
 * with capability_not_available_in_country, AFTER the traveler has chosen a
 * country that can never be changed.
 *
 * So this list is the transfer zone, not the account-creation zone. If the
 * platform's own country ever changes, the zone changes with it.
 *
 * Notably absent: MOROCCO, a core Jibly corridor. Stripe doesn't operate there
 * at all. A Morocco-resident traveler needs an account in one of these
 * countries — typically a French one, which many France-based travelers on that
 * route already have.
 */
export const PAYOUT_COUNTRIES = [
  // EEA
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU',
  'LV', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
  // Plus the rest of the cross-border transfer zone
  'CA', 'CH', 'GB', 'US',
] as const;

/**
 * Is this country one we can pay into? Returns null — not false — when the
 * country is unknown or unmappable, so callers can tell "we know this won't
 * work" apart from "we have no idea", and only hard-block on the former.
 */
export function isPayoutCountry(code: string | null | undefined): boolean | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return null;
  return (PAYOUT_COUNTRIES as readonly string[]).includes(upper);
}

/**
 * Localised country names for display, sorted alphabetically in the target
 * locale. Uses Intl rather than a hand-maintained translation table — 32
 * country names in every locale is exactly the sort of list that rots.
 */
export function payoutCountryOptions(
  locale: string
): { code: string; name: string }[] {
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    display = null;
  }
  return PAYOUT_COUNTRIES.map((code) => ({
    code,
    name: display?.of(code) ?? code,
  })).sort((a, b) => a.name.localeCompare(b.name, locale));
}

export function payoutCountryNames(locale: string): string[] {
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    // Unsupported locale: fall back to raw codes rather than rendering nothing.
    return [...PAYOUT_COUNTRIES];
  }
  return PAYOUT_COUNTRIES.map((c) => display!.of(c) ?? c).sort((a, b) =>
    a.localeCompare(b, locale)
  );
}
