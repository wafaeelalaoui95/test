import { createHmac, timingSafeEqual } from 'crypto';
import { getSiteUrl } from '@/lib/site-url';

// =============================================================================
// Unsubscribe links for e-mails sent to every member (lib/broadcast.ts)
// =============================================================================
// The link carries the user id and an HMAC of it, so it works without signing
// in and nobody can unsubscribe someone else by changing the id. Server only.
//
// The secret is UNSUBSCRIBE_SECRET if set, otherwise derived from the service
// role key (already server-only). Changing either invalidates old links, which
// only means an old e-mail's link stops working, nothing worse.

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No secret for unsubscribe links');
  return `jibly-unsubscribe:${s}`;
}

export function unsubscribeToken(userId: string): string {
  return createHmac('sha256', secret()).update(userId).digest('base64url');
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  if (!userId || !token) return false;
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** The page a person lands on from the e-mail (asks them to confirm). */
export function unsubscribePageUrl(userId: string): string {
  return `${getSiteUrl()}/desabonnement?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}

/** For the List-Unsubscribe header: mail apps POST here directly (one click). */
export function unsubscribeApiUrl(userId: string): string {
  return `${getSiteUrl()}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}
