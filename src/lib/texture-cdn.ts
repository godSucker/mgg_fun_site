const CDN_BASE = 'https://cdn.archivist-library.com';

export function textureUrl(relativePath: string): string {
  if (!relativePath) return relativePath;

  const isTexture = relativePath.includes('textures_by_mutant/');
  const clean = relativePath.startsWith('/') ? relativePath : '/' + relativePath;

  if (isTexture && CDN_BASE) {
    return CDN_BASE + clean;
  }
  return clean;
}
