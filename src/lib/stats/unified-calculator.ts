/**
 * UNIFIED STATS CALCULATOR WITH DEBUG MODE
 * ==========================================
 * Single source of truth for all mutant stat calculations
 * Includes comprehensive logging for debugging
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
  // Also support underscored names (from base_stats objects)
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
 * Calculate final stats with complete debug logging
 * @param baseStats Base stat values (supports both naming conventions)
 * @param level Current level (1-30)
 * @param starMultiplier Star rating multiplier (0=1.0, 1=1.1, 2=1.3, 3=1.75, 4=2.0)
 * @returns Calculated stats object
 */
export function calculateFinalStats(
  baseStats: BaseStatsInput,
  level: number,
  starMultiplier?: number
): CalculatedStats {
  // --- Шаг 0: ВХОДНОЙ КОНТРОЛЬ И ДЕБАГ ---
  console.log('--- ЗАПУСК РАСЧЕТА СТАТОВ ---');
  console.log('Базовые статы:', baseStats);
  console.log('Уровень:', level);
  console.log('Множитель звезды:', starMultiplier);

  const multiplier = starMultiplier || 1;
  if (starMultiplier) {
    console.log('✓ Применяем множитель:', multiplier);
  }

  // Normalize input - support both naming conventions
  const hp = baseStats.hp ?? baseStats.hp_base ?? 0;
  const atk1 = baseStats.atk1 ?? baseStats.atk1_base ?? 0;
  const atk1r = baseStats.atk1r ?? baseStats.atk1p_base ?? atk1;
  const atk2 = baseStats.atk2 ?? baseStats.atk2_base ?? 0;
  const atk2r = baseStats.atk2r ?? baseStats.atk2p_base ?? atk2;
  const speed = baseStats.speed ?? baseStats.speed_base ?? 0;
  const silver = baseStats.silver ?? baseStats.bank_base ?? 0;
  const abilityPct1 = baseStats.abilityPct1 ?? 0;
  const abilityPct2 = baseStats.abilityPct2 ?? 0;

  console.log('Нормализованные базовые значения:', { hp, atk1, atk1r, atk2, atk2r, speed, silver });

  // --- Шаг 1: Применяем множитель к базовым статам ---
  const finalBaseHp = hp * multiplier;
  const finalBaseAtk1 = atk1 * multiplier;
  const finalBaseAtk1r = atk1r * multiplier;
  const finalBaseAtk2 = atk2 * multiplier;
  const finalBaseAtk2r = atk2r * multiplier;

  console.log('После применения множителя:', { finalBaseHp, finalBaseAtk1, finalBaseAtk1r, finalBaseAtk2, finalBaseAtk2r });

  // --- Шаг 2: Расчет по формулам ---
  const levelScale = level / 10 + 0.9;
  console.log(`Коэффициент уровня (${level}/10 + 0.9):`, levelScale);

  const finalHp = finalBaseHp * levelScale;
  console.log(`HP: ${finalBaseHp} * ${levelScale} = ${finalHp}`);

  // ATK1: изменяется на уровне 10
  const activeBaseAtk1 = level < 10 ? finalBaseAtk1 : finalBaseAtk1r;
  const finalAtk1 = activeBaseAtk1 * levelScale;
  console.log(`ATK1: Уровень ${level} >= 10? ${level >= 10}. Используем базовую атаку: ${activeBaseAtk1}. Финал: ${activeBaseAtk1} * ${levelScale} = ${finalAtk1}`);

  // ATK2: изменяется на уровне 15
  const activeBaseAtk2 = level < 15 ? finalBaseAtk2 : finalBaseAtk2r;
  const finalAtk2 = activeBaseAtk2 * levelScale;
  console.log(`ATK2: Уровень ${level} >= 15? ${level >= 15}. Используем базовую атаку: ${activeBaseAtk2}. Финал: ${activeBaseAtk2} * ${levelScale} = ${finalAtk2}`);

  // --- Шаг 3: "Умный" расчет абилки ---
  let abilityValue = 0;
  const abilityPercent = level < 25 ? abilityPct1 : abilityPct2;
  console.log(`АБИЛКА: Уровень ${level} >= 25? ${level >= 25}. Используем процент: ${abilityPercent}%`);
  abilityValue = finalAtk1 * (Math.abs(abilityPercent) / 100);
  console.log(`АБИЛКА: ${finalAtk1} * (${Math.abs(abilityPercent)} / 100) = ${abilityValue}`);

  // --- Шаг 4: Скорость и Серебро ---
  const finalSpeed = speed; // Speed is already in the correct format
  const finalSilver = silver * level;
  console.log(`Скорость: ${finalSpeed}`);
  console.log(`Серебро: ${silver} * ${level} = ${finalSilver}`);

  // --- Шаг 5: Финальный результат ---
  const results: CalculatedStats = {
    hp: Math.round(finalHp),
    atk1: Math.round(finalAtk1),
    atk2: Math.round(finalAtk2),
    ability: Math.round(abilityValue),
    speed: finalSpeed,
    silver: Math.round(finalSilver),
  };

  console.log('✓ Финальный результат расчета:', results);
  console.log('--- КОНЕЦ РАСЧЕТА ---');
  return results;
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
