import { PLATFORM_FEE_BPS, PLATFORM_FEE_FIXED_CENTS } from '@/lib/constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(d);
}

/**
 * Format a person's name with proper Title Case (first letter of each word
 * uppercase, rest lowercase). Handles the messy input we get from real users:
 *   "WAFAE ELALAOUI" → "Wafae Elalaoui"
 *   "yassine ichchou" → "Yassine Ichchou"
 *   "Marie-Claire DUPONT" → "Marie-Claire Dupont"
 *   "" or null → ""
 *
 * Particles like "el", "le", "de" are kept lowercase except at the start —
 * this matches FR/Arab name conventions ("Wafae El Alaoui" stays as-is,
 * but "El Mansouri" at the start gets capitalized).
 */
const PARTICLES = new Set(['el', 'le', 'la', 'les', 'de', 'du', 'des', 'da', 'di', 'van', 'von', 'der', 'al']);

export function formatName(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  // Title Case every word, including particles (El, Le, De…).
  // Hyphens inside a word are preserved: "marie-claire" → "Marie-Claire".
  return trimmed
    .split(/\s+/)
    .map((word) =>
      word
        .split('-')
        .map((part) => {
          if (!part) return part;
          const lower = part.toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join('-')
    )
    .join(' ');
}

/**
 * Initial letter of a name, always uppercase. Falls back to '·' if missing.
 */
export function nameInitial(name: string | null | undefined): string {
  if (!name) return '·';
  const trimmed = name.trim();
  if (!trimmed) return '·';
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Public-facing display name: first name + first letter of last name.
 * Protects users from being doxxed by search engines / social media lookups.
 *
 *   "wafae el alaoui" → "Wafae E."
 *   "YASSINE ICHCHOU" → "Yassine I."
 *   "Marie" → "Marie"
 *   "" or null → ""
 *
 * Use this EVERYWHERE that shows another user's name. Only show the full
 * name in the user's OWN profile/settings page (where they see themselves).
 */
export function displayName(name: string | null | undefined): string {
  const formatted = formatName(name);
  if (!formatted) return '';
  const parts = formatted.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '';
  // First name as-is, then ONE single initial from whatever follows.
  // For names with particles ("Wafae El Alaoui"), the initial comes from the
  // first non-first-name word — typically the family-name particle "E." which
  // is short and readable. We deliberately don't show every initial ("E. A.")
  // because that gives away too much identity for online searches.
  const first = parts[0];
  const initial = parts[1].charAt(0).toUpperCase();
  return `${first} ${initial}.`;
}
/**
 * Jibly fee model.
 * Traveler sets a price (e.g. 50€) — that's what they receive.
 * Sender pays that price PLUS the service fee on top.
 *
 * Derived from PLATFORM_FEE_BPS rather than written out, so this and
 * splitAmount() (which inverts it at payout time) can never disagree again.
 */
export const JIBLY_FEE_RATE = PLATFORM_FEE_BPS / 10000;
export const JIBLY_FEE_FIXED = PLATFORM_FEE_FIXED_CENTS / 100;

export type PriceBreakdown = {
  traveler: number;
  fees: number;
  total: number;
};

/**
 * What the sender pays for a trip priced at `travelerEuros`.
 *
 * Percentage PLUS a flat amount, because Stripe's fee has a flat part too —
 * see PLATFORM_FEE_FIXED_CENTS. splitAmount() is the exact inverse of this and
 * must stay so: the traveler receives `traveler`, not a percentage of `total`.
 */
export function priceBreakdown(travelerEuros: number): PriceBreakdown {
  const fees =
    Math.round(travelerEuros * JIBLY_FEE_RATE * 100) / 100 + JIBLY_FEE_FIXED;
  return {
    traveler: travelerEuros,
    fees,
    total: travelerEuros + fees,
  };
}

/**
 * Given what the SENDER pays, what does the traveler receive?
 *
 * The client-side mirror of splitAmount() — which lives in lib/stripe/connect
 * and can't be imported into a component, since it pulls in the service-role
 * Supabase client. Both must stay the exact inverse of priceBreakdown().
 *
 * This existed as `price / 1.15` written out in two components, which was
 * already the wrong shape once the commission gained a flat part, and was the
 * kind of duplication that let the payout and the checkout disagree in the
 * first place.
 */
export function travelerNetFromTotal(totalEuros: number): number {
  const cents = Math.round(totalEuros * 100);
  const afterFlat = Math.max(0, cents - PLATFORM_FEE_FIXED_CENTS);
  return (
    Math.round((afterFlat * 10000) / (10000 + PLATFORM_FEE_BPS)) / 100
  );
}

/**
 * Format euro amount with French decimal separator.
 */
export function formatEuros(amount: number): string {
  if (Number.isInteger(amount)) return `${amount}€`;
  return `${amount.toFixed(2).replace('.', ',')}€`;
}

/**
 * What a traveler ticked they were willing to carry on a given trip.
 *
 * Stored two ways for historical reasons: a real column, and a JSON blob in
 * `notes` for trips created before the column existed. Reading both means an
 * older trip doesn't silently look like "accepts nothing", which would put a
 * warning on every request it receives.
 *
 * An empty result means "not specified", not "accepts nothing" — callers must
 * treat it as no signal rather than as a refusal.
 */
export function acceptedCategories(trip: {
  accepted_categories?: string[] | null;
  notes?: string | null;
}): string[] {
  if (Array.isArray(trip.accepted_categories) && trip.accepted_categories.length) {
    return trip.accepted_categories;
  }
  if (!trip.notes) return [];
  try {
    const parsed = JSON.parse(trip.notes);
    if (Array.isArray(parsed?.accepted_categories)) return parsed.accepted_categories;
  } catch {
    /* notes is free text on older trips, not JSON */
  }
  return [];
}
