/**
 * Core Breeding Algorithm - MGG Game Rules
 *
 * This module implements the strict biological breeding rules for Mutants Genetic Gladiators.
 * The algorithm is based on gene combinatorics with special reduction rules.
 */

export type Gene = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type GeneCode = string; // 'A', 'AA', 'AB', etc.

/**
 * Gene type mapping for reference:
 * A: Cyborg
 * B: Undead
 * C: Saber
 * D: Beast
 * E: Galactic
 * F: Mythic
 */

/**
 * Mutant genetic structures:
 * - Single (X): Has 1 gene (e.g., 'A', 'B')
 * - Mono (XX): Has 2 identical genes (e.g., 'AA', 'BB')
 * - Hybrid (XY): Has 2 different genes (e.g., 'AB', 'DE')
 */

/**
 * Normalizes a gene code to uppercase
 */
export function normalizeGeneCode(code: string | string[]): string {
  const str = Array.isArray(code) ? code.join('') : code;
  return str.toUpperCase().trim();
}

/**
 * Extracts the available gene pool from a parent's gene code.
 *
 * - Single parent ('A') -> ['A']
 * - Mono parent ('AA') -> ['A', 'A']
 * - Hybrid parent ('AB') -> ['A', 'B']
 *
 * @param geneCode The parent's gene code
 * @returns Array of available genes
 */
export function extractGenePool(geneCode: string): Gene[] {
  const normalized = normalizeGeneCode(geneCode);
  return normalized.split('') as Gene[];
}

/**
 * Generates all possible gene combinations from two parents using Cartesian product.
 * Applies the "Single Exception" reduction rule: when both parents contribute the same gene,
 * the result can be EITHER a Mono (AA) OR a Single (A).
 *
 * Algorithm:
 * 1. Extract gene pool from each parent
 * 2. Create Cartesian product (every gene from p1 × every gene from p2)
 * 3. Apply reduction rule for identical gene pairs
 *
 * Test cases:
 * - AA + BC -> AB, AC, BA, CA
 * - B + BA -> BB, B, BA, AB
 * - A + A -> AA, A
 * - A + B -> AB, BA
 *
 * @param parent1Code First parent's gene code
 * @param parent2Code Second parent's gene code
 * @returns Array of possible offspring gene combinations (order matters: [primary, secondary])
 */
export function calculatePossibleOffspring(
  parent1Code: string | string[],
  parent2Code: string | string[]
): GeneCode[] {
  const p1Code = normalizeGeneCode(parent1Code);
  const p2Code = normalizeGeneCode(parent2Code);

  const p1Genes = extractGenePool(p1Code);
  const p2Genes = extractGenePool(p2Code);

  const results = new Set<GeneCode>();

  // Cartesian product: every gene from p1 with every gene from p2
  for (const g1 of p1Genes) {
    for (const g2 of p2Genes) {
      // Order matters (Primary/Secondary gene)
      const combo1 = `${g1}${g2}`;
      const combo2 = `${g2}${g1}`;

      // Special Reduction Rule: if both genes are identical
      if (g1 === g2) {
        // Add BOTH the Mono (AA) AND the Single (A)
        results.add(`${g1}${g1}`); // Mono
        results.add(g1);            // Single
      } else {
        // For different genes, add both orderings (AB and BA are different)
        results.add(combo1);
        results.add(combo2);
      }
    }
  }

  return Array.from(results);
}

/**
 * Checks if a child gene code can result from breeding two parents.
 * This is used for reverse breeding (finding parents for a target child).
 *
 * @param childCode The target child's gene code
 * @param parent1Code First parent's gene code
 * @param parent2Code Second parent's gene code
 * @returns true if the child can be bred from these parents
 */
export function canBreedChild(
  childCode: string | string[],
  parent1Code: string | string[],
  parent2Code: string | string[]
): boolean {
  const possibleOffspring = calculatePossibleOffspring(parent1Code, parent2Code);
  const normalizedChild = normalizeGeneCode(childCode);

  return possibleOffspring.includes(normalizedChild);
}

/**
 * TEST SUITE - Verify algorithm correctness
 */
export function runTests(): { passed: number; failed: number; results: string[] } {
  const tests = [
    {
      name: 'AA + BC',
      p1: 'AA',
      p2: 'BC',
      expected: ['AB', 'AC', 'BA', 'CA']
    },
    {
      name: 'B (Single) + BA',
      p1: 'B',
      p2: 'BA',
      expected: ['BB', 'B', 'BA', 'AB']
    },
    {
      name: 'A (Single) + A (Single)',
      p1: 'A',
      p2: 'A',
      expected: ['AA', 'A']
    },
    {
      name: 'A (Single) + B (Single)',
      p1: 'A',
      p2: 'B',
      expected: ['AB', 'BA']
    },
    {
      name: 'AB + CD',
      p1: 'AB',
      p2: 'CD',
      expected: ['AC', 'AD', 'BC', 'BD', 'CA', 'DA', 'CB', 'DB']
    },
    {
      name: 'AA + AA',
      p1: 'AA',
      p2: 'AA',
      expected: ['AA', 'A']
    }
  ];

  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  for (const test of tests) {
    const actual = calculatePossibleOffspring(test.p1, test.p2);
    const expectedSet = new Set(test.expected);
    const actualSet = new Set(actual);

    const missing = test.expected.filter(e => !actualSet.has(e));
    const extra = actual.filter(a => !expectedSet.has(a));

    if (missing.length === 0 && extra.length === 0) {
      passed++;
      results.push(`✓ ${test.name}: PASS`);
    } else {
      failed++;
      results.push(`✗ ${test.name}: FAIL`);
      results.push(`  Expected: ${test.expected.join(', ')}`);
      results.push(`  Got: ${actual.join(', ')}`);
      if (missing.length > 0) results.push(`  Missing: ${missing.join(', ')}`);
      if (extra.length > 0) results.push(`  Extra: ${extra.join(', ')}`);
    }
  }

  return { passed, failed, results };
}
