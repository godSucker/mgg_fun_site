#!/usr/bin/env node
/**
 * AI upscaling for specimen textures using Real-ESRGAN (ncnn-vulkan).
 * 
 * Modes:
 *   --source=<dir>   Source PNG directory (default: public/textures_by_mutant)
 *   --output=<dir>   Output directory (default: same as source, overwrite)
 *   --dry-run        Preview without writing
 *   --quality=<n>    WebP quality (default: 95)
 *   --scale=<n>      Target scale factor (default: 4)
 *   --size=<n>       Target size in px (default: 512, overrides --scale)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const sharp = require('sharp');

const REAL_ESRGAN = '/tmp/realesrgan-bin/realesrgan-ncnn-vulkan';
const _MODELS_DIR = '/tmp/realesrgan-bin/models';

// Parse args
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const a = args.find(a => a.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
};
const hasFlag = (name) => args.includes(`--${name}`);

const SOURCE_DIR = getArg('source', 'public/textures_by_mutant');
const OUTPUT_DIR = getArg('output', SOURCE_DIR);
const DRY_RUN = hasFlag('dry-run');
const FORCE = hasFlag('force');
const WEBP_QUALITY = parseInt(getArg('quality', '95'), 10);
const TARGET_SIZE = parseInt(getArg('size', '400'), 10);
const MODEL = getArg('model', 'realesr-animevideov3');

if (!fs.existsSync(REAL_ESRGAN)) {
  console.error(`Real-ESRGAN not found at ${REAL_ESRGAN}`);
  console.error('Download: curl -sL https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip | unzip -d /tmp/realesrgan-bin');
  process.exit(1);
}

// Find all specimen PNGs
function findSpecimens(dir) {
  const results = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.startsWith('specimen_') && entry.name.endsWith('.webp')) {
        results.push(full);
      }
    }
  };
  walk(dir);
  return results;
}

// Pad image to target size (center, transparent bg)
async function padImage(srcPath, tmpPath, size) {
  const img = sharp(srcPath);
  const meta = await img.metadata();
  const _padX = Math.max(0, size - meta.width);
  const _padY = Math.max(0, size - meta.height);
  
  await img
    .resize(size, size, { 
      fit: 'contain', 
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'nearest' // preserve original pixels
    })
    .png()
    .toFile(tmpPath);
}

// Run Real-ESRGAN
function upscale(inputPath, outputPath, model, scale) {
  const result = spawnSync(REAL_ESRGAN, [
    '-i', inputPath,
    '-o', outputPath,
    '-n', model,
    '-s', String(scale),
    '-f', 'png'
  ], { 
    timeout: 30000,
    stdio: 'pipe'
  });
  return result.status === 0;
}

// Convert PNG to WebP
async function toWebP(srcPath, dstPath, quality) {
  await sharp(srcPath)
    .webp({ quality, effort: 4 })
    .toFile(dstPath);
}

// Generate thumbnail
async function makeThumbnail(srcPath, dstPath) {
  await sharp(srcPath)
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toFile(dstPath);
}

async function main() {
  console.log(`[AI-UPSCALE] Source: ${SOURCE_DIR}`);
  console.log(`[AI-UPSCALE] Output: ${OUTPUT_DIR}`);
  console.log(`[AI-UPSCALE] Target: ${TARGET_SIZE}x${TARGET_SIZE}, Model: ${MODEL}, Quality: ${WEBP_QUALITY}`);
  
  const specimens = findSpecimens(SOURCE_DIR);
  console.log(`[AI-UPSCALE] Found ${specimens.length} specimen files`);
  
  if (specimens.length === 0) {
    console.log('[AI-UPSCALE] Nothing to process');
    return;
  }

  const tmpDir = '/tmp/ai-upscale-tmp';
  fs.mkdirSync(tmpDir, { recursive: true });

  // Ensure output directory exists
  if (!DRY_RUN) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const specPath of specimens) {
    const rel = path.relative(SOURCE_DIR, specPath);
    const parsed = path.parse(specPath);
    
    // Check current dimensions (skip if already large enough, unless --force)
    if (!FORCE) {
      try {
        const meta = await sharp(specPath).metadata();
        if (meta.width >= TARGET_SIZE && meta.height >= TARGET_SIZE) {
          skipped++;
          continue;
        }
      } catch {
        failed++;
        continue;
      }
    }

    const tmpPadded = path.join(tmpDir, `padded_${parsed.base}.png`);
    const tmpUpscaled = path.join(tmpDir, `upscaled_${parsed.base}.png`);
    
    const outWebp = path.join(OUTPUT_DIR, rel);
    const thumbName = parsed.name.replace('specimen_', 'thumb_specimen_') + '.webp';
    const outThumb = path.join(path.dirname(outWebp), thumbName);

    if (DRY_RUN) {
      console.log(`  [DRY] ${rel}`);
      processed++;
      continue;
    }

    try {
      // Pad to square
      await padImage(specPath, tmpPadded, TARGET_SIZE / 4); // Pad to 128 for x4
      
      // Upscale
      const ok = upscale(tmpPadded, tmpUpscaled, MODEL, 4);
      if (!ok) {
        console.error(`  [FAIL] ${rel} - upscale failed`);
        failed++;
        continue;
      }

      // Convert to webP
      await toWebP(tmpUpscaled, outWebp, WEBP_QUALITY);

      // Generate thumbnail
      await makeThumbnail(tmpUpscaled, outThumb);

      processed++;
      if (processed % 50 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        const remaining = ((specimens.length - processed - skipped) / rate).toFixed(0);
        console.log(`  [${processed}/${specimens.length}] ${rate.toFixed(1)} img/s, ~${remaining}s remaining`);
      }
    } catch (err) {
      console.error(`  [FAIL] ${rel} - ${err.message}`);
      failed++;
    }
  }

  // Cleanup tmp
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[AI-UPSCALE] Done in ${elapsed}s`);
  console.log(`  Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(console.error);
