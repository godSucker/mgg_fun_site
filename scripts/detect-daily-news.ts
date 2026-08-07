// Анонс ближайших daily_news-баннеров (Фаза 3, задача B). dailypopup.xml
// размечен теми же SPRINT-метками, что shopitems.xml (см. src/lib/sprint-
// calendar.ts) - берём блок офферов под ближайшим ещё не наступившим спринтом
// и достаём баннер каждого.
//
// ИСПРАВЛЕНО 2026-08-07: у каждого <Offer> есть СВОЙ путь картинки
// (image="hud/daily_news/news_X$$.jpg") - баннер РЕАЛЬНО существует, просто
// нужен языковой суффикс (-ru.jpg/-en.jpg), который я раньше не добавлял и
// поэтому ловил 404 на голом "news_X.jpg". Пользователь прислал список
// подтверждённых рабочих URL той же схемы (news_release_shop_db_13-ru.jpg,
// news_adaptive_shield-ru.jpg и т.д.) - все 200 OK. Пробуем -ru, потом -en.
export const LANG_SUFFIXES = ['ru', 'en'] as const

import axios from 'axios'
import { currentSprint, sprintRangeLabel, sprintStartDate } from '../src/lib/sprint-calendar'

const DAILYPOPUP_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/dailypopup.xml'
const BANNER_BASE = 'https://s-beta.kobojo.com/mutants/assets/hud/daily_news/'
const ASSETS_BASE = 'https://s-beta.kobojo.com/mutants/assets/'

interface DailyNewsItem {
  filter: string
  name: string
  category: string | null
  image: string | null
}

// dailypopup.xml хранит только внутренний Filter-тег ("Shop_Mystery_Anniversary26_2",
// "filter_dungeon_hexcity_2"), не готовое название - в отличие от shopitems.xml
// у оффера тут нет своего itemId/caption для похода в локализацию.
// Прогноз живёт 1-2 недели до попадания в build-boxes.ts/build-special-offers.ts
// с постоянным человекочитаемым именем - прямо сейчас достаточно причёсанного id.
function prettifyFilter(filter: string): string {
  return filter
    .replace(/^(shop_|filter_dungeon_|filter_)/i, '')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
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
    const res = await axios.head(url, {
      timeout: 8000,
      validateStatus: (s) => s === 200 || s === 404,
    })
    return res.status === 200
  } catch {
    return false
  }
}

// image="hud/daily_news/news_X$$.jpg" - путь УЖЕ содержит "hud/daily_news/",
// поэтому база - ASSETS_BASE (общий assets/), не BANNER_BASE. "$$" убираем,
// дальше пробуем оба языковых суффикса по очереди.
async function resolveOfferBanner(imageRaw: string): Promise<string | null> {
  const base = imageRaw.replace(/\$\$/g, '').replace(/\.jpg$/i, '')
  for (const lang of LANG_SUFFIXES) {
    const url = `${ASSETS_BASE}${base}-${lang}.jpg`
    if (await bannerExists(url)) return url
  }
  return null
}

export async function fetchDailyNewsForecast(): Promise<DailyNewsForecast | null> {
  const { data: xml } = await axios.get<string>(DAILYPOPUP_URL, {
    responseType: 'text',
    timeout: 20000,
  })

  const target = currentSprint() + 1
  const markerRe = new RegExp(`<!--\\s*DEBUT SPRINT ${target}\\s*-->`)
  const markerMatch = xml.match(markerRe)
  if (!markerMatch || markerMatch.index === undefined) return null

  const startIdx = markerMatch.index + markerMatch[0].length
  const nextMarkerIdx = xml.indexOf('<!-- DEBUT SPRINT', startIdx)
  const block = xml.slice(startIdx, nextMarkerIdx === -1 ? undefined : nextMarkerIdx)

  const rawItems: { filter: string; category: string | null; imageRaw: string | null }[] = []
  for (const offerXml of block.match(/<Offer\b[^>]*>[\s\S]*?<\/Offer>/g) ?? []) {
    const filter = offerXml.match(/<Filter>([^<]*)<\/Filter>/)?.[1]
    const category = offerXml.match(/category="([^"]*)"/)?.[1] ?? null
    const imageRaw = offerXml.match(/image="([^"]+)"/)?.[1] ?? null
    if (filter) rawItems.push({ filter, category, imageRaw })
  }

  const items: DailyNewsItem[] = []
  for (const it of rawItems) {
    const image = it.imageRaw ? await resolveOfferBanner(it.imageRaw) : null
    items.push({ filter: it.filter, name: prettifyFilter(it.filter), category: it.category, image })
  }

  const year = sprintStartDate(target).getUTCFullYear()
  const coverImage = items.find((it) => it.image)?.image ?? (await findCoverImage(target, year))

  return { sprint: target, dateRangeLabel: sprintRangeLabel(target), items, coverImage }
}
