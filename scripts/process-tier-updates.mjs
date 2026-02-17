#!/usr/bin/env node

/**
 * Script to process tier updates from temporary file and update mutants.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Define file paths
const BASE_DIR = join(process.cwd(), 'src', 'data', 'mutants');
const MUTANTS_FILE = join(BASE_DIR, 'mutants.json');
const PENDING_UPDATES_FILE = join(process.cwd(), 'temp', 'pending_tier_updates.json');

try {
  // Read current mutants data
  const mutantsContent = readFileSync(MUTANTS_FILE, 'utf-8');
  const mutants = JSON.parse(mutantsContent);

  // Read pending tier updates
  let pendingUpdates = {};
  try {
    const updatesContent = readFileSync(PENDING_UPDATES_FILE, 'utf-8');
    pendingUpdates = JSON.parse(updatesContent);
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('No pending updates file found');
      process.exit(0); // Exit successfully if no updates
    } else {
      throw e;
    }
  }

  // Extract tier updates
  const tierUpdates = pendingUpdates.tiers || {};

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

  // Optionally clear the pending updates file
  // fs.writeFileSync(PENDING_UPDATES_FILE, JSON.stringify({}));
} catch (error) {
  console.error('Error processing tier updates:', error);
  process.exit(1);
}