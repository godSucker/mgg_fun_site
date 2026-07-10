const numberFormatter = new Intl.NumberFormat('ru-RU')

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.floor(value))
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const lastDigit = abs % 10
  if (abs > 10 && abs < 20) return many
  if (lastDigit > 1 && lastDigit < 5) return few
  if (lastDigit === 1) return one
  return many
}

export function normalizeMutantId(specimenId: string): { folder: string; fileId: string; baseId: string } {
  if (!specimenId) return { folder: '', fileId: '', baseId: '' }

  let cleaned = specimenId.replace(/^Specimen_/i, '')
  cleaned = cleaned.replace(/_(normal|bronze|silver|gold|platinum)$/i, '')

  if (!cleaned) return { folder: '', fileId: '', baseId: '' }

  const baseId = cleaned
  const folder = cleaned.toLowerCase()
  const fileId = cleaned.toLowerCase()
  return { folder, fileId, baseId }
}
