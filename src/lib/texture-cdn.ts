const CDN_BASE = 'https://cdn.archivist-library.com';

const SKIP_PREFIXES = ['/api/', '/_astro/'];

export function textureUrl(relativePath: string): string {
  if (!relativePath) return relativePath;
  if (relativePath.startsWith('http')) return relativePath;

  const clean = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
  if (SKIP_PREFIXES.some(p => clean.startsWith(p))) return clean;

  return CDN_BASE + clean;
}
