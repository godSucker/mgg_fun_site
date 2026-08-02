import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'

// Пофайтовый состав врагов для 7 кампаний x 9 карт кампании (Дивизионы, /guides).
// Источник - fightsettings.xml (тот же файл, что дал формулы крита/ботов, см.
// память re-binary-formulas-plan): <Campaign id><Map id><Fight id><Wave number>
// <Fighter typeId level stars boss?><Adjustment .../></Fighter>. divisions.json
// (агрегаты fightCount/levelRange/enemy roster + кураторская finishing_reward)
// собран отдельно и НЕ трогается этим скриптом - тут только детальный список
// боёв, который раньше при сборке divisions.json был свёрнут в агрегаты.

const FIGHTSETTINGS_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/fightsettings.xml'
const OUT_PATH = path.join(process.cwd(), 'src/data/guides/division-fights.json')

interface FighterOut {
  id: string
  level: number
  stars: number
  boss: boolean
  adjustment?: { speedPct: number; lifePct: number; attackPct: number }
}
interface WaveOut {
  number: number
  fighters: FighterOut[]
}
interface FightOut {
  fightId: number
  waves: WaveOut[]
}
interface MapFightsOut {
  campaignId: string
  mapId: string
  fights: FightOut[]
}

function parseAttrs(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of attrStr.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2]
  return attrs
}

async function main() {
  const { data: xml } = await axios.get<string>(FIGHTSETTINGS_URL, { responseType: 'text' })

  const campaignRe = /<Campaign\b([^>]*)>([\s\S]*?)<\/Campaign>/g
  const mapRe = /<Map\b([^>]*)>([\s\S]*?)<\/Map>/g
  const fightRe = /<Fight\b([^>]*)>([\s\S]*?)<\/Fight>/g
  const waveRe = /<Wave\b([^>]*)>([\s\S]*?)<\/Wave>/g
  const fighterRe = /<Fighter\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Fighter>)/g

  const out: MapFightsOut[] = []

  for (const cm of xml.matchAll(campaignRe)) {
    const campaignId = parseAttrs(cm[1]).id
    const campaignBody = cm[2]

    for (const mm of campaignBody.matchAll(mapRe)) {
      const mapId = parseAttrs(mm[1]).id
      const mapBody = mm[2]

      const fights: FightOut[] = []
      for (const fm of mapBody.matchAll(fightRe)) {
        const fightId = Number(parseAttrs(fm[1]).id)
        const fightBody = fm[2]

        const waves: WaveOut[] = []
        for (const wm of fightBody.matchAll(waveRe)) {
          const waveNumber = Number(parseAttrs(wm[1]).number)
          const waveBody = wm[2]

          const fighters: FighterOut[] = []
          for (const ftm of waveBody.matchAll(fighterRe)) {
            const attrs = parseAttrs(ftm[1])
            const inner = ftm[2] ?? ''
            const adjMatch = inner.match(
              /<Adjustment\s+speedPct="(-?\d+)"\s+lifePct="(-?\d+)"\s+attackPct="(-?\d+)"/,
            )
            fighters.push({
              id: attrs.typeId,
              level: Number(attrs.level),
              stars: Number(attrs.stars ?? '0'),
              boss: attrs.boss === 'true',
              ...(adjMatch
                ? {
                    adjustment: {
                      speedPct: Number(adjMatch[1]),
                      lifePct: Number(adjMatch[2]),
                      attackPct: Number(adjMatch[3]),
                    },
                  }
                : {}),
            })
          }
          waves.push({ number: waveNumber, fighters })
        }
        fights.push({ fightId, waves })
      }

      out.push({ campaignId, mapId, fights })
    }
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf-8')
  const totalFights = out.reduce((s, m) => s + m.fights.length, 0)
  console.log(`[division-fights] готово: ${out.length} карт, ${totalFights} боёв`)
}

main().catch((err) => {
  console.error('[division-fights] FATAL', err)
  process.exit(1)
})
