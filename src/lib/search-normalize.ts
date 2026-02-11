/**
 * Search normalization utilities
 * Provides functions to normalize strings for case-insensitive and special-character-insensitive search
 */

/**
 * Normalizes a string for search matching
 * - Converts to lowercase
 * - Removes special characters (apostrophes, hyphens, dots, etc.)
 * - Keeps alphanumeric characters and Cyrillic letters
 * - Handles special Cyrillic encoding issues
 *
 * Examples:
 * - "Д'Аратомис" → "даратомис"
 * - "Крутой-мутант" → "крутойmутант"
 * - "test.123" → "test123"
 * - "Кр€з" → "крез"
 */
export function normalizeSearch(text: string): string {
  if (!text) return '';

  // Handle special Cyrillic character replacements before removing special characters
  let normalized = text
    .toLowerCase()
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
    .replace(/[«»"''„“]/g, '')  // Remove quotes
    .replace(/[.,;:!?]/g, '')  // Remove punctuation
    .replace(/[()\[\]{}]/g, '') // Remove brackets
    .replace(/[-–—]/g, ''); // Remove hyphens and dashes

  return normalized
    .replace(/[^\w\u0400-\u04FF]/g, ''); // Keep only word chars and Cyrillic
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
