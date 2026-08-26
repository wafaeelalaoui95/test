/**
 * The one place that decides what URL Jibly calls itself.
 *
 * This string ends up in customer-facing places that are hard to take back:
 * links in emails, Stripe's "return to Jibly" button, the canonical URL and
 * share previews, robots.txt and the sitemap. A wrong value here doesn't throw
 * — it quietly shows customers a vercel.app address and invites Google to index
 * it.
 *
 * Production is therefore pinned to the real domain. A deployment URL is only
 * honoured on previews, where it is genuinely the right answer.
 */
export const CANONICAL_SITE_URL = 'https://jibly.io';

export function getSiteUrl(): string {
  const configured = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ''
  ).trim();

  if (!configured) return CANONICAL_SITE_URL;

  const normalised = configured.replace(/\/+$/, '');

  // On a preview deployment the generated *.vercel.app host is correct — it's
  // where that build actually lives, and Stripe has to return the user there.
  if (process.env.VERCEL_ENV !== 'production') return normalised;

  // In production it never is. Someone leaving the deployment URL in the
  // environment shouldn't be able to put it in front of customers.
  try {
    if (new URL(normalised).hostname.endsWith('.vercel.app')) {
      console.warn(
        `[site-url] ignoring ${normalised} in production; using ${CANONICAL_SITE_URL}`
      );
      return CANONICAL_SITE_URL;
    }
  } catch {
    // Not a parseable URL — fall back rather than emit something malformed.
    return CANONICAL_SITE_URL;
  }

  return normalised;
}
