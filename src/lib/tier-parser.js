/**
 * Parser for tier data from various formats (txt)
 * Expected format in files:
 * - Each line should contain mutant NAME and tier value
 * - Format: mutant_name,tier_value or mutant_name tier_value
 * - Example: Робот,2+ or Андроид,3-
 */

// Valid tier values
const VALID_TIERS = ['1+', '1-', '2+', '2', '2-', '3+', '3', '3-', '4'];

/**
 * Normalize tier value to accepted format
 * Valid tiers: 1+, 1-, 2+, 2, 2-, 3+, 3, 3-, 4
 */
function normalizeTierValue(tier) {
  tier = tier.trim().toUpperCase();
  
  // Map common variations to standard format
  const tierMapping = {
    '1+': '1+', '1ПЛЮС': '1+', '1 ПЛЮС': '1+',
    '1-': '1-', '1МИНУС': '1-', '1 МИНУС': '1-',
    '2+': '2+', '2ПЛЮС': '2+', '2 ПЛЮС': '2+',
    '2': '2', '2НОРМАЛЬНЫЙ': '2', '2 НОРМ': '2',
    '2-': '2-', '2МИНУС': '2-', '2 МИНУС': '2-',
    '3+': '3+', '3ПЛЮС': '3+', '3 ПЛЮС': '3+',
    '3': '3', '3НОРМАЛЬНЫЙ': '3', '3 НОРМ': '3',
    '3-': '3-', '3МИНУС': '3-', '3 МИНУС': '3-',
    '4': '4', '4НОРМАЛЬНЫЙ': '4', '4 НОРМ': '4'
  };
  
  const normalizedTier = tierMapping[tier] || tier;
  
  // Validate tier format
  if (!VALID_TIERS.includes(normalizedTier)) {
    throw new Error(`Invalid tier value: ${normalizedTier}. Valid tiers are: ${VALID_TIERS.join(', ')}`);
  }
  
  return normalizedTier;
}

/**
 * Find mutant ID by Russian name with fuzzy matching
 */
function findMutantIdByName(name, nameToId) {
  // Direct match
  if (nameToId[name]) {
    return nameToId[name];
  }
  
  // Partial match
  for (const [storedName, mutantId] of Object.entries(nameToId)) {
    if (name.includes(storedName) || storedName.includes(name)) {
      return mutantId;
    }
  }
  
  // If no match found, return null
  return null;
}

/**
 * Parse tier data from text content
 */
function parseTierFromTxt(txtContent, nameToId) {
  const tiers = {};
  const lines = txtContent.split('\n');
  
  for (const line of lines) {
    let processedLine = line.trim();
    if (!processedLine || processedLine.startsWith('#') || processedLine.startsWith('//')) {
      continue;
    }
    
    // Try comma-separated format
    if (processedLine.includes(',')) {
      const parts = processedLine.split(',');
      if (parts.length >= 2) {
        const mutantName = parts[0].trim().toLowerCase();
        const tier = normalizeTierValue(parts[1].trim());
        
        // Find matching mutant ID
        const mutantId = findMutantIdByName(mutantName, nameToId);
        if (mutantId) {
          tiers[mutantId] = tier;
        }
      }
    }
    // Try space-separated format with colon
    else if (processedLine.includes(':')) {
      const parts = processedLine.split(':');
      if (parts.length >= 2) {
        const mutantName = parts[0].trim().toLowerCase();
        const tier = normalizeTierValue(parts[1].trim());
        
        // Find matching mutant ID
        const mutantId = findMutantIdByName(mutantName, nameToId);
        if (mutantId) {
          tiers[mutantId] = tier;
        }
      }
    }
    // Try simple space format (last word is tier)
    else {
      const parts = processedLine.split(/\s+/);
      if (parts.length >= 2) {
        // Assume last part is tier, rest is mutant name
        const tier = normalizeTierValue(parts[parts.length - 1].trim());
        const mutantNameParts = parts.slice(0, -1);
        const mutantName = mutantNameParts.join(' ').trim().toLowerCase();
        
        // Find matching mutant ID
        const mutantId = findMutantIdByName(mutantName, nameToId);
        if (mutantId) {
          tiers[mutantId] = tier;
        }
      }
    }
  }
  
  return tiers;
}

/**
 * Load mapping from Russian names to mutant IDs
 * @param {string} mutantsJson - JSON string of mutants data
 */
function loadMutantMapping(mutantsJson) {
  const mutantsData = JSON.parse(mutantsJson);
  
  const nameToId = {};
  for (const mutant of mutantsData) {
    const name = mutant.name.trim().toLowerCase();
    const mutantId = mutant.id;
    nameToId[name] = mutantId;
    
    // Also add variations without special characters
    const cleanName = mutant.name.replace(/[^\w\s'-]/g, '').trim().toLowerCase();
    if (cleanName !== name) {
      nameToId[cleanName] = mutantId;
    }
  }
  
  return nameToId;
}

/**
 * Parse tier data from text content (main function)
 * @param {string} content - Text content with tier data
 * @param {string} mutantsJson - JSON string of mutants data
 */
function parseTierData(content, mutantsJson) {
  // Load the name to ID mapping from mutants data
  const nameToId = loadMutantMapping(mutantsJson);
  
  const tiers = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    let processedLine = line.trim();
    if (!processedLine || processedLine.startsWith('#') || processedLine.startsWith('//')) {
      continue;
    }
    
    // Try to match format: "Mutant Name (tier)"
    const parenMatch = processedLine.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (parenMatch) {
      const mutantName = parenMatch[1].trim().toLowerCase();
      const tier = normalizeTierValue(parenMatch[2].trim());
      
      // Find matching mutant ID
      const mutantId = findMutantIdByName(mutantName, nameToId);
      if (mutantId) {
        tiers[mutantId] = tier;
      } else {
        console.log(`Warning: Could not find mutant ID for "${mutantName}"`);
      }
      continue;
    }
    
    // Try comma-separated format
    if (processedLine.includes(',')) {
      const parts = processedLine.split(',');
      if (parts.length >= 2) {
        const mutantName = parts[0].trim().toLowerCase();
        const tier = normalizeTierValue(parts[1].trim());
        
        const mutantId = findMutantIdByName(mutantName, nameToId);
        if (mutantId) {
          tiers[mutantId] = tier;
        }
      }
      continue;
    }
    
    // Try space-separated format with colon
    if (processedLine.includes(':')) {
      const parts = processedLine.split(':');
      if (parts.length >= 2) {
        const mutantName = parts[0].trim().toLowerCase();
        const tier = normalizeTierValue(parts[1].trim());
        
        const mutantId = findMutantIdByName(mutantName, nameToId);
        if (mutantId) {
          tiers[mutantId] = tier;
        }
      }
      continue;
    }
  }
  
  return tiers;
}

// Export functions for use in other modules
export { parseTierData, normalizeTierValue, loadMutantMapping };