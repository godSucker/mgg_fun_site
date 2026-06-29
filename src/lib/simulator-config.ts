export type ResourceSummaryKey = 'consumables' | 'stars' | 'spheres' | 'boosters' | 'tokens' | 'mutants' | 'jackpots'

export interface ResourceSummaryConfig {
  label: string
  icon: string
  metaLabel: string
}

export const resourceSummaryConfig: Record<ResourceSummaryKey, ResourceSummaryConfig> = {
  consumables: { label: 'Расходники', icon: '/med/normal_med.webp', metaLabel: 'Ресурсов суммарно' },
  stars: { label: 'Звёзды', icon: '/stars/all_stars.webp', metaLabel: 'Ресурсов суммарно' },
  spheres: { label: 'Сферы', icon: '/orbs/basic/orb_slot.webp', metaLabel: 'Ресурсов суммарно' },
  boosters: { label: 'Бустеры', icon: '/boosters/charm_xpx2_7.webp', metaLabel: 'Ресурсов суммарно' },
  tokens: { label: 'Жетоны', icon: '/tokens/material_gacha_token.webp', metaLabel: 'Ресурсов суммарно' },
  mutants: { label: 'Мутанты', icon: '/etc/icon_larva.webp', metaLabel: 'Выпало суммарно' },
  jackpots: { label: 'Джекпоты', icon: '/cash/jackpot.webp', metaLabel: 'Выпало суммарно' },
}

export const resourceSummaryOrder: ResourceSummaryKey[] = [
  'consumables',
  'stars',
  'spheres',
  'boosters',
  'tokens',
  'mutants',
  'jackpots',
]
