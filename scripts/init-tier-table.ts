// Разовая инициализация src/data/mutants/tier-table.json - изолированного
// хранилища тиров для /tier-table (см. память tier-table-pipeline). НЕ пишет
// в mutants.json и НЕ читается им обратно - см. prompt_tablica_mutantov.md.
//
// После первого запуска этот файл больше не запускается автосинком - тиры
// "Тир до"/"Тир после" правятся только вручную в таблице (через /api/tier-table)
// или кнопкой "Обновить тиры" на странице (тот же refresh-эндпоинт).

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MUTANTS_PATH = path.join(ROOT, 'src/data/mutants/mutants.json')
const OUT_PATH = path.join(ROOT, 'src/data/mutants/tier-table.json')

interface Mutant {
  id: string
  tier?: string | null
}

async function main() {
  const mutants: Mutant[] = JSON.parse(await fs.readFile(MUTANTS_PATH, 'utf-8'))

  try {
    await fs.access(OUT_PATH)
    console.error(
      `[TIER-TABLE] ${OUT_PATH} уже существует - init только для первого запуска, не перезаписываю.`,
    )
    console.error('[TIER-TABLE] Для пересинка тиров используй кнопку "Обновить тиры" на странице.')
    process.exit(1)
  } catch {
    // файла нет - это и есть первичная инициализация, продолжаем
  }

  const table: Record<string, { before: string; after: string }> = {}
  for (const m of mutants) {
    const tier = String(m.tier ?? '').trim() || '-'
    table[m.id] = { before: tier, after: tier }
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(table, null, 2) + '\n', 'utf-8')
  console.log(`[TIER-TABLE] Инициализировано записей: ${Object.keys(table).length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
