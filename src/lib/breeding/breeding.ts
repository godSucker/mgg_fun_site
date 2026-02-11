/**
 * Main Breeding Calculator - MGG Game Rules Implementation
 *
 * This module orchestrates the breeding calculation by:
 * 1. Generating possible gene combinations (core-algorithm.ts)
 * 2. Finding matching mutants in the database
 * 3. Filtering by type availability rules (type-filters.ts)
 * 4. Handling secret recipes
 */

import { calculatePossibleOffspring, normalizeGeneCode, canBreedChild } from './core-algorithm';
import { canBreedByType, getBreedingTag, isUnbreedableType } from './type-filters';
import { secretCombos } from '@/lib/secretCombos';
import { normalizeSearch as normalizeName } from '@/lib/search-normalize';

// --- 1. Types ---

export interface Mutant {
  id: string;
  name: string;
  genes: string | string[];
  odds: number;
  type?: string;
  incub_time?: number;
  image?: string | string[];
}

export interface BreedingResult {
  child: Mutant;
  isSecret?: boolean;
  tag?: string;
}

export interface ParentPair {
  p1: Mutant;
  p2: Mutant;
  isSecret: boolean;
}

// --- 2. Helpers ---

function getGeneStr(genes: string | string[]): string {
  let str = Array.isArray(genes) ? genes.join('') : genes;
  return str ? str.toUpperCase().trim() : '';
}

/**
 * Checks if a child's gene code matches any of the possible offspring combinations.
 */
function matchesOffspringGenes(childGenes: string, possibleOffspring: string[]): boolean {
  const normalized = normalizeGeneCode(childGenes);
  return possibleOffspring.includes(normalized);
}

// --- 3. Main Breeding Calculator ---

/**
 * Calculates all possible offspring from breeding two parent mutants.
 *
 * Process:
 * 1. Check for secret recipes (highest priority)
 * 2. Generate possible gene combinations using the breeding algorithm
 * 3. Find all mutants matching those gene combinations
 * 4. Filter by type availability rules
 * 5. Sort results (secrets first, then copies, then by rarity)
 *
 * @param p1 First parent mutant
 * @param p2 Second parent mutant
 * @param allMutants Database of all mutants
 * @returns Array of possible offspring with metadata
 */
export function calculateBreeding(
  p1: Mutant,
  p2: Mutant,
  allMutants: Mutant[]
): BreedingResult[] {
  if (!p1 || !p2) return [];

  const candidates: BreedingResult[] = [];
  const seenIds = new Set<string>();

  const p1Name = normalizeName(p1.name);
  const p2Name = normalizeName(p2.name);
  const p1Id = String(p1.id);
  const p2Id = String(p2.id);

  // ========================================
  // STEP 1: SECRET RECIPES (Highest Priority)
  // ========================================
  const secretMatch = secretCombos.find(combo => {
    const cP1 = normalizeName(combo.parents[0]);
    const cP2 = normalizeName(combo.parents[1]);
    return (cP1 === p1Name && cP2 === p2Name) || (cP1 === p2Name && cP2 === p1Name);
  });

  if (secretMatch) {
    const secretChild = allMutants.find(m =>
      normalizeName(m.name) === normalizeName(secretMatch.childName)
    );
    if (secretChild) {
      candidates.push({ child: secretChild, isSecret: true, tag: 'РЕЦЕПТ' });
      seenIds.add(String(secretChild.id));
    }
  }

  // ========================================
  // STEP 2: CALCULATE POSSIBLE GENE COMBINATIONS
  // ========================================
  const p1Genes = getGeneStr(p1.genes);
  const p2Genes = getGeneStr(p2.genes);

  const possibleOffspring = calculatePossibleOffspring(p1Genes, p2Genes);

  // ========================================
  // STEP 3 & 4: FIND MATCHING MUTANTS AND FILTER BY TYPE
  // ========================================
  for (const m of allMutants) {
    const mId = String(m.id);
    if (seenIds.has(mId)) continue;

    const mGenes = getGeneStr(m.genes);

    // Check if genes match the possible offspring
    if (!matchesOffspringGenes(mGenes, possibleOffspring)) {
      continue;
    }

    // Apply type-based filtering
    if (!canBreedByType(m, p1Id, p2Id)) {
      continue;
    }

    const tag = getBreedingTag(m, p1Id, p2Id);

    candidates.push({ child: m, isSecret: false, tag });
    seenIds.add(mId);
  }

  // ========================================
  // STEP 5: SORT RESULTS
  // ========================================
  // Priority: Secrets -> Copies -> By Odds (rarity)
  return candidates.sort((a, b) => {
    if (a.isSecret !== b.isSecret) return a.isSecret ? -1 : 1;
    if (a.tag === 'КОПИЯ' && b.tag !== 'КОПИЯ') return -1;
    if (b.tag === 'КОПИЯ' && a.tag !== 'КОПИЯ') return 1;
    return (Number(b.child.odds) || 0) - (Number(a.child.odds) || 0);
  });
}

