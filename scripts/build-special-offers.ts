import axios from 'axios'
import fs from 'fs/promises'
import fssync from 'fs'
import path from 'path'

// Каталог "спец. предложений" для /guides - разовые офферы, которые всплывают
// игроку при достижении определённого уровня (levelUp-триггер). Источник -
// impulsivepromo.xml (расписание триггер->оффер) + shopitems.xml (реальное
// содержимое каждого оффера, помечено Tag key="impulsive" value="true").
//
// impulsivepromo.xml сам документирует, что триггеры кроме levelUp
// ("winGene", "buying", "playerLoseChance", "closeBankNoBuy", "closeGacha1st",
// "closeJackpot1st") помечены как "Not implemented triggers" - т.е. они лежат
// в конфиге, но НИКОГДА не показываются игроку. Берём только levelUp.
//
// Групповая логика (option/rand_X -> атомарный исход, per-article rand,
// гарантированные предметы без rand) идентична scripts/build-boxes.ts -
// тот же движок ShopItem/ArticleItems.

const SHOPITEMS_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/shopitems.xml'
const LOC_RU_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/localisation_ru.txt'
const THUMB_BASE = 'https://s-beta.kobojo.com/mutants/assets/thumbnails/'

const MUTANTS_PATH = path.join(process.cwd(), 'src/data/mutants/mutants.json')
const ICON_DIR = path.join(process.cwd(), 'public/special-offers')
const OUT_PATH = path.join(process.cwd(), 'src/data/guides/special-offers.json')

const TIER_WORDS = new Set(['normal', 'bronze', 'silver', 'gold', 'platinum'])
const TIER_RU: Record<string, string> = {
  normal: 'обычный',
  bronze: 'бронза',
  silver: 'серебро',
  gold: 'золото',
  platinum: 'платина',
}
const STAR_INDEX_TO_TIER = ['normal', 'bronze', 'silver', 'gold', 'platinum']

interface MutantRef {
  id: string
  name: string
  tier: string | null
  skin: string | null
}
interface RewardRef {
  name: string
  type: 'entity' | 'hardcurrency' | 'softcurrency'
  amount: number
}
interface OfferGroup {
  chance: number | null
  mutants: MutantRef[]
  rewards: RewardRef[]
}
interface OfferEntry {
  id: string
  shopItemId: string
  name: string
  icon: string | null
  level: number
  cost: { amount: number; type: 'hardcurrency' | 'softcurrency' } | null
  realPriceUsd: number | null
  groups: OfferGroup[]
}

