import mutantsData from '@/data/mutants/mutants.json';

/**
 * findMutantsByGenes searches through the unified mutant list and returns
 * those whose gene code matches the provided code.
 */
export function findMutantsByGenes(code: string): any[] {
  return mutantsData.filter((m: any) => Array.isArray(m.genes) && m.genes[0] === code);
}
