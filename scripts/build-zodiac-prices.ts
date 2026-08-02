import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'

// Цены зодиакальных мутантов (обычная/серебряная версия) для /guides.
// Источник - отдельные (не бандловые) ShopItem записи вида
// itemId="Specimen_<ID>" / itemId="Specimen_<ID>_Silver" в shopitems.xml,
// каждая со своим <Cost amount="N" type="hardcurrency"/>. Бандловые
// ArticleItem-вхождения того же мутанта (наборы уровней, акции) сюда не
// попадают - ищем именно ShopItem с itemId, совпадающим 1-в-1.

const SHOPITEMS_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/shopitems.xml'
const ZODIAC_PATH = path.join(process.cwd(), 'src/data/guides/zodiac.json')

interface ZodiacEntry {
  id: string
  sign: string
  dateFrom: string
  dateTo: string
  priceNormal?: number
  priceSilver?: number
}

function findCost(xml: string, itemId: string): number | null {
  const openTag = `<ShopItem itemId="${itemId}"`
  const start = xml.indexOf(openTag)
  if (start === -1) return null
  const end = xml.indexOf('</ShopItem>', start)
  if (end === -1) return null
  const block = xml.slice(start, end)
  const m = block.match(/<Cost amount="(\d+)" type="hardcurrency"/)
  return m ? Number(m[1]) : null
}

async function main() {
  const [{ data: xml }, zodiacRaw] = await Promise.all([
    axios.get<string>(SHOPITEMS_URL, { responseType: 'text' }),
    fs.readFile(ZODIAC_PATH, 'utf-8').then((t) => JSON.parse(t) as ZodiacEntry[]),
  ])

  let changed = 0
  const out = zodiacRaw.map((z) => {
    const typeId = `Specimen_${z.id.replace(/^specimen_/i, '').toUpperCase()}`
    const priceNormal = findCost(xml, typeId)
    const priceSilver = findCost(xml, `${typeId}_Silver`)
    if (priceNormal == null || priceSilver == null) {
      console.warn(
        `[zodiac-prices] не найдена цена для ${typeId} (normal=${priceNormal}, silver=${priceSilver})`,
      )
    }
    if (priceNormal !== z.priceNormal || priceSilver !== z.priceSilver) changed++
    return {
      ...z,
      ...(priceNormal != null ? { priceNormal } : {}),
      ...(priceSilver != null ? { priceSilver } : {}),
    }
  })

  await fs.writeFile(ZODIAC_PATH, JSON.stringify(out, null, 2) + '\n', 'utf-8')
  console.log(`[zodiac-prices] готово, изменено записей: ${changed}/${out.length}`)
}

main().catch((err) => {
  console.error('[zodiac-prices] FATAL', err)
  process.exit(1)
})
