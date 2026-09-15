import { FORBIDDEN_CATEGORIES } from '@/lib/constants';
import { PROHIBITED_ITEMS } from '@/lib/safety';

// =============================================================================
// What each party swore, and against which rules
// =============================================================================
// This file exists to answer one question, possibly years from now, possibly
// from someone with a warrant: "what did Jibly do to stop its platform being
// used to move illegal goods?"
//
// A checkbox is not an answer. "The user ticked a box" is worth very little if
// nobody can say WHAT the box said on the day they ticked it, which list of
// prohibited items was in force, or what the parcel was described as at that
// moment. Descriptions get edited, policies get rewritten, translations get
// improved — and every one of those quietly rewrites the past unless the
// attestation carries its own copy.
//
// So an attestation stores the rendered sentence verbatim, the locale it was
// read in, the policy version, and a snapshot of the parcel as described at
// the time. The row is written by the server, never the browser, and is
// insert-only. See 2026-09-15-attestations.sql.

/**
 * The version of the prohibited-items policy in force.
 *
 * BUMP THIS whenever FORBIDDEN_CATEGORIES (lib/constants.ts), PROHIBITED_ITEMS
 * (lib/safety.ts) or the /objets-autorises page changes what is allowed. Old
 * attestations keep the version they were signed under, which is the point:
 * somebody who shipped in September must be judged against September's rules,
 * not against a list rewritten in November.
 *
 * Date-based rather than semantic, because the only question anyone will ever
 * ask of it is "which rules applied on the day".
 */
export const PROHIBITED_POLICY_VERSION = '2026-09-15';

/**
 * The day declarations started being collected.
 *
 * Parcels handed over before this date have none, and never will. They cannot
 * be back-filled: a declaration invented after the fact for someone who was
 * never asked is not weak evidence, it is a fabricated record, and it would
 * discredit every genuine row next to it the moment anyone looked closely.
 *
 * So the coverage check excludes them instead. A monitoring query that is
 * permanently non-empty is a query people stop reading — and this one only
 * earns its keep if a single row appearing means something is actually wrong.
 *
 * The honest answer to "why does this parcel have no declarations?" is
 * therefore a date, which is a far better answer than a forged row.
 */
export const ATTESTATIONS_REQUIRED_FROM = '2026-09-15';

/**
 * A stable fingerprint of what that version actually forbade.
 *
 * Stored alongside the version so the two cannot drift: if someone edits the
 * lists and forgets to bump the version, the digest recorded on new rows stops
 * matching the old ones and the discrepancy is visible rather than silent.
 *
 * Not cryptographic — a checksum, not a seal. It is here to catch an honest
 * mistake, not a determined forger, and the row itself is server-written and
 * insert-only which is what stops the forger.
 */
export function prohibitedPolicyDigest(): string {
  const source = [
    ...FORBIDDEN_CATEGORIES.fr,
    ...FORBIDDEN_CATEGORIES.en,
    ...PROHIBITED_ITEMS,
  ].join('|');
  let h = 0;
  for (let i = 0; i < source.length; i++) {
    h = (h * 31 + source.charCodeAt(i)) | 0;
  }
  return `${PROHIBITED_POLICY_VERSION}.${(h >>> 0).toString(16)}`;
}

export type AttestationKind = 'sender_certification' | 'traveler_inspection';
export type AttestationLocale = 'fr' | 'en';

/**
 * The exact sentences. FROZEN.
 *
 * Deliberately NOT read from lib/i18n/translations.ts. Those strings are
 * product copy: they get reworded for tone, shortened to fit a card, fixed for
 * a typo — all fine for a button, fatal for a declaration someone is held to.
 * A statement that can change under an attestation already written is not
 * evidence of anything.
 *
 * If one of these has to change, add a new version rather than editing in
 * place, and bump PROHIBITED_POLICY_VERSION so the two stay legible together.
 * The rendered text is copied onto every row anyway, so old rows survive an
 * edit here — this rule is about keeping the file honest, not about rescuing
 * the data.
 *
 * {item} is the parcel as the sender categorised it, in upper case, so the
 * declaration names the thing rather than gesturing at it.
 */
const STATEMENTS: Record<AttestationKind, Record<AttestationLocale, string>> = {
  sender_certification: {
    en:
      'I certify that this is {item}, accurately described, contains no prohibited item ' +
      'and complies with applicable customs, import and export rules.',
    fr:
      'Je certifie qu’il s’agit de {item}, décrit avec exactitude, ne contenant aucun ' +
      'objet interdit et conforme aux règles douanières, d’importation et d’exportation ' +
      'applicables.',
  },
  traveler_inspection: {
    en: 'I inspected the item and confirm it corresponds to the description.',
    fr: 'J’ai inspecté l’objet et confirme qu’il correspond à la description.',
  },
};

/**
 * Render the sentence the person is about to agree to.
 *
 * The SAME function serves the screen and the stored record, so what is filed
 * away is necessarily what was displayed. Rendering them separately is how the
 * two end up differing by a word that a lawyer then spends a day on.
 */
export function attestationStatement(
  kind: AttestationKind,
  locale: AttestationLocale,
  itemLabel?: string | null
): string {
  const template = STATEMENTS[kind][locale] ?? STATEMENTS[kind].en;
  const item = (itemLabel ?? '').trim();
  return template.replace(
    '{item}',
    item ? item.toUpperCase() : locale === 'fr' ? 'CET OBJET' : 'THIS ITEM'
  );
}
