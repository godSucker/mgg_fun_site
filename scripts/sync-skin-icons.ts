// Авто-подтяжка иконок скинов реактора/гачи для модалки мутанта. Источник правды -
// какие skin id вообще существуют - src/data/mutants/skins.json (генерится
// build-skins.ts из gacha.xml). Иконки лежат на Kobojo CDN по предсказуемому
// пути assets/gachacontent/icon_<skinId>.png - тот же маршрут, которым раньше
// докачивали hexcity/gemstones руками (2026-08-06).
//
// Часть skin id не имеют иконки на CDN игры вообще (404) - это база игры, не
// баг сайта (см. память skin-icons-cdn: cybernetics/nebula/opalescent/purgatory/
// seasons/solarflare/thanksgiving/verdant/wireframe и т.п.). Такие просто не
// попадают в skin-icons.json и не ретраятся бесконечно - список маленький
// (~60 id), лишний 404 раз в день не проблема.

import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'
import sharp from 'sharp'

const ICON_URL_BASE = 'https://s-beta.kobojo.com/mutants/assets/gachacontent/icon_'
const SKINS_PATH = path.join(process.cwd(), 'src/data/mutants/skins.json')
const ICONS_PATH = path.join(process.cwd(), 'src/data/mutants/skin-icons.json')
const ICONS_DIR = path.join(process.cwd(), 'public/skins')

async function loadJson<T>(p: string): Promise<T> {
  return JSON.parse(await fs.readFile(p, 'utf-8'))
}

async function main() {
  const skins = await loadJson<{ specimens: { skin: string }[] }>(SKINS_PATH)
  const icons = await loadJson<Record<string, string>>(ICONS_PATH)

  const distinctSkinIds = [...new Set(skins.specimens.map((s) => s.skin))].sort()
  const missing = distinctSkinIds.filter((id) => !(id in icons))

  if (missing.length === 0) {
    console.log('[SKIN-ICONS] Все существующие skin id уже покрыты иконками.')
    return
  }

  await fs.mkdir(ICONS_DIR, { recursive: true })

  const added: string[] = []
  const unavailable: string[] = []

  for (const id of missing) {
    const url = `${ICON_URL_BASE}${id}.png`
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      if (res.status !== 200 || res.data.length < 100) throw new Error('empty response')

      const iconPath = path.join(ICONS_DIR, `icon_${id}.png`)
      await sharp(res.data).png().toFile(iconPath)
      icons[id] = `/skins/icon_${id}.png`
      added.push(id)
      console.log(`[SKIN-ICONS] +${id}`)
    } catch {
      unavailable.push(id)
    }
  }

  if (added.length > 0) {
    const sorted = Object.fromEntries(Object.entries(icons).sort(([a], [b]) => a.localeCompare(b)))
    await fs.writeFile(ICONS_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')
  }

  const lines: string[] = ['### Иконки скинов']
  if (added.length > 0) {
    lines.push(`✅ Добавлено новых иконок (${added.length}): ${added.join(', ')}`)
  }
  if (unavailable.length > 0) {
    lines.push(
      `ℹ️ Без иконки на CDN игры (не баг, база игры) — ${unavailable.length}: ${unavailable.join(', ')}`,
    )
  }
  console.log(lines.join('\n'))

  const cacheDir = path.join(process.cwd(), 'scripts/.cache')
  await fs.mkdir(cacheDir, { recursive: true })
  await fs.writeFile(path.join(cacheDir, 'skin-icons-summary.md'), lines.join('\n') + '\n', 'utf-8')
}

main().catch((err) => {
  console.error('[SKIN-ICONS] Ошибка:', err instanceof Error ? err.message : err)
  process.exit(1)
})
