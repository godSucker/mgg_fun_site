/**
 * This module is a TypeScript port of the original desktop craft simulator that
 * lived in {@link src/data/simulators/CRAFT/craft.py}. The legacy script
 * consumed the same XML-like recipe files, translated item identifiers and
 * simulated reward rolls. By mirroring those routines we guarantee that the web
 * version stays perfectly in sync with the proven Python reference.
 */

import blackholeRaw from '@/data/simulators/CRAFT/blackhole.txt?raw';
import labRaw from '@/data/simulators/CRAFT/lab.txt?raw';
import orbRaw from '@/data/simulators/CRAFT/orb.txt?raw';
import starRaw from '@/data/simulators/CRAFT/star.txt?raw';
import incentiveRaw from '@/data/simulators/CRAFT/incentreward.txt?raw';

export type CraftCategory = 'blackhole' | 'lab' | 'orb' | 'star';

export interface CraftIngredient {
  regex: string;
  amount: number;
}

export interface CraftReward {
  id: string;
  amount: number;
  odds: number;
}

export interface CraftRecipe {
  id: string;
  category: CraftCategory;
  bonusPer1000: number;
  okHC: number;
  ingredients: CraftIngredient[];
  rewards: CraftReward[];
}

export interface IncentiveReward {
  duration: number; // minutes
  id: string;
  per1000: number;
  probability: number; // 0–1
}

export interface SimulationResult {
  crafts: number;
  mainRewards: Record<string, number>;
  incentiveRewards: Record<string, number>;
}

export interface RewardSummary {
  id: string;
  amount: number;
  perCraft: number;
  share: number;
}

export interface IncentiveSummary {
  id: string;
  amount: number;
  perCraft: number;
}

export interface DetailedSimulationResult extends SimulationResult {
  rewardDetails: RewardSummary[];
  incentiveDetails: IncentiveSummary[];
  expectedIncentiveChance: number;
  log: string[];
}

const RAW_SOURCES: Array<{ category: CraftCategory; raw: string }> = [
  { category: 'blackhole', raw: blackholeRaw },
  { category: 'lab', raw: labRaw },
  { category: 'orb', raw: orbRaw },
  { category: 'star', raw: starRaw },
];

const ITEM_TRANSLATIONS: Record<string, string> = {
  // Stars
  Star_Bronze: 'Бронзовая звезда',
  Star_Silver: 'Серебряная звезда',
  Star_Gold: 'Золотая звезда',
  Star_Platinum: 'Платиновая звезда',

  // Basic orbs
  orb_basic_attack: 'Сфера атаки',
  orb_basic_life: 'Сфера HP',
  orb_basic_critical: 'Сфера крит. урона',
  orb_basic_strengthen: 'Сфера усиления',
  orb_basic_weaken: 'Сфера проклятья',
  orb_basic_regenerate: 'Сфера вампиризма',
  orb_basic_shield: 'Сфера щита',
  orb_basic_retaliate: 'Сфера отражения',
  orb_basic_slash: 'Сфера ранения',
  orb_basic_xp: 'Сфера опыта',

  // Special orbs
  orb_special_addstrengthen: 'Особая сфера усиления',
  orb_special_addweaken: 'Особая сфера проклятья',
  orb_special_addregenerate: 'Особая сфера вампиризма',
  orb_special_addshield: 'Особая сфера щита',
  orb_special_addretaliate: 'Особая сфера отражения',
  orb_special_addslash: 'Особая сфера ранения',
  orb_special_speed: 'Особая сфера скорости',

  // Materials & supplies
  Material_Muto1: 'Малая доза мутостерона',
  Material_Muto10: 'Доза мутостерона',
  Material_Muto50: 'Большая доза мутостерона',
  Material_XP10: 'Плитка опыта',
  Material_XP250: 'Батончик опыта',
  Material_XP1000: 'Маленькая банка опыта',
  Material_LP10: 'Маленькая аптечка',
  Material_LP100: 'Аптечка',
  Material_LP1000: 'Большая аптечка',
  Material_Gacha_Token: 'Жетон генератора',
  Material_Event_Token: 'Жетон испытания',
  Material_Jackpot_Token: 'Жетон джекпота',
  Material_Energy5: '5 пропусков',
  Material_Energy25: '25 пропусков',

  // Boosters
  Charm_Xpx3_7: 'Бустер опыта +200% (7д)',
  Charm_Xpx2_7: 'Бустер опыта +100% (7д)',
  Charm_Regenx4_7: 'Бустер восстановления +300% (7д)',
  Charm_Regenx2_7: 'Бустер восстановления +100% (7д)',
  Charm_Critical_7: 'Бустер крит. ударов (7д)',
  Charm_Anticritical_7: 'Бустер щита (7д)',
  Charm_Xpx3_3: 'Бустер опыта +200% (3д)',
  Charm_Xpx2_3: 'Бустер опыта +100% (3д)',
  Charm_Regenx4_3: 'Бустер восстановления +300% (3д)',
  Charm_Regenx2_3: 'Бустер восстановления +100% (3д)',
  Charm_Critical_3: 'Бустер крит. ударов (3д)',
  Charm_Anticritical_3: 'Бустер щита (3д)',
  Charm_Xpx3_1: 'Бустер опыта +200% (1д)',
  Charm_Xpx2_1: 'Бустер опыта +100% (1д)',
  Charm_Regenx4_1: 'Бустер восстановления +300% (1д)',
  Charm_Regenx2_1: 'Бустер восстановления +100% (1д)',
  Charm_Critical_1: 'Бустер крит. ударов (1д)',
  Charm_Anticritical_1: 'Бустер щита (1д)',
};

