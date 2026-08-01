// Строит src/data/mutants/toplists.json - рейтинги мутантов по статам/абилкам
// на разных "точках времени" (текущие данные + состояния до прошедших ребалансов).
//
// Историческая реконструкция ограничена тем, что реально пишет compareStats() в
// scripts/sync-mutants.ts:
//   - hp: пишет lvl1.hp (raw), lvl30.hp линейно = lvl1.hp * 3.9 (формула
//     unified-calculator.ts, levelScale(30)/levelScale(1) = 3.9/1.0) - точная реконструкция.
//   - speed: единственный показатель без разбивки на уровни - точная реконструкция.
//   - atk1/atk2: трекер пишет СЫРОЙ atk*p_base (эффективный lvl30-рейт, БЕЗ
//     масштаба уровня) - при реконструкции его нужно домножить на 3.9
//     (levelScale(30), та же константа что у HP), иначе получится значение
//     уровня как будто это уровень 1. Обычный atk*_base (используется при
//     level<10/15, т.е. для lvl1) никогда не сравнивается и не восстановим.
//     lvl1-топы по атаке/абилкам для прошлых дат физически недоступны -
//     соответствующие массивы остаются пустыми, UI должен показать "нет
//     данных для этой даты", а не молчать неточными числами.
//   - abilities atk1/atk2: та же история, значение в rebalance-history уже
//     равно value_atk1_lvl30 (проверено на реальных цифрах). pct - отдельный
//     трекнутый показатель, не зависит от уровня.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MUTANTS_PATH = path.join(ROOT, 'src/data/mutants/mutants.json')
const HISTORY_PATH = path.join(ROOT, 'src/data/mutants/rebalance-history.json')
const OUT_PATH = path.join(ROOT, 'src/data/mutants/toplists.json')

const STAR_MULTIPLIERS: Record<string, number> = {
  normal: 1.0,
  bronze: 1.1,
  silver: 1.3,
  gold: 1.75,
  platinum: 2.0,
}
// От лучшего к худшему - берём первый найденный ключ как "реальный макс. тир мутанта".
const STAR_ORDER = ['platinum', 'gold', 'silver', 'bronze', 'normal']

const PLUS_ABILITIES = [
  'ability_shield_plus',
  'ability_regen_plus',
  'ability_retaliate_plus',
  'ability_slash_plus',
  'ability_strengthen_plus',
  'ability_weaken_plus',
]

interface LevelStats {
  hp: number
  atk1: number
  atk2: number
  speed: number
  silver: number
  atk1_AOE: boolean
  atk2_AOE: boolean
}

interface Mutant {
  id: string
  name: string
  base_stats: {
    lvl1: LevelStats
    lvl30: LevelStats
  }
  abilities: { name: string; pct: number; value_atk1_lvl30: number }[]
  stars: Record<string, { images?: string[] } | undefined>
}

interface StatChange {
  stat: 'hp' | 'atk1' | 'atk2' | 'speed' | 'abilities'
  level: 1 | 30 | null
  old: number | null
  new: number | null
  ability?: string
  field?: 'pct' | 'atk1' | 'atk2'
}

interface RebalanceRun {
  date: string
  entries: { id: string; name: string; changes: StatChange[] }[]
}

interface RankEntry {
  id: string
  name: string
  value: number
  star: string
  icon: string
  pct?: number
}

function maxStar(m: Mutant): string {
  for (const key of STAR_ORDER) {
    if (m.stars?.[key]) return key
  }
  return 'normal'
}

// GACHA/HEROIC мутанты хранят единственный тир под ключом типа "platinum", но
// реальный файл текстуры внутри всё равно "..._normal.webp" (см. память
// game-data-unencrypted-mirror и character-textures-cdn) - поэтому берём путь
// ИЗ данных мутанта, а не строим его по шаблону "specimen_<id>_<tier>.webp",
// который для таких мутантов 404-ится.
function mutantIcon(m: Mutant, star: string): string {
  const raw = m.stars?.[star]?.images?.[0]
  if (!raw) return ''
  return raw.startsWith('/') ? raw : `/${raw}`
}

