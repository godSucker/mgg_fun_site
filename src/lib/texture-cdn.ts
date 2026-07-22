const CDN_BASE = 'https://cdn.archivist-library.com'

const SKIP_PREFIXES = ['/api/', '/_astro/']

// Многие хелперы иконок возвращают string | null (и вызываются под {#if}),
// поэтому textureUrl принимает и пустые значения, возвращая их как есть.
export function textureUrl(relativePath: string): string
export function textureUrl(relativePath: null | undefined): null | undefined
export function textureUrl(relativePath: string | null | undefined): string | null | undefined
export function textureUrl(relativePath: string | null | undefined): string | null | undefined {
  if (!relativePath) return relativePath
  if (relativePath.startsWith('http')) return relativePath

  const clean = relativePath.startsWith('/') ? relativePath : '/' + relativePath
  if (SKIP_PREFIXES.some((p) => clean.startsWith(p))) return clean

  return CDN_BASE + clean
}
