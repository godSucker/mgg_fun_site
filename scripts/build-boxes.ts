import axios from 'axios'
import fs from 'fs/promises'
import fssync from 'fs'
import path from 'path'

// Каталог боксов для /boxes - строится НАПРЯМУЮ из shopitems.xml (s-beta), а не из
// obtain.json. obtain.json проиндексирован по мутанту и не хранит исходный itemId
// бокса - из-за этого было невозможно (а) показать боксы без единого мутанта
// (чисто ресурсные), (б) проверить полноту дроп-пула, (в) различить skin-тег,
// который у игры одним полем хранит то тир (bronze/silver/gold/platinum), то
// реальный косметический скин (wireframe/anniversary/...). Ключ карточки - настоящий
// itemId ShopItem, не текстовое название (одно и то же название вроде "Легендарный
// киберконтейнер" легитимно переиспользуется игрой для РАЗНЫХ продуктов).
//
// obtain.json НЕ трогаем и не перегенерируем - там кураторский текст (7 коммитов
// ручной калибровки + фиксы нечитаемых имён), см. память
// obtain-trigger-offer-names-fixed.

const SHOPITEMS_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/shopitems.xml'
const LOC_RU_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/localisation_ru.txt'
const THUMB_BASE = 'https://s-beta.kobojo.com/mutants/assets/thumbnails/'

const MUTANTS_PATH = path.join(process.cwd(), 'src/data/mutants/mutants.json')
const BOXES_ICON_DIR = path.join(process.cwd(), 'public/boxes')
const OUT_PATH = path.join(process.cwd(), 'src/data/boxes.json')

const TIER_WORDS = new Set(['normal', 'bronze', 'silver', 'gold', 'platinum'])
const TIER_RU: Record<string, string> = {
  normal: 'обычный',
  bronze: 'бронза',
  silver: 'серебро',
  gold: 'золото',
  platinum: 'платина',
}
const STAR_INDEX_TO_TIER = ['normal', 'bronze', 'silver', 'gold', 'platinum']

interface BoxMutantRef {
  id: string
  name: string
  tier: string | null
  skin: string | null
}
interface BoxReward {
  name: string
  type: 'entity' | 'hardcurrency' | 'softcurrency'
  amount: number
}
interface BoxEntry {
  itemId: string
  icon: string | null
  category: string
  name: string
  mutants: BoxMutantRef[]
  rewards: BoxReward[]
}

function parseAttrs(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of attrStr.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2]
  return attrs
}

// Часть названий боксов в игровой локализации обрезаны (не хватает закрывающей
// «кавычки») - см. Luckybox_Independence_2026. Балансируем на выходе.
function balanceQuotes(name: string): string {
  const open = (name.match(/«/g) ?? []).length
  const close = (name.match(/»/g) ?? []).length
  return open > close ? name + '»'.repeat(open - close) : name
}

