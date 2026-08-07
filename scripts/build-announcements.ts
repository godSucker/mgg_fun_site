// Авто-публикация анонсов на /announcements. Механизм пришёл на замену ручному
// ".анонс" (форвард поста из офиц. канала + reply в telegram-webhook.ts) для
// контента, который и так синкается автоматически - его появление детектируется
// напрямую по игровым данным, а не ждёт, пока кто-то увидит пост в канале.
// См. память auto-announcements-architecture: Фаза 1 покрывает только типы,
// где RU-имя уже есть в данных (не нужен ни LLM, ни .локал-алерт) - мутанты,
// скины, бинго-доски, боксы, обменники, ребаланс. Реакторы/лесенки - Фаза 2.
//
// Механизм ledger'а (scripts/announced-ids-cache.json, коммитится в репо):
// на каждом прогоне сравниваем текущий набор id по каждому типу с тем, что
// уже было объявлено. Новые id -> одна запись в announcements.json на тип
// за прогон (не по записи на каждый id - иначе разовая партия из 20 новых
// мутантов даст 20 постов подряд). Бутстрап: если ledger ещё не существует,
// сохраняем текущее состояние КАК ЕСТЬ и ничего не публикуем - иначе первый
// запуск объявит все 554 мутанта разом.

import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'
import { fetchShopForecast } from './detect-shop-forecast'
import { fetchDailyNewsForecast } from './detect-daily-news'

const ROOT = process.cwd()
// НЕ scripts/.cache/ - та папка в .gitignore и не переживает между прогонами
// CI (свежий checkout каждый раз = вечный бутстрап без единой публикации).
// Тот же приём, что у scripts/missing-textures-cache.json.
const LEDGER_PATH = path.join(ROOT, 'scripts/announced-ids-cache.json')
const ANNOUNCEMENTS_PATH = path.join(ROOT, 'src/data/announcements.json')

interface AnnouncementItem {
  id: string
  name: string
  image?: string | null
  category?: string | null
}

interface Announcement {
  id: string
  date: string
  category: string
  title: string
  text?: string | null
  items: AnnouncementItem[]
  link?: string | null
}

interface Ledger {
  mutant: string[]
  skin: string[]
  bingo: string[]
  box: string[]
  exchange: string[]
  rebalance: string[]
  raid: string[]
  ladder: string[]
  token: string[]
  shopForecast: string[]
  dailyNews: string[]
}

const EMPTY_LEDGER: Ledger = {
  mutant: [],
  skin: [],
  bingo: [],
  box: [],
  exchange: [],
  rebalance: [],
  raid: [],
  ladder: [],
  token: [],
  shopForecast: [],
  dailyNews: [],
}

async function loadJson<T>(relPath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, relPath), 'utf-8'))
  } catch {
    return fallback
  }
}

async function loadLedger(): Promise<{ ledger: Ledger; isBootstrap: boolean }> {
  try {
    const raw = await fs.readFile(LEDGER_PATH, 'utf-8')
    return { ledger: JSON.parse(raw), isBootstrap: false }
  } catch {
    return { ledger: structuredClone(EMPTY_LEDGER), isBootstrap: true }
  }
}

