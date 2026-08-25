/**
 * Countries where a traveler can be onboarded to receive payouts.
 *
 * This mirrors Connect → Settings → Onboarding options → Countries in the
 * Stripe Dashboard. It is NOT a Jibly policy choice: Stripe simply does not
 * offer connected accounts anywhere else, so a traveler banking outside this
 * list cannot be paid through the platform at all.
 *
 * Notably absent: MOROCCO. Stripe does not operate there in any form, which
 * matters because Morocco is a core Jibly corridor. A Morocco-resident
 * traveler needs a bank account in one of the countries below — typically a
 * French one, which many France-based travelers on this route already have.
 *
 * Keep this in sync by hand if you change the selection in the Dashboard.
 * Divergence fails late and confusingly: the traveler gets all the way to
 * Stripe's form before being turned away.
 */
export const PAYOUT_COUNTRIES = [
  'AE', 'AT', 'AU', 'BE', 'BG', 'CA', 'CH', 'CY', 'CZ', 'DE',
  'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GI', 'GR', 'HK', 'HR',
  'HU', 'IE', 'IT', 'JP', 'LI', 'LT', 'LU', 'LV', 'MT', 'MX',
  'NL', 'NO', 'NZ', 'PL', 'PT', 'RO', 'SE', 'SG', 'SI', 'SK',
  'TH', 'US',
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
