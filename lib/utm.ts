// Where a visitor came from — the utm_* tags on the link they first opened
// (an influencer's Instagram link, say). Kept in this browser until they sign
// up, then saved on their account as signup_source so the admin can count the
// signups and bookings each campaign brought.
//
// First touch wins: a later visit with other tags does not overwrite it, so
// the person who brought them keeps the credit. Kept 60 days.

export type SignupSource = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  landing: string | null;
  at: string;
};

const KEY = 'jibly_utm';
const MAX_AGE_MS = 60 * 86_400_000;

function clean(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim().toLowerCase().slice(0, 80);
  return s || null;
}

/** Call on page load: remembers the utm tags of the URL, if any. */
export function captureUtm(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const source = clean(params.get('utm_source'));
    const campaign = clean(params.get('utm_campaign'));
    if (!source && !campaign) return;
    if (readUtm()) return; // first touch wins
    const value: SignupSource = {
      source,
      medium: clean(params.get('utm_medium')),
      campaign,
      landing: window.location.pathname.slice(0, 200),
      at: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {}
}

/** The remembered tags, or null when none (or too old). */
export function readUtm(): SignupSource | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as SignupSource;
    if (!v?.at || Date.now() - new Date(v.at).getTime() > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return v;
  } catch {
    return null;
  }
}
