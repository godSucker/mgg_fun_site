#!/usr/bin/env node

/**
 * Script to process tier updates from temporary file and update mutants.json
 * This script is designed to run in a GitHub Action environment
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Define file paths
const BASE_DIR = join(process.cwd(), 'src', 'data', 'mutants');
const MUTANTS_FILE = join(BASE_DIR, 'mutants.json');

// For this example, we'll use a hardcoded update
// In a real implementation, you would fetch updates from an API or other source
const tierUpdates = {
  "specimen_a_01": "2+",
  "specimen_aa_01": "3",
  "specimen_ab_01": "1+"
};

try {
  // Read current mutants data
  const mutantsContent = readFileSync(MUTANTS_FILE, 'utf-8');
  const mutants = JSON.parse(mutantsContent);

  // Count updates
  let updatedCount = 0;
  const updatedMutants = [];

  // Apply tier updates to mutants
  for (const [mutantId, newTier] of Object.entries(tierUpdates)) {
    const mutantIndex = mutants.findIndex(m => m.id === mutantId);
    
    if (mutantIndex !== -1) {
      const oldTier = mutants[mutantIndex].tier;
      if (oldTier !== newTier) {
        mutants[mutantIndex].tier = newTier;
        updatedCount++;
        updatedMutants.push({
          id: mutantId,
          name: mutants[mutantIndex].name,
          oldTier: oldTier,
          newTier: newTier
        });
      }
    } else {
      console.log(`Warning: Mutant with ID ${mutantId} not found in mutants.json`);
    }
  }

  // Write updated mutants data back to file
  writeFileSync(MUTANTS_FILE, JSON.stringify(mutants, null, 2));

  console.log(`Successfully updated ${updatedCount} mutant tiers in mutants.json`);
  console.log('Updated mutants:', updatedMutants);

} catch (error) {
  console.error('Error processing tier updates:', error);
  process.exit(1);
}