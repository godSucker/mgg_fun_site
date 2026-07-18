/**
 * Main Breeding Calculator - MGG Game Rules Implementation
 *
 * This module orchestrates the breeding calculation by:
 * 1. Generating possible gene combinations (core-algorithm.ts)
 * 2. Finding matching mutants in the database
 * 3. Filtering by type availability rules (type-filters.ts)
 * 4. Handling secret recipes
 * 5. Calculating odds (weight = (chance + levelBonus) × LengthOut)
 * 6. Calculating breeding duration
 */

import { calculatePossibleOffspring, normalizeGeneCode, canBreedChild } from './core-algorithm';
import { canBreedByType, getBreedingTag, isUnbreedableType } from './type-filters';
import { secretCombos } from '@/lib/secretCombos';
import { normalizeSearch as normalizeName } from '@/lib/search-normalize';

// --- 1. Types ---

export type BuildingLevel = 1 | 2 | 3;
export type StarLevel = 0 | 1 | 2 | 3 | 4; // 0=none, 1=bronze, 2=silver, 3=gold, 4=platinum

export interface Mutant {
  id: string;
  name: string;
  genes: string | string[];
  chance: number;
  type?: string;
  incub_time?: number;
  image?: string | string[];
}

export interface BreedingResult {
  child: Mutant;
  isSecret?: boolean;
  tag?: string;
  probability: number;
  weight: number;
  duration: number; // seconds
}

export interface ParentPair {
  p1: Mutant;
  p2: Mutant;
  isSecret: boolean;
}

// --- 2. LengthOut Table (from breedingsettings_decoded.xml) ---

// Key: "allele1Len,allele2Len" -> { one, two }
// one = weight multiplier for single-gene offspring (A, B, C...)
// two = weight multiplier for double-gene offspring (AA, AB, AC...)
// three = dead field (no triple-gene mutants exist)
const LENGTH_OUT: Record<string, { one: number; two: number }> = {
  '1,1': { one: 1, two: 4 },
  '1,2': { one: 1, two: 18 },
  '1,3': { one: 1, two: 15 },
  '2,1': { one: 1, two: 18 },
  '2,2': { one: 0, two: 1 },
  '2,3': { one: 0, two: 1 },
  '3,1': { one: 1, two: 15 },
  '3,2': { one: 0, two: 1 },
  '3,3': { one: 0, two: 0 },
};

// --- 3. Level Bonus Tables (from XML <Hybridization>) ---

const LEVEL_BONUS_ODDS: Record<BuildingLevel, number> = {
  1: 0,
  2: 50,
  3: 200,
};

const LEVEL_BONUS_ODDS_RECIPE: Record<BuildingLevel, number> = {
  1: 0,
  2: 1,
  3: 4,
};

// --- 4. Breeding Speed (from decompiled game client) ---

const BUILDING_SPEED: Record<BuildingLevel, number> = {
  1: 0.99,
  2: 0.66,
  3: 0.33,
};

// Star timer multiplier: 1 + timerMalus/100
// Platinum has timerMalus=0 but useFusionRules=true (separate mechanic)
const STAR_TIMER_MULTIPLIER: Record<StarLevel, number> = {
  0: 1.0,
  1: 1.5, // Bronze: timerMalus=50
  2: 2.0, // Silver: timerMalus=100
  3: 3.0, // Gold: timerMalus=200
  4: 1.0, // Platinum: timerMalus=0 (fusion rules apply)
};

// --- 5. Helpers ---

function getGeneStr(genes: string | string[]): string {
  let str = Array.isArray(genes) ? genes.join('') : genes;
  return str ? str.toUpperCase().trim() : '';
}

function dnaLength(geneCode: string): number {
  return geneCode.length;
}

function getLengthOut(p1Genes: string, p2Genes: string): { one: number; two: number } {
  const len1 = dnaLength(p1Genes);
  const len2 = dnaLength(p2Genes);
  const key = `${len1},${len2}`;
  return LENGTH_OUT[key] ?? { one: 0, two: 0 };
}

function getWeightMultiplier(childGenes: string, lo: { one: number; two: number }): number {
  const len = dnaLength(childGenes);
  if (len === 1) return lo.one;
  if (len === 2) return lo.two;
  return 0;
}

function matchesOffspringGenes(childGenes: string, possibleOffspring: string[]): boolean {
  const normalized = normalizeGeneCode(childGenes);
  return possibleOffspring.includes(normalized);
}

// --- 6. Main Breeding Calculator ---

