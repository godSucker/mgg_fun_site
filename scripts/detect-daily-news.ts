// Анонс ближайших daily_news-баннеров (Фаза 3, задача B). dailypopup.xml
// размечен теми же SPRINT-метками, что shopitems.xml (см. src/lib/sprint-
// calendar.ts) - берём блок офферов под ближайшим ещё не наступившим спринтом
// и пытаемся достать баннер каждого. ВАЖНО: у каждого <Offer> в файле есть
// СВОЙ семантический путь картинки (image="hud/daily_news/news_X$$.jpg"), но
// эти конкретные файлы по прямому URL 404-ят (проверено 2026-08-07 - похоже,
// не все банально лежат статикой, часть может резолвиться только внутри
// клиентского asset-бандла). Единственный подтверждённый рабочий паттерн -
// news_shop_24h_<year>_<sprint><a|b>-ru.jpg (подсказка коллеги, "24-часовой"
// флеш-сейл, отдельный от общей карусели daily_news). Поэтому: пробуем прямой
// URL оффера, если 404 - не блокируем анонс, просто без картинки.

import axios from 'axios'
import { currentSprint, sprintRangeLabel, sprintStartDate } from '../src/lib/sprint-calendar'

const DAILYPOPUP_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/dailypopup.xml'
const BANNER_BASE = 'https://s-beta.kobojo.com/mutants/assets/hud/daily_news/'

interface DailyNewsItem {
  filter: string
  category: string | null
  image: string | null
}

export interface DailyNewsForecast {
  sprint: number
  dateRangeLabel: string
  items: DailyNewsItem[]
  coverImage: string | null
}

// Подтверждённый рабочий паттерн (подсказка коллеги, 2026-08-07): "24-часовой"
// флеш-сейл баннер, публикуется на КАЖДУЮ половину спринта. Используем как
// общую обложку блока анонса, раз у отдельных офферов своих картинок нет.
async function findCoverImage(sprint: number, year: number): Promise<string | null> {
  for (const half of ['a', 'b'] as const) {
    const url = `${BANNER_BASE}news_shop_24h_${year}_${sprint}${half}-ru.jpg`
    if (await bannerExists(url)) return url
  }
  return null
}

async function bannerExists(url: string): Promise<boolean> {
  try {
    const res = await axios.head(url, { timeout: 8000, validateStatus: (s) => s === 200 || s === 404 })
    return res.status === 200
  } catch {
    return false
  }
}

export async function fetchDailyNewsForecast(): Promise<DailyNewsForecast | null> {
  const { data: xml } = await axios.get<string>(DAILYPOPUP_URL, { responseType: 'text', timeout: 20000 })

  const target = currentSprint() + 1
  const markerRe = new RegExp(`<!--\\s*DEBUT SPRINT ${target}\\s*-->`)
  const markerMatch = xml.match(markerRe)
  if (!markerMatch || markerMatch.index === undefined) return null

  const startIdx = markerMatch.index + markerMatch[0].length
  const nextMarkerIdx = xml.indexOf('<!-- DEBUT SPRINT', startIdx)
  const block = xml.slice(startIdx, nextMarkerIdx === -1 ? undefined : nextMarkerIdx)

  // Прямые семантические банеры отдельных офферов (image="hud/daily_news/news_X$$.jpg")
  // не отдаются по HTTP (проверено 2026-08-07 - 404 на обоих хостах), поэтому
  // для отдельных items картинку не тянем вообще - только filter/category как
  // текстовый список, а обложку блока даёт findCoverImage() (подтверждённый
  // паттерн 24h-баннера).
  const items: DailyNewsItem[] = []
  for (const offerXml of block.match(/<Offer\b[^>]*>[\s\S]*?<\/Offer>/g) ?? []) {
    const filter = offerXml.match(/<Filter>([^<]*)<\/Filter>/)?.[1]
    const category = offerXml.match(/category="([^"]*)"/)?.[1] ?? null
    if (filter) items.push({ filter, category, image: null })
  }

  const year = sprintStartDate(target).getUTCFullYear()
  const coverImage = await findCoverImage(target, year)

  return { sprint: target, dateRangeLabel: sprintRangeLabel(target), items, coverImage }
}