function sortDesc(list: RankEntry[]): RankEntry[] {
  return [...list].sort((a, b) => b.value - a.value)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface LevelBucket {
  atk1: RankEntry[]
  atk2: RankEntry[]
  hp: RankEntry[]
  speed: RankEntry[]
  silver: RankEntry[]
  abilities: Record<string, RankEntry[]>
}

function emptyBucket(): LevelBucket {
  const abilities: Record<string, RankEntry[]> = {}
  for (const name of PLUS_ABILITIES) abilities[name] = []
  return { atk1: [], atk2: [], hp: [], speed: [], silver: [], abilities }
}

function buildSnapshot(id: string, label: string, mutants: Mutant[], run: RebalanceRun | null) {
  const changesById = new Map<string, StatChange[]>()
  if (run) for (const entry of run.entries) changesById.set(entry.id, entry.changes)

  const level1 = emptyBucket()
  const level30 = emptyBucket()
  // Только для "текущей" точки (run === null) реально известен lvl1-эффективный
  // atk*_base - для прошлых дат он никогда не трекался, см. комментарий в шапке файла.
  const lvl1AtkAvailable = run === null

  for (const m of mutants) {
    const star = maxStar(m)
    const mult = STAR_MULTIPLIERS[star]
    const icon = mutantIcon(m, star)
    const changes = changesById.get(m.id) ?? []
    const base = { id: m.id, name: m.name, star, icon }

    const hpChange = changes.find((c) => c.stat === 'hp' && c.level === 1)
    const atk1Change = changes.find((c) => c.stat === 'atk1' && c.level === 1)
    const atk2Change = changes.find((c) => c.stat === 'atk2' && c.level === 1)
    const speedChange = changes.find((c) => c.stat === 'speed')

    const hpLvl1Raw = hpChange?.old ?? m.base_stats.lvl1.hp
    const hpLvl30Raw = run ? hpLvl1Raw * 3.9 : m.base_stats.lvl30.hp
    const speedRaw = speedChange?.old ?? m.base_stats.lvl1.speed
    // ВАЖНО: rebalance-history хранит СЫРОЙ atk1p_base/atk2p_base (без масштаба
    // уровня), а m.base_stats.lvl30.atk1/atk2 - уже готовое значение НА 30
    // уровне (raw * levelScale(30), levelScale(30) = 3.9 - та же константа,
    // что и для HP). Забыть умножить на 3.9 здесь = "до ребаланса" тихо
    // показывает атаку как будто на 1 уровне при выбранном 30-м.
    const atk1Lvl30Raw = atk1Change ? atk1Change.old! * 3.9 : m.base_stats.lvl30.atk1
    const atk2Lvl30Raw = atk2Change ? atk2Change.old! * 3.9 : m.base_stats.lvl30.atk2

    level30.hp.push({ ...base, value: Math.round(hpLvl30Raw * mult) })
    level1.hp.push({ ...base, value: Math.round(hpLvl1Raw * mult) })
    level30.speed.push({ ...base, value: speedRaw })
    level1.speed.push({ ...base, value: speedRaw })
    level30.silver.push({ ...base, value: m.base_stats.lvl30.silver })
    level1.silver.push({ ...base, value: m.base_stats.lvl1.silver })

    // "Одиночная"/"массовая" атака - это НЕ фиксированные поля atk1/atk2, а
    // определяются per-мутант флагом *_AOE (у части мутантов AOE висит на
    // atk1, а не на atk2 - см. память topmutants-aoe-flag-bug). Мутант без
    // AOE-слота вообще не участвует в топе по массовой атаке (и наоборот),
    // а не молча подставляет нерелевантное число.
    const aoe1_30 = m.base_stats.lvl30.atk1_AOE
    const aoe2_30 = m.base_stats.lvl30.atk2_AOE
    const singleLvl30Candidates = [
      !aoe1_30 ? atk1Lvl30Raw : null,
      !aoe2_30 ? atk2Lvl30Raw : null,
    ].filter((v): v is number => v != null)
    const massLvl30Candidates = [
      aoe1_30 ? atk1Lvl30Raw : null,
      aoe2_30 ? atk2Lvl30Raw : null,
    ].filter((v): v is number => v != null)
    if (singleLvl30Candidates.length) {
      level30.atk1.push({ ...base, value: Math.round(Math.max(...singleLvl30Candidates) * mult) })
    }
    if (massLvl30Candidates.length) {
      level30.atk2.push({ ...base, value: Math.round(Math.max(...massLvl30Candidates) * mult) })
    }

    if (lvl1AtkAvailable) {
      const aoe1_1 = m.base_stats.lvl1.atk1_AOE
      const aoe2_1 = m.base_stats.lvl1.atk2_AOE
      const singleLvl1Candidates = [
        !aoe1_1 ? m.base_stats.lvl1.atk1 : null,
        !aoe2_1 ? m.base_stats.lvl1.atk2 : null,
      ].filter((v): v is number => v != null)
      const massLvl1Candidates = [
        aoe1_1 ? m.base_stats.lvl1.atk1 : null,
        aoe2_1 ? m.base_stats.lvl1.atk2 : null,
      ].filter((v): v is number => v != null)
      if (singleLvl1Candidates.length) {
        level1.atk1.push({ ...base, value: Math.round(Math.max(...singleLvl1Candidates) * mult) })
      }
      if (massLvl1Candidates.length) {
        level1.atk2.push({ ...base, value: Math.round(Math.max(...massLvl1Candidates) * mult) })
      }
    }

    for (const abilityName of PLUS_ABILITIES) {
      const current = m.abilities?.find((a) => a.name === abilityName)
      if (!current) continue
      const abilityChanges = changes.filter(
        (c) => c.stat === 'abilities' && c.ability === abilityName,
      )
      const pctChange = abilityChanges.find((c) => c.field === 'pct')
      const atk1Lvl30Change = abilityChanges.find((c) => c.field === 'atk1')

      const pct = pctChange?.old ?? current.pct
      const valueLvl30 = atk1Lvl30Change?.old ?? current.value_atk1_lvl30

      level30.abilities[abilityName].push({ ...base, pct, value: Math.round(valueLvl30 * mult) })
      if (lvl1AtkAvailable) {
        const valueLvl1 = m.base_stats.lvl1.atk1 * mult * (pct / 100)
        level1.abilities[abilityName].push({ ...base, pct, value: Math.round(valueLvl1) })
      }
    }
  }

  for (const bucket of [level1, level30]) {
    bucket.atk1 = sortDesc(bucket.atk1)
    bucket.atk2 = sortDesc(bucket.atk2)
    bucket.hp = sortDesc(bucket.hp)
    bucket.speed = sortDesc(bucket.speed)
    bucket.silver = sortDesc(bucket.silver)
    for (const name of PLUS_ABILITIES) bucket.abilities[name] = sortDesc(bucket.abilities[name])
  }

  return { id, label, levels: { '1': level1, '30': level30 } }
}

async function main() {
  const mutants: Mutant[] = JSON.parse(await fs.readFile(MUTANTS_PATH, 'utf-8'))
  const history: RebalanceRun[] = JSON.parse(await fs.readFile(HISTORY_PATH, 'utf-8'))

  const snapshots = [buildSnapshot('current', 'Текущие данные', mutants, null)]

  const sortedRuns = [...history].sort((a, b) => b.date.localeCompare(a.date))
  for (const run of sortedRuns) {
    snapshots.push(buildSnapshot(run.date, `До ребаланса ${formatDate(run.date)}`, mutants, run))
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(snapshots, null, 2) + '\n', 'utf-8')
  console.log(`[TOPLISTS] Точек времени: ${snapshots.length}, мутантов в каждой: ${mutants.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
