// =============================================================================
// What counts as an open dispute
// =============================================================================
// This file exists because the answer was written down twice and one copy was
// wrong. /api/cron/auto-release excluded `("resolved","dismissed")` — two
// statuses this product has never had. The real terminal states are
// resolved_for_reporter, resolved_for_reported and closed, so the exclusion
// list excluded nothing, and a booking that had ever been disputed could never
// auto-close again no matter how the argument ended.
//
// That mistake was invisible: it fails in the safe direction (money stays put)
// and only shows up as a traveller who is never paid, weeks later, with no
// error anywhere. The same list now decides whether a payout may leave
// (lib/stripe/payout.ts), where the cost of a stale copy is the same silence.
// So there is one of it.
//
// The statuses themselves live in the database schema (08_trust_and_safety.sql,
// which is not in this repo) and are mirrored by the `Dispute` type in
// lib/supabase/queries.ts. If a status is added there, add it here too and
// decide deliberately which side it falls on.

export const DISPUTE_LIVE_STATUSES = ['open', 'investigating'] as const;

/**
 * Nobody is arguing any more. An operator has reached a decision, or the
 * report was closed without one.
 */
export const DISPUTE_SETTLED_STATUSES = [
  'resolved_for_reporter',
  'resolved_for_reported',
  'closed',
] as const;

export type DisputeStatus =
  | (typeof DISPUTE_LIVE_STATUSES)[number]
  | (typeof DISPUTE_SETTLED_STATUSES)[number];

/**
 * The settled list in the form PostgREST's `in` filter expects: `("a","b")`.
 *
 * Built from the array rather than written out, so the two cannot drift — that
 * drift is the whole reason this file exists.
 *
 * Used as `.not('status', 'in', DISPUTE_SETTLED_FILTER)`, which reads "not
 * settled" rather than "is open" on purpose: a status added to the schema and
 * forgotten here should hold the money, not release it.
 */
export const DISPUTE_SETTLED_FILTER = `(${DISPUTE_SETTLED_STATUSES.map(
  (s) => `"${s}"`
).join(',')})`;

/**
 * Same question as the filter, asked of a row already in hand.
 *
 * Widened to `string` deliberately: the caller has a value that came back from
 * the database, which is not necessarily one this build knows about, and the
 * honest answer for an unrecognised status is "not settled".
 */
export function isDisputeSettled(status: string | null | undefined): boolean {
  return !!status && (DISPUTE_SETTLED_STATUSES as readonly string[]).includes(status);
}
