import skinTexturesJson from '@/data/simulators/reactor/skin-textures.json'
import mutantTexturesJson from '@/data/simulators/reactor/mutant-textures.json'
import skinsData from '@/data/mutants/skins.json'

const skinTextureMap = new Map(Object.entries(skinTexturesJson as Record<string, string>))
const mutantTextureMap = new Map(Object.entries(mutantTexturesJson as Record<string, string>))

const canonicalizeFull = (id: string): string => {
  const trimmed = id?.trim()
  if (!trimmed) return ''
  const withoutPrefix = trimmed.replace(/^Specimen_/i, '').replace(/^specimen_/i, '')
  if (!withoutPrefix) return ''
  const parts = withoutPrefix
    .split(/[_\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (!parts.length) return ''
  return `Specimen_${parts.map((part) => part.toUpperCase()).join('_')}`
}

const canonicalizeBase = (id: string): string => {
  const canonical = canonicalizeFull(id)
  if (!canonical) return ''
  const [, rest = ''] = canonical.split('Specimen_')
  if (!rest) return ''
  const segments = rest.split('_').filter(Boolean)
  if (!segments.length) return ''
  if (segments.length === 1) {
    return `Specimen_${segments[0]}`
  }
  return `Specimen_${segments[0]}_${segments[1]}`
}

// skins.json генерируется build-skins.ts из свежего gacha.xml и хранит АКТУАЛЬНЫЙ
// скин на мутанта, в отличие от устаревшего/ручного skin-textures.json (последний
// не обновлялся под новые скины 2025/2026 -> бинго показывало обычную голову
// вместо скиновой). Ключ мапы - id+skin, т.к. в бинго мутант может фигурировать
// с ДРУГИМ (более старым) скином, чем его "текущий" скин в skins.json.
type SkinSpecimen = { id: string; skin?: string; image?: string[] }
const skinsByIdAndSkin = new Map<string, string>()
for (const rec of (skinsData as { specimens: SkinSpecimen[] }).specimens ?? []) {
  const images = rec.image ?? []
  const preferred = images.find((p) => p.includes('/semi-full/')) ?? images[0]
  if (!preferred || !rec.skin) continue
  const key = `${canonicalizeBase(rec.id)}::${rec.skin.toLowerCase()}`
  skinsByIdAndSkin.set(key, preferred.startsWith('/') ? preferred : `/${preferred}`)
}

export function getSkinTexture(specimenId: string, skin?: string): string | null {
  if (!specimenId) return null
  const canonical = canonicalizeBase(specimenId)
  if (!canonical) return null
  if (skin) {
    const bySkin = skinsByIdAndSkin.get(`${canonical}::${skin.toLowerCase()}`)
    if (bySkin) return bySkin
  }
  return skinTextureMap.get(canonical) ?? null
}

export function getMutantTexture(specimenId: string): string | null {
  if (!specimenId) return null
  const canonical = canonicalizeFull(specimenId)
  if (!canonical) return null
  return mutantTextureMap.get(canonical) ?? null
}

export function getSkinTextures(ids: Iterable<string>): Record<string, string | null> {
  const result: Record<string, string | null> = {}
  for (const id of ids) {
    result[id] = getSkinTexture(id) ?? getMutantTexture(id)
  }
  return result
}

export function getMutantTextures(ids: Iterable<string>): Record<string, string | null> {
  const result: Record<string, string | null> = {}
  for (const id of ids) {
    result[id] = getMutantTexture(id)
  }
  return result
}