async function main() {
  const [{ data: xml }, { data: locRaw }, mutants] = await Promise.all([
    axios.get<string>(SHOPITEMS_URL, { responseType: 'text' }),
    axios.get<string>(LOC_RU_URL, { responseType: 'text' }),
    fs.readFile(MUTANTS_PATH, 'utf-8').then((t) => JSON.parse(t) as { id: string; name: string }[]),
  ])

  const loc = new Map<string, string>()
  const locLower = new Map<string, string>()
  for (const rawLine of locRaw.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const i = line.indexOf(';')
    if (i === -1) continue
    const key = line.slice(0, i)
    const val = line.slice(i + 1)
    loc.set(key, val)
    // Локализация регистро-непоследовательна относительно itemId в shopitems.xml
    // (LuckyBox_Halloween24 в шопе, Luckybox_Halloween24 в локализации) -
    // регистронезависимая карта как второй проход.
    if (!locLower.has(key.toLowerCase())) locLower.set(key.toLowerCase(), val)
  }

  const mutantIds = new Set(mutants.map((m) => m.id.toLowerCase()))
  const mutantNameById = new Map(mutants.map((m) => [m.id.toLowerCase(), m.name]))

  function lookup(key: string): string | undefined {
    return loc.get(key) ?? locLower.get(key.toLowerCase())
  }

  function resolveName(itemId: string, caption: string | undefined): string {
    // itemId почти всегда сам является ключом короткого названия в локализации -
    // надёжнее, чем caption (тот часто указывает на длинный tooltip/description).
    const byItemId = lookup(itemId)
    if (byItemId) return balanceQuotes(byItemId)

    // Год/номер в itemId иногда отсутствует в ключе локализации
    // (Luckybox_Valentines21 в шопе -> Luckybox_Valentines в локализации).
    const withoutTrailingDigits = itemId.replace(/\d+$/, '')
    if (withoutTrailingDigits !== itemId) {
      const byStripped = lookup(withoutTrailingDigits)
      if (byStripped) return balanceQuotes(byStripped)
    }

    if (caption) {
      const strippedKey = caption
        .replace(/^\$/, '')
        .replace(/_description$/, '')
        .replace(/_payment_text$/, '')
        .replace(/_tooltip$/, '')
      const byCaption = lookup(strippedKey) ?? lookup(caption)
      if (byCaption && byCaption.length <= 80) return balanceQuotes(byCaption)
    }

    // Совсем не нашли короткого названия - форматируем itemId, это лучше сырого кода.
    return itemId
      .replace(/^#\w+-\d+-/, '')
      .replace(/^#/, '')
      .replace(/_/g, ' ')
      .trim()
  }

  await fs.mkdir(BOXES_ICON_DIR, { recursive: true })
  const existingIcons = new Set(
    fssync.readdirSync(BOXES_ICON_DIR).map((f) => path.basename(f, path.extname(f))),
  )

  // Известный баг игровых данных: picture="luckybox_legend_gold_duo$$" (лишний "$$"
  // прямо в атрибуте) -> 404 даже на CDN Kobojo. Фоллбэк на близкую по теме иконку,
  // тот же фикс уже применялся раньше для этого случая (коммит 33a819c77).
  const BROKEN_PICTURE_FALLBACK: Record<string, string> = {
    luckybox_legend_gold_duo$$: 'lucky_box_xmas_gold',
  }

  async function ensureIcon(pictureRaw: string): Promise<string | null> {
    const picture = BROKEN_PICTURE_FALLBACK[pictureRaw] ?? pictureRaw
    if (!picture) return null
    if (existingIcons.has(picture)) return `/boxes/${picture}.png`
    try {
      const res = await axios.get<ArrayBuffer>(`${THUMB_BASE}${picture}.png`, {
        responseType: 'arraybuffer',
        timeout: 15000,
      })
      await fs.writeFile(path.join(BOXES_ICON_DIR, `${picture}.png`), Buffer.from(res.data))
      existingIcons.add(picture)
      return `/boxes/${picture}.png`
    } catch {
      return null
    }
  }

  const boxIconBasenames = existingIcons // расширяется по мере скачивания новых

  const shopItemRe = /<ShopItem\b([^>]*)>([\s\S]*?)<\/ShopItem>/g
  const articleRe = /<ArticleItem typeId="([^"]+)">([\s\S]*?)<\/ArticleItem>/g

  const boxes: BoxEntry[] = []
  let downloaded = 0
  let m: RegExpExecArray | null

  while ((m = shopItemRe.exec(xml))) {
    const attrs = parseAttrs(m[1])
    const body = m[2]
    const itemId = attrs.itemId ?? ''
    const picture = attrs.picture ?? ''
    if (!itemId || !picture) continue

    const isBoxLike = boxIconBasenames.has(picture) || /luckybox|lucky_box|mystery/i.test(itemId)
    if (!isBoxLike) continue

    const articles: { typeId: string; tags: Record<string, string> }[] = []
    let am: RegExpExecArray | null
    articleRe.lastIndex = 0
    while ((am = articleRe.exec(body))) {
      const tags: Record<string, string> = {}
      for (const tm of am[2].matchAll(/key="([^"]+)" value="([^"]*)"/g)) tags[tm[1]] = tm[2]
      articles.push({ typeId: am[1], tags })
    }
    if (articles.length === 0) continue // не гача-пул (обычный магазинный товар) - пропускаем

    const iconBefore = existingIcons.has(picture)
    const icon = await ensureIcon(picture)
    if (!iconBefore && icon) downloaded++

    const captionMatch = m[0].match(/caption="([^"]*)"/)
    const name = resolveName(itemId, captionMatch?.[1])
    const category = /luckybox|lucky_box/i.test(itemId)
      ? 'Лаки-бокс'
      : /mystery/i.test(itemId)
        ? 'Мистери-бокс'
        : ''

    const box: BoxEntry = { itemId, icon, category, name, mutants: [], rewards: [] }

    for (const art of articles) {
      const idLower = art.typeId.toLowerCase()
      if (mutantIds.has(idLower)) {
        const skinVal = art.tags.skin
        const isTier = skinVal != null && TIER_WORDS.has(skinVal.toLowerCase())
        const starsTag = art.tags.stars
        let tier: string | null = null
        if (isTier) tier = TIER_RU[skinVal.toLowerCase()]
        else if (starsTag != null && STAR_INDEX_TO_TIER[Number(starsTag)]) {
          tier = TIER_RU[STAR_INDEX_TO_TIER[Number(starsTag)]]
        }
        const cosmeticSkin = skinVal && !isTier ? skinVal : null
        box.mutants.push({
          id: idLower,
          name: mutantNameById.get(idLower) ?? art.typeId,
          tier,
          skin: cosmeticSkin,
        })
      } else {
        const amount = art.tags.amount != null ? Number(art.tags.amount) : 1
        if (/^gold$/i.test(art.typeId) || art.typeId === '') {
          box.rewards.push({ name: 'gold', type: 'hardcurrency', amount })
        } else if (/^silver$/i.test(art.typeId)) {
          box.rewards.push({ name: 'silver', type: 'softcurrency', amount })
        } else {
          box.rewards.push({ name: art.typeId, type: 'entity', amount })
        }
      }
    }

    boxes.push(box)
  }

  boxes.sort((a, b) => b.mutants.length - a.mutants.length)
  await fs.writeFile(OUT_PATH, JSON.stringify(boxes, null, 2) + '\n', 'utf-8')

  const withMutants = boxes.filter((b) => b.mutants.length > 0).length
  const resourceOnly = boxes.filter((b) => b.mutants.length === 0).length
  const withoutIcon = boxes.filter((b) => !b.icon).length
  console.log(
    `[BOXES] ${boxes.length} боксов (${withMutants} с мутантами, ${resourceOnly} чисто ресурсных)`,
  )
  console.log(`[BOXES] Иконок докачано: ${downloaded}, без иконки: ${withoutIcon}`)
}

main().catch((err) => {
  console.error('[BUILD-BOXES] Ошибка:', err instanceof Error ? err.message : err)
  process.exit(1)
})
