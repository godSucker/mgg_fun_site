#!/usr/bin/env node
/**
 * Upscales specimen (head) textures from 200×200 to a larger size.
 *
 * Usage:
 *   node scripts/upscale-specimens.js [--size 512] [--quality 90] [--dry-run]
 *
 * By default uses Sharp (Lanczos3 kernel — excellent for pixel-art / game textures).
 * If Real-ESRGAN binary is on PATH, it will be used instead for AI upscaling.
 */

import { readdir, stat, readFile, writeFile, copyFile, mkdir } from 'node:fs/promises'
import { join, basename, dirname, extname } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const TEXTURES_DIR = 'public/textures_by_mutant'

// CLI args
const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback
}
const TARGET_SIZE = parseInt(flag('size', '512'), 10)
const QUALITY = parseInt(flag('quality', '90'), 10)
const DRY_RUN = args.includes('--dry-run')
const DEDUPLICATE = args.includes('--deduplicate') // remove _X_X duplicates

// --- Detect upscaler ---

let hasRealEsrgan = false
try {
  await execFileAsync('realesrgan-ncnn-vulkan', ['-h'])
  hasRealEsrgan = true
} catch {
  // not available
}

const UPSCALER = hasRealEsrgan ? 'realesrgan' : 'sharp'
console.log(`Upscaler: ${UPSCALER} | Target: ${TARGET_SIZE}×${TARGET_SIZE} | Quality: ${QUALITY}`)

// --- Sharp upscaler ---

async function upscaleSharp(inputPath, outputPath, size) {
  const sharp = (await import('sharp')).default
  const { rename } = await import('node:fs/promises')
  const tmpPath = outputPath + '.tmp'
  await sharp(inputPath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3',
    })
    .webp({ quality: QUALITY, alphaQuality: 100 })
    .toFile(tmpPath)
  await rename(tmpPath, outputPath)
}

// --- Real-ESRGAN upscaler ---

async function upscaleRealEsrgan(inputPath, outputPath, size) {
  // Real-ESRGAN doesn't take a target size, it upscales by a factor.
  // 200 → 512 is ~2.56x, so use 4x (→800) and then resize down to target.
  const tmpPath = outputPath + '.tmp.webp'
  await execFileAsync('realesrgan-ncnn-vulkan', [
    '-i', inputPath,
    '-o', tmpPath,
    '-n', 'realesrgan-x4plus', // general model
    '-f', 'webp',
    '-q', String(QUALITY),
  ])
  // Resize to exact target
  const sharp = (await import('sharp')).default
  await sharp(tmpPath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: QUALITY, alphaQuality: 100 })
    .toFile(outputPath)
  // Remove temp
  const { unlink } = await import('node:fs/promises')
  await unlink(tmpPath).catch(() => {})
}

const upscale = hasRealEsrgan ? upscaleRealEsrgan : upscaleSharp

// --- Find specimen files ---

async function findSpecimenFiles(dir) {
  const results = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...await findSpecimenFiles(fullPath))
    } else if (entry.name.startsWith('specimen_') && entry.name.endsWith('.webp')) {
      results.push(fullPath)
    }
  }
  return results
}

// --- Classify files ---

function classifySpecimenFile(filename) {
  // "specimen_aa_01_normal.webp" → { base: "specimen_aa_01", variant: "normal" }
  // "specimen_aa_01_bronze_bronze.webp" → { base: "specimen_aa_01", variant: "bronze_bronze" }
  // "specimen_aa_01_bronze.webp" → { base: "specimen_aa_01", variant: "bronze" }
  const name = basename(filename, '.webp')
  const parts = name.split('_')
  // Remove "specimen" prefix and the mutant ID (first two parts after specimen)
  // Find where variant starts: it's after the numeric part
  let variantStart = -1
  for (let i = 2; i < parts.length; i++) {
    if (/^\d+$/.test(parts[i])) {
      variantStart = i + 1
      break
    }
  }
  if (variantStart === -1) return { base: name, variant: 'normal', isDuplicate: false }

  const variant = parts.slice(variantStart).join('_')
  const base = parts.slice(0, variantStart).join('_')
  // Duplicate detection: "bronze_bronze", "gold_gold", etc.
  const isDuplicate = variant.split('_').length >= 2 && variant.split('_').every(v => v === variant.split('_')[0])
  return { base, variant, isDuplicate }
}

