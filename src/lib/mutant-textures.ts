import skinTexturesJson from '@/data/simulators/reactor/skin-textures.json';
import mutantTexturesJson from '@/data/simulators/reactor/mutant-textures.json';

const skinTextureMap = new Map(Object.entries(skinTexturesJson as Record<string, string>));
const mutantTextureMap = new Map(Object.entries(mutantTexturesJson as Record<string, string>));

const canonicalizeFull = (id: string): string => {
  const trimmed = id?.trim();
  if (!trimmed) return '';
  const withoutPrefix = trimmed.replace(/^Specimen_/i, '').replace(/^specimen_/i, '');
  if (!withoutPrefix) return '';
  const parts = withoutPrefix
    .split(/[_\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return '';
  return `Specimen_${parts.map((part) => part.toUpperCase()).join('_')}`;
};

const canonicalizeBase = (id: string): string => {
  const canonical = canonicalizeFull(id);
  if (!canonical) return '';
  const [, rest = ''] = canonical.split('Specimen_');
  if (!rest) return '';
  const segments = rest.split('_').filter(Boolean);
  if (!segments.length) return '';
  if (segments.length === 1) {
    return `Specimen_${segments[0]}`;
  }
  return `Specimen_${segments[0]}_${segments[1]}`;
};

export function getSkinTexture(specimenId: string): string | null {
  if (!specimenId) return null;
  const canonical = canonicalizeBase(specimenId);
  if (!canonical) return null;
  return skinTextureMap.get(canonical) ?? null;
}

export function getMutantTexture(specimenId: string): string | null {
  if (!specimenId) return null;
  const canonical = canonicalizeFull(specimenId);
  if (!canonical) return null;
  return mutantTextureMap.get(canonical) ?? null;
}

export function getSkinTextures(ids: Iterable<string>): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const id of ids) {
    result[id] = getSkinTexture(id) ?? getMutantTexture(id);
  }
  return result;
}

export function getMutantTextures(ids: Iterable<string>): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const id of ids) {
    result[id] = getMutantTexture(id);
  }
  return result;
}