const ITEM_TEXTURES: Record<string, string> = {
  // Stars
  Star_Bronze: '/stars/star_bronze.png',
  Star_Silver: '/stars/star_silver.png',
  Star_Gold: '/stars/star_gold.png',
  Star_Platinum: '/stars/star_platinum.png',

  // Tokens
  Material_Gacha_Token: '/tokens/material_gacha_token.png',
  Material_Event_Token: '/tokens/material_event_token.png',
  Material_Jackpot_Token: '/tokens/material_jackpot_token.png',

  // Supplies
  Material_Muto1: '/materials/mini_muto.png',
  Material_Muto10: '/materials/normal_muto.png',
  Material_Muto50: '/materials/big_muto.png',
  Material_XP10: '/materials/mini_xp.png',
  Material_XP250: '/materials/big_xp.png',
  Material_XP1000: '/materials/big_xp.png',
  Material_LP10: '/med/mini_med.png',
  Material_LP100: '/med/normal_med.png',
  Material_LP1000: '/med/big_med.png',
  Material_Energy5: '/materials/ticket_5.png',
  Material_Energy25: '/materials/ticket_25.png',
  Material_Energy1: '/materials/ticket_1.png',
};

const SPECIAL_ORB_TEXTURE_BLACKLIST = new Set([
  'orb_special_shield_1',
  'orb_special_shield_2',
  'orb_special_shield_3',
  'orb_special_shield_4',
  'orb_special_shield_5',
]);

const COMPLEX_REGEX_DESCRIPTIONS: Record<string, string> = {
  'orb_(basic|special)_[abcdefghijklmnopqrstuvwxyz]+':
    'Любая сфера (базовая или особая) любого типа',
  'orb_(special|basic)_[abcdefghijklmnopqrstuvwxyz]+_.*|Star_Bronze|Material_Jackpot_Token|(Material_XP|Material_Muto).*|Material_LP100|Material_LP1000':
    'Любые 3 предмета из списка: сферы любого уровня, бронзовые звезды, жетоны джекпота, опыт или мутостерон, аптечки (средние/большие)',
  'orb_(special|basic)_[abcdefghijklmnopqrstuvwxyz]+_.*|Star_Bronze|Star_Silver|Material_Jackpot_Token|(Material_XP|Material_Muto).*|Material_LP100|Material_LP1000':
    'Любые 4 предмета из списка: сферы любого уровня, бронзовые или серебряные звезды, жетоны джекпота, опыт или мутостерон, аптечки (средние/большие)',
  'Material_Muto50|Material_XP1000':
    'Любая большая доза мутостерона или банка опыта',
  'orb_basic_[abcdefghijklmnopqrstuvwxyz]+': 'Любая базовая сфера',
  'orb_basic_[abcdefghijklmnopqrstuvwxyz]+_01': 'Любая базовая сфера ур.1',
  'orb_basic_[abcdefghijklmnopqrstuvwxyz]+_02': 'Любая базовая сфера ур.2',
  'orb_basic_[abcdefghijklmnopqrstuvwxyz]+_03': 'Любая базовая сфера ур.3',
  'orb_special_[abcdefghijklmnopqrstuvwxyz]+': 'Любая особая сфера',
  'orb_special_[abcdefghijklmnopqrstuvwxyz]+_01': 'Любая особая сфера ур.1',
  'orb_special_[abcdefghijklmnopqrstuvwxyz]+_02': 'Любая особая сфера ур.2',
  'orb_special_[abcdefghijklmnopqrstuvwxyz]+_03': 'Любая особая сфера ур.3',
};

function parseAttributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(tag)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

function parseRecipes(raw: string, category: CraftCategory): CraftRecipe[] {
  const recipes: CraftRecipe[] = [];
  const recipeRegex = /<Recipe[^>]*>[\s\S]*?<\/Recipe>/g;
  const ingredientRegex = /<ingredient[^>]*>/g;
  const rewardRegex = /<reward[^>]*>/g;

  const cleanedRaw = raw.replace(/-->.*$/gm, '').replace(/<\/Recipe>\s*$/m, '</Recipe>');

  const matches = cleanedRaw.match(recipeRegex);
  if (!matches) {
    return recipes;
  }

  for (const block of matches) {
    const headerMatch = block.match(/<Recipe[^>]*>/);
    if (!headerMatch) continue;
    const attrs = parseAttributes(headerMatch[0]);

    const recipe: CraftRecipe = {
      id: attrs.id ?? 'unknown',
      category,
      bonusPer1000: attrs.bonusPer1000 ? Number(attrs.bonusPer1000) : 0,
      okHC: attrs.okHC ? Number(attrs.okHC) : 0,
      ingredients: [],
      rewards: [],
    };

    const ingredientMatches = block.match(ingredientRegex) ?? [];
    for (const ingredientTag of ingredientMatches) {
      const ingredientAttrs = parseAttributes(ingredientTag);
      if (ingredientAttrs.regex) {
        recipe.ingredients.push({
          regex: ingredientAttrs.regex,
          amount: ingredientAttrs.amount ? Number(ingredientAttrs.amount) : 1,
        });
      }
    }

    const rewardMatches = block.match(rewardRegex) ?? [];
    for (const rewardTag of rewardMatches) {
      const rewardAttrs = parseAttributes(rewardTag);
      if (rewardAttrs.id) {
        recipe.rewards.push({
          id: rewardAttrs.id,
          amount: rewardAttrs.amount ? Number(rewardAttrs.amount) : 1,
          odds: rewardAttrs.odds ? Number(rewardAttrs.odds) : 1000,
        });
      }
    }

    recipes.push(recipe);
  }

  return recipes;
}

function parseIncentives(raw: string): IncentiveReward[] {
  const matches = raw.match(/<IncentiveReward[^>]*>/g);
  if (!matches) return [];

  return matches
    .map((tag) => {
      const attrs = parseAttributes(tag);
      const per1000 = attrs.per1000 ? Number(attrs.per1000) : 0;
      return {
        duration: attrs.duration ? Number(attrs.duration) : 0,
        id: attrs.id ?? 'unknown',
        per1000,
        probability: per1000 / 1000,
      } satisfies IncentiveReward;
    })
    .sort((a, b) => b.per1000 - a.per1000);
}

const RECIPES = RAW_SOURCES.flatMap(({ category, raw }) => parseRecipes(raw, category));

export const craftRecipesByCategory: Record<CraftCategory, CraftRecipe[]> = {
  blackhole: RECIPES.filter((recipe) => recipe.category === 'blackhole'),
  lab: RECIPES.filter((recipe) => recipe.category === 'lab'),
  orb: RECIPES.filter((recipe) => recipe.category === 'orb'),
  star: RECIPES.filter((recipe) => recipe.category === 'star'),
};

