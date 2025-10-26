import skins from '@/data/mutants/skins.json';

const CDN_BASE = 'https://static.kobojo.com/mutants/v4/';

type SkinEntry = (typeof skins)['specimens'][number];

const textureMap: Record<string, string | null> = Object.create(null);

for (const specimen of skins.specimens as SkinEntry[]) {
  const [full, semi] = specimen.image ?? [];
  const path = semi ?? full;
  if (path) {
    const cleaned = path.startsWith('/') ? path.slice(1) : path;
    textureMap[specimen.id] = `${CDN_BASE}${cleaned}`;
  } else {
    textureMap[specimen.id] = null;
  }
}

export function getSpecimenTexture(specimenId: string): string | null {
  return textureMap[specimenId] ?? null;
}

export function getSpecimenTextures(ids: Iterable<string>): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const id of ids) {
    result[id] = getSpecimenTexture(id);
  }
  return result;
}
