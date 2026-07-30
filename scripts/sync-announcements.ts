// Собирает src/data/announcements.json из беты MGG: текущий "спринт" в
// dailypopup.xml сопоставляется с shopitems.xml (Cost/ArticleItems) и
// gamedefinitions.xml (статы/имена), плюс bingo-сетка текущего события.
//
// Бета-CDN отдаёт все конфиги как plain XML без авторизации (тот же приём уже
// используется в sync-mutants.ts для LOC_RU_URL) - здесь просто читаем больше
// файлов из того же источника: dailypopup.xml (расписание офферов) и
// shopitems.xml (содержимое коробок), которых раньше в парсере не было.
//
// "Спринт" - это версия-счётчик за всю историю конфига (там есть записи ещё
// 2019 года), а не отдельный магазинный день. Текущий спринт определяем как
// максимальный номер, для которого хотя бы один Offer.Filter резолвится в
// реальный ShopItem с Cost (у ещё не наполненных "будущих" спринтов там пусто).
//
// Регэкспом, а не XMLParser/fast-xml-parser: минифицированный shopitems.xml
// не парсится через DOM-обходчики (см. gotcha в CLAUDE.md), а плоский regex
// по атрибутам это обходит - то же решение, что в beta_watch.py (прототип,
// живёт вне репо в 4443/ из-за NDA на остальной RE-тулинг).
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'

const BETA_HOST = 'https://s-beta.kobojo.com/mutants'
const PROD_HOST = 'https://s-ak.kobojo.com/mutants' // тот же байт-в-байт контент, уже используется в sync-mutants.ts
const OUT_PATH = path.join(process.cwd(), 'src/data/announcements.json')

const STAR_NAME: Record<string, string> = { '1': 'bronze', '2': 'silver', '3': 'gold', '4': 'platinum' }
const STAR_RU: Record<string, string> = { bronze: 'бронза', silver: 'серебро', gold: 'золото', platinum: 'платина' }
const CURRENCY_ICON: Record<string, string> = {
  hardcurrency: 'https://cdn.archivist-library.com/cash/hardcurrency.webp',
  softcurrency: 'https://cdn.archivist-library.com/cash/softcurrency.webp',
}
const CURRENCY_NAME: Record<string, string> = { hardcurrency: 'золото', softcurrency: 'серебро' }

async function fetchText(url: string): Promise<string> {
  const res = await axios.get<string>(url, { responseType: 'text', timeout: 20000 })
  return res.data
}

