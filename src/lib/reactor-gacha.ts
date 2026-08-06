import gachaRaw from '@/data/simulators/reactor/gacha.json'
import mutantNamesRaw from '@/data/simulators/reactor/mutant_names.json'

export type GachaId = keyof typeof gachaRaw

export interface BasicReward {
  specimen: string
  stars: number
  odds: number
  bonus: number
}

export interface GachaDefinition {
  token_cost: number
  hc_cost: number
  filter: string
  basic_elements: BasicReward[]
  completion_reward: BasicReward | null
}

export interface GachaMeta extends GachaDefinition {
  id: string
  name: string
  totalOdds: number
  cover: string | null
}

export const STAR_LABEL: Record<number, string> = {
  0: '',
  1: 'Бронзовая звезда',
  2: 'Серебряная звезда',
  3: 'Золотая звезда',
  4: 'Платиновая звезда',
}

export const STAR_ICON: Record<number, string> = {
  0: '/stars/no_stars.webp',
  1: '/stars/star_bronze.webp',
  2: '/stars/star_silver.webp',
  3: '/stars/star_gold.webp',
  4: '/stars/star_platinum.webp',
}

export const GACHA_NAME_RU: Record<string, string> = {
  western: 'Вестерн',
  gachaboss: 'Большой босс',
  japan: 'Япония',
  fantasy: 'Темное фентези',
  lucha: "Мучачо's",
  olympians: 'Боги арены',
  music: 'Диско',
  villains: 'Супер злодеи',
  starwars: 'Космические войны',
  beach: 'Тропическое лето',
  heroes: 'Супергерои',
  soldiers: 'Патруль времени',
  gothic: 'Готика',
  movies: 'Кино',
  elements: 'Команда элементалей',
  steampunk: 'Стимпанк',
  vegetal: 'Фотосинтез',
  girl: 'Хищницы',
  olympics: 'Кровавые игры',
  checkmate: 'Шахматы',
  gemstones: 'Самоцветы',
}

// Обложки - официальный крoп-арт игры (assets/gachacontent/btn_gacha_<live-id>-ru.png
// на Kobojo CDN), локализованная RU-версия с русским текстом на баннере, .png
// (перезалиты 2026-08-06 взамен старых .webp с английским текстом). Ключ здесь -
// наш локальный slug генератора, который может отличаться от текущего id в игре
// (checkmate -> chess, см. gacha.json) - подтверждено сверкой fingerprint'а по
// составу specimen'ов basic_elements/completion_reward.
export const GACHA_COVERS: Partial<Record<string, string>> = {
  western: '/reactor/western.png',
  beach: '/reactor/beach.png',
  soldiers: '/reactor/soldiers.png',
  heroes: '/reactor/heroes.png',
  villains: '/reactor/villains.png',
  steampunk: '/reactor/steampunk.png',
  starwars: '/reactor/starwars.png',
  lucha: '/reactor/lucha.png',
  movies: '/reactor/movies.png',
  girl: '/reactor/girl.png',
  japan: '/reactor/japan.png',
  gothic: '/reactor/gothic.png',
  olympians: '/reactor/olympians.png',
  fantasy: '/reactor/fantasy.png',
  elements: '/reactor/elements.png',
  music: '/reactor/music.png',
  olympics: '/reactor/olympics.png',
  gachaboss: '/reactor/gachaboss.png',
  vegetal: '/reactor/vegetal.png',
  checkmate: '/reactor/checkmate.png',
  gemstones: '/reactor/gemstones.png',
}

export const mutantNames: Record<string, string> = mutantNamesRaw

export const gachaMap: Record<string, GachaDefinition> = gachaRaw

export function getGachaMeta(id: string): GachaMeta | null {
  const definition = gachaMap[id]
  if (!definition) {
    return null
  }
  const totalOdds = definition.basic_elements.reduce((sum, item) => sum + item.odds, 0)
  const name = GACHA_NAME_RU[id] ?? id
  const cover = GACHA_COVERS[id] ?? null
  return {
    id,
    name,
    totalOdds,
    cover,
    ...definition,
  }
}

export function listGachas(): GachaMeta[] {
  return Object.keys(gachaMap)
    .map((id) => getGachaMeta(id)!)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function getMutantName(specimenId: string): string {
  return mutantNames[specimenId] ?? specimenId
}
