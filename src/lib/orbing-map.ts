import orbingData from '@/data/mutants/orbing.json'

// Ячейка ряда - обычно одна текстура; строка вида ["a.webp","b.webp"] -
// одна физическая сфера с двумя эффектами (см. комментарий у
// parseCombinedOrCell в telegram-webhook.ts), модалка рисует её как две
// половинки в записанном порядке.
export type OrbCell = string | [string, string]

export interface OrbingData {
  rows: OrbCell[][]
}

// Данные лежат в orbing.json (обновляется через ".сфера" в telegram-webhook.ts
// через GitHub Contents API - коммитить кусок TS оттуда сильно хрупче JSON).
export const orbingMap: Record<string, OrbingData> = orbingData as Record<string, OrbingData>
