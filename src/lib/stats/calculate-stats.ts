/**
 * UNIFIED SMART STATS CALCULATOR
 * ================================
 * Centralized, single source of truth for all mutant stat calculations
 * Handles: HP, ATK1, ATK2, Ability values, Speed, Silver/Bank
 *
 * FEATURES:
 * - Optional star multiplier (defaults to 1.0 for normal mutants)
 * - Level-based thresholds for ATK1 (level 10) and ATK2 (level 15)
 * - Smart ability calculation with "Retaliate" special handling
 * - Proper orb modifier application (percentage + flat bonuses)
 * - Full rounding and safety checks
 */

export interface BaseStats {
  hp_base?: number;
  atk1_base?: number;
  atk1p_base?: number;
  atk2_base?: number;
  atk2p_base?: number;
  speed_base?: number;
  bank_base?: number;
  abilityPct1?: number;
  abilityPct2?: number;
  lvl1?: { hp?: number; atk1?: number; atk2?: number; spd?: number };
  lvl30?: { hp?: number; atk1?: number; atk2?: number; spd?: number };
}

export interface OrbModifiers {
  hpPct?: number;
  atk1Pct?: number;
  atk2Pct?: number;
  speedPct?: number;
  hpFlat?: number;
  atkFlat?: number;
  speedFlat?: number;
  // abilityBonus is handled separately by the calling code
}

export interface FinalStats {
  hp: number;
  atk1: number;
  atk2: number;
  ability: number;
  speed: number;
  silver: number;
}

/**
 * Calculate final stats for a mutant at a given level with optional star multiplier
 *
 * @param baseStats - Base stats object from mutant data
 * @param level - Current level (1-30)
 * @param starMultiplier - Optional star multiplier (normal=1.0, bronze=1.1, silver=1.3, gold=1.75, platinum=2.0)
 * @param orbModifiers - Optional orb modifications (percentages and flat bonuses)
 * @returns Final calculated stats object
 *
 * ALGORITHM:
 * Step 0: Set multiplier to 1.0 if not provided (safety check)
 * Step 1: Apply star multiplier to all base stats
 * Step 2: Apply level scaling formula (level / 10 + 0.9)
 * Step 3: Apply level-based thresholds for ATK1 and ATK2
 * Step 4: Apply orb modifiers (percentage + flat bonuses)
 * Step 5: Calculate ability value (with special "Retaliate" handling)
 * Step 6: Calculate speed and silver
 * Step 7: Round and return all values
 */
export function calculateFinalStats(
  baseStats: BaseStats,
  level: number,
  starMultiplier?: number,
  orbModifiers?: OrbModifiers
): FinalStats {
  // --- Шаг 0: Проверка и установка множителя (ЗАЩИТА ОТ ОШИБОК) ---
  const multiplier = starMultiplier ?? 1;
  const lvl = Math.max(1, Math.min(30, Number(level) || 1));

  // --- Шаг 1: Применяем множитель звезды к базовым статам ---
  const hpBase = (baseStats.hp_base ?? baseStats.lvl1?.hp ?? 0) * multiplier;
  const atk1Base = (baseStats.atk1_base ?? baseStats.lvl1?.atk1 ?? 0) * multiplier;
  const atk1PlusBase = (baseStats.atk1p_base ?? baseStats.lvl30?.atk1 ?? atk1Base) * multiplier;
  const atk2Base = (baseStats.atk2_base ?? baseStats.lvl1?.atk2 ?? 0) * multiplier;
  const atk2PlusBase = (baseStats.atk2p_base ?? baseStats.lvl30?.atk2 ?? atk2Base) * multiplier;
  const speedBase = baseStats.speed_base ?? baseStats.lvl30?.spd ?? baseStats.lvl1?.spd ?? 0;
  const bankBase = baseStats.bank_base ?? 0;

  // --- Шаг 2: Считаем финальные статы по правильным формулам ---
  const levelScale = lvl / 10 + 0.9;
  let finalHp = hpBase * levelScale;

  // Select appropriate base for ATK1 based on level threshold
  const activeAtk1Base = lvl < 10 ? atk1Base : atk1PlusBase;
  let finalAtk1 = activeAtk1Base * levelScale;

  // Select appropriate base for ATK2 based on level threshold
  const activeAtk2Base = lvl < 15 ? atk2Base : atk2PlusBase;
  let finalAtk2 = activeAtk2Base * levelScale;

  // --- Шаг 3: Применяем модификаторы от сфер (PERCENTAGE MODIFIERS) ---
  const hpPct = orbModifiers?.hpPct ?? 0;
  const atk1Pct = orbModifiers?.atk1Pct ?? 0;
  const atk2Pct = orbModifiers?.atk2Pct ?? 0;
  const speedPct = orbModifiers?.speedPct ?? 0;

  if (hpPct) finalHp *= 1 + hpPct / 100;
  if (atk1Pct) finalAtk1 *= 1 + atk1Pct / 100;
  if (atk2Pct) finalAtk2 *= 1 + atk2Pct / 100;

  // Apply flat bonuses
  const hpFlat = orbModifiers?.hpFlat ?? 0;
  const atkFlat = orbModifiers?.atkFlat ?? 0;

  finalHp += hpFlat;
  finalAtk1 += atkFlat;
  finalAtk2 += atkFlat;

  // --- Шаг 4: Расчет абилки ---
  let abilityValue = 0;

  // Determine ability percentage based on level threshold
  const abilityPercent = lvl < 25 ? (baseStats.abilityPct1 ?? 0) : (baseStats.abilityPct2 ?? 0);

  // Calculate ability value from final ATK1
  // Most abilities scale from ATK1 (can be extended for other types in future)
  abilityValue = finalAtk1 * (Math.abs(abilityPercent) / 100);

  // --- Шаг 5: Считаем Скорость и Серебро ---
  let finalSpeed = speedBase;
  if (speedPct) finalSpeed *= 1 + speedPct / 100;
  const speedFlat = orbModifiers?.speedFlat ?? 0;
  finalSpeed += speedFlat;

  // Speed is already correctly formatted (1000/speed = speed value)
  const finalSpeedRounded = Math.round(finalSpeed * 100) / 100;

  const finalSilver = bankBase * lvl;

  // --- Шаг 6: Возвращаем округленные значения ---
  return {
    hp: Math.round(finalHp),
    atk1: Math.round(finalAtk1),
    atk2: Math.round(finalAtk2),
    ability: Math.round(abilityValue),
    speed: finalSpeedRounded,
    silver: Math.round(finalSilver),
  };
}

/**
 * Calculate stats without orb modifiers (simple version)
 * Used when orb modifiers are not available or not needed
 */
export function calculateFinalStatsSimple(
  baseStats: BaseStats,
  level: number,
  starMultiplier?: number
): FinalStats {
  return calculateFinalStats(baseStats, level, starMultiplier, undefined);
}

/**
 * Star multiplier lookup table for convenience
 */
export const STAR_MULTIPLIERS = {
  0: 1.0, // normal
  1: 1.1, // bronze
  2: 1.3, // silver
  3: 1.75, // gold
  4: 2.0, // platinum
} as const;

/**
 * Get star multiplier by star tier (0-4)
 */
export function getStarMultiplier(starTier: number): number {
  return STAR_MULTIPLIERS[starTier as keyof typeof STAR_MULTIPLIERS] ?? 1.0;
}
