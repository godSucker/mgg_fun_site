import localisationRu from '@/data/localisation_ru.txt'

// skins.json хранит slug скина на английском (napr. "girl", "japan") - тот
// же ключ, что используется в игровой локализации, поэтому переводить можно
// прямым поиском по localisation_ru.txt ("girl;Хищницы").
const skinNamesRu: Record<string, string> = {}
for (const line of localisationRu.split('\n')) {
  const idx = line.indexOf(';')
  if (idx === -1) continue
  const key = line.slice(0, idx).trim().replace(/^﻿/, '')
  const value = line.slice(idx + 1).trim()
  if (key) skinNamesRu[key] = value
}

export function getSkinNameRu(slug?: string | null): string | null {
  if (!slug) return null
  return skinNamesRu[slug] ?? null
}
