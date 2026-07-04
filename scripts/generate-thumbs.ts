import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const TEXTURES_DIR = path.join(process.cwd(), 'public/textures_by_mutant')
const THUMB_SIZE = 128

async function generateThumbs() {
  const dirs = await fs.readdir(TEXTURES_DIR)
  let created = 0
  let skipped = 0
  let errors = 0

  for (const dir of dirs) {
    const dirPath = path.join(TEXTURES_DIR, dir)
    const stat = await fs.stat(dirPath)
    if (!stat.isDirectory()) continue

    const files = await fs.readdir(dirPath)
    for (const file of files) {
      if (!file.startsWith('specimen_') || !file.endsWith('.webp')) continue
      if (file.startsWith('thumb_')) continue

      const thumbName = file.replace('specimen_', 'thumb_specimen_')
      const thumbPath = path.join(dirPath, thumbName)

      try {
        await fs.access(thumbPath)
        skipped++
        continue
      } catch {}

      try {
        const srcPath = path.join(dirPath, file)
        await sharp(srcPath)
          .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 90 })
          .toFile(thumbPath)
        created++
      } catch {
        errors++
      }
    }
  }

  console.log(`Создано: ${created}`)
  console.log(`Уже было: ${skipped}`)
  console.log(`Ошибок: ${errors}`)
}

generateThumbs().catch(console.error)
