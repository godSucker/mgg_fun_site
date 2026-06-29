/**
 * CDN base URL for mutant textures.
 * Set VITE_CDN_BASE env var to enable CDN (e.g. https://cdn.archivist-library.com).
 * When empty, textures are served from local /textures_by_mutant/.
 */
const CDN_BASE = import.meta.env.VITE_CDN_BASE ?? '';

/**
 * Returns the full URL for a texture path.
 * Only prefixes CDN for paths containing 'textures_by_mutant/'.
 * All other paths (icons, genes, etc.) are passed through as-is.
 *
 * Input: 'textures_by_mutant/ab_01/specimen_ab_01_normal.webp'
 * With CDN: 'https://cdn.archivist-library.com/textures_by_mutant/ab_01/specimen_ab_01_normal.webp'
 * Without CDN: '/textures_by_mutant/ab_01/specimen_ab_01_normal.webp'
 */
export function textureUrl(relativePath: string): string {
  if (!relativePath) return relativePath;

  const isTexture = relativePath.includes('textures_by_mutant/');
  const clean = relativePath.startsWith('/') ? relativePath : '/' + relativePath;

  if (isTexture && CDN_BASE) {
    return CDN_BASE + clean;
  }
  return clean;
}
