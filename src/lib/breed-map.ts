import mutantsData from '@/data/mutants/normal.json';

/**
 * findMutantsByGenes searches through the list of common (normal-star) mutants and returns
 * those whose gene code matches the provided code. Each mutant in the dataset has a
 * `genes` array where the first (and only) element is a string representing its gene
 * combination (e.g. 'A', 'AB', 'AC'). This function does not attempt to split or sort
 * gene codes; it simply compares the entire code string.
 *
 * If your project includes separate datasets for other star levels (bronze, silver, etc.),
 * you can extend this function to merge those arrays as needed before filtering.
 */
export function findMutantsByGenes(code: string): any[] {
  // Filter mutants whose first gene string matches the requested code exactly.
  return mutantsData.filter((m: any) => Array.isArray(m.genes) && m.genes[0] === code);
}