// src/lib/breeding/m3-xml.ts
// Parses m3-style XML settings and exposes a normalized structure.
export type StarCondition = {
  lvlCreatureMin: number;
  heuristicNeeded: number; // Min(starC1, starC2)
  itemNeeded: string;      // Star_Bronze / Star_Silver / ...
  result: number;          // 1..4
  timerMalus: number;      // as in XML (unit-agnostic here)
  useFusionRules?: boolean;
};

export type HybridLengthWeights = { one: number; two: number; three: number };
export type HybridKey = `${1|2|3}x${1|2|3}`;

export type M3Settings = {
  stars: StarCondition[];
  hybrid: Record<HybridKey, HybridLengthWeights>;
  level2BonusOdds?: number;
  level2BonusOddsReceipe?: number;
  level3BonusOdds?: number;
  level3BonusOddsReceipe?: number;
};

export async function loadM3Settings(): Promise<M3Settings | null> {
  let raw: string | undefined;
  try {
    // @ts-ignore vite raw import in Astro/Vite
    const mod = await import('@/data/breeding/settings.xml?raw');
    raw = (mod?.default ?? '').trim();
  } catch {
    return null;
  }
  if (!raw) return null;

  const doc = new DOMParser().parseFromString(raw, 'application/xml');

  const stars: StarCondition[] = [];
  doc.querySelectorAll('Stars > Condition').forEach(n => {
    stars.push({
      lvlCreatureMin: +(n.getAttribute('lvlCreatureMin') || 0),
      heuristicNeeded: +(n.getAttribute('heuristicNeeded') || 0),
      itemNeeded: String(n.getAttribute('itemNeeded') || ''),
      result: +(n.getAttribute('result') || 0),
      timerMalus: +(n.getAttribute('timerMalus') || 0),
      useFusionRules: n.getAttribute('useFusionRules') === 'true',
    });
  });

  const attrNum = (el: Element, name: string) => +(el.getAttribute(name) || 0);
  const hybrid: Record<HybridKey, HybridLengthWeights> = {} as any;
  doc.querySelectorAll('Hybridization > Specimens').forEach(sp => {
    const a = +(sp.getAttribute('allele1') || 0) as 1|2|3;
    const b = +(sp.getAttribute('allele2') || 0) as 1|2|3;
    const lo = sp.querySelector('LengthOut');
    if (!a || !b || !lo) return;
    hybrid[`${a}x${b}`] = {
      one: attrNum(lo, 'one'),
      two: attrNum(lo, 'two'),
      three: attrNum(lo, 'three'),
    };
    hybrid[`${b}x${a}`] = hybrid[`${a}x${b}`]; // symmetric
  });

  const root = doc.querySelector('Hybridization');
  return {
    stars,
    hybrid,
    level2BonusOdds: +(root?.getAttribute('level2BonusOdds') || 0),
    level2BonusOddsReceipe: +(root?.getAttribute('level2BonusOddsReceipe') || 0),
    level3BonusOdds: +(root?.getAttribute('level3BonusOdds') || 0),
    level3BonusOddsReceipe: +(root?.getAttribute('level3BonusOddsReceipe') || 0),
  };
}
