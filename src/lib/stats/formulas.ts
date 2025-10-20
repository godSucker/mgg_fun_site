// src/lib/stats/formulas.ts
// Level scaling per user's formula:
// scale(n) = (n/10 + 0.9); works for any n >= 1 (unbounded)
export const scale = (n: number) => (n/10 + 0.9);

export type BaseStatsLvl1 = { hp: number; atk1: number; atk2: number; spd: number };

export function hpAtLevel(x_hp_lvl1: number, lvl: number) {
  return Math.round(x_hp_lvl1 * scale(lvl));
}
export function atk1AtLevel(z_atk1_lvl1: number, lvl: number) {
  return Math.round(z_atk1_lvl1 * scale(lvl));
}
export function atk2AtLevel(y_atk2_lvl1: number, lvl: number) {
  return Math.round(y_atk2_lvl1 * scale(lvl));
}
// Speed: staying constant unless orbs modify (no formula given to scale with lvl)
