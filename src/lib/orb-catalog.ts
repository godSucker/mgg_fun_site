// Каталог "один вариант на тип сферы" для /sferovki - уровень сферы
// сознательно зафиксирован (базовые всегда _05, особые всегда _03), как это
// уже негласно устоялось в orbing.json через ".сфера" в telegram-webhook.ts
// (ORB_BASIC_LEVEL=5 / ORB_SPECIAL_LEVEL=3) - реальный уровень сферы владелец
// мутанта выставляет в игре руками, инструмент его не отслеживает.
export interface OrbTypeDef {
  slug: string
  label: string
  file: string // относительно /orbs/, как в orbing.json
}

export const BASIC_ORB_TYPES: OrbTypeDef[] = [
  { slug: 'attack', label: 'Атака', file: 'basic/orb_basic_attack_05.webp' },
  { slug: 'life', label: 'Здоровье', file: 'basic/orb_basic_life_05.webp' },
  { slug: 'critical', label: 'Критический удар', file: 'basic/orb_basic_critical_05.webp' },
  { slug: 'xp', label: 'Опыт', file: 'basic/orb_basic_xp_05.webp' },
  { slug: 'strengthen', label: 'Усиление', file: 'basic/orb_basic_strengthen_05.webp' },
  { slug: 'shield', label: 'Щит', file: 'basic/orb_basic_shield_05.webp' },
  { slug: 'slash', label: 'Ранение', file: 'basic/orb_basic_slash_05.webp' },
  { slug: 'weaken', label: 'Проклятие', file: 'basic/orb_basic_weaken_05.webp' },
  { slug: 'regenerate', label: 'Вытягивание жизни', file: 'basic/orb_basic_regenerate_05.webp' },
  { slug: 'retaliate', label: 'Контратака', file: 'basic/orb_basic_retaliate_05.webp' },
]

export const SPECIAL_ORB_TYPES: OrbTypeDef[] = [
  { slug: 'speed', label: 'Скорость', file: 'special/orb_special_speed_03.webp' },
  { slug: 'strengthen', label: 'Усиление', file: 'special/orb_special_addstrengthen_03.webp' },
  { slug: 'shield', label: 'Щит', file: 'special/orb_special_addshield_03.webp' },
  { slug: 'slash', label: 'Ранение', file: 'special/orb_special_addslash_03.webp' },
  { slug: 'weaken', label: 'Проклятие', file: 'special/orb_special_addweaken_03.webp' },
  {
    slug: 'regenerate',
    label: 'Вытягивание жизни',
    file: 'special/orb_special_addregenerate_03.webp',
  },
  { slug: 'retaliate', label: 'Контратака', file: 'special/orb_special_addretaliate_03.webp' },
]

export const EMPTY_BASIC_SLOT = 'basic/orb_slot.webp'
export const EMPTY_SPECIAL_SLOT = 'special/orb_slot_spe.webp'

export function isSpecialFile(file: string): boolean {
  return file.startsWith('special/')
}

export function slotsForType(type: string | undefined | null): number {
  const key = String(type || '')
    .trim()
    .toLowerCase()
  if (key === 'default') return 1
  if (key === 'heroic') return 3
  return 2
}