function loadLocalisation(txt: string): Record<string, string> {
  const ru: Record<string, string> = {}
  for (const raw of txt.split('\n')) {
    const line = raw.replace(/^﻿/, '')
    const idx = line.indexOf(';')
    if (idx > -1) ru[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return ru
}

// ==================== specimens (gamedefinitions.xml) ====================

interface Specimen {
  id: string
  life?: string
  atk1?: string
  atk2?: string
  dna?: string
  nameRu: string
  nameEn: string
}

function parseSpecimens(xml: string, ru: Record<string, string>, en: Record<string, string>): Map<string, Specimen> {
  const out = new Map<string, Specimen>()
  const blocks = xml.split(/(?=<EntityDescriptor id=")/)
  for (const block of blocks) {
    const idM = block.match(/^<EntityDescriptor id="([^"]+)"/)
    if (!idM || !idM[1].startsWith('Specimen_')) continue
    const sid = idM[1]
    const tag = (key: string) => block.match(new RegExp(`<Tag key="${key}" value="([^"]*)"`))?.[1]
    out.set(sid, {
      id: sid,
      life: tag('lifePoint'),
      atk1: tag('atk1'),
      atk2: tag('atk2'),
      dna: tag('dna'),
      nameRu: ru[sid] ?? '',
      nameEn: en[sid] ?? '',
    })
  }
  return out
}

// ==================== shopitems.xml ====================

interface ArticleTag { [key: string]: string }
interface ArticleItem { typeId: string; amount: number; tags: ArticleTag }
interface ShopItem {
  itemId: string
  picture: string | null
  caption: string | null
  cost: { amount: number; type: string } | null
  articles: ArticleItem[]
}

function parseShopItems(xml: string): { byId: Map<string, ShopItem>; byFilter: Map<string, ShopItem> } {
  const byId = new Map<string, ShopItem>()
  const byFilter = new Map<string, ShopItem>()
  const re = /<ShopItem\b([^>]*)>([\s\S]*?)<\/ShopItem>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const [, head, body] = m
    const idM = head.match(/itemId="([^"]*)"/)
    if (!idM) continue
    const itemId = idM[1]
    const picture = head.match(/picture="([^"]*)"/)?.[1] ?? null
    const caption = head.match(/caption="([^"]*)"/)?.[1] ?? null
    const filter = body.match(/<Filter>([^<]*)<\/Filter>/)?.[1]
    const costM = body.match(/<Cost\b[^>]*amount="([^"]*)"[^>]*type="([^"]*)"/)
    const articles: ArticleItem[] = []
    const artRe = /<ArticleItem\b([^>]*?)(?:\/>|>([\s\S]*?)<\/ArticleItem>)/g
    let am: RegExpExecArray | null
    while ((am = artRe.exec(body))) {
      const [, ahead, abody = ''] = am
      const atid = ahead.match(/typeId="([^"]*)"/)
      if (!atid) continue
      const amt = ahead.match(/amount="([^"]*)"/)
      const tags: ArticleTag = {}
      const tagRe = /<Tag key="([^"]+)" value="([^"]*)"/g
      let tm: RegExpExecArray | null
      while ((tm = tagRe.exec(abody))) tags[tm[1]] = tm[2]
      articles.push({ typeId: atid[1], amount: amt ? parseInt(amt[1], 10) : 1, tags })
    }
    const entry: ShopItem = {
      itemId,
      picture,
      caption,
      cost: costM ? { amount: parseInt(costM[1], 10), type: costM[2] } : null,
      articles,
    }
    byId.set(itemId, entry)
    if (filter) byFilter.set(filter, entry)
  }
  return { byId, byFilter }
}

// ==================== icon / name resolution ====================

interface PendingIcon { target: Record<string, unknown>; key: string; candidates: string[] }

function rawIcon(picture: string | null | undefined): string | null {
  if (!picture || picture.includes('$$')) return null
  return `${PROD_HOST}/assets/thumbnails/${picture.toLowerCase()}.png`
}

function nameFor(itemId: string, ru: Record<string, string>, caption?: string | null): string {
  if (itemId === 'Material_Hexcity_Token') return 'Жетон Hexcity'
  for (const k of [itemId, itemId.toLowerCase(), caption?.replace(/^\$/, ''), caption]) {
    if (k && ru[k]) return ru[k]
  }
  return itemId
}

class Resolver {
  pending: PendingIcon[] = []
  usedSpecimens = new Set<string>()
  constructor(
    private ru: Record<string, string>,
    private specimens: Map<string, Specimen>,
    private shopById: Map<string, ShopItem>,
  ) {}

  articleCandidates(typeId: string, tags: ArticleTag = {}): string[] {
    if (CURRENCY_ICON[typeId]) return [CURRENCY_ICON[typeId]]
    const base = typeId.toLowerCase()
    const cands: (string | null)[] = []
    const skin = tags.skin
    const stars = tags.stars
    if (skin && skin !== '_any') cands.push(rawIcon(`${base}_${skin}`))
    else if (stars && STAR_NAME[stars]) cands.push(rawIcon(`${base}_${STAR_NAME[stars]}`))
    const si = this.shopById.get(typeId)
    if (si?.picture) cands.push(rawIcon(si.picture))
    cands.push(rawIcon(base))
    const seen = new Set<string>()
    const out: string[] = []
    for (const c of cands) {
      if (c && !seen.has(c)) { seen.add(c); out.push(c) }
    }
    return out
  }

