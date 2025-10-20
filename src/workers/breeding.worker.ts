
// @ts-nocheck
/// <reference lib="webworker" />
// Breeding worker: heavy enumeration + reverse search + dijkstra planning.
import type { Star } from '@/lib/breed-map';
import { findMutantsByGenes, toCard } from '@/lib/breed-map';
import { parseBreedCsv, childGenesFor, pairCostMinutes, pairProbability } from '@/lib/breeding/logic';

let BREED_TABLE: ReturnType<typeof parseBreedCsv> | null = null;

// Lazy init with CSV content passed from main thread (to avoid network from worker)
function ensureTable(csv?: string){
  if (BREED_TABLE) return BREED_TABLE;
  if (!csv) throw new Error('Breed CSV not provided to worker');
  BREED_TABLE = parseBreedCsv(csv);
  return BREED_TABLE;
}

type Job =
  | { kind: 'enumerateChildren'; parentGenes: string[]; star: Star; csv: string }
  | { kind: 'reverseSearch'; targetGenes: string; star: Star; csv: string }
  | { kind: 'planPath'; targetId: string; star: Star; csv: string };

// Minimal Dijkstra by "cost" (minutes), edges = pair -> child genes
function dijkstra(table: ReturnType<typeof parseBreedCsv>, startGenes: Set<string>, goalGenes: string){
  // normalize helper
  const norm = (g: string) => g.split('').sort().join('');
  const goal = norm(goalGenes);
  const dist = new Map<string, number>();
  const prev = new Map<string, {from: string, via: [string,string]} | null>();
  const pq: [number,string][] = [];

  // seed known genes (existing in collection)
  for (const g of startGenes){
    const s = norm(g);
    dist.set(s, 0);
    pq.push([0, s]);
  }
  pq.sort((a,b)=>a[0]-b[0]);

  while (pq.length){
    const [d, u] = pq.shift()!;
    if (u === goal) break;
    if (d !== dist.get(u)) continue;

    // All pairs (u, v) that have defined child in table
    for (const [pairKey, out] of table.edges){
      const [g1, g2] = pairKey.split('+');
      // try as u with v, or v with u
      const ok = (u===g1 || u===g2);
      if (!ok) continue;
      const v = (u === g1 ? g2 : g1);
      const child = out.child; // normalized already inside parse
      const w = out.minutes ?? 0;
      const nd = d + w;
      if (nd < (dist.get(child) ?? Infinity)){
        dist.set(child, nd);
        prev.set(child, {from: u, via: [g1,g2]});
        // push/update pq
        pq.push([nd, child]);
        pq.sort((a,b)=>a[0]-b[0]);
      }
    }
  }

  if (!dist.has(goal)) return null;
  // reconstruct
  const path: {genes: string, via?: [string,string]}[] = [];
  let cur: string | undefined = goal;
  while (cur){
    const step = {genes: cur, via: prev.get(cur || '')?.via};
    path.push(step);
    const p = prev.get(cur || '');
    cur = p?.from;
  }
  path.reverse();
  return { totalMinutes: dist.get(goal)!, steps: path };
}

self.onmessage = (ev: MessageEvent<Job>) => {
  const job = ev.data;
  try{
    const table = ensureTable(job.csv);
    switch(job.kind){
      case 'enumerateChildren': {
        const children: any[] = [];
        for (const pg of job.parentGenes){
          for (const pg2 of job.parentGenes){
            const g = childGenesFor(table, pg, pg2);
            if (!g) continue;
            const muts = findMutantsByGenes(g).map(toCard);
            if (muts.length){
              children.push({
                parents: [pg, pg2],
                childGenes: g,
                probability: pairProbability(table, pg, pg2),
                minutes: pairCostMinutes(table, pg, pg2),
                mutants: muts
              });
            }
          }
        }
        (self as any).postMessage({ ok: true, kind: 'enumerateChildren', children });
        break;
      }
      case 'reverseSearch': {
        const rev: any[] = [];
        for (const [pairKey, out] of table.edges){
          if (out.child === job.targetGenes){
            const [g1,g2] = pairKey.split('+');
            rev.push({
              parents: [g1,g2],
              probability: out.probability ?? null,
              minutes: out.minutes ?? null
            });
          }
        }
        (self as any).postMessage({ ok: true, kind: 'reverseSearch', pairs: rev });
        break;
      }
      case 'planPath': {
        // Assume user already has some genes in collection? Minimal start set = basic single-letter genes found in dataset.
        const have = new Set<string>(
          Array.from(new Set(findMutantsByGenes('A').concat(findMutantsByGenes('B')))) // cheap seed; adjust in UI
            .map(m => m.genes).filter(Boolean) as string[]
        );
        const target = findMutantsByGenes(job.targetId).length ? job.targetId : job.targetId; // if id passed as genes we treat as such
        const plan = dijkstra(table, have, target);
        (self as any).postMessage({ ok: true, kind: 'planPath', plan });
        break;
      }
    }
  }catch(err: any){
    (self as any).postMessage({ ok: false, error: String(err?.message || err) });
  }
};
