// Кросс-пост анонсов в публичный Telegram-канал (не путать с TELEGRAM_CHAT_ID -
// это ЛИЧНЫЙ чат владельца для .локал-алертов из detect-new-*.ts). Нужен
// отдельный секрет TELEGRAM_CHANNEL_ID (id канала, боту нужны права админа
// с "Post Messages"). Best-effort: без секретов просто логирует и молчит,
// не роняет build-announcements.ts.
//
// Шаблоны по категориям (обновлено 2026-08-07 - "шаблоны бота как сейчас на
// странице анонсов"): mutant/skin/raid/ladder/reactor/token/box шлются
// СКРИНШОТОМ реальной карточки с /announcements (api/screenshot-announcement.ts,
// Chromium на Vercel, тот же паттерн, что уже был у bingo) - карточка на сайте
// единственный источник правды по виду, бот её не дублирует вторым шаблоном.
// Фолбэк на старый текст+картинка-по-URL, если скриншот не удался (сеть,
// таймаут Chromium) - см. postGenericCard.
// - bingo: ОТДЕЛЬНЫЙ путь (api/screenshot-bingo.ts) - карточка бинго сама
//   встраивает <img src="/api/screenshot-bingo">, скриншотить её через общий
//   эндпоинт means Chromium-в-Chromium, не делаем.
// - exchange: sendMessage, простой текст (юзер сказал "и так норм") - пост
//   агрегирует НЕСКОЛЬКО обменников разом, 1:1 с одной карточкой сайта не бьётся.
// - shopForecast + dailyNews: ОБЪЕДИНЯЮТСЯ в один пост (юзер: "dailyNews
//   можно засунуть сразу в прогноз магазина"), стиль по референсу pokradex.org
//   ("NOVEDADES DEL X AL Y" + разделы) - у нас текстовый аналог, т.к. нет
//   персональных скриншотов на каждый оффер (см. память
//   kobojo-asset-url-patterns.md - индивидуальные daily_news банеры теперь
//   резолвятся, но полного набора картинок как у pokradex всё равно нет).
// - rebalance: НЕ кросс-постится (юзер: "не нужен, уже есть человек, который
//   этим занимается вручную") - остаётся только на сайте.

import fs from 'fs/promises'
import path from 'path'
import { bingoLabel } from '../src/lib/mutant-dicts'

// Тот же приём, что formatBingoTitle в bingo.astro/announcements.astro - id
// доски типа "morphology_anniversary26" вместо RU-названия иначе выглядит
// в посте как техническая абракадабра (фидбек 2026-08-07).
function formatBingoTitle(title: string, id: string): string {
  const labelById = bingoLabel(id)
  if (labelById && labelById !== id) return labelById
  const labelByTitle = bingoLabel(title)
  if (labelByTitle && labelByTitle !== title) return labelByTitle
  return title
    .replace(/^--------/, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const ROOT = process.cwd()
const SITE_ORIGIN = 'https://archivist-library.com'

function getCreds() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const channelId = process.env.TELEGRAM_CHANNEL_ID
  if (!botToken || !channelId) {
    console.log(
      '[CROSS-POST] TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL_ID не заданы, кросс-пост пропущен',
    )
    return null
  }
  return { botToken, channelId }
}

// CROSS_POST_TEST_MODE - для симуляции (scripts/simulate-announcements-test.ts)
// без риска перепутать тестовый пост с настоящим анонсом в канале. Прод-путь
// (env не задан) не меняется вообще.
function withTestLabel(text: string): string {
  return process.env.CROSS_POST_TEST_MODE ? `🧪 *ТЕСТ*\n${text}` : text
}

async function sendMessage(text: string): Promise<void> {
  const creds = getCreds()
  if (!creds) return
  text = withTestLabel(text)
  try {
    const res = await fetch(`https://api.telegram.org/bot${creds.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: creds.channelId, text, parse_mode: 'Markdown' }),
    })
    if (!res.ok) console.error('[CROSS-POST] sendMessage failed:', await res.text())
  } catch (err) {
    console.error('[CROSS-POST] sendMessage error:', err instanceof Error ? err.message : err)
  }
}

async function sendPhotoByUrl(photoUrl: string, caption: string): Promise<void> {
  const creds = getCreds()
  if (!creds) return
  caption = withTestLabel(caption)
  try {
    const res = await fetch(`https://api.telegram.org/bot${creds.botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: creds.channelId,
        photo: photoUrl,
        caption,
        parse_mode: 'Markdown',
      }),
    })
    if (!res.ok) {
      console.error('[CROSS-POST] sendPhoto(url) failed, фолбэк на текст:', await res.text())
      await sendMessage(caption)
    }
  } catch (err) {
    console.error('[CROSS-POST] sendPhoto(url) error:', err instanceof Error ? err.message : err)
    await sendMessage(caption)
  }
}