// --- Main ---

async function main() {
  console.log(`Scanning ${TEXTURES_DIR}...`)
  const allFiles = await findSpecimenFiles(TEXTURES_DIR)
  console.log(`Found ${allFiles.length} specimen files`)

  // Separate unique vs duplicate
  const unique = []
  const duplicates = []
  for (const f of allFiles) {
    const { isDuplicate } = classifySpecimenFile(basename(f))
    if (isDuplicate) duplicates.push(f)
    else unique.push(f)
  }
  console.log(`Unique: ${unique.length} | Duplicates: ${duplicates.length}`)

  // Check which ones already have the target size
  const sharp = (await import('sharp')).default
  const toUpscale = []
  for (const f of unique) {
    const meta = await sharp(f).metadata()
    if (meta.width < TARGET_SIZE) {
      toUpscale.push({ path: f, currentWidth: meta.width })
    }
  }
  console.log(`Need upscaling: ${toUpscale.length} (already ${TARGET_SIZE}+: ${unique.length - toUpscale.length})`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would upscale:')
    toUpscale.slice(0, 10).forEach(f => console.log(`  ${f.path} (${f.currentWidth}→${TARGET_SIZE})`))
    if (toUpscale.length > 10) console.log(`  ... and ${toUpscale.length - 10} more`)
    return
  }

  // Upscale unique files
  let done = 0
  const errors = []
  for (const { path: filePath, currentWidth } of toUpscale) {
    try {
      await upscale(filePath, filePath, TARGET_SIZE)
      done++
      if (done % 50 === 0 || done === toUpscale.length) {
        console.log(`  [${done}/${toUpscale.length}] ${basename(filePath)}`)
      }
    } catch (err) {
      errors.push({ path: filePath, error: err.message })
      console.error(`  ERROR: ${filePath}: ${err.message}`)
    }
  }
  console.log(`\nUpscaled: ${done} files (${errors.length} errors)`)

  // Copy upscaled versions to duplicate files
  if (DEDUPLICATE && duplicates.length > 0) {
    console.log(`\nSyncing ${duplicates.length} duplicate files...`)
    let synced = 0
    for (const dupPath of duplicates) {
      const { base, variant } = classifySpecimenFile(basename(dupPath))
      // Find the unique version (without the doubled suffix)
      const singleVariant = variant.split('_')[0]
      const uniqueName = `${base}_${singleVariant}.webp`
      const uniquePath = join(dirname(dupPath), uniqueName)
      try {
        await copyFile(uniquePath, dupPath)
        synced++
      } catch {
        // Unique version might not exist, skip
      }
    }
    console.log(`Synced: ${synced} duplicates`)
  }

  // Generate thumbnails for cards (128x128)
  const THUMB_SIZE = 128
  console.log(`\nGenerating ${THUMB_SIZE}×${THUMB_SIZE} thumbnails...`)
  let thumbsDone = 0
  for (const { path: filePath } of toUpscale) {
    try {
      const dir = dirname(filePath)
      const name = basename(filePath)
      const thumbPath = join(dir, `thumb_${name}`)
      const sharp = (await import('sharp')).default
      await sharp(filePath)
        .resize(THUMB_SIZE, THUMB_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          kernel: 'lanczos3',
        })
        .webp({ quality: 80 })
        .toFile(thumbPath)
      thumbsDone++
    } catch {}
  }
  console.log(`Generated: ${thumbsDone} thumbnails`)

  console.log('\nDone!')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
