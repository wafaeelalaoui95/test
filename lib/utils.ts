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

  // Split on whitespace AND keep hyphens internal to each word
  return trimmed
    .split(/\s+/)
    .map((word, wordIdx) =>
      word
        .split('-')
        .map((part, partIdx) => {
          if (!part) return part;
          const lower = part.toLowerCase();
          // Particles in the middle of a name stay lowercase
          // (but the first word of the whole name is always capitalised)
          if (wordIdx > 0 && partIdx === 0 && PARTICLES.has(lower)) {
            return lower;
          }
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
