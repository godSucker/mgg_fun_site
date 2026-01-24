/**
 * Search normalization utilities
 * Provides functions to normalize strings for case-insensitive and special-character-insensitive search
 */

/**
 * Normalizes a string for search matching
 * - Converts to lowercase
 * - Removes special characters (apostrophes, hyphens, dots, etc.)
 * - Keeps alphanumeric characters and Cyrillic letters
 *
 * Examples:
 * - "Д'Аратомис" → "даратомис"
 * - "Крутой-мутант" → "крутойmутант"
 * - "test.123" → "test123"
 */
export function normalizeSearch(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
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