async function saveLedger(ledger: Ledger) {
  await fs.mkdir(path.dirname(LEDGER_PATH), { recursive: true })
  await fs.writeFile(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n', 'utf-8')
}

// GACHA_NAME_RU дублировать импортом из .svelte-соседнего lib нельзя (там же
// Svelte-специфичные вещи), поэтому короткий локальный список только для
// того, что реально встречается в skins.json - расхождение не страшно,
// worst case skin объявится под сырым id вместо RU-названия.
const SKIN_NAME_RU: Record<string, string> = {
  western: 'Вестерн',
  gachaboss: 'Большой босс',
  japan: 'Япония',
  fantasy: 'Темное фентези',
  lucha: "Мучачо's",
  olympians: 'Боги арены',
  music: 'Диско',
  villains: 'Супер злодеи',
  starwars: 'Космические войны',
  beach: 'Тропическое лето',
  heroes: 'Супергерои',
  soldiers: 'Патруль времени',
  gothic: 'Готика',
  movies: 'Кино',
  elements: 'Команда элементалей',
  steampunk: 'Стимпанк',
  vegetal: 'Фотосинтез',
  girl: 'Хищницы',
  hexcity: 'Hex City',
  gemstones: 'Самоцветы',
  chess: 'Шахматы',
}

interface DetectResult {
  newIds: string[]
  items: AnnouncementItem[]
}

type StarsMap = Record<string, { images?: string[] }>

// GACHA/HEROIC мутанты хранят только один star-элемент (часто platinum, не
// normal) - см. память unified mutants.json. Берём первую попавшуюся картинку
// из любого доступного star вместо жёсткого stars.normal.
function firstMutantImage(stars: StarsMap | undefined): string | null {
  if (!stars) return null
  for (const key of ['normal', 'bronze', 'silver', 'gold', 'platinum']) {
    const img = stars[key]?.images?.[0]
    if (img) return img
  }
  const anyKey = Object.keys(stars)[0]
  return anyKey ? (stars[anyKey]?.images?.[0] ?? null) : null
}

// Готовая промо-карточка мутанта с Kobojo CDN (найдено 2026-08-07 в присланных
// пользователем ссылках) - лучше сырого спрайта из firstMutantImage() для
// карточки анонса "новый мутант". Не гарантирована для 100% id (не проверяли
// на GACHA/HEROIC), поэтому HEAD-проверка с фоллбеком, не слепая подстановка.
async function opengraphObtainImage(id: string): Promise<string | null> {
  const url = `https://s-beta.kobojo.com/mutants/assets/opengraph/${id.toLowerCase()}_obtain.jpg`
  try {
    const res = await axios.head(url, { timeout: 8000, validateStatus: (s) => s === 200 || s === 404 })
    return res.status === 200 ? url : null
  } catch {
    return null
  }
}

async function detectMutants(seen: string[]): Promise<DetectResult> {
  const mutants = await loadJson<{ id: string; name: string; stars?: StarsMap }[]>(
    'src/data/mutants/mutants.json',
    [],
  )
  const seenSet = new Set(seen)
  const fresh = mutants.filter((m) => !seenSet.has(m.id))
  return {
    newIds: mutants.map((m) => m.id),
    items: await Promise.all(fresh.map(async (m) => ({
      id: m.id,
      name: m.name,
      image: (await opengraphObtainImage(m.id)) ?? firstMutantImage(m.stars),
    }))),
  }
}

async function detectSkins(seen: string[]): Promise<DetectResult> {
  const data = await loadJson<{
    specimens: { id: string; name: string; skin: string; image?: string[] }[]
  }>('src/data/mutants/skins.json', { specimens: [] })
  const seenSet = new Set(seen)
  const byKey = new Map<string, { id: string; name: string; skin: string; image?: string[] }>()
  for (const s of data.specimens) {
    if (!s.skin || s.skin === '_any' || s.skin === 'none') continue
    byKey.set(`${s.id}|${s.skin}`, s)
  }
  const allKeys = [...byKey.keys()]
  const fresh = allKeys.filter((k) => !seenSet.has(k))
  return {
    newIds: allKeys,
    items: fresh.map((k) => {
      const s = byKey.get(k)!
      const skinName = SKIN_NAME_RU[s.skin] ?? s.skin
      return {
        id: k,
        name: `${s.name} — ${skinName}`,
        image: s.image?.[0] ?? null,
      }
    }),
  }
}

async function detectBingo(seen: string[]): Promise<DetectResult> {
  const bingos = await loadJson<{ id: string; title: string }[]>('src/data/bingos.json', [])
  const seenSet = new Set(seen)
  const fresh = bingos.filter((b) => !seenSet.has(b.id))
  return {
    newIds: bingos.map((b) => b.id),
    items: fresh.map((b) => ({ id: b.id, name: b.title, image: null })),
  }
}

async function detectBoxes(seen: string[]): Promise<DetectResult> {
  const boxes = await loadJson<{ itemId: string; name: string; icon?: string }[]>(
    'src/data/boxes.json',
    [],
  )
  const seenSet = new Set(seen)
  const fresh = boxes.filter((b) => !seenSet.has(b.itemId))
  return {
    newIds: boxes.map((b) => b.itemId),
    items: fresh.map((b) => ({ id: b.itemId, name: b.name, image: b.icon ?? null })),
  }
}

async function detectExchange(seen: string[]): Promise<DetectResult> {
  const obtain = await loadJson<Record<string, { type: string; where: string }[]>>(
    'src/data/mutants/obtain.json',
    {},
  )
  const mutants = await loadJson<{ id: string; name: string; stars?: StarsMap }[]>(
    'src/data/mutants/mutants.json',
    [],
  )
  const nameById = new Map(mutants.map((m) => [m.id, m]))
  const seenSet = new Set(seen)
  const allKeys: string[] = []
  const fresh: { key: string; specimenId: string; where: string }[] = []
  for (const [specimenId, entries] of Object.entries(obtain)) {
    for (const e of entries) {
      if (e.type !== 'jackpot_hall') continue
      const key = `${specimenId}|${e.where}`
      allKeys.push(key)
      if (!seenSet.has(key)) fresh.push({ key, specimenId, where: e.where })
    }
  }
  return {
    newIds: allKeys,
    items: fresh.map((f) => {
      const m = nameById.get(f.specimenId)
      return {
        id: f.key,
        name: m ? `${m.name} — ${f.where}` : `${f.specimenId} — ${f.where}`,
        image: firstMutantImage(m?.stars),
      }
    }),
  }
}

// Полноценный resolveReward из src/lib/guides-resolve.ts требует craft-simulator.ts/
// localisation.ts, которые тянут `?raw`-txt и `@/`-алиасы - это Vite-фичи, недоступные
// в голом tsx-скрипте вне Astro/Vite-пайплайна (детектор запускается через `npx tsx`
// напрямую в CI). Поэтому здесь - упрощённый резолвер только через material.json
// (обычный JSON, грузится как все остальные детекторы) + mutants.json. Награды рейдов/
// лесенок на практике это звёзды/материалы/орбы/жетоны/валюта/мутант - всё это material.json
// покрывает; для остального (тот же fallback, что у SKIN_NAME_RU) - сырой id.
async function dungeonItemName(
  id: string,
  materialsById: Map<string, { name?: string; texture?: string }>,
  mutantsById: Map<string, { name: string; stars?: StarsMap }>,
): Promise<{ label: string; image: string | null }> {
  if (id.startsWith('Specimen_')) {
    const m = mutantsById.get(id.toLowerCase())
    return { label: m?.name ?? id, image: firstMutantImage(m?.stars) }
  }
  const mat = materialsById.get(id)
  return { label: mat?.name ?? id, image: mat?.texture ?? null }
}

interface DungeonRawShape {
  id: string
  name: string
  mutantId: string | null
  fightCount: number
  rewards: {
    currency: { softcurrency: number; hardcurrency: number }
    items: { id: string; amount: number }[]
  }
}

async function detectDungeons(
  seen: string[],
  entries: DungeonRawShape[],
  linePrefix: string,
): Promise<DetectResult> {
  const [materials, mutants] = await Promise.all([
    loadJson<{ id: string; name?: string; texture?: string }[]>(
      'src/data/materials/material.json',
      [],
    ),
    loadJson<{ id: string; name: string; stars?: StarsMap }[]>('src/data/mutants/mutants.json', []),
  ])
  const materialsById = new Map(materials.map((m) => [m.id, m]))
  const mutantsById = new Map(mutants.map((m) => [m.id, m]))

  const seenSet = new Set(seen)
  const fresh = entries.filter((d) => !seenSet.has(d.id))

  const items = await Promise.all(
    fresh.map(async (d) => {
      // finish-pending.ts качает титульный баннер (title_<id>-ru.png) в
      // public/dungeon-covers/ при доделке - если он есть, он лучше сырой
      // иконки мутанта/материала для карточки анонса.
      const coverPath = path.join(ROOT, 'public/dungeon-covers', `${d.id}.png`)
      const hasCover = await fs
        .access(coverPath)
        .then(() => true)
        .catch(() => false)
      const image = hasCover
        ? `/dungeon-covers/${d.id}.png`
        : d.mutantId
          ? (await dungeonItemName(d.mutantId, materialsById, mutantsById)).image
          : d.rewards.items[0]
            ? (await dungeonItemName(d.rewards.items[0].id, materialsById, mutantsById)).image
            : null
      return {
        id: d.id,
        name: `${linePrefix} «${d.name}» (${d.fightCount} боёв)`,
        image,
      }
    }),
  )

  return { newIds: entries.map((d) => d.id), items }
}

async function detectRaids(seen: string[]): Promise<DetectResult> {
  const raids = await loadJson<DungeonRawShape[]>('src/data/guides/raids.json', [])
  return detectDungeons(seen, raids, 'Рейд')
}

async function detectLadders(seen: string[]): Promise<DetectResult> {
  const special = await loadJson<{ experiment: DungeonRawShape[]; challenge: DungeonRawShape[] }>(
    'src/data/guides/special-ladders.json',
    { experiment: [], challenge: [] },
  )
  return detectDungeons(seen, [...special.experiment, ...special.challenge], 'Лесенка')
}

// Жетоны сами в material.json пишет scripts/detect-tokens.ts (Phase-1-детектор
// с сетевым фетчем game-defs) - здесь только diff уже-записанных данных, тот
// же приём, что у остальных Phase-1-детекторов (никакого XML тут не трогаем).
async function detectTokens(seen: string[]): Promise<DetectResult> {
  const materials = await loadJson<{ id: string; name: string; texture?: string | null }[]>(
    'src/data/materials/material.json',
    [],
  )
  const tokens = materials.filter((m) => /token/i.test(m.id))
  const seenSet = new Set(seen)
  const fresh = tokens.filter((m) => !seenSet.has(m.id))
  return {
    newIds: tokens.map((m) => m.id),
    items: fresh.map((m) => ({ id: m.id, name: m.name, image: m.texture ?? null })),
  }
}

// Прогноз магазина/daily_news (Фаза 3, задачи A/B) - ledger ключ тут не id, а
// номер спринта: одна публикация на спринт, не на каждый оффер внутри.
async function detectShopForecast(seen: string[]): Promise<DetectResult> {
  const forecast = await fetchShopForecast()
  if (!forecast) return { newIds: seen, items: [] }
  const key = String(forecast.sprint)
  if (seen.includes(key)) return { newIds: seen, items: [] }
  return {
    newIds: [...seen, key],
    items: [
      {
        id: key,
        name: `Прогноз магазина (${forecast.dateRangeLabel}): ${forecast.items.length} предложений`,
        image: forecast.items[0]?.image ?? null,
      },
    ],
  }
}

async function detectDailyNews(seen: string[]): Promise<DetectResult> {
  const forecast = await fetchDailyNewsForecast()
  if (!forecast) return { newIds: seen, items: [] }
  const key = String(forecast.sprint)
  if (seen.includes(key)) return { newIds: seen, items: [] }
  return {
    newIds: [...seen, key],
    items: [
      {
        id: key,
        name: `Скоро в игре (${forecast.dateRangeLabel}): ${forecast.items.length} событий`,
        image: forecast.coverImage,
      },
    ],
  }
}

async function detectRebalance(seen: string[]): Promise<DetectResult> {
  const history = await loadJson<{ date: string; entries: { id: string; name: string }[] }[]>(
    'src/data/mutants/rebalance-history.json',
    [],
  )
  const seenSet = new Set(seen)
  const fresh = history.filter((h) => !seenSet.has(h.date))
  return {
    newIds: history.map((h) => h.date),
    items: fresh.map((h) => ({
      id: h.date,
      name: `Ребаланс от ${new Date(h.date).toLocaleDateString('ru-RU')}: ${h.entries.length} мутант(ов)`,
      image: null,
    })),
  }
}

const DETECTORS: {
  category: keyof Ledger
  title: string
  link: string
  run: typeof detectMutants
}[] = [
  { category: 'mutant', title: 'Новые мутанты', link: '/mutants', run: detectMutants },
  { category: 'skin', title: 'Новые скины', link: '/mutants', run: detectSkins },
  { category: 'bingo', title: 'Новые бинго-доски', link: '/bingo', run: detectBingo },
  { category: 'box', title: 'Новые боксы', link: '/boxes', run: detectBoxes },
  { category: 'exchange', title: 'Обновление зала обмена', link: '/mutants', run: detectExchange },
  { category: 'raid', title: 'Новые рейды', link: '/guides', run: detectRaids },
  { category: 'ladder', title: 'Новые лесенки', link: '/guides', run: detectLadders },
  { category: 'token', title: 'Новые жетоны', link: '/materials', run: detectTokens },
  {
    category: 'shopForecast',
    title: 'Прогноз магазина',
    link: '/materials',
    run: detectShopForecast,
  },
  { category: 'dailyNews', title: 'Скоро в игре', link: '/announcements', run: detectDailyNews },
  { category: 'rebalance', title: 'Ребаланс статов', link: '/rebalance', run: detectRebalance },
]

async function main() {
  const { ledger, isBootstrap } = await loadLedger()
  const announcements = await loadJson<Announcement[]>('src/data/announcements.json', [])

  if (isBootstrap) {
    console.log(
      '[ANNOUNCE] Ledger не найден - бутстрап без публикации (сохраняем текущее состояние).',
    )
    for (const d of DETECTORS) {
      const { newIds } = await d.run(ledger[d.category])
      ledger[d.category] = newIds
    }
    await saveLedger(ledger)
    return
  }

  const now = new Date().toISOString()
  const published: string[] = []

  for (const d of DETECTORS) {
    const { newIds, items } = await d.run(ledger[d.category])
    if (items.length > 0) {
      announcements.push({
        id: `${d.category}-${Date.now()}`,
        date: now,
        category: d.category,
        title: items.length === 1 ? items[0].name : `${d.title}: ${items.length}`,
        items,
        link: d.link,
      })
      published.push(`${d.category} (${items.length})`)
    }
    ledger[d.category] = newIds
  }

  await saveLedger(ledger)
  await fs.writeFile(ANNOUNCEMENTS_PATH, JSON.stringify(announcements, null, 2) + '\n', 'utf-8')

  const cacheDir = path.join(ROOT, 'scripts/.cache')
  await fs.mkdir(cacheDir, { recursive: true })
  const summary =
    published.length > 0
      ? `### Авто-анонсы\n✅ Опубликовано: ${published.join(', ')}`
      : '### Авто-анонсы\nℹ️ Новых записей нет'
  await fs.writeFile(path.join(cacheDir, 'announcements-summary.md'), summary + '\n', 'utf-8')
  console.log(summary)
}

main().catch((err) => {
  console.error('[ANNOUNCE] Ошибка:', err instanceof Error ? err.message : err)
  process.exit(1)
})
