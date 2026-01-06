import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src/data/mutants');
const JSON_FILES = ['normal.json', 'bronze.json', 'silver.json', 'gold.json', 'platinum.json'];

async function deduplicate() {
    for (const file of JSON_FILES) {
        const filePath = path.join(DATA_DIR, file);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            
            if (!Array.isArray(data)) {
                console.error(`Error: ${file} is not an array`);
                continue;
            }

            const uniqueMutants = new Map();
            let duplicatesCount = 0;

            for (const mutant of data) {
                if (!mutant.id) continue;
                
                // Keep the last occurrence or first? Usually first is safer if appending duplicates
                // But let's check if we have duplicates
                if (uniqueMutants.has(mutant.id)) {
                    duplicatesCount++;
                    // Optional: You could merge or keep the most complete one here
                    // For now, we'll keep the first one found (assuming append behavior)
                } else {
                    uniqueMutants.set(mutant.id, mutant);
                }
            }

            if (duplicatesCount > 0) {
                const cleanedData = Array.from(uniqueMutants.values());
                // Sort by ID for consistency
                cleanedData.sort((a: any, b: any) => a.id.localeCompare(b.id));
                
                await fs.writeFile(filePath, JSON.stringify(cleanedData, null, 2), 'utf-8');
                console.log(`Cleaned ${file}: Removed ${duplicatesCount} duplicates. Remaining: ${cleanedData.length}`);
            } else {
                console.log(`${file}: No duplicates found.`);
            }

        } catch (e) {
            console.error(`Failed to process ${file}:`, e);
        }
    }
}

deduplicate().catch(console.error);
