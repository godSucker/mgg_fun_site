// src/lib/stats/orbs.ts
// Loads orbs and normalizes their effects so we can apply them generically.
export type OrbEffect = { hpPct?: number; hpFlat?: number; atkPct?: number; atkFlat?: number; spdFlat?: number };
export type Orb = { id: string; name: string; type: 'normal'|'special'; effect: OrbEffect };

type Raw = any;

function num(x: any): number|undefined {
  if (x === null || x === undefined) return undefined;
  if (typeof x === 'number' && isFinite(x)) return x;
  if (typeof x === 'string') {
    const m = x.match(/-?\d+(?:\.\d+)?/);
    if (m) return +m[0];
  }
  return undefined;
}

function normalizeOne(raw: Raw, type: 'normal'|'special'): Orb | null {
  const id = String(raw.id ?? raw.key ?? raw.code ?? raw.name ?? '').trim();
  const name = String(raw.name ?? raw.title ?? id).trim();
  const eff: OrbEffect = {};

  const src = (raw.effects ?? raw.effect ?? raw.stats ?? raw) as any;
  // Look for common keys
  const tryKeys = (keys: string[]) => {
    for (const k of keys) {
      const v = src[k];
      const n = num(v);
      if (n !== undefined) return n;
    }
    return undefined;
  };
  const hp_pct  = tryKeys(['hpPct','hp_percent','hp_pct','HP%','hpBonusPct','hp','HP']);
  const hp_flat = tryKeys(['hpFlat','hp_flat','flat_hp']);
  const atk_pct = tryKeys(['atkPct','attackPct','atk_percent','atk_pct','ATK%','attack%','atk']);
  const atk_flat= tryKeys(['atkFlat','attackFlat','atk_flat','flat_atk']);
  const spd     = tryKeys(['spd','speed','speedFlat','spdFlat','speed_flat']);

  if (hp_pct !== undefined)  eff.hpPct = hp_pct;
  if (hp_flat !== undefined) eff.hpFlat = hp_flat;
  if (atk_pct !== undefined) eff.atkPct = atk_pct;
  if (atk_flat !== undefined) eff.atkFlat = atk_flat;
  if (spd !== undefined)     eff.spdFlat = spd;

  return { id, name, type, effect: eff };
}

export type OrbsDB = { normal: Orb[]; special: Orb[] };

export async function loadOrbs(): Promise<OrbsDB> {
  let raw: any;
  try {
    // @ts-ignore
    const mod = await import('@/data/materials/orbs.json');
    raw = mod?.default ?? mod;
  } catch {
    return { normal: [], special: [] };
  }
  const normals: Orb[] = [];
  const specials: Orb[] = [];

  const addMany = (arr: any[], type: 'normal'|'special') => {
    if (!Array.isArray(arr)) return;
    for (const r of arr) {
      const o = normalizeOne(r, type);
      if (o) (type==='normal' ? normals : specials).push(o);
    }
  };

  if (Array.isArray(raw)) {
    // flat list; infer type by flag or name
    for (const r of raw) {
      const t = (String(r.type || '').toLowerCase().includes('special') || String(r.slot||'').toLowerCase()==='special') ? 'special' : 'normal';
      const o = normalizeOne(r, t as any);
      if (o) (t==='special' ? specials : normals).push(o);
    }
  } else if (raw) {
    addMany(raw.normal || raw.normals || raw.standard || [], 'normal');
    addMany(raw.special || raw.specials || [], 'special');
  }

  return { normal: normals, special: specials };
}

export type Applied = { hp: number; atk1: number; atk2: number; spd: number };

export function applyOrbs(base: Applied, orbs: { normal: (Orb|null)[], special: Orb|null }) : Applied {
  // Sum up all percentages / flats
  let hpPct = 0, hpFlat = 0, atkPct = 0, atkFlat = 0, spdFlat = 0;
  for (const o of orbs.normal) {
    if (!o) continue;
    hpPct  += o.effect.hpPct  ?? 0;
    hpFlat += o.effect.hpFlat ?? 0;
    atkPct += o.effect.atkPct ?? 0;
    atkFlat+= o.effect.atkFlat?? 0;
    spdFlat+= o.effect.spdFlat?? 0;
  }
  if (orbs.special) {
    hpPct  += orbs.special.effect.hpPct  ?? 0;
    hpFlat += orbs.special.effect.hpFlat ?? 0;
    atkPct += orbs.special.effect.atkPct ?? 0;
    atkFlat+= orbs.special.effect.atkFlat?? 0;
    spdFlat+= orbs.special.effect.spdFlat?? 0;
  }

  const hp  = Math.round(base.hp  * (1 + hpPct/100) + hpFlat);
  const atk1= Math.round(base.atk1* (1 + atkPct/100) + atkFlat);
  const atk2= Math.round(base.atk2* (1 + atkPct/100) + atkFlat);
  const spd = +(base.spd + spdFlat).toFixed(2);

  return { hp, atk1, atk2, spd };
}