  resolveArticle(typeId: string, amount: number, tags: ArticleTag = {}) {
    if (typeId.toLowerCase().startsWith('specimen_')) this.usedSpecimens.add(typeId)
    let name: string
    if (CURRENCY_NAME[typeId]) {
      name = CURRENCY_NAME[typeId]
    } else {
      const sp = this.specimens.get(typeId)
      const si = this.shopById.get(typeId)
      if (sp) name = sp.nameRu || typeId
      else if (si) name = nameFor(typeId, this.ru, si.caption)
      else name = nameFor(typeId, this.ru)
    }
    const item: Record<string, unknown> = { typeId, name, amount, icon: null }
    if (tags.skin && tags.skin !== '_any') item.skin = tags.skin
    this.pending.push({ target: item, key: 'icon', candidates: this.articleCandidates(typeId, tags) })
    return item
  }

  async resolveAll() {
    const allUrls = Array.from(new Set(this.pending.flatMap((p) => p.candidates)))
    const ok = new Map<string, boolean>()
    const CONCURRENCY = 20
    for (let i = 0; i < allUrls.length; i += CONCURRENCY) {
      const batch = allUrls.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        batch.map(async (url) => {
          try {
            const res = await axios.head(url, { timeout: 8000, validateStatus: () => true })
            return res.status === 200
          } catch {
            return false
          }
        }),
      )
      batch.forEach((url, idx) => ok.set(url, results[idx]))
    }
    let resolved = 0
    for (const p of this.pending) {
      if (Object.values(CURRENCY_ICON).includes(p.candidates[0])) {
        p.target[p.key] = p.candidates[0]
        resolved++
        continue
      }
      const hit = p.candidates.find((c) => ok.get(c))
      p.target[p.key] = hit ?? null
      if (hit) resolved++
    }
    console.log(`texture-confirm: ${resolved}/${this.pending.length} refs resolved, ${allUrls.length} unique URLs checked`)
  }
}

// ==================== contents / random-pick options ====================

function buildContents(resolver: Resolver, articles: ArticleItem[]) {
  const agg = new Map<string, { amount: number; tags: ArticleTag }>()
  const order: string[] = []
  for (const a of articles) {
    if ('option' in a.tags) continue
    const key = `${a.typeId}::${a.tags.skin ?? ''}::${a.tags.stars ?? ''}`
    if (!agg.has(key)) { agg.set(key, { amount: 0, tags: a.tags }); order.push(key) }
    agg.get(key)!.amount += a.amount
  }
  return order.map((key) => {
    const { amount, tags } = agg.get(key)!
    const typeId = key.split('::')[0]
    return resolver.resolveArticle(typeId, amount, tags)
  })
}

function tierLabel(tags: ArticleTag): string {
  const skin = tags.skin
  if (skin && STAR_RU[skin]) return STAR_RU[skin]
  if (skin) return skin
  const starName = tags.stars ? STAR_NAME[tags.stars] : undefined
  if (starName) return STAR_RU[starName]
  return 'база'
}