export function calculateBreeding(
  p1: Mutant,
  p2: Mutant,
  allMutants: Mutant[],
  buildingLevel: BuildingLevel = 3,
  star1: StarLevel = 0,
  star2: StarLevel = 0
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

  // Calculate duration for secrets
  const secretDuration = calculateDuration(p1, p2, buildingLevel, star1, star2);

  if (secretMatch) {
    const secretChild = allMutants.find(m =>
      normalizeName(m.name) === normalizeName(secretMatch.childName)
    );
    if (secretChild) {
      candidates.push({
        child: secretChild,
        isSecret: true,
        tag: 'РЕЦЕПТ',
        probability: 100,
        weight: 0,
        duration: secretDuration,
      });
      seenIds.add(String(secretChild.id));
    }
  }

  // ========================================
  // STEP 1.5: PLATINUM FUSION (Guaranteed Result)
  // ========================================
  if (star1 === 4 && star2 === 4 && p1Id === p2Id) {
    const fusionDuration = calculateDuration(p1, p2, buildingLevel, 4, 4);
    return [{
      child: p1,
      isSecret: false,
      tag: 'ПЛАТИНА',
      probability: 100,
      weight: 0,
      duration: fusionDuration,
    }];
  }

  // ========================================
  // STEP 2: CALCULATE POSSIBLE GENE COMBINATIONS
  // ========================================
  const p1Genes = getGeneStr(p1.genes);
  const p2Genes = getGeneStr(p2.genes);

  const possibleOffspring = calculatePossibleOffspring(p1Genes, p2Genes);
  const lo = getLengthOut(p1Genes, p2Genes);

  // ========================================
  // STEP 3 & 4: FIND MATCHING MUTANTS AND FILTER BY TYPE
  // ========================================
  const rawCandidates: BreedingResult[] = [];

  for (const m of allMutants) {
    const mId = String(m.id);
    if (seenIds.has(mId)) continue;

    const mGenes = getGeneStr(m.genes);

    if (!matchesOffspringGenes(mGenes, possibleOffspring)) {
      continue;
    }

    if (!canBreedByType(m, p1Id, p2Id)) {
      continue;
    }

    const tag = getBreedingTag(m, p1Id, p2Id);
    const multiplier = getWeightMultiplier(mGenes, lo);

    if (multiplier <= 0) continue;

    const isRecipeType = (m.type || '').toLowerCase() === 'recipe';
    const baseChance = Number(m.chance) || 0;
    const levelBonus = isRecipeType
      ? LEVEL_BONUS_ODDS[buildingLevel] + LEVEL_BONUS_ODDS_RECIPE[buildingLevel]
      : LEVEL_BONUS_ODDS[buildingLevel];
    const effectiveOdds = baseChance + levelBonus;
    const weight = effectiveOdds * multiplier;

    rawCandidates.push({
      child: m,
      isSecret: false,
      tag,
      probability: 0,
      weight,
      duration: secretDuration,
    });
    seenIds.add(mId);
  }

  // ========================================
  // STEP 5: CALCULATE PROBABILITIES
  // ========================================
  const totalWeight = rawCandidates.reduce((sum, c) => sum + c.weight, 0);
  for (const c of rawCandidates) {
    c.probability = totalWeight > 0 ? (c.weight / totalWeight) * 100 : 0;
  }

  // Add secrets to final list (100% probability)
  const secrets = candidates.filter(c => c.isSecret);
  const allResults = [...secrets, ...rawCandidates];

  // ========================================
  // STEP 6: SORT RESULTS
  // ========================================
  return allResults.sort((a, b) => {
    if (a.isSecret !== b.isSecret) return a.isSecret ? -1 : 1;
    if (a.tag === 'КОПИЯ' && b.tag !== 'КОПИЯ') return -1;
    if (b.tag === 'КОПИЯ' && a.tag !== 'КОПИЯ') return 1;
    return b.probability - a.probability;
  });
}

// --- 7. Breeding Duration Calculation ---

export function calculateDuration(
  p1: Mutant,
  p2: Mutant,
  buildingLevel: BuildingLevel = 3,
  star1: StarLevel = 0,
  star2: StarLevel = 0
): number {
  const baseTime1 = Number(p1.incub_time) || 0;
  const baseTime2 = Number(p2.incub_time) || 0;
  const sumMinutes = baseTime1 + baseTime2;

  const speed = BUILDING_SPEED[buildingLevel];

  // Star multiplier uses the higher star of the two parents (heuristic = min(star1, star2))
  // But for timer, the game uses the result star's timerMalus
  // For breeding (no star result), star multiplier = 1.0
  // For star fusion, use the target star's multiplier
  // We use min(star1, star2) as the "result star level"
  const minStar = Math.min(star1, star2) as StarLevel;
  const starMult = STAR_TIMER_MULTIPLIER[minStar];

  // Platinum fusion: timerMalus=0, so starMult=1.0 (same as no star)
  const durationSeconds = Math.round(sumMinutes * 60 * speed * starMult);

  return durationSeconds;
}

// --- 8. Reverse Breeding (Find Parents) ---

export function findParentsFor(
  target: Mutant,
  allMutants: Mutant[]
): ParentPair[] {
  const results: ParentPair[] = [];

  const tName = normalizeName(target.name);
  const tType = (target.type || 'default').toLowerCase();
  const tGenes = getGeneStr(target.genes);
  const tId = String(target.id);

  const secretRecipes = secretCombos.filter(s => normalizeName(s.childName) === tName);
  if (secretRecipes.length > 0) {
    secretRecipes.forEach(r => {
      const p1 = allMutants.find(m => normalizeName(m.name) === normalizeName(r.parents[0]));
      const p2 = allMutants.find(m => normalizeName(m.name) === normalizeName(r.parents[1]));
      if (p1 && p2) results.push({ p1, p2, isSecret: true });
    });
    return results;
  }

  if (isUnbreedableType(tType)) {
    return [];
  }

  const targetGenePool = tGenes.split('').filter((g, i, arr) => arr.indexOf(g) === i);

  const potentialParents = allMutants.filter(m => {
    const genes = getGeneStr(m.genes);
    return targetGenePool.some(g => genes.includes(g));
  }).sort((a, b) => (Number(b.chance) || 0) - (Number(a.chance) || 0));

  const needsInheritance = !canBreedByType(target, 'none', 'none');

  if (needsInheritance) {
    for (const p2 of potentialParents) {
      if (canBreedChild(tGenes, tGenes, getGeneStr(p2.genes))) {
        results.push({ p1: target, p2, isSecret: false });
      }
    }
  } else {
    let count = 0;
    const maxResults = 20;
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
