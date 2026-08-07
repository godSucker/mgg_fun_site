// Авто-синк жетонов/материалов (Material_*_Token и родственные) в
// material.json. В отличие от реакторов/данжей RU-имя УЖЕ есть в офиц.
// локализации (см. auto-announcements-architecture) - .локал не нужен,
// обычный Phase-1-паттерн: пишет данные сразу, build-announcements.ts
// объявляет через diff material.json (см. detectTokens там же).
//
// Иконка - хотлинк на Kobojo thumbnail CDN (та же база, что build-boxes.ts),
// best-effort по конвенции id.toLowerCase(). Если файла там нет - просто
// битая картинка в таблице материалов до тех пор, пока кто-то не подберёт
// нормальный арт руками (тот же компромисс, что раньше решался вручную для
// части материалов - см. память materials-buildings-schema).

import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'

const ROOT = process.cwd()
const GAME_DEFS_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/gamedefinitions.xml'
const LOC_RU_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/localisation_ru.txt'
const THUMB_BASE = 'https://s-beta.kobojo.com/mutants/assets/thumbnails/'
const MATERIAL_PATH = path.join(ROOT, 'src/data/materials/material.json')

interface MaterialEntry {
  id: string
  name: string
  description?: string
  texture?: string | null
}

async function loadJson<T>(p: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(p, 'utf-8'))
  } catch {
    return fallback
  }
}

async function main() {
  const [{ data: xml }, { data: locRaw }, materials] = await Promise.all([
    axios.get<string>(GAME_DEFS_URL, { responseType: 'text', timeout: 20000 }),
    axios.get<string>(LOC_RU_URL, { responseType: 'text', timeout: 20000 }),
    loadJson<MaterialEntry[]>(MATERIAL_PATH, []),
  ])

  const loc = new Map<string, string>()
  for (const rawLine of locRaw.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const i = line.indexOf(';')
    if (i === -1) continue
    loc.set(line.slice(0, i).toLowerCase(), line.slice(i + 1))
  }

  const tokenIds = new Set<string>()
  for (const m of xml.matchAll(/<EntityDescriptor id="(Material_[^"]*[Tt]oken[^"]*)"/g)) {
    tokenIds.add(m[1])
  }

  const known = new Set(materials.map((m) => m.id))
  const fresh = [...tokenIds].filter((id) => !known.has(id))

  if (fresh.length === 0) {
    console.log('[TOKENS] Новых жетонов не найдено.')
    return
  }

  for (const id of fresh) {
    const name = loc.get(id.toLowerCase()) ?? id.replace(/_/g, ' ')
    materials.push({
      id,
      name,
      description: loc.get(`tooltip_${id.toLowerCase()}`) ?? '',
      texture: `${THUMB_BASE}${id.toLowerCase()}.png`,
    })
    console.log(`[TOKENS] Новый: ${id} -> "${name}"`)
  }

  await fs.writeFile(MATERIAL_PATH, JSON.stringify(materials, null, 2) + '\n', 'utf-8')
}

main().catch((err) => {
  console.error('[TOKENS] Ошибка:', err instanceof Error ? err.message : err)
  process.exit(1)
})