function buildOptions(resolver: Resolver, articles: ArticleItem[], specimens: Map<string, Specimen>) {
  const groupsByOption = new Map<string, ArticleItem[]>()
  const order: string[] = []
  for (const a of articles) {
    const opt = a.tags.option
    if (opt == null) continue
    if (!groupsByOption.has(opt)) { groupsByOption.set(opt, []); order.push(opt) }
    groupsByOption.get(opt)!.push(a)
  }

  const specimenOf = (items: ArticleItem[]): string | null => {
    const specs = items.filter((a) => a.typeId.toLowerCase().startsWith('specimen_'))
    const uniqueIds = new Set(specs.map((a) => a.typeId))
    return uniqueIds.size === 1 ? specs[0].typeId : null
  }

  const buckets = new Map<string, [string, ArticleItem[]][]>()
  const bucketOrder: string[] = []
  for (const opt of order) {
    const items = groupsByOption.get(opt)!
    const spec = specimenOf(items)
    const bucketKey = spec ?? `__solo__${opt}`
    if (!buckets.has(bucketKey)) { buckets.set(bucketKey, []); bucketOrder.push(bucketKey) }
    buckets.get(bucketKey)!.push([opt, items])
  }

  const totalSlots = order.length
  const options: Record<string, unknown>[] = []
  for (const bkey of bucketOrder) {
    const entries = buckets.get(bkey)!
    const slotCount = entries.length
    const firstItems = entries[0][1]
    const seenCompanions = new Set<string>()
    const companions: ArticleItem[] = []
    for (const a of firstItems) {
      if (a.typeId.toLowerCase().startsWith('specimen_')) continue
      const ck = `${a.typeId}::${JSON.stringify(Object.entries(a.tags).sort())}`
      if (seenCompanions.has(ck)) continue
      seenCompanions.add(ck)
      companions.push(a)
    }
    const specArticle = firstItems.find((a) => a.typeId.toLowerCase().startsWith('specimen_'))

    if (slotCount === 1 || !specArticle) {
      const items = firstItems.map((a) => resolver.resolveArticle(a.typeId, a.amount, a.tags))
      options.push({ key: bkey, slots: slotCount, totalSlots, items })
      continue
    }

    const tiers = entries.map(([, items]) => {
      const sa = items.find((a) => a.typeId.toLowerCase().startsWith('specimen_'))!
      const ref = resolver.resolveArticle(sa.typeId, sa.amount, sa.tags)
      return { label: tierLabel(sa.tags), ref }
    })
    const companionItems = companions.map((a) => resolver.resolveArticle(a.typeId, a.amount, a.tags))
    options.push({
      key: bkey,
      slots: slotCount,
      totalSlots,
      specimenName: specimens.get(bkey)?.nameRu || bkey,
      tiers: tiers.map((t) => ({ label: t.label, ref: t.ref })),
      companions: companionItems,
    })
  }
  return options
}

function cleanOption(o: Record<string, unknown>) {
  const tiers = o.tiers as { label: string; ref: Record<string, unknown> }[] | undefined
  if (tiers) {
    return { ...o, tiers: tiers.map((t) => ({ label: t.label, icon: t.ref.icon })) }
  }
  return o
}

