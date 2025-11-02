import gachaRaw from '@/data/simulators/reactor/gacha.json';
import mutantNamesRaw from '@/data/simulators/reactor/mutant_names.json';

export type GachaId = keyof typeof gachaRaw;

export interface BasicReward {
  specimen: string;
  stars: number;
  odds: number;
  bonus: number;
}

export interface GachaDefinition {
  token_cost: number;
  hc_cost: number;
  filter: string;
  basic_elements: BasicReward[];
  completion_reward: BasicReward | null;
}

export interface GachaMeta extends GachaDefinition {
  id: string;
  name: string;
  totalOdds: number;
  cover: string | null;
}

export const STAR_LABEL: Record<number, string> = {
  0: '',
  1: 'Бронзовая звезда',
  2: 'Серебряная звезда',
  3: 'Золотая звезда',
  4: 'Платиновая звезда',
};

export const STAR_ICON: Record<number, string> = {
  0: '/stars/no_stars.png',
  1: '/stars/star_bronze.png',
  2: '/stars/star_silver.png',
  3: '/stars/star_gold.png',
  4: '/stars/star_platinum.png',
};

export const GACHA_NAME_RU: Record<string, string> = {
  western: 'Western',
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
};

export const GACHA_COVERS: Partial<Record<string, string>> = {
  western: '/reactor/western.png',
  beach: '/reactor/tropical.png',
  soldiers: '/reactor/time.png',
  heroes: '/reactor/superhero.png',
  villains: '/reactor/super.png',
  steampunk: '/reactor/steampunk.png',
  starwars: '/reactor/starwars.png',
  lucha: '/reactor/muchachos.png',
  movies: '/reactor/movie.png',
  girl: '/reactor/lady.png',
  japan: '/reactor/japan.png',
  gothic: '/reactor/gotic.png',
  olympians: '/reactor/gods.png',
  fantasy: '/reactor/fantasy.png',
  elements: '/reactor/element.png',
  music: '/reactor/disco.png',
  olympics: '/reactor/bloody_games.png',
  gachaboss: '/reactor/bigboss.png',
};

export const mutantNames: Record<string, string> = mutantNamesRaw;

export const gachaMap: Record<string, GachaDefinition> = gachaRaw;

export function getGachaMeta(id: string): GachaMeta | null {
  const definition = gachaMap[id];
  if (!definition) {
    return null;
  }
  const totalOdds = definition.basic_elements.reduce((sum, item) => sum + item.odds, 0);
  const name = GACHA_NAME_RU[id] ?? id;
  const cover = GACHA_COVERS[id] ?? null;
  return {
    id,
    name,
    totalOdds,
    cover,
    ...definition,
  };
}

export function listGachas(): GachaMeta[] {
  return Object.keys(gachaMap)
    .map((id) => getGachaMeta(id)!)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export function getMutantName(specimenId: string): string {
  return mutantNames[specimenId] ?? specimenId;
}
