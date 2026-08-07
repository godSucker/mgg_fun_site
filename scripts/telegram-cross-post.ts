// Кросс-пост анонсов в публичный Telegram-канал (не путать с TELEGRAM_CHAT_ID -
// это ЛИЧНЫЙ чат владельца для .локал-алертов из detect-new-*.ts). Нужен
// отдельный секрет TELEGRAM_CHANNEL_ID (id канала, боту нужны права админа
// с "Post Messages"). Best-effort: без секретов просто логирует и молчит,
// не роняет build-announcements.ts.
//
// Шаблоны по категориям обсуждены с пользователем 2026-08-07:
// - mutant/skin/raid/ladder/reactor/token: sendPhoto с готовой картинкой + caption.
// - box: sendPhoto (иконка бокса) + список мутантов из groups (обычно 6).
// - bingo: sendPhoto СО СКРИНШОТОМ доски с сайта (api/screenshot-bingo.ts,
//   Chromium на Vercel) + короткий текст "кто добавился".
// - exchange: sendMessage, простой текст (юзер сказал "и так норм").
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
}

export interface CrossPostAnnouncement {
  category: string
  title: string
  items: CrossPostItem[]
}

async function postSimplePhoto(
  icon: string,
  a: CrossPostAnnouncement,
  prefix: string,
): Promise<void> {
  const it = a.items[0]
  const image = it?.image
  const caption = `${icon} *${it?.name ?? a.title}*${LINK_LINE}`
  if (image) {
    await sendPhotoByUrl(toAbsolute(image), caption)
  } else {
    await sendMessage(`${icon} *${prefix}: ${it?.name ?? a.title}*${LINK_LINE}`)
  }
}

async function postBox(a: CrossPostAnnouncement): Promise<void> {
  const it = a.items[0]
  const boxes = await loadJson<
    { itemId: string; icon?: string; groups: { mutants: { name: string }[] }[] }[]
  >('src/data/boxes.json', [])
  const box = boxes.find((b) => b.itemId === it?.id)
  const names = box
    ? [...new Set(box.groups.flatMap((g) => g.mutants.map((m) => m.name)))].slice(0, 10)
    : []
  const list = names.length > 0 ? `\n\nВ боксе: ${names.join(', ')}` : ''
  const caption = `📦 *Новый бокс: ${it?.name ?? a.title}*${list}${LINK_LINE}`
  if (box?.icon) {
    await sendPhotoByUrl(toAbsolute(box.icon), caption)
  } else {
    await sendMessage(caption)
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
  const names = bingo?.mutants.map((m) => mutantNames[m.specimenId] ?? m.specimenId) ?? []
  const preview = names.slice(0, 5).join(', ')
  const rest = names.length > 5 ? ` и ещё ${names.length - 5}` : ''
  const caption = `🎲 *Новая бинго-доска: ${it.name}*\n\nУчастники: ${preview}${rest}${LINK_LINE}`

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

async function postShopAndDailyNews(
  shop: CrossPostAnnouncement | null,
  daily: CrossPostAnnouncement | null,
): Promise<void> {
  const shopIt = shop?.items[0]
  const dailyIt = daily?.items[0]
  const dateLabel = (shopIt?.name.match(/\(([^)]+)\)/) ?? [])[1] ?? ''

  const lines: string[] = [`🛒 *Прогноз магазина${dateLabel ? `: ${dateLabel}` : ''}*`]
  if (shopIt) lines.push(`\n📋 *Офферы:* ${shopIt.name.replace(/^Прогноз магазина[^:]*:\s*/, '')}`)
  if (dailyIt)
    lines.push(`\n📰 *Скоро в игре:* ${dailyIt.name.replace(/^Скоро в игре[^:]*:\s*/, '')}`)
  const caption = `${lines.join('\n')}${LINK_LINE}`

  const image = shopIt?.image ?? dailyIt?.image
  if (image) {
    await sendPhotoByUrl(toAbsolute(image), caption)
  } else {
    await sendMessage(caption)
  }
}

const PHOTO_ICON: Record<string, { icon: string; prefix: string }> = {
  mutant: { icon: '🧬', prefix: 'Новый мутант' },
  skin: { icon: '🎨', prefix: 'Новый скин' },
  raid: { icon: '⚔️', prefix: 'Новый рейд' },
  ladder: { icon: '🪜', prefix: 'Новая лесенка' },
  reactor: { icon: '🎰', prefix: 'Новый реактор' },
  token: { icon: '🪙', prefix: 'Новый жетон' },
}

// Вызывается из build-announcements.ts для каждой СВЕЖЕОПУБЛИКОВАННОЙ записи
// за этот прогон. shopForecast/dailyNews/rebalance обрабатываются отдельно
// в main() (комбо-пост и полное игнорирование соответственно).
export async function crossPostAnnouncement(a: CrossPostAnnouncement): Promise<void> {
  if (a.items.length === 0) return
  const simple = PHOTO_ICON[a.category]
  if (simple) {
    await postSimplePhoto(simple.icon, a, simple.prefix)
    return
  }
  if (a.category === 'box') return postBox(a)
  if (a.category === 'bingo') return postBingo(a)
  if (a.category === 'exchange') return postExchange(a)
}

export { postShopAndDailyNews }
