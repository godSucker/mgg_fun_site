// Разовая инициализация src/data/mutants/release-order.json - хронологической
// нумерации мутантов по дате выхода в игре, для колонки "№2" на /tier-table
// (см. prompt_tablica_combined_final.md). Источник - CSV
// release_number,specimen_id,name_ru. Отдельная нумерация от колонки "№"
// (порядок по генам), ни на что другое не влияет.
//
// После первого запуска этот файл дополняется ТОЛЬКО дописыванием новых
// мутантов из sync-mutants.ts (additive only, как bingos.json) - повторный
// запуск этого скрипта откажет, если файл уже существует.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MUTANTS_PATH = path.join(ROOT, 'src/data/mutants/mutants.json')
const OUT_PATH = path.join(ROOT, 'src/data/mutants/release-order.json')

interface Mutant {
  id: string
}

function normalizeId(specimenId: string): string {
  return `specimen_${specimenId.replace(/^Specimen_/i, '')}`.toLowerCase()
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('[RELEASE-ORDER] Использование: npx tsx scripts/init-release-order.ts <путь-к-csv>')
    process.exit(1)
  }

  try {
    await fs.access(OUT_PATH)
    console.error(
      `[RELEASE-ORDER] ${OUT_PATH} уже существует - init только для первого запуска, не перезаписываю.`,
    )
    console.error('[RELEASE-ORDER] Новые мутанты дописываются автоматически через sync-mutants.ts.')
    process.exit(1)
  } catch {
    // файла нет - это и есть первичная инициализация, продолжаем
  }

  const mutants: Mutant[] = JSON.parse(await fs.readFile(MUTANTS_PATH, 'utf-8'))
  const mutantIds = new Set(mutants.map((m) => m.id.toLowerCase()))

  const raw = await fs.readFile(csvPath, 'utf-8')
  const lines = raw.trim().split('\n').slice(1) // пропускаем заголовок

  const table: Record<string, number> = {}
  const seenIds = new Set<string>()
  const csvNotInMutants: string[] = []
  let duplicates = 0

  for (const line of lines) {
    const [numRaw, specimenIdRaw] = line.split(',')
    const id = normalizeId(specimenIdRaw.trim())
    const num = parseInt(numRaw.trim(), 10)

    if (seenIds.has(id)) {
      console.warn(`[RELEASE-ORDER] Дубликат specimen_id в CSV: ${id} (строка "${line}")`)
      duplicates++
      continue
    }
    seenIds.add(id)

    if (!mutantIds.has(id)) {
      csvNotInMutants.push(`${id} (№${num})`)
      continue
    }

    table[id] = num
  }

  const mutantsNotInCsv = [...mutantIds].filter((id) => !seenIds.has(id))

  if (csvNotInMutants.length > 0) {
    console.warn(
      `[RELEASE-ORDER] ${csvNotInMutants.length} id из CSV не найдены в mutants.json (проверить вручную):`,
    )
    for (const id of csvNotInMutants) console.warn(`  - ${id}`)
  }
  if (mutantsNotInCsv.length > 0) {
    console.warn(
      `[RELEASE-ORDER] ${mutantsNotInCsv.length} мутантов из mutants.json нет в CSV (получат "-" в №2):`,
    )
    for (const id of mutantsNotInCsv) console.warn(`  - ${id}`)
  }
  if (duplicates > 0) {
    console.warn(`[RELEASE-ORDER] Дубликатов specimen_id пропущено: ${duplicates}`)
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(table, null, 2) + '\n', 'utf-8')
  console.log(`[RELEASE-ORDER] Инициализировано записей: ${Object.keys(table).length} / ${mutants.length} мутантов`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
