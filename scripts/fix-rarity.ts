import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src/data/mutants');
const JSON_FILES = ['normal.json', 'bronze.json', 'silver.json', 'gold.json', 'platinum.json'];

async function fixRarity() {
    let totalFixed = 0;

    for (const file of JSON_FILES) {
        const filePath = path.join(DATA_DIR, file);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            let modified = false;

            for (const mutant of data) {
                if (mutant.rarity === 'CAPTAINPEACE' || mutant.type === 'CAPTAINPEACE') {
                    if (mutant.rarity === 'CAPTAINPEACE') mutant.rarity = 'SPECIAL';
                    if (mutant.type === 'CAPTAINPEACE') mutant.type = 'SPECIAL';
                    // Also update tier if it matches for consistency
                    if (mutant.tier === 'CAPTAINPEACE') {
                        mutant.tier = 'SPECIAL';
                    }
                    modified = true;
                    totalFixed++;
                }
            }

            if (modified) {
                await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
                console.log(`Fixed rarity in ${file}`);
            }

        } catch (e) {
            console.error(`Failed to process ${file}:`, e);
        }
    }
    console.log(`Total mutants fixed: ${totalFixed}`);
}

fixRarity().catch(console.error);
