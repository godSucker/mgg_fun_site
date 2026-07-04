import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const KOBOJO_IMG_BASE = 'https://s-ak.kobojo.com/mutants/assets/thumbnails/'
const SKINS_DIR = path.join(process.cwd(), 'public/textures_by_skins/textures_by_skin/semi-full')
const SKINS_JSON = path.join(process.cwd(), 'src/data/mutants/skins.json')

interface SkinEntry {
  id: string
  skin: string
  image: string[]
}

/**
 * Извлекает имя файла скина из пути semi-full.
 * image[1] = "textures_by_skins/textures_by_skin/semi-full/specimen_a_01_japan.webp"
 * → возвращает "specimen_a_01_japan"
 */
function extractSkinFileName(imagePath: string): string | null {
  const match = imagePath.match(/semi-full\/(.+)\.webp$/)
  return match ? match[1] : null
}

async function downloadSkinTexture(
  skinFileName: string
): Promise<'ok' | 'exists' | 'error'> {
  const targetPath = path.join(SKINS_DIR, `${skinFileName}.webp`)

  try {
    await fs.access(targetPath)
    return 'exists'
  } catch {}

  const kobojoUrl = `${KOBOJO_IMG_BASE}${skinFileName}.png`
  try {
    const res = await axios.get(kobojoUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (res.status === 200 && res.data.length > 100) {
      await fs.mkdir(SKINS_DIR, { recursive: true })
      await sharp(res.data).webp({ quality: 95 }).toFile(targetPath)
      return 'ok'
    }
  } catch {}
  return 'error'
}

async function main() {
  const data = JSON.parse(await fs.readFile(SKINS_JSON, 'utf-8'))
  const skins: SkinEntry[] = data.specimens

  console.log(`[INFO] Всего скинов: ${skins.length}`)

  const stats = { downloaded: 0, exists: 0, errors: 0, skipped: 0 }

  for (const skin of skins) {
    const semiFull = skin.image?.[1]
    if (!semiFull) {
      stats.skipped++
      continue
    }

    const skinFileName = extractSkinFileName(semiFull)
    if (!skinFileName) {
      stats.skipped++
      console.log(`[SKIP] ${skin.id} — не удалось извлечь имя из пути: ${semiFull}`)
      continue
    }

    const result = await downloadSkinTexture(skinFileName)
    if (result === 'ok') {
      stats.downloaded++
      console.log(`[NEW] ${skinFileName}`)
    } else if (result === 'error') {
      stats.errors++
      console.log(`[ERR] ${skinFileName} — не удалось скачать`)
    } else {
      stats.exists++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`Скачано: ${stats.downloaded}`)
  console.log(`Уже было: ${stats.exists}`)
  console.log(`Пропущено: ${stats.skipped}`)
  console.log(`Ошибок: ${stats.errors}`)
  console.log('='.repeat(50))
}

main().catch(console.error)
