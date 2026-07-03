// Safety & compliance helpers for the shipping flow. The goal is to protect
// the traveler: no opaque, suspicious or poorly-described items. Everything
// here is front-end guidance (warn / require confirmation) — it never moves
// money or bypasses the server checks.

// Lowercase + strip accents so matching is robust to "Médicaments"/"medicaments".
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

// Descriptions too vague to tell the traveler what they're actually carrying.
// A description that is ONLY one of these (or shorter than a few chars) is
// rejected. "médicaments" alone is vague — the sender must say which one.
export const VAGUE_DESCRIPTIONS = [
  'colis', 'petit colis', 'affaires', 'affaire', 'trucs', 'truc', 'medicaments',
  'medicament', 'cadeau', 'cadeaux', 'produit', 'produits', 'chose', 'choses',
  'objet', 'objets', 'paquet', 'divers',
];

// A description is vague if it's empty/too short, or reduces to a single vague
// word once punctuation is stripped.
export function isVagueDescription(text: string): boolean {
  const t = normalizeText(text).replace(/[.!?,;:]/g, '').trim();
  if (t.length < 4) return true;
  return VAGUE_DESCRIPTIONS.includes(t);
}

// Prohibited — never allowed on the platform.
export const PROHIBITED_ITEMS = [
  'Espèces et argent liquide',
  'Drogues et stupéfiants',
  'Armes',
  'Produits dangereux (inflammables, explosifs…)',
  'Animaux',
  'Objets volés',
  'Produits contrefaits',
  'Substances inconnues',
  'Colis fermés ou scellés que le voyageur ne peut pas ouvrir',
];

// Sensitive — allowed but require caution (regulated, valuable or fragile).
export const SENSITIVE_ITEMS = [
  'Médicaments',
  'Ordonnances',
  'Passeports',
  "Cartes d'identité",
  'Bijoux',
  'Montres de luxe',
  'Appareils électroniques avec batterie',
  'Alcool',
  'Tabac',
  'Compléments alimentaires',
  'Cosmétiques en grande quantité',
];

// Free-text keywords that should trigger a caution (not a hard block).
export const RISK_KEYWORDS = [
  'cash', 'argent', 'espece', 'especes', 'passeport', "carte d'identite",
  'identite', 'bijou', 'bijoux', 'montre', 'luxe', 'ferme', 'scelle', 'scellee',
  'liquide', 'poudre', 'batterie', 'complement', 'tabac', 'alcool',
];

// Returns the distinct risk keywords found in a free-text field.
export function detectRiskKeywords(text: string): string[] {
  const t = normalizeText(text);
  const found = RISK_KEYWORDS.filter((k) => t.includes(normalizeText(k)));
  return Array.from(new Set(found));
}

// Report reasons offered to a traveler who flags a problem with an item.
export const REPORT_REASONS = [
  'object_mismatch',   // objet différent de la description
  'sealed',            // objet fermé / impossible à inspecter
  'suspicious',        // comportement suspect
  'hide_request',      // demande de cacher l'objet
  'prohibited',        // objet interdit ou sensible
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