async function sendPhotoByBuffer(buffer: Buffer, caption: string, filename: string): Promise<void> {
  const creds = getCreds()
  if (!creds) return
  caption = withTestLabel(caption)
  try {
    const form = new FormData()
    form.append('chat_id', creds.channelId)
    form.append('caption', caption)
    form.append('parse_mode', 'Markdown')
    form.append('photo', new Blob([new Uint8Array(buffer)], { type: 'image/png' }), filename)
    const res = await fetch(`https://api.telegram.org/bot${creds.botToken}/sendPhoto`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      console.error('[CROSS-POST] sendPhoto(buffer) failed, фолбэк на текст:', await res.text())
      await sendMessage(caption)
    }
  } catch (err) {
    console.error('[CROSS-POST] sendPhoto(buffer) error:', err instanceof Error ? err.message : err)
    await sendMessage(caption)
  }
}

function toAbsolute(imagePath: string): string {
  return imagePath.startsWith('http') ? imagePath : `${SITE_ORIGIN}${imagePath}`
}

const LINK_LINE = `\n\n[Все анонсы →](${SITE_ORIGIN}/announcements)`

async function loadJson<T>(relPath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, relPath), 'utf-8'))
  } catch {
    return fallback
  }
}

export interface CrossPostItem {
  id: string
  name: string
  image?: string | null
  // Только для bingo: список мутантов, добавленных в УЖЕ существующую доску
  // (не новая доска целиком) - см. detectBingo в build-announcements.ts.
  addedNames?: string[]
}

export interface CrossPostAnnouncement {
  id: string
  category: string
  title: string
  items: CrossPostItem[]
}

// Скриншотит РЕАЛЬНУЮ карточку с /announcements (та же вёрстка, что видит
// живой посетитель сайта) через api/screenshot-announcement.ts. Фолбэк на
// старый текст+картинка-по-URL, если Chromium не ответил/упал по таймауту -
// кросс-пост не должен молчать только из-за недоступности рендера.
async function postGenericCard(
  icon: string,
  a: CrossPostAnnouncement,
  prefix: string,
): Promise<void> {
  const it = a.items[0]
  const caption = `${icon} *${it?.name ?? a.title}*${LINK_LINE}`
  try {
    const res = await fetch(
      `${SITE_ORIGIN}/api/screenshot-announcement?id=${encodeURIComponent(a.id)}`,
      { signal: AbortSignal.timeout(30000) },
    )
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer())
      await sendPhotoByBuffer(buffer, caption, `announcement-${a.id}.png`)
      return
    }
    console.error('[CROSS-POST] screenshot-announcement вернул', res.status)
  } catch (err) {
    console.error(
      '[CROSS-POST] screenshot-announcement error:',
      err instanceof Error ? err.message : err,
    )
  }
  const image = it?.image
  if (image) {
    await sendPhotoByUrl(toAbsolute(image), caption)
  } else {
    await sendMessage(`${icon} *${prefix}: ${it?.name ?? a.title}*${LINK_LINE}`)
  }
}

