import skins from '@/data/mutants/skins.json';
import normal from '@/data/mutants/normal.json';

const CDN_BASE = 'https://static.kobojo.com/mutants/v4/';

type SkinEntry = (typeof skins)['specimens'][number];
type NormalEntry = (typeof normal)[number];

const textureMap = new Map<string, string>();

const toCdnUrl = (path: string) => {
  const cleaned = path.startsWith('/') ? path.slice(1) : path;
  return `${CDN_BASE}${cleaned}`;
};

const canonicalizeId = (id: string): string => {
  const trimmed = id?.trim();
  if (!trimmed) return '';
  const withoutPrefix = trimmed.replace(/^Specimen_/i, '').replace(/^specimen_/i, '');
  return `Specimen_${withoutPrefix.toUpperCase()}`;
};

const registerTexture = (rawId: string, image?: string[] | null) => {
  if (!rawId || !image?.length) return;
  const preferred = image.find((entry) => typeof entry === 'string' && /specimen/i.test(entry));
  const [first, second] = image;
  const path = preferred ?? second ?? first;
  if (!path) return;
  const canonical = canonicalizeId(rawId);
  if (!canonical || textureMap.has(canonical)) return;
  textureMap.set(canonical, toCdnUrl(path));
};

for (const specimen of skins.specimens as SkinEntry[]) {
  registerTexture(specimen.id, specimen.image ?? null);
}

for (const specimen of normal as NormalEntry[]) {
  if (specimen.type === 'GACHA') {
    registerTexture(specimen.id, specimen.image ?? null);
  }
}

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
