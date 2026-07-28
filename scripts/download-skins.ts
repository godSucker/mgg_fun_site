import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const KOBOJO_IMG_BASE = 'https://s-ak.kobojo.com/mutants/assets/thumbnails/'
const SKINS_DIR = path.join(process.cwd(), 'public/textures_by_skins/textures_by_skin/semi-full')
const SKINS_JSON = path.join(process.cwd(), 'src/data/mutants/skins.json')
// Не под scripts/.cache/ (тот в .gitignore целиком) - должен коммититься и
// переживать прогоны CI. Тот же паттерн, что и missing-textures-cache.json
// у sync-mutants.ts: без него каждый скин без арта на Kobojo вечно ждёт 15с
// таймаут заново на каждом прогоне.
const MISSING_CACHE_PATH = path.join(process.cwd(), 'scripts/missing-skin-textures-cache.json')
const RECHECK_DAYS = 14

let missingCache: Record<string, string> | null = null
let missingCacheDirty = false

async function loadMissingCache(): Promise<Record<string, string>> {
  if (missingCache) return missingCache
  try {
    missingCache = JSON.parse(await fs.readFile(MISSING_CACHE_PATH, 'utf-8'))
  } catch {
    missingCache = {}
  }
  return missingCache!
}

async function saveMissingCache(): Promise<void> {
  if (!missingCache || !missingCacheDirty) return
  await fs.writeFile(MISSING_CACHE_PATH, JSON.stringify(missingCache, null, 2) + '\n')
}

function isCacheFresh(isoTimestamp: string): boolean {
  const ageMs = Date.now() - new Date(isoTimestamp).getTime()
  return ageMs < RECHECK_DAYS * 24 * 60 * 60 * 1000
}

interface SkinEntry {
  id: string
  skin: string
  image: string[]
}

/**
 * Строит ожидаемое имя файла скина из id+skin напрямую (specimen_<code>_<skin>),
 * а не из image[1]: build-skins.ts добавляет image[1] в skins.json ТОЛЬКО когда
 * файл уже существует на диске - если читать имя оттуда, скин без предыдущей
 * успешной загрузки никогда не получит первую попытку (circular dependency,
 * из-за которой ряд скинов годами не скачивался, хотя Kobojo отдаёт 200).
 */
function skinFileNameFor(skin: SkinEntry): string | null {
  const code = skin.id?.replace(/^Specimen_/i, '').toLowerCase()
  if (!code || !skin.skin) return null
  return `specimen_${code}_${skin.skin.toLowerCase()}`
}

async function downloadSkinTexture(skinFileName: string): Promise<'ok' | 'exists' | 'error'> {
  const targetPath = path.join(SKINS_DIR, `${skinFileName}.webp`)

  try {
    await fs.access(targetPath)
    return 'exists'
  } catch {}

  const cache = await loadMissingCache()
  const cachedAt = cache[skinFileName]
  if (cachedAt && isCacheFresh(cachedAt)) {
    return 'error'
  }

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
      if (skinFileName in cache) {
        delete cache[skinFileName]
        missingCacheDirty = true
        await saveMissingCache()
      }
      return 'ok'
    }
  } catch {}

  cache[skinFileName] = new Date().toISOString()
  missingCacheDirty = true
  await saveMissingCache()
  return 'error'
}

async function main() {
  const data = JSON.parse(await fs.readFile(SKINS_JSON, 'utf-8'))
  const skins: SkinEntry[] = data.specimens

  console.log(`[INFO] Всего скинов: ${skins.length}`)

  const stats = { downloaded: 0, exists: 0, errors: 0, skipped: 0 }

  for (const skin of skins) {
    const skinFileName = skinFileNameFor(skin)
    if (!skinFileName) {
      stats.skipped++
      console.log(`[SKIP] ${skin.id} — не удалось построить имя файла (нет skin?)`)
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