function prettify(itemId: string): string {
  const s = itemId.replace(/^(bundle_orbs_|bundle_mutants_|shop_|pack_)/i, '').replace(/_/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : itemId
}

// ==================== main ====================

async function main() {
  console.log('Fetching beta config...')
  const [dailyXml, shopXml, gameDefsXml, locRuTxt, locEnTxt] = await Promise.all([
    fetchText(`${BETA_HOST}/gameconfig/dailypopup.xml`),
    fetchText(`${BETA_HOST}/gameconfig/shopitems.xml`),
    fetchText(`${PROD_HOST}/gameconfig/gamedefinitions.xml`),
    fetchText(`${BETA_HOST}/gameconfig/localisation_ru.txt`),
    fetchText(`${BETA_HOST}/gameconfig/localisation_en.txt`),
  ])

  const ru = loadLocalisation(locRuTxt)
  const en = loadLocalisation(locEnTxt)
  const specimens = parseSpecimens(gameDefsXml, ru, en)
  const { byId: shopById, byFilter: shopByFilter } = parseShopItems(shopXml)
  const resolver = new Resolver(ru, specimens, shopById)

  // ---- какой спринт сейчас активен: самый большой номер с реальным контентом ----
  const sprintBlocks = Array.from(dailyXml.matchAll(/<!--\s*DEBUT SPRINT (\d+)\s*-->/g)).map((m) => ({
    sprint: parseInt(m[1], 10),
    start: m.index!,
  }))
  sprintBlocks.sort((a, b) => a.start - b.start)

  function blockFor(sprint: number): string {
    const idx = sprintBlocks.findIndex((b) => b.sprint === sprint)
    const start = sprintBlocks[idx].start
    const end = idx + 1 < sprintBlocks.length ? sprintBlocks[idx + 1].start : dailyXml.length
    return dailyXml.slice(start, end)
  }

  const uniqueSprints = Array.from(new Set(sprintBlocks.map((b) => b.sprint))).sort((a, b) => b - a)
  let currentSprint: number | null = null
  let filtersForSprint: string[] = []
  for (const sprint of uniqueSprints) {
    const block = blockFor(sprint)
    const filters = Array.from(block.matchAll(/<Filter>([^<]*)<\/Filter>/g)).map((m) => m[1])
    const hasRealOffer = filters.some((f) => shopByFilter.get(f)?.cost != null)
    if (hasRealOffer) {
      currentSprint = sprint
      filtersForSprint = filters
      break
    }
  }
  if (currentSprint == null) {
    console.log('No sprint with resolvable offers found — nothing to publish.')
    await fs.writeFile(OUT_PATH, '[]\n', 'utf-8')
    return
  }
  console.log(`Current sprint: ${currentSprint} (${filtersForSprint.length} offer slots)`)

  // ---- событие: имя бинго этого спринта, если есть, иначе общая подпись.
  // Локализованного заголовка у самого Filter обычно нет (проверено на живых
  // данных) - берём prettified slug как честный, а не выдуманный лейбл.
  const bingoFilter = filtersForSprint.find((f) => /^Bingo_/i.test(f))
  let bingoSlug: string | null = null
  let eventName = `Текущий спринт ${currentSprint}`
  if (bingoFilter) {
    bingoSlug = bingoFilter.replace(/^Bingo_/i, '')
    eventName = ru[bingoFilter] || prettify(bingoSlug)
  }

  function makeOffer(itemId: string, orderVal: number): Record<string, unknown> | null {
    const si = shopById.get(itemId)
    if (!si || !si.cost) return null
    const hasOptions = si.articles.some((a) => 'option' in a.tags)
    const title = ru[itemId] || prettify(itemId)
    const entry: Record<string, unknown> = {
      kind: 'offer',
      id: itemId,
      order: orderVal,
      name: title,
      picture: null,
      price: { amount: si.cost.amount, type: si.cost.type },
      event: eventName,
    }
    if (si.picture) resolver.pending.push({ target: entry, key: 'picture', candidates: [rawIcon(si.picture)].filter(Boolean) as string[] })
    if (hasOptions) {
      entry.mode = 'random'
      entry.options = buildOptions(resolver, si.articles, specimens)
    } else {
      entry.mode = 'bundle'
      entry.contents = buildContents(resolver, si.articles)
    }
    return entry
  }

  // ---- офферы текущего спринта ----
  const offers: Record<string, unknown>[] = []
  let idx = 0
  const seenOfferIds = new Set<string>()
  for (const filt of filtersForSprint) {
    const si = shopByFilter.get(filt)
    if (!si || !si.cost) continue
    if (seenOfferIds.has(si.itemId)) continue
    seenOfferIds.add(si.itemId)
    idx++
    const offer = makeOffer(si.itemId, 300 - idx)
    if (offer) offers.push(offer)
  }

  // ---- N-дневная ротация (напр. "контейнер дня"): группы ShopItem вида
  // <Prefix>_Box_<N>, где префикс встречается среди фильтров текущего спринта ----
  const boxGroups = new Map<string, string[]>()
  for (const itemId of shopById.keys()) {
    const m = itemId.match(/^(.+)_Box_(\d{1,2})$/)
    if (!m) continue
    const prefix = m[1]
    if (!boxGroups.has(prefix)) boxGroups.set(prefix, [])
    boxGroups.get(prefix)!.push(itemId)
  }
  let rotation: Record<string, unknown> | null = null
  for (const [prefix, ids] of boxGroups) {
    if (ids.length < 3) continue
    const relevant = filtersForSprint.some((f) => f.toLowerCase().includes(prefix.toLowerCase().split('_')[0]))
    if (!relevant) continue
    const sorted = ids.sort((a, b) => {
      const na = parseInt(a.match(/_(\d{1,2})$/)![1], 10)
      const nb = parseInt(b.match(/_(\d{1,2})$/)![1], 10)
      return na - nb
    })
    const days = sorted.map((bid) => {
      const si = shopById.get(bid)!
      const day: Record<string, unknown> = {
        day: parseInt(bid.match(/_(\d{1,2})$/)![1], 10),
        picture: null,
        price: si.cost ? { amount: si.cost.amount, type: si.cost.type } : null,
        contents: buildContents(resolver, si.articles),
      }
      if (si.picture) resolver.pending.push({ target: day, key: 'picture', candidates: [rawIcon(si.picture)].filter(Boolean) as string[] })
      return day
    })
    rotation = {
      kind: 'offer',
      id: `${prefix}_OOTD`,
      order: 250,
      name: 'Контейнер дня — вся ротация',
      mode: 'rotation',
      days,
      event: eventName,
    }
    break
  }

  // ---- bingo текущего события (генерик: Bingo_<slug> -> morphology/<slug>.xml) ----
  let bingo: Record<string, unknown> | null = null
  if (bingoSlug) {
    try {
      const morphXml = await fetchText(`${BETA_HOST}/gameconfig/morphology/${bingoSlug.toLowerCase()}.xml`)
      const cells = Array.from(morphXml.matchAll(/<col\b[^>]*\/>/g)).map((m) => m[0])
      const bingoSpecimens: Record<string, unknown>[] = []
      for (const cell of cells) {
        const sidM = cell.match(/specimenId="([^"]*)"/)
        if (!sidM) continue
        const sid = sidM[1]
        const skinM = cell.match(/skin="([^"]*)"/)
        const skin = skinM?.[1]
        const chip: Record<string, unknown> = { name: specimens.get(sid)?.nameRu || sid, icon: null }
        if (skin && skin !== '_any') chip.skin = skin
        resolver.pending.push({ target: chip, key: 'icon', candidates: resolver.articleCandidates(sid, skin ? { skin } : {}) })
        bingoSpecimens.push(chip)
      }
      const lines = (morphXml.match(/<line\b/g) ?? []).length
      const rewardMatches = Array.from(
        morphXml.matchAll(/<(?:line|col)\b[^>]*\bamount="([^"]*)"[^>]*\btype="([^"]*)"[^>]*\bid="([^"]*)"/g),
      ).slice(0, 8)
      const rewards = rewardMatches.map((m) => {
        const amt = parseInt(m[1], 10)
        return resolver.resolveArticle(m[3], Number.isFinite(amt) ? amt : 1)
      })
      bingo = {
        kind: 'bingo',
        id: bingoSlug,
        order: 249,
        name: `Бинго «${eventName}»`,
        event: eventName,
        grid_size: cells.filter((c) => c.includes('specimenId=')).length,
        lines,
        specimens: bingoSpecimens,
        rewards,
      }
    } catch (e) {
      console.log(`Bingo file for slug "${bingoSlug}" not found, skipping bingo card.`)
    }
  }

  // ---- "в фокусе": мутанты со свежим release-баннером в текущем спринте ----
  const spotlightIds = new Set<string>()
  for (const f of filtersForSprint) {
    const m = f.match(/Specimen_[A-Z]+_\d+/i)
    if (m) spotlightIds.add(m[0])
  }
  const spotlights: Record<string, unknown>[] = []
  let sIdx = 0
  for (const sid of spotlightIds) {
    if (resolver.usedSpecimens.has(sid)) continue // уже показан внутри оффера/ротации/бинго
    const sp = specimens.get(sid)
    if (!sp) continue
    sIdx++
    const card: Record<string, unknown> = {
      kind: 'mutant',
      id: sid,
      order: 248 - sIdx,
      name: sp.nameRu,
      name_en: sp.nameEn,
      life: sp.life,
      atk1: sp.atk1,
      atk2: sp.atk2,
      dna: sp.dna,
      picture: null,
      event: eventName,
    }
    resolver.pending.push({ target: card, key: 'picture', candidates: [rawIcon(sid.toLowerCase())].filter(Boolean) as string[] })
    spotlights.push(card)
  }

  const feed = [...offers, ...(rotation ? [rotation] : []), ...(bingo ? [bingo] : []), ...spotlights]
  await resolver.resolveAll()
  for (const e of feed) {
    if (e.options) e.options = (e.options as Record<string, unknown>[]).map(cleanOption)
  }
  feed.sort((a, b) => (b.order as number) - (a.order as number))

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true })
  await fs.writeFile(OUT_PATH, JSON.stringify(feed, null, 2) + '\n', 'utf-8')
  console.log(`Wrote ${feed.length} entries to ${OUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
