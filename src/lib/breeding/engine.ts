// src/lib/breeding/engine.ts
import type { M3Settings } from './m3-xml';

export type Gene = 'A'|'B'|'C'|'D'|'E'|'F';
export type Code = string; // 'A', 'AA', 'AB', 'AC', ... (pairs sorted lexicographically)

export type Parent = { id?: string; name?: string; genes: Code; star?: number; lvl?: number };

export type Outcome = { genes: Code; weight: number; via: 'xml'|'generic' };

const sortCode = (g: Code) => (g.length===2 && g[0]!==g[1] ? ([...g].sort().join('')) : g);
const uniq = <T,>(xs:T[]) => Array.from(new Set(xs));
const lettersOf = (code: Code): Gene[] => uniq(code.split('')).sort() as Gene[];
const alleleLen = (code: Code): 1|2|3 => (code.length===1 ? 1 : 2);

function distributeWeightsSingle(letters: Gene[], wSingle: number): Outcome[] {
  // 'three' category per user's clarification => SINGLE-LETTER children (A, B, C, ...)
  if (!letters.length || wSingle<=0) return [];
  const w = wSingle / letters.length;
  return letters.map(l => ({ genes: l, weight: w, via: 'xml' as const }));
}

function distributeWeightsMono(letters: Gene[], wMono: number): Outcome[] {
  // 'one' => homogeneous pairs AA, BB (from available letters)
  if (!letters.length || wMono<=0) return [];
  const monos = letters.map(l => `${l}${l}` as Code);
  const w = wMono / monos.length;
  return monos.map(g => ({ genes: sortCode(g), weight: w, via: 'xml' as const }));
}

function distributeWeightsDi(letters: Gene[], wDi: number): Outcome[] {
  // 'two' => hetero pairs AB, AC, ...
  if (letters.length<2 || wDi<=0) return [];
  const di: Code[] = [];
  for (let i=0;i<letters.length;i++) for (let j=i+1;j<letters.length;j++) di.push(`${letters[i]}${letters[j]}` as Code);
  const w = wDi / di.length;
  return di.map(g => ({ genes: sortCode(g), weight: w, via: 'xml' as const }));
}

function normalize(out: Outcome[]): Outcome[] {
  const sum = out.reduce((a,b)=>a+b.weight,0);
  return sum>0 ? out.map(o => ({...o, weight: o.weight/sum})) : out;
}

export function predict(a: Parent, b: Parent, s?: M3Settings): Outcome[] {
  const la = lettersOf(a.genes);
  const lb = lettersOf(b.genes);
  const letters = uniq([...la, ...lb]); // gene pool

  // No XML -> generic: equal distribution over AA and all AB
  if (!s) {
    const mon = distributeWeightsMono(letters, 1);
    const di  = distributeWeightsDi(letters, 3);
    return normalize([...mon, ...di].map(o => ({...o, via:'generic' as const})));
  }

  const key = `${alleleLen(a.genes)}x${alleleLen(b.genes)}` as const;
  const hw = s.hybrid[key];

  if (!hw) {
    const mon = distributeWeightsMono(letters, 1);
    const di  = distributeWeightsDi(letters, 3);
    return normalize([...mon, ...di].map(o => ({...o, via:'generic' as const})));
  }

  // User clarified: 'three' => single-letter child (A, B, C)
  const singles = distributeWeightsSingle(letters, hw.three);
  const monos   = distributeWeightsMono(letters, hw.one);
  const di      = distributeWeightsDi(letters, hw.two);

  return normalize([...singles, ...monos, ...di]);
}

// Star/fusion requirements helper (from <Stars/> block)
export function fusionRequirements(a: Parent, b: Parent, s?: M3Settings){
  if (!s) return null;
  const heuristic = Math.min(a.star ?? 0, b.star ?? 0); // 0..3
  // pick first matching by heuristicNeeded (exact match)
  const cand = s.stars.find(c => c.heuristicNeeded === heuristic);
  if (!cand) return null;
  return {
    item: cand.itemNeeded,
    minLevel: cand.lvlCreatureMin,
    resultStar: cand.result,
    timerMalus: cand.timerMalus,
    useFusionRules: !!cand.useFusionRules,
  };
}
