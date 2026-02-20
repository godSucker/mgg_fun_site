/**
 * Search normalization utilities
 * Provides functions to normalize strings for case-insensitive and special-character-insensitive search
 */

// Latin → Cyrillic map (lowercase, applied after .toLowerCase())
// Maps ALL Latin letters to closest Cyrillic for Russian-language search
const LATIN_TO_CYRILLIC: Record<string, string> = {
  'a': 'а', 'b': 'в', 'c': 'с', 'd': 'д', 'e': 'е', 'f': 'ф',
  'g': 'г', 'h': 'х', 'i': 'и', 'j': 'й', 'k': 'к', 'l': 'л',
  'm': 'м', 'n': 'н', 'o': 'о', 'p': 'р', 'q': 'к', 'r': 'р',
  's': 'с', 't': 'т', 'u': 'у', 'v': 'в', 'w': 'в', 'x': 'х',
  'y': 'у', 'z': 'з',
};

/**
 * Normalizes a string for search matching
 * - Converts to lowercase
 * - Maps Latin lookalikes to Cyrillic (B→В, H→Н, etc.)
 * - Removes special characters (apostrophes, hyphens, dots, etc.)
 * - Keeps Cyrillic letters and digits
 *
 * Examples:
 * - "Bарвар" → "варвар"       (Latin B → Cyrillic в)
 * - "Д'Аратомис" → "даратомис"
 * - "Кр€з" → "крез"
 * - "H.U.M.A.N." → "нуман"
 * - "Людовик XVI" → "людовикхви"
 */
export function normalizeSearch(text: string): string {
  if (!text) return '';

  let normalized = text
    .toLowerCase()
    // Replace zero (0) with Cyrillic 'о' for fuzzy search (e.g., "Ан0малия" → "аномалия")
    .replace(/0/g, 'о')
    // Replace common problematic characters that might appear due to encoding issues
    .replace(/€/g, 'е')  // € often represents 'е'
    .replace(/‚/g, 'г')  // ‚ often represents 'г'
    .replace(/ƒ/g, 'ф')  // ƒ often represents 'ф'
    .replace(/†/g, 'а')  // † sometimes used for 'а'
    .replace(/‡/g, 'с')  // ‡ sometimes used for 'с'
    .replace(/‰/g, 'е')  // ‰ sometimes used for 'е'
    .replace(/Љ/g, 'л')  // Cyrillic replacements
    .replace(/Њ/g, 'н')
    .replace(/Ћ/g, 'т')
    .replace(/Ќ/g, 'к')
    .replace(/Ў/g, 'у')
    .replace(/Џ/g, 'ч')
    .replace(/ђ/g, 'д')
    .replace(/ѓ/g, 'г')
    .replace(/ѕ/g, 'п')
    .replace(/ј/g, 'я')
    .replace(/і/g, 'и')
    .replace(/ї/g, 'и')
    .replace(/љ/g, 'л')
    .replace(/њ/g, 'н')
    .replace(/ћ/g, 'м')
    .replace(/ќ/g, 'о')
    .replace(/ў/g, 'у')
    .replace(/џ/g, 'ж')
    .replace(/Ѓ/g, 'г')
    .replace(/Ѕ/g, 'з')
    .replace(/Ј/g, 'й')
    .replace(/І/g, 'и')
    .replace(/Ї/g, 'и')
    .replace(/Ў/g, 'у')
    .replace(/Џ/g, 'ч')
    // Remove special symbols/punctuation that shouldn't affect search
    .replace(/[«»"''„"']/g, '')  // Remove quotes and apostrophes
    .replace(/[.,;:!?$]/g, '')  // Remove punctuation
    .replace(/[()\[\]{}]/g, '') // Remove brackets
    .replace(/[-–—/\\]/g, ''); // Remove hyphens, dashes, slashes

  // Remove everything that's not a letter or digit
  normalized = normalized.replace(/[^\w\u0400-\u04FF]/g, '');

  // Map Latin lookalikes to Cyrillic (handles mixed Latin/Cyrillic names)
  let result = '';
  for (const ch of normalized) {
    result += LATIN_TO_CYRILLIC[ch] || ch;
  }

  return result;
}

/**
 * Checks if a search query matches a target string
 * Both strings are normalized before comparison
 */
export function matchesSearch(query: string, target: string): boolean {
  if (!query.trim()) return true;
  return normalizeSearch(target).includes(normalizeSearch(query));
}

/**
 * For backward compatibility - alias for normalizeSearch
 * Originally used in breeding.ts
 */
export function normalizeName(name: string): string {
  return normalizeSearch(name);
}
