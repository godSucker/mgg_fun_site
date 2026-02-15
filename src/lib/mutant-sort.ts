const GENE_ORDER: Record<string, number> = {
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5,
}

function readGenes(m: any): string {
  if (Array.isArray(m?.genes)) {
    return m.genes
      .filter(Boolean)
      .map((g: any) => String(g).toUpperCase())
      .join('')
  }
  return ''
}

/**
 * Sort mutants by gene:
 * 1) Primary: first gene (A=0..F=5)
 * 2) Secondary: second gene (0=single first, 1=A, 2=B..6=F)
 * 3) Tertiary: by ID (lower ID first)
 */
export function sortMutantsByGene<T extends Record<string, any>>(a: T, b: T): number {
  const ga = readGenes(a)
  const gb = readGenes(b)

  // Primary: first gene
  const a1 = ga[0] ? (GENE_ORDER[ga[0]] ?? 99) : 199
  const b1 = gb[0] ? (GENE_ORDER[gb[0]] ?? 99) : 199
  if (a1 !== b1) return a1 - b1

  // Secondary: second gene (single=0 goes first, then A=1..F=6)
  const a2 = ga.length <= 1 ? 0 : (GENE_ORDER[ga[1]] ?? 99) + 1
  const b2 = gb.length <= 1 ? 0 : (GENE_ORDER[gb[1]] ?? 99) + 1
  if (a2 !== b2) return a2 - b2

  // Tertiary: by ID
  const aid = String(a?.id ?? '')
  const bid = String(b?.id ?? '')
  return aid.localeCompare(bid)
}

/**
 * Filter mutants that match gene1 (first gene) and gene2 (second gene).
 * gene1/gene2 should be uppercase letters or empty string for "all".
 */
export function filterByGenes<T extends Record<string, any>>(
  items: T[],
  gene1: string,
  gene2: string,
): T[] {
  if (!gene1 && !gene2) return items

  return items.filter((m) => {
    const genes = readGenes(m)
    if (gene1 && genes[0] !== gene1) return false
    if (gene2) {
      if (gene2 === 'NEUTRAL') {
        // Single-gene mutants only (length 1 or both genes same)
        if (genes.length > 1 && genes[0] !== genes[1]) return false
      } else {
        if (genes.length < 2 || genes[1] !== gene2) return false
      }
    }
    return true
  })
}