export const incentiveRewards = parseIncentives(incentiveRaw);

export function translateItemId(itemId: string): string {
  if (ITEM_TRANSLATIONS[itemId]) {
    return ITEM_TRANSLATIONS[itemId];
  }

  for (const [baseId, title] of Object.entries(ITEM_TRANSLATIONS)) {
    if (itemId.startsWith(`${baseId}_`)) {
      const suffix = itemId.slice(baseId.length + 1);
      if (/^\d+$/.test(suffix)) {
        return `${title} ур.${Number(suffix)}`;
      }
      if (/^\d{2}$/.test(suffix)) {
        return `${title} ур.${Number(suffix)}`;
      }
    }
  }

  const readable = itemId
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

export function getItemTexture(itemId: string): string | null {
  if (ITEM_TEXTURES[itemId]) {
    return ITEM_TEXTURES[itemId];
  }

  if (itemId.startsWith('orb_basic_')) {
    return `/orbs/basic/${itemId}.png`;
  }

  if (itemId.startsWith('orb_special_')) {
    if (SPECIAL_ORB_TEXTURE_BLACKLIST.has(itemId)) {
      return null;
    }
    return `/orbs/special/${itemId}.png`;
  }

  if (itemId.startsWith('Charm_')) {
    return `/boosters/${itemId.toLowerCase()}.png`;
  }

  return null;
}

export function describeIngredientRegex(regex: string): string {
  if (COMPLEX_REGEX_DESCRIPTIONS[regex]) {
    return COMPLEX_REGEX_DESCRIPTIONS[regex];
  }

  if (!regex.includes('|') && !regex.includes('[') && !regex.includes('(') && !regex.includes('.')) {
    return translateItemId(regex);
  }

  const parts = regex
    .split('|')
    .map((part) => part.replace(/[()]/g, '').replace(/\.\*/g, '').trim())
    .filter(Boolean);

  if (parts.length > 1) {
    const unique = Array.from(new Set(parts));
    const translated = unique.map((part) => translateItemId(part));
    return translated.join(' или ');
  }

  return regex;
}

export function calculateIncentiveChance(
  recipe: CraftRecipe,
  incentive: IncentiveReward | null,
): number {
  if (!incentive || recipe.bonusPer1000 <= 0) {
    return 0;
  }

  return (recipe.bonusPer1000 / 1000) * (incentive.per1000 / 1000);
}

export function simulateRecipe(
  recipe: CraftRecipe,
  crafts: number,
  incentive: IncentiveReward | null,
  rng: () => number = Math.random,
): DetailedSimulationResult {
  const totalOdds = recipe.rewards.reduce((sum, reward) => sum + reward.odds, 0);
  const mainRewards: Record<string, number> = {};
  const incentiveRewardsResult: Record<string, number> = {};
  const log: string[] = [];

  if (crafts < 1) {
    return {
      crafts: 0,
      mainRewards,
      incentiveRewards: incentiveRewardsResult,
      rewardDetails: [],
      incentiveDetails: [],
      expectedIncentiveChance: 0,
      log,
    };
  }

  const expectedIncentiveChance = calculateIncentiveChance(recipe, incentive);

  for (let i = 0; i < crafts; i += 1) {
    if (totalOdds > 0 && recipe.rewards.length > 0) {
      const roll = Math.floor(rng() * totalOdds) + 1;
      let current = 0;
      for (const reward of recipe.rewards) {
        current += reward.odds;
        if (roll <= current) {
          mainRewards[reward.id] = (mainRewards[reward.id] ?? 0) + reward.amount;
          break;
        }
      }
    }

    if (incentive && expectedIncentiveChance > 0) {
      if (rng() < expectedIncentiveChance) {
        incentiveRewardsResult[incentive.id] = (incentiveRewardsResult[incentive.id] ?? 0) + 1;
      }
    }
  }

  const rewardDetails = Object.entries(mainRewards)
    .map(([id, amount]) => ({
      id,
      amount,
      perCraft: crafts > 0 ? amount / crafts : 0,
      share: 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalMain = rewardDetails.reduce((sum, item) => sum + item.amount, 0);
  const totalIncentive = Object.values(incentiveRewardsResult).reduce((sum, amount) => sum + amount, 0);

  if (totalMain > 0) {
    for (const item of rewardDetails) {
      item.share = item.amount / totalMain;
    }
  }

  const incentiveDetails: IncentiveSummary[] = Object.entries(incentiveRewardsResult)
    .map(([id, amount]) => ({
      id,
      amount,
      perCraft: crafts > 0 ? amount / crafts : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  log.push(`🎯 Результаты ${crafts} крафтов`);
  log.push(`📋 Рецепт: ${recipe.id}`);

  if (expectedIncentiveChance > 0 && incentive) {
    log.push(`🎲 Шанс доп. награды: ${(expectedIncentiveChance * 100).toFixed(2)}%`);
  }

  log.push('🏆 Основные награды:');
  if (rewardDetails.length === 0) {
    log.push('  - Нет наград');
  } else {
    for (const detail of rewardDetails) {
      const chancePerCraft = detail.perCraft * 100;
      const sharePercent = detail.share * 100;
      log.push(
        `  - ${translateItemId(detail.id)}: ${detail.amount} шт. (${chancePerCraft.toFixed(1)}% за крафт, ${sharePercent.toFixed(
          1,
        )}% от всех наград)`,
      );
    }
  }

  if (incentive) {
    if (incentiveDetails.length > 0) {
      log.push(`✨ Дополнительные награды (${translateItemId(incentive.id)}):`);
      for (const detail of incentiveDetails) {
        const actualChance = detail.perCraft * 100;
        const expectedPercent = expectedIncentiveChance * 100;
        log.push(
          `  - ${translateItemId(detail.id)}: ${detail.amount} шт. (ожидалось: ${expectedPercent.toFixed(1)}%, получено: ${actualChance.toFixed(
            1,
          )}%)`,
        );
      }
    } else {
      log.push(`✨ Дополнительные награды (${translateItemId(incentive.id)}) не выпали.`);
    }
  }

  log.push('📊 Статистика:');
  log.push(`  - Всего основных наград: ${totalMain}`);
  log.push(`  - Всего дополнительных наград: ${totalIncentive}`);
  log.push(`  - Общее количество наград: ${totalMain + totalIncentive}`);

  return {
    crafts,
    mainRewards,
    incentiveRewards: incentiveRewardsResult,
    rewardDetails,
    incentiveDetails,
    expectedIncentiveChance,
    log,
  };
}

export function getRewardChance(reward: CraftReward, recipe: CraftRecipe): number {
  const totalOdds = recipe.rewards.reduce((sum, item) => sum + item.odds, 0);
  if (!totalOdds) return 0;
  return reward.odds / totalOdds;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) {
    return 'мгновенно';
  }

  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days} д`);
  if (hours) parts.push(`${hours} ч`);
  if (mins) parts.push(`${mins} мин`);

  return parts.join(' ') || 'мгновенно';
}

export function getBonusRange(recipes: CraftRecipe[]): { min: number; max: number } {
  if (!recipes.length) {
    return { min: 0, max: 0 };
  }
  const bonuses = recipes.map((recipe) => recipe.bonusPer1000);
  return {
    min: Math.min(...bonuses),
    max: Math.max(...bonuses),
  };
}

export function getOkhcRange(recipes: CraftRecipe[]): { min: number; max: number } | null {
  const values = recipes
    .map((recipe) => recipe.okHC)
    .filter((value) => typeof value === 'number' && value > 0);
  if (!values.length) {
    return null;
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function getFeaturedRewardIds(recipes: CraftRecipe[], limit = 5): string[] {
  const seen = new Set<string>();
  const featured: string[] = [];

  for (const recipe of recipes) {
    for (const reward of recipe.rewards) {
      if (!seen.has(reward.id)) {
        seen.add(reward.id);
        featured.push(reward.id);
        if (featured.length >= limit) {
          return featured;
        }
      }
    }
  }

  return featured;
}
