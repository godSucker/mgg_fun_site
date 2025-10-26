import { promises as fs } from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const publicDir = path.join(projectRoot, 'public');
const mutantDir = path.join(publicDir, 'textures_by_mutant');
const skinsDir = path.join(publicDir, 'textures_by_skins', 'textures_by_skin');
const outputDir = path.join(projectRoot, 'src', 'data', 'simulators', 'reactor');

const SKIN_VARIANT_PRIORITY = new Map([
  ['', 0],
  ['normal', 1],
  ['default', 1],
  ['basic', 1],
  ['classic', 2],
  ['gachaboss', 2],
]);

const toCanonicalId = (raw) => {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const withoutPrefix = trimmed.replace(/^Specimen_/i, '').replace(/^specimen_/i, '');
  if (!withoutPrefix) return null;
  const parts = withoutPrefix
    .split(/[_\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  return `Specimen_${parts.map((part) => part.toUpperCase()).join('_')}`;
};

const toBaseId = (raw) => {
  const canonical = toCanonicalId(raw);
  if (!canonical) return null;
  const [, rest = ''] = canonical.split('Specimen_');
  if (!rest) return null;
  const segments = rest.split('_').filter(Boolean);
  if (!segments.length) return null;
  if (segments.length === 1) {
    return `Specimen_${segments[0]}`;
  }
  return `Specimen_${segments[0]}_${segments[1]}`;
};

const getVariantPriority = (variant) => {
  if (!variant) return 0;
  const clean = variant.replace(/^_/, '').toLowerCase();
  const [head] = clean.split('_');
  if (SKIN_VARIANT_PRIORITY.has(head)) {
    return SKIN_VARIANT_PRIORITY.get(head);
  }
  return 5;
};

async function findFiles(startDir, predicate) {
  const found = [];
  const entries = await fs.readdir(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findFiles(fullPath, predicate);
      found.push(...nested);
    } else if (entry.isFile() && predicate(entry.name)) {
      found.push(fullPath);
    }
  }
  return found;
}

async function collectSkinTextures() {
  const candidateMap = new Map();
  try {
    await fs.access(skinsDir);
  } catch {
    return new Map();
  }

  const textureFiles = await findFiles(skinsDir, (name) => /\.(png|jpg|jpeg|webp)$/i.test(name));
  for (const absPath of textureFiles) {
    const fileName = path.basename(absPath);
    const specimenMatch = fileName.match(/^specimen_([a-z0-9]+_[0-9]+)(.*)\.(png|jpg|jpeg|webp)$/i);
    const bareMatch = fileName.match(/^([a-z]{1,3}_[0-9]{2,})(.*)\.(png|jpg|jpeg|webp)$/i);
    const match = specimenMatch ?? bareMatch;
    if (!match) continue;
    const idSegment = specimenMatch ? match[1] : `Specimen_${match[1]}`;
    const baseId = toBaseId(idSegment);
    if (!baseId) continue;
    const variant = match[2] ?? '';
    const relPath = path.relative(publicDir, absPath).replace(/\\/g, '/');
    const sourcePriority = relPath.includes('/full-char/') ? 0 : relPath.includes('/semi-full/') ? 1 : 2;
    const entry = {
      path: `/${relPath}`,
      sourcePriority,
      variantPriority: getVariantPriority(variant),
      variantLength: variant.length,
      fileName: fileName.toLowerCase(),
    };
    const list = candidateMap.get(baseId) ?? [];
    list.push(entry);
    candidateMap.set(baseId, list);
  }

  const result = new Map();
  for (const [id, entries] of candidateMap.entries()) {
    entries.sort((a, b) =>
      a.sourcePriority - b.sourcePriority ||
      a.variantPriority - b.variantPriority ||
      a.variantLength - b.variantLength ||
      a.fileName.localeCompare(b.fileName)
    );
    result.set(id, entries[0].path);
  }
  return result;
}

async function collectMutantTextures() {
  const map = new Map();
  const metaFiles = await findFiles(mutantDir, (name) => name === 'meta.json');
  for (const metaPath of metaFiles) {
    const data = JSON.parse(await fs.readFile(metaPath, 'utf8'));
    const canonical = toCanonicalId(data.id ?? data.code ?? null);
    if (!canonical) continue;
    if (map.has(canonical)) continue;
    const preferred = pickPreferred(data.found_files ?? []);
    let targetPath = preferred?.dst;
    if (!targetPath) {
      const dir = path.dirname(metaPath);
      const entries = await fs.readdir(dir);
      const specimen = entries.find((entry) => entry.toLowerCase().startsWith('specimen_'));
      if (specimen) {
        targetPath = path.relative(publicDir, path.join(dir, specimen));
      }
    }
    if (!targetPath) continue;
    map.set(canonical, `/${targetPath.replace(/\\/g, '/')}`);
  }
  return map;
}

function pickPreferred(files) {
  if (!files?.length) return null;
  const normalized = files
    .map((file) => ({ ...file, lower: file.filename?.toLowerCase?.() ?? '' }))
    .filter((file) => file.filename);
  if (!normalized.length) return null;
  const markers = ['_normal', '_default', '_basic', '_gold', '_silver', '_bronze'];
  for (const marker of markers) {
    const match = normalized.find((file) => file.lower.includes(marker));
    if (match) return match;
  }
  const specimenFile = normalized.find((file) => file.lower.startsWith('specimen_'));
  if (specimenFile) return specimenFile;
  return normalized[0];
}

async function main() {
  const [skinMap, mutantMap] = await Promise.all([
    collectSkinTextures(),
    collectMutantTextures(),
  ]);

  const sortedSkin = Object.fromEntries([...skinMap.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const sortedMutant = Object.fromEntries([...mutantMap.entries()].sort(([a], [b]) => a.localeCompare(b)));

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputDir, 'skin-textures.json'), `${JSON.stringify(sortedSkin, null, 2)}\n`),
    fs.writeFile(path.join(outputDir, 'mutant-textures.json'), `${JSON.stringify(sortedMutant, null, 2)}\n`),
  ]);

  console.log(
    `Wrote ${Object.keys(sortedSkin).length} skin textures and ${Object.keys(sortedMutant).length} mutant textures.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