function parseAttrs(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of attrStr.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2]
  return attrs
}

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
    if (!locLower.has(key.toLowerCase())) locLower.set(key.toLowerCase(), val)
  }
  function lookup(key: string): string | undefined {
    return loc.get(key) ?? locLower.get(key.toLowerCase())
  }

  const mutantIds = new Set(mutants.map((m) => m.id.toLowerCase()))
  const mutantNameById = new Map(mutants.map((m) => [m.id.toLowerCase(), m.name]))

  function resolveName(itemId: string, caption: string | undefined): string {
    const byItemId = lookup(itemId)
    if (byItemId) return balanceQuotes(byItemId)
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
    return itemId
      .replace(/^#\w+-\d+-/, '')
      .replace(/^#/, '')
      .replace(/_/g, ' ')
      .trim()
  }

  await fs.mkdir(ICON_DIR, { recursive: true })
  const existingIcons = new Set(
    fssync.readdirSync(ICON_DIR).map((f) => path.basename(f, path.extname(f))),
  )

  // Известный баг игровых данных: picture="luckybox_legend_gold_duo$$" (лишний "$$"
  // прямо в атрибуте) -> 404 даже на CDN Kobojo (тот же баг, что в build-boxes.ts,
  // коммит 33a819c77). Дуо-бокс визуально идентичен обычному "Золотому легендарному
  // контейнеру" (только награды x2) - переиспользуем его иконку, а не левую ёлочную.
  const BROKEN_PICTURE_FALLBACK: Record<string, string> = {
    luckybox_legend_gold_duo$$: 'lucky_box_xmas_gold',
  }

  async function ensureIcon(pictureRaw: string | undefined): Promise<string | null> {
    const picture = pictureRaw ? (BROKEN_PICTURE_FALLBACK[pictureRaw] ?? pictureRaw) : pictureRaw
    if (!picture) return null
    if (existingIcons.has(picture)) return `/special-offers/${picture}.png`
    try {
      const res = await axios.get<ArrayBuffer>(`${THUMB_BASE}${picture}.png`, {
        responseType: 'arraybuffer',
        timeout: 15000,
      })
      await fs.writeFile(path.join(ICON_DIR, `${picture}.png`), Buffer.from(res.data))
      existingIcons.add(picture)
      return `/special-offers/${picture}.png`
    } catch {
      return null
    }
  }

  function toMutantOrReward(
    typeId: string,
    tags: Record<string, string>,
  ): { mutant: MutantRef } | { reward: RewardRef } {
    const idLower = typeId.toLowerCase()
    if (mutantIds.has(idLower)) {
      const skinVal = tags.skin
      const isTier = skinVal != null && TIER_WORDS.has(skinVal.toLowerCase())
      const starsTag = tags.stars
      let tier: string | null = null
      if (isTier) tier = TIER_RU[skinVal.toLowerCase()]
      else if (starsTag != null && STAR_INDEX_TO_TIER[Number(starsTag)]) {
        tier = TIER_RU[STAR_INDEX_TO_TIER[Number(starsTag)]]
      }
      const cosmeticSkin = skinVal && !isTier ? skinVal : null
      return {
        mutant: {
          id: idLower,
          name: mutantNameById.get(idLower) ?? typeId,
          tier,
          skin: cosmeticSkin,
        },
      }
    }
    const amount = tags.amount != null ? Number(tags.amount) : 1
    if (/^(gold|hardcurrency)$/i.test(typeId) || typeId === '') {
      return { reward: { name: 'gold', type: 'hardcurrency', amount } }
    }
    if (/^(silver|softcurrency)$/i.test(typeId)) {
      return { reward: { name: 'silver', type: 'softcurrency', amount } }
    }
    return { reward: { name: typeId, type: 'entity', amount } }
  }

  const shopItemRe = /<ShopItem\b([^>]*)>([\s\S]*?)<\/ShopItem>/g
  const articleRe = /<ArticleItem\b([^>]*?)(?:\/>|>([\s\S]*?)<\/ArticleItem>)/g
  const topLevelTagRe = /<Tag key="([^"]+)" value="([^"]*)"\s*\/>/g

  const offers: OfferEntry[] = []
  let downloaded = 0
  let m: RegExpExecArray | null

  while ((m = shopItemRe.exec(xml))) {
    const attrs = parseAttrs(m[1])
    const body = m[2]
    const itemId = attrs.itemId ?? ''

    if (!/key="impulsive" value="true"/.test(body)) continue

    const triggerMatch = itemId.match(/^#levelUp-(\d+)-(.+)$/)
    if (!triggerMatch) continue // не levelUp - остальные триггеры не реализованы в игре

    const level = Number(triggerMatch[1])
    const shopItemId = triggerMatch[2]

    const articles: { typeId: string; tags: Record<string, string> }[] = []
    let am: RegExpExecArray | null
    articleRe.lastIndex = 0
    while ((am = articleRe.exec(body))) {
      const articleAttrs = parseAttrs(am[1])
      const tags: Record<string, string> = {}
      if (am[2]) {
        for (const tm of am[2].matchAll(/key="([^"]+)" value="([^"]*)"/g)) tags[tm[1]] = tm[2]
      }
      if (articleAttrs.amount != null && tags.amount == null) tags.amount = articleAttrs.amount
      articles.push({ typeId: articleAttrs.typeId ?? '', tags })
    }
    if (articles.length === 0) continue

    const shopTags: Record<string, string> = {}
    topLevelTagRe.lastIndex = 0
    let tm2: RegExpExecArray | null
    while ((tm2 = topLevelTagRe.exec(body))) shopTags[tm2[1]] = tm2[2]

    const picture = attrs.picture
    const iconBefore = picture ? existingIcons.has(picture) : false
    const icon = await ensureIcon(picture)
    if (!iconBefore && icon) downloaded++

    const captionMatch = m[0].match(/caption="([^"]*)"/)
    const name = resolveName(shopItemId, captionMatch?.[1])

    const costMatch = body.match(/<Cost amount="([^"]+)" type="([^"]+)"/)
    const cost = costMatch
      ? {
          amount: Number(costMatch[1]),
          type: (costMatch[2] === 'softcurrency' ? 'softcurrency' : 'hardcurrency') as
            'hardcurrency' | 'softcurrency',
        }
      : null
    const realPriceMatch = body.match(/<RealPrices Currency="USD" Value="([^"]+)"/)
    const realPriceUsd = realPriceMatch ? Number(realPriceMatch[1]) : null

    const orderedKeys: string[] = []
    const articlesByOption = new Map<string, typeof articles>()
    for (const art of articles) {
      const key = art.tags.option ?? `__solo_${orderedKeys.length}`
      if (!articlesByOption.has(key)) {
        articlesByOption.set(key, [])
        orderedKeys.push(key)
      }
      articlesByOption.get(key)!.push(art)
    }

    const rawGroups = orderedKeys.map((key) => {
      const arts = articlesByOption.get(key)!
      const fromOptionTag = key.startsWith('__solo_') ? undefined : shopTags[`rand_${key}`]
      const fromSoloTag = arts.length === 1 ? arts[0].tags.rand : undefined
      const weightStr = fromOptionTag ?? fromSoloTag
      const weight = weightStr != null ? Number(weightStr) : null
      return { arts, weight }
    })
    const totalWeight = rawGroups.reduce((sum, g) => sum + (g.weight ?? 0), 0)

    const groups: OfferGroup[] = rawGroups.map(({ arts, weight }) => {
      const group: OfferGroup = {
        chance: weight != null && totalWeight > 0 ? (weight / totalWeight) * 100 : null,
        mutants: [],
        rewards: [],
      }
      for (const art of arts) {
        const resolved = toMutantOrReward(art.typeId, art.tags)
        if ('mutant' in resolved) group.mutants.push(resolved.mutant)
        else group.rewards.push(resolved.reward)
      }
      return group
    })

    offers.push({
      id: `levelup-${level}-${shopItemId.toLowerCase()}`,
      shopItemId,
      name,
      icon,
      level,
      cost,
      realPriceUsd,
      groups,
    })
  }

  offers.sort((a, b) => a.level - b.level)

  await fs.writeFile(OUT_PATH, JSON.stringify(offers, null, 2) + '\n', 'utf-8')

  console.log(
    `[SPECIAL-OFFERS] ${offers.length} офферов на ${new Set(offers.map((o) => o.level)).size} уровнях`,
  )
  console.log(`[SPECIAL-OFFERS] Иконок докачано: ${downloaded}`)
}

main().catch((err) => {
  console.error('[BUILD-SPECIAL-OFFERS] Ошибка:', err instanceof Error ? err.message : err)
  process.exit(1)
})