async function postBingo(a: CrossPostAnnouncement): Promise<void> {
  const it = a.items[0]
  if (!it) return
  const [bingos, mutantNames] = await Promise.all([
    loadJson<{ id: string; title: string; mutants: { specimenId: string }[] }[]>(
      'src/data/bingos.json',
      [],
    ),
    loadJson<Record<string, string>>('src/data/mutant_names.json', {}),
  ])
  const bingo = bingos.find((b) => b.id === it.id)
  const title = formatBingoTitle(bingo?.title ?? it.name, it.id)

  let caption: string
  if (it.addedNames && it.addedNames.length > 0) {
    // Доска уже существовала - это пополнение, не "новая доска".
    const who = it.addedNames.length === 1 ? 'Добавлен' : 'Добавлены'
    caption = `🎲 *Бинго «${title}»: новые участники*\n\n${who}: ${it.addedNames.join(', ')}${LINK_LINE}`
  } else {
    const names = bingo?.mutants.map((m) => mutantNames[m.specimenId] ?? m.specimenId) ?? []
    const preview = names.slice(0, 5).join(', ')
    const rest = names.length > 5 ? ` и ещё ${names.length - 5}` : ''
    caption = `🎲 *Новая бинго-доска: ${title}*\n\nУчастники: ${preview}${rest}${LINK_LINE}`
  }

  try {
    const res = await fetch(
      `${SITE_ORIGIN}/api/screenshot-bingo?board=${encodeURIComponent(it.id)}`,
      { signal: AbortSignal.timeout(30000) },
    )
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer())
      await sendPhotoByBuffer(buffer, caption, `bingo-${it.id}.png`)
      return
    }
    console.error('[CROSS-POST] screenshot-bingo вернул', res.status)
  } catch (err) {
    console.error('[CROSS-POST] screenshot-bingo error:', err instanceof Error ? err.message : err)
  }
  await sendMessage(caption)
}

async function postExchange(a: CrossPostAnnouncement): Promise<void> {
  const list = a.items.map((it) => `• ${it.name}`).join('\n')
  await sendMessage(`🔁 *Обновление зала обмена*\n\n${list}${LINK_LINE}`)
}

// shopForecast/dailyNews каждый - полноценная карточка-сетка (см.
// AnnouncementCard.astro, kind="forecast") с РЕАЛЬНЫМИ офферами (детекторы
// отдают items = все офферы спринта, не один summary-item, см.
// build-announcements.ts). РАНЬШЕ слался ОДИН пост (skip второго через
// `primary = shop ?? daily`) - на практике это тихо теряло dailyNews целиком,
// пользователь его в канале не видел вообще (фидбек 2026-08-07: "так и не
// пришло в телегу"). Теперь - два независимых поста, каждый своим скриншотом.
async function postForecastCard(a: CrossPostAnnouncement, icon: string): Promise<void> {
  const caption = `${icon} *${a.title}*${LINK_LINE}`
  try {
    const res = await fetch(
      `${SITE_ORIGIN}/api/screenshot-announcement?id=${encodeURIComponent(a.id)}`,
      { signal: AbortSignal.timeout(30000) },
    )
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer())
      await sendPhotoByBuffer(buffer, caption, `forecast-${a.id}.png`)
      return
    }
    console.error('[CROSS-POST] screenshot-announcement (forecast) вернул', res.status)
  } catch (err) {
    console.error(
      '[CROSS-POST] screenshot-announcement (forecast) error:',
      err instanceof Error ? err.message : err,
    )
  }
  const image = a.items[0]?.image
  if (image) {
    await sendPhotoByUrl(toAbsolute(image), caption)
  } else {
    await sendMessage(caption)
  }
}

async function postShopAndDailyNews(
  shop: CrossPostAnnouncement | null,
  daily: CrossPostAnnouncement | null,
): Promise<void> {
  if (shop) await postForecastCard(shop, '🛒')
  if (daily) await postForecastCard(daily, '📰')
}

const PHOTO_ICON: Record<string, { icon: string; prefix: string }> = {
  mutant: { icon: '🧬', prefix: 'Новый мутант' },
  skin: { icon: '🎨', prefix: 'Новый скин' },
  raid: { icon: '⚔️', prefix: 'Новый рейд' },
  ladder: { icon: '🪜', prefix: 'Новая лесенка' },
  reactor: { icon: '🎰', prefix: 'Новый реактор' },
  token: { icon: '🪙', prefix: 'Новый жетон' },
  box: { icon: '📦', prefix: 'Новый бокс' },
}

// Вызывается из build-announcements.ts для каждой СВЕЖЕОПУБЛИКОВАННОЙ записи
// за этот прогон. shopForecast/dailyNews/rebalance обрабатываются отдельно
// в main() (комбо-пост и полное игнорирование соответственно).
export async function crossPostAnnouncement(a: CrossPostAnnouncement): Promise<void> {
  if (a.items.length === 0) return
  if (a.category === 'bingo') return postBingo(a)
  if (a.category === 'exchange') return postExchange(a)
  const simple = PHOTO_ICON[a.category]
  if (simple) {
    await postGenericCard(simple.icon, a, simple.prefix)
  }
}

export { postShopAndDailyNews }
