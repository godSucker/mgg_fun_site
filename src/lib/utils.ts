const numberFormatter = new Intl.NumberFormat('ru-RU')

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.floor(value))
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