// --- 4. Reverse Breeding (Find Parents) ---

/**
 * Finds all possible parent pairs that can breed the target mutant.
 *
 * @param target The mutant to breed
 * @param allMutants Database of all mutants
 * @returns Array of parent pairs that can produce this mutant
 */
export function findParentsFor(
  target: Mutant,
  allMutants: Mutant[]
): ParentPair[] {
  const results: ParentPair[] = [];

  const tName = normalizeName(target.name);
  const tType = (target.type || 'default').toLowerCase();
  const tGenes = getGeneStr(target.genes);
  const tId = String(target.id);

  // ========================================
  // CHECK 1: SECRET RECIPES
  // ========================================
  const secretRecipes = secretCombos.filter(s => normalizeName(s.childName) === tName);
  if (secretRecipes.length > 0) {
    secretRecipes.forEach(r => {
      const p1 = allMutants.find(m => normalizeName(m.name) === normalizeName(r.parents[0]));
      const p2 = allMutants.find(m => normalizeName(m.name) === normalizeName(r.parents[1]));
      if (p1 && p2) results.push({ p1, p2, isSecret: true });
    });
    // Secret recipes are exclusive - return only these
    return results;
  }

  // ========================================
  // CHECK 2: UNBREEDABLE TYPES
  // ========================================
  if (isUnbreedableType(tType)) {
    return [];
  }

  // ========================================
  // CHECK 3: FIND COMPATIBLE PARENTS
  // ========================================

  // Extract required genes from target
  const targetGenePool = tGenes.split('').filter((g, i, arr) => arr.indexOf(g) === i);

  // Filter potential parents: must have at least one gene that the target needs
  const potentialParents = allMutants.filter(m => {
    const genes = getGeneStr(m.genes);
    return targetGenePool.some(g => genes.includes(g));
  }).sort((a, b) => (Number(b.odds) || 0) - (Number(a.odds) || 0));

  // Check if target requires inheritance (restricted type not in breedable list)
  const needsInheritance = !canBreedByType(target, 'none', 'none');

  if (needsInheritance) {
    // Strategy: One parent must be the target itself
    for (const p2 of potentialParents) {
      if (canBreedChild(tGenes, tGenes, getGeneStr(p2.genes))) {
        results.push({ p1: target, p2, isSecret: false });
      }
    }
  } else {
    // Strategy: Try all parent combinations
    let count = 0;
    const maxResults = 20; // Limit to prevent performance issues
    const maxIterations = 5000;

    outer: for (let i = 0; i < potentialParents.length; i++) {
      for (let j = i; j < potentialParents.length; j++) {
        if (count++ > maxIterations) break outer;

        const p1 = potentialParents[i];
        const p2 = potentialParents[j];

        const p1Genes = getGeneStr(p1.genes);
        const p2Genes = getGeneStr(p2.genes);

        if (canBreedChild(tGenes, p1Genes, p2Genes)) {
          results.push({ p1, p2, isSecret: false });
          if (results.length >= maxResults) break outer;
        }
      }
    }
  }

  return results;
}
