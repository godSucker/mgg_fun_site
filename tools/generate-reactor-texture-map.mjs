import { promises as fs } from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const publicDir = path.join(projectRoot, 'public');
const mutantDir = path.join(publicDir, 'textures_by_mutant');
const skinsDir = path.join(publicDir, 'textures_by_skins', 'textures_by_skin');
const outputPath = path.join(projectRoot, 'src', 'data', 'simulators', 'reactor', 'texture-map.json');

const PRIORITY_ORDER = [
  '_normal',
  '_default',
  '_basic',
  '_bronze',
  '_silver',
  '_gold',
  '_platinum',
];

const VARIANT_SUFFIX_RE = /_(?:normal|bronze|silver|gold|platinum)(?:_[a-z0-9]+)?$/i;

function toCanonicalId(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const withoutPrefix = trimmed.replace(/^Specimen_/i, '').replace(/^specimen_/i, '');
  if (!withoutPrefix) return null;
  return `Specimen_${withoutPrefix
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.toUpperCase())
    .join('_')}`;
}

function pickPreferred(files) {
  if (!files?.length) return null;
  const normalized = files
    .map((file) => ({ ...file, lower: file.filename?.toLowerCase?.() ?? '' }))
    .filter((file) => file.filename);
  if (!normalized.length) return null;
  for (const marker of PRIORITY_ORDER) {
    const match = normalized.find((file) => file.lower.includes(marker));
    if (match) return match;
  }
  const specimenFile = normalized.find((file) => file.lower.startsWith('specimen_'));
  if (specimenFile) return specimenFile;
  return normalized[0];
}

async function collectMutantTextures() {
  const map = new Map();
  const metaFiles = await findFiles(mutantDir, 'meta.json');
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

async function collectSkinTextures(map) {
  try {
    await fs.access(skinsDir);
  } catch {
    return map;
  }
  const textureFiles = await findAllTextureFiles(skinsDir);
  for (const absPath of textureFiles) {
    const fileName = path.basename(absPath);
    const match = fileName.match(/^specimen_([a-z0-9_]+)\.(png|jpg|jpeg|webp)$/i);
    if (!match) continue;
    const slug = match[1];
    const baseMatch = slug.match(/^([a-z0-9]+_[0-9]+)(.*)$/i);
    const suffix = baseMatch?.[2] ?? '';
    if (!suffix || VARIANT_SUFFIX_RE.test(suffix)) {
      // Skip default tier variants — базовые варианты уже покрыты из каталога мутантов
      continue;
    }
    const canonical = toCanonicalId(slug);
    if (!canonical || map.has(canonical)) continue;
    const relPath = path.relative(publicDir, absPath).replace(/\\/g, '/');
    map.set(canonical, `/${relPath}`);
  }
  return map;
}

async function findFiles(startDir, fileName) {
  const found = [];
  const entries = await fs.readdir(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findFiles(fullPath, fileName);
      found.push(...nested);
    } else if (entry.isFile() && entry.name === fileName) {
      found.push(fullPath);
    }
  }
  return found;
}

async function findAllTextureFiles(startDir) {
  const found = [];
  const entries = await fs.readdir(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findAllTextureFiles(fullPath);
      found.push(...nested);
    } else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
        found.push(fullPath);
      }
    }
  }
  return found;
}

async function main() {
  const map = await collectMutantTextures();
  await collectSkinTextures(map);
  const sorted = Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(sorted).length} textures to ${path.relative(projectRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
