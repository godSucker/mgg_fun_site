/**
 * UNIFIED STATS CALCULATOR
 * Single source of truth for all mutant stat calculations
 */

export interface BaseStatsInput {
  hp?: number;
  atk1?: number;
  atk1r?: number;
  atk2?: number;
  atk2r?: number;
  speed?: number;
  silver?: number;
  abilityPct1?: number;
  abilityPct2?: number;
  hp_base?: number;
  atk1_base?: number;
  atk1p_base?: number;
  atk2_base?: number;
  atk2p_base?: number;
  speed_base?: number;
  bank_base?: number;
}

export interface CalculatedStats {
  hp: number;
  atk1: number;
  atk2: number;
  ability: number;
  speed: number;
  silver: number;
}

/**
 * Calculate final stats
 * @param baseStats Base stat values (supports both naming conventions)
 * @param level Current level (1-30)
 * @param starMultiplier Star rating multiplier (1.0, 1.1, 1.3, 1.75, 2.0)
 */
export function calculateFinalStats(
  baseStats: BaseStatsInput,
  level: number,
  starMultiplier?: number
): CalculatedStats {
  const multiplier = starMultiplier || 1;

  // Normalize input - support both naming conventions
  const hp = baseStats.hp ?? baseStats.hp_base ?? 0;
  const atk1 = baseStats.atk1 ?? baseStats.atk1_base ?? 0;
  const atk1r = baseStats.atk1r ?? baseStats.atk1p_base ?? atk1;
  const atk2 = baseStats.atk2 ?? baseStats.atk2_base ?? 0;
  const atk2r = baseStats.atk2r ?? baseStats.atk2p_base ?? atk2;

  const speed = baseStats.speed ?? baseStats.speed_base ??
                (baseStats as any).spd ??
                (baseStats as any).lvl1?.spd ??
                (baseStats as any).lvl30?.spd ?? 0;

  const silver = baseStats.silver ?? baseStats.bank_base ?? 42;
  const abilityPct1 = baseStats.abilityPct1 ?? 0;
  const abilityPct2 = baseStats.abilityPct2 ?? 0;

  // Apply star multiplier to base stats
  const finalBaseHp = hp * multiplier;
  const finalBaseAtk1 = atk1 * multiplier;
  const finalBaseAtk1r = atk1r * multiplier;
  const finalBaseAtk2 = atk2 * multiplier;
  const finalBaseAtk2r = atk2r * multiplier;

  // Level scaling
  const levelScale = level / 10 + 0.9;

  const finalHp = finalBaseHp * levelScale;

  // ATK1: upgrades at level 10
  const activeBaseAtk1 = level < 10 ? finalBaseAtk1 : finalBaseAtk1r;
  const finalAtk1 = activeBaseAtk1 * levelScale;

  // ATK2: upgrades at level 15
  const activeBaseAtk2 = level < 15 ? finalBaseAtk2 : finalBaseAtk2r;
  const finalAtk2 = activeBaseAtk2 * levelScale;

  // Ability: switches at level 25
  const abilityPercent = level < 25 ? abilityPct1 : abilityPct2;
  const abilityValue = finalAtk1 * (Math.abs(abilityPercent) / 100);

  const finalSpeed = speed;
  const finalSilver = silver * level;

  return {
    hp: Math.round(finalHp),
    atk1: Math.round(finalAtk1),
    atk2: Math.round(finalAtk2),
    ability: Math.round(abilityValue),
    speed: finalSpeed,
    silver: Math.round(finalSilver),
  };
}

/**
 * Get star multiplier by tier
 */
export function getStarMultiplier(starTier: number): number {
  const multipliers = {
    0: 1.0, // normal
    1: 1.1, // bronze
    2: 1.3, // silver
    3: 1.75, // gold
    4: 2.0, // platinum
  };
  return multipliers[starTier as keyof typeof multipliers] ?? 1.0;
}
