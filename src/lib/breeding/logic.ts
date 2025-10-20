
// @ts-nocheck
/**
 * Parser for m3guide-like breeding CSV and helpers.
 * Expected columns (header names can vary; we match loosely):
 * parent1,parent2,child,probability,minutes
 */
export function parseBreedCsv(csv: string){
  const lines = csv.trim().split(/\r?\n/);
  const hdr = lines.shift()!.split(',').map(s => s.trim().toLowerCase());
  function at(name: string){
    const i = hdr.findIndex(h => h.includes(name));
    return i >= 0 ? i : -1;
  }
  const iP1 = at('parent1'); const iP2 = at('parent2'); const iChild = at('child'); 
  const iProb = at('prob'); const iTime = at('time') >= 0 ? at('time') : at('minutes');

  const edges = new Map<string, { child: string; probability?: number; minutes?: number }>();

  const norm = (g: string) => String(g || '').trim().toUpperCase().split('').sort().join('');

  for (const raw of lines){
    if (!raw.trim()) continue;
    const cols = raw.split(',').map(s => s.trim());
    const p1 = norm(cols[iP1]); const p2 = norm(cols[iP2]); const child = norm(cols[iChild]);
    const prob = iProb >= 0 ? Number(cols[iProb]) : NaN;
    const minutes = iTime >= 0 ? Number(cols[iTime]) : NaN;
    edges.set(`${p1}+${p2}`, { child, probability: isFinite(prob) ? prob : undefined, minutes: isFinite(minutes) ? minutes : undefined });
    // table is symmetric
    edges.set(`${p2}+${p1}`, { child, probability: isFinite(prob) ? prob : undefined, minutes: isFinite(minutes) ? minutes : undefined });
  }

  return { edges, norm };
}

export function childGenesFor(table: ReturnType<typeof parseBreedCsv>, g1: string, g2: string){
  const k = `${table.norm(g1)}+${table.norm(g2)}`;
  return table.edges.get(k)?.child ?? null;
}
export function pairCostMinutes(table: ReturnType<typeof parseBreedCsv>, g1: string, g2: string){
  const k = `${table.norm(g1)}+${table.norm(g2)}`;
  return table.edges.get(k)?.minutes ?? null;
}
export function pairProbability(table: ReturnType<typeof parseBreedCsv>, g1: string, g2: string){
  const k = `${table.norm(g1)}+${table.norm(g2)}`;
  return table.edges.get(k)?.probability ?? null;
}
