import textureMapJson from '@/data/simulators/reactor/texture-map.json';

const textureMap = new Map(Object.entries(textureMapJson as Record<string, string>));

const canonicalizeId = (id: string): string => {
  const trimmed = id?.trim();
  if (!trimmed) return '';
  const withoutPrefix = trimmed.replace(/^Specimen_/i, '').replace(/^specimen_/i, '');
  return `Specimen_${withoutPrefix.toUpperCase()}`;
};

export function getSpecimenTexture(specimenId: string): string | null {
  if (!specimenId) return null;
  const canonical = canonicalizeId(specimenId);
  if (!canonical) return null;
  return textureMap.get(canonical) ?? null;
}

export function getSpecimenTextures(ids: Iterable<string>): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const id of ids) {
    result[id] = getSpecimenTexture(id);
  }
  return result;
}
