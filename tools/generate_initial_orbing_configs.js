
import fs from 'fs';
import path from 'path';

const orbsData = JSON.parse(fs.readFileSync('src/data/materials/orbs.json', 'utf8'));
const normalData = JSON.parse(fs.readFileSync('src/data/mutants/normal.json', 'utf8'));
const orbingDir = 'public/orbing';
const outputConfigFile = 'src/data/orbing_configurations.json';

// Map orb names to their IDs from orbs.json
const orbNameToIdMap = new Map(orbsData.map(orb => [orb.name.toLowerCase(), orb.id]));

const getOrbFilePath = (orbName) => {
  const orbId = orbNameToIdMap.get(orbName.toLowerCase());
  if (orbId) {
    const type = orbId.includes('special') ? 'special' : 'basic';
    return `${type}/${orbId}.webp`;
  }
  return null; // Return null if orb name not found
};

const getMutantIdFromName = (mutantName) => {
  const cleanedMutantName = mutantName.replace(/["'\[\]().]/g, '').toLowerCase();
  const mutant = normalData.find(m => m.name.toLowerCase().replace(/["'\[\]().]/g, '') === cleanedMutantName);
  return mutant ? mutant.id : null;
};

const generateConfigs = () => {
  const files = fs.readdirSync(orbingDir);
  let orbingConfigurations = {};

  // Define the default orb configuration based on Architect's example
  const defaultOrbs = [
    ['Здоровье 25%', 'Здоровье 25%', 'Здоровье 25%', 'Спец. Усиление 26%'],
    ['Здоровье 25%', 'Здоровье 25%', 'Здоровье 25%', 'Спец. Скорость 18%'],
    // The third row is empty according to the user's description for Architect
    // If other mutants consistently have more or less, this will need manual adjustment by the user
    // in the generated JSON file.
  ];

  for (const file of files) {
    if (file.endsWith('.jpg') || file.endsWith('.webp')) {
      let detectedMutantName = file.replace(/photo_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\./i, "")
                                   .replace(/\.(jpg|webp)$/i, "")
                                   .replace(/^_/, "")
                                   .replace(/_$/, "")
                                   .replace(/_/g, " ").trim();
      
      const mutantId = getMutantIdFromName(detectedMutantName);

      if (mutantId) {
        // Convert default orb names to file paths
        const rowsWithFilePaths = defaultOrbs.map(row =>
          row.map(orbName => getOrbFilePath(orbName)).filter(Boolean)
        );

        orbingConfigurations[mutantId] = { rows: rowsWithFilePaths };
      } else {
        console.log(`WARNING: Mutant ID not found for detected name: "${detectedMutantName}" (from file: ${file}). Skipping.`);
      }
    }
  }

  fs.writeFileSync(outputConfigFile, JSON.stringify(orbingConfigurations, null, 2));
  console.log(`Initial orb configurations generated and saved to ${outputConfigFile}`);
};

generateConfigs();
