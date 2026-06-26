#!/usr/bin/env node
/**
 * Upscale specimen (head) mutant textures using Sharp.
 * Processes all specimen_*.webp files in public/textures_by_mutant/
 * and outputs upscaled versions (2x, lanczos3) to public/textures_by_mutant_upscaled/
 * 
 * Usage: node scripts/upscale-specimens.js [--apply]
 *   --apply  overwrites original files in-place (backup first!)
 */

import { readdir, stat, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import sharp from 'sharp';

const SRC_DIR = join(import.meta.dirname, '..', 'public', 'textures_by_mutant');
const OUT_DIR = join(import.meta.dirname, '..', 'public', 'textures_by_mutant_upscaled');
const SCALE = 2;
const KERNEL = sharp.kernel.lanczos3;

async function findSpecimenFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await findSpecimenFiles(full);
      results.push(...sub);
    } else if (entry.name.startsWith('specimen_') && entry.name.endsWith('.webp')) {
      results.push(full);
    }
  }
  return results;
}

async function upscaleFile(src, out) {
  const meta = await sharp(src).metadata();
  const newW = Math.round(meta.width * SCALE);
  const newH = Math.round(meta.height * SCALE);
  
  await sharp(src)
    .resize(newW, newH, { kernel: KERNEL })
    .webp({ quality: 90 })
    .toFile(out);
    
  return { w: meta.width, h: meta.height, newW, newH };
}

async function main() {
  const applyMode = process.argv.includes('--apply');
  
  console.log('Finding specimen files...');
  const files = await findSpecimenFiles(SRC_DIR);
  console.log(`Found ${files.length} specimen files to upscale`);
  
  if (!applyMode) {
    // Dry run — upscale to out dir
    await mkdir(OUT_DIR, { recursive: true });
    
    let done = 0;
    for (const file of files) {
      const rel = file.replace(SRC_DIR + '/', '');
      const outPath = join(OUT_DIR, rel);
      const outDir = join(outPath, '..');
      await mkdir(outDir, { recursive: true });
      
      try {
        const info = await upscaleFile(file, outPath);
        done++;
        if (done % 50 === 0) console.log(`  ${done}/${files.length}...`);
      } catch (e) {
        console.error(`  FAIL: ${rel} — ${e.message}`);
      }
    }
    console.log(`\nDone! ${done}/${files.length} files upscaled to ${OUT_DIR}`);
    console.log('Run with --apply to overwrite originals');
  } else {
    // Apply mode — upscale in-place (temp file + rename)
    let done = 0;
    for (const file of files) {
      const tmp = file + '.upscaled.tmp';
      try {
        const info = await upscaleFile(file, tmp);
        // Rename tmp → original
        const { rename } = await import('fs/promises');
        await rename(tmp, file);
        done++;
        if (done % 50 === 0) console.log(`  ${done}/${files.length}...`);
      } catch (e) {
        console.error(`  FAIL: ${file} — ${e.message}`);
        // cleanup tmp
        try { await import('fs/promises').then(fs => fs.unlink(tmp)); } catch {}
      }
    }
    console.log(`\nDone! ${done}/${files.length} files upscaled in-place`);
  }
}

main().catch(console.error);
