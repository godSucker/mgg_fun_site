// Одноразовый/периодический синк обложек рейдов/лесенок (title_<id>-ru.png,
// pveeventcontent на s-beta) - для уже существующих 16 рейдов + 87 лесенок,
// которые добавлялись ДО того, как finish-pending.ts начал качать обложку
// сам (2026-08-07). Для новых записей вперёд ничего доп. запускать не нужно -
// finish-pending.ts качает title_<id>-ru.png в public/dungeon-covers/ сразу
// при .локал. Этот скрипт - только бэкфилл истории + периодическая проверка,
// что старые ссылки не протухли (Kobojo меняет пути без предупреждения, см.
// dungeons.xml прецедент).
//
// НЕ качает файлы на свой CDN - просто хотлинк на Kobojo (та же логика, что
// у shop-forecast/daily-news, картинка нужна как фон карточки, не как
// постоянный актив). Результат - src/data/guides/dungeon-covers.json,
// {id: coverUrl | null}, коммитится в репо, читается в guides.astro.

import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'

const ROOT = process.cwd()
const OUT_PATH = path.join(ROOT, 'src/data/guides/dungeon-covers.json')
const ASSET_BASE = 'https://s-beta.kobojo.com/mutants/assets/pveeventcontent/'

async function loadJson<T>(p: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(p, 'utf-8'))
  } catch {
    return fallback
  }
}

async function checkExists(url: string): Promise<boolean> {
  try {
    const res = await axios.head(url, {
      timeout: 8000,
      validateStatus: (s) => s === 200 || s === 404,
    })
    return res.status === 200
  } catch {
    return false
  }
}

// Повторные запуски одного и того же события переиспользуют арт БАЗОВОГО id
// без порядкового суффикса (library_2 -> title_library-ru.png, не
// title_library_2-ru.png) - подтверждено 2026-08-07 на 5 случайных id.
// Часть id (собственные имена типа "dumas") вообще без -ru суффикса -
// title_dumas.png, не title_dumas-ru.png. Сезонные ивенты с годом в id
// (valentines23/halloween24/easter23...) НЕ резолвятся ни одним из этих
// вариантов - паттерн их имён не разгадан, остаются без обложки (~60 из 136,
// см. память auto-announcements-architecture).
async function resolveCover(id: string): Promise<string | null> {
  // event-ladders.json хранит id с префиксом "season_" (season_anniversary_18_1),
  // которого нет в файлах на Kobojo (title_anniversary_18_1-ru.png) - убираем.
  const noSeason = id.replace(/^season_/, '')
  const base = noSeason.replace(/_\d+$/, '')
  const candidates = [...new Set([id, noSeason, base])]
  // screen_<id>.jpg - реальный скриншот арены (хорош под background-size:
  // cover), title_<id>-ru.png - логотип на прозрачном фоне (криво растягивается,
  // фидбек по /guides 2026-08-07) - оставлен фолбэком, если screen_ нет.
  for (const c of candidates) {
    const screenUrl = `${ASSET_BASE}screen_${c}.jpg`
    if (await checkExists(screenUrl)) return screenUrl
  }
  for (const c of candidates) {
    for (const suffix of ['-ru.png', '.png']) {
      const url = `${ASSET_BASE}title_${c}${suffix}`
      if (await checkExists(url)) return url
    }
  }
  return null
}

async function main() {
  const [raids, specialLadders, eventLadders] = await Promise.all([
    loadJson<{ id: string }[]>('src/data/guides/raids.json', []),
    loadJson<{ experiment: { id: string }[]; challenge: { id: string }[] }>(
      'src/data/guides/special-ladders.json',
      { experiment: [], challenge: [] },
    ),
    loadJson<{ id: string }[]>('src/data/guides/event-ladders.json', []),
  ])

  const ids = [
    ...raids.map((r) => r.id),
    ...specialLadders.experiment.map((r) => r.id),
    ...specialLadders.challenge.map((r) => r.id),
    ...eventLadders.map((r) => r.id),
  ]

  const covers: Record<string, string | null> = await loadJson(OUT_PATH, {})
  let found = 0
  let checked = 0

  // Небольшими пачками, не 100+ параллельных HEAD-запросов разом.
  const BATCH = 10
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (id) => {
        const url = await resolveCover(id)
        covers[id] = url
        checked++
        if (url) found++
      }),
    )
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(covers, null, 2) + '\n', 'utf-8')
  console.log(`[DUNGEON-COVERS] Проверено: ${checked}, найдено обложек: ${found}`)
}

main().catch((err) => {
  console.error('[DUNGEON-COVERS] Ошибка:', err instanceof Error ? err.message : err)
  process.exit(1)
})
