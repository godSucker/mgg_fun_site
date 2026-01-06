import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import sharp from 'sharp';

// URLs
const LOC_RU_URL = 'https://s-beta.kobojo.com/mutants/gameconfig/localisation_ru.txt';
const GAME_DEFS_URL = 'https://s-ak.kobojo.com/mutants/gameconfig/gamedefinitions.xml';
const KOBOJO_IMG_BASE = 'https://s-ak.kobojo.com/mutants/assets/thumbnails/';
const POKRADEX_IMG_BASE = 'https://pokradex.org/MutantsGG/MGG/';

// Paths
const DATA_DIR = path.join(process.cwd(), 'src/data/mutants');
const TEXTURES_DIR = path.join(process.cwd(), 'public/textures_by_mutant');

const RATINGS = ['normal', 'bronze', 'silver', 'gold', 'platinum'];
const JSON_FILES = {
    normal: 'normal.json',
    bronze: 'bronze.json',
    silver: 'silver.json',
    gold: 'gold.json',
    platinum: 'platinum.json'
};

const MULTIPLIERS: Record<string, number> = {
    normal: 1.0,
    bronze: 1.1,
    silver: 1.3,
    gold: 1.75,
    platinum: 2.0
};

/**
 * Formula for stats: x * (level / 10 + 0.9)
 */
function calculateFinalStat(base: number, rating: string, level: number) {
    const mult = MULTIPLIERS[rating] || 1.0;
    return Math.round(base * mult * (level / 10 + 0.9));
}

async function fetchLocalization() {
    console.log('Fetching localization...');
    const response = await axios.get(LOC_RU_URL);
    const lines = response.data.split('\r').join('').split('\n');
    const locMap = new Map<string, string>();
    for (const line of lines) {
        const parts = line.split(';');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join(';').trim();
            locMap.set(key, value);
        }
    }
    return locMap;
}

async function fetchGameDefinitions() {
    console.log('Fetching game definitions...');
    const response = await axios.get(GAME_DEFS_URL);
    const parser = new XMLParser({ 
        ignoreAttributes: false, 
        attributeNamePrefix: "",
        parseAttributeValue: true,
        trimValues: true
    });
    return parser.parse(response.data);
}

/**
 * Strictly downloads all 10 possible images for a mutant:
 * - 5 Full Textures (Pokradex)
 * - 5 Icons (Kobojo)
 */
async function downloadMutantTextures(mutantId: string) {
    const mutantFolder = mutantId.toLowerCase();
    const targetDir = path.join(TEXTURES_DIR, mutantFolder);
    try { await fs.mkdir(targetDir, { recursive: true }); } catch (e) {}

    const idUpper = mutantId.toUpperCase();
    const idLower = mutantId.toLowerCase();
    
    let hasAtLeastOne = false;

    for (const rating of RATINGS) {
        const targetFull = path.join(targetDir, `${idUpper}_${rating}.webp`);
        const targetIcon = path.join(targetDir, `specimen_${idLower}_${rating === 'platinum' ? 'platinum_platinum' : (rating === 'normal' ? 'normal' : rating + '_' + rating)}.webp`);

        // 1. Full Texture from Pokradex
        let fullDownloaded = false;
        try {
            await fs.access(targetFull);
            fullDownloaded = true;
        } catch (e) {
            let url = "";
            if (rating === 'normal') url = `${POKRADEX_IMG_BASE}${idUpper}.png`;
            else if (rating === 'bronze') url = `${POKRADEX_IMG_BASE}V1/${idUpper}.png`;
            else if (rating === 'silver') url = `${POKRADEX_IMG_BASE}V2/${idUpper}.png`;
            else if (rating === 'gold') url = `${POKRADEX_IMG_BASE}V3/${idUpper}.png`;
            else if (rating === 'platinum') url = `${POKRADEX_IMG_BASE}V4/${idUpper}.png`;

            try {
                const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
                const buf = Buffer.from(res.data);
                const meta = await sharp(buf).metadata();
                if (meta.width && meta.width > 200) { // Check for full texture size
                    await sharp(buf).webp().toFile(targetFull);
                    console.log(`[FULL] Downloaded ${rating} for ${mutantId}`);
                    fullDownloaded = true;
                }
            } catch (err) {}
        }

        // 2. Icon from Kobojo (or Pokradex fallback)
        let iconDownloaded = false;
        try {
            await fs.access(targetIcon);
            iconDownloaded = true;
        } catch (e) {
            const urls = [
                `${KOBOJO_IMG_BASE}specimen_${idLower}${rating === 'normal' ? '' : '_' + rating}.png`,
                `${POKRADEX_IMG_BASE}specimen_${idLower}${rating === 'normal' ? '' : '_' + rating}.png`
            ];
            for (const url of urls) {
                try {
                    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
                    const buf = Buffer.from(res.data);
                    if ((await sharp(buf).metadata()).width) {
                        await sharp(buf).webp().toFile(targetIcon);
                        console.log(`[ICON] Downloaded ${rating} for ${mutantId}`);
                        iconDownloaded = true;
                        break;
                    }
                } catch (err) {}
            }
        }

        if (fullDownloaded || iconDownloaded) hasAtLeastOne = true;
    }

    return hasAtLeastOne;
}

function parseTags(descriptor: any) {
    const tags: Record<string, any> = {};
    if (descriptor.Tag) {
        const tagList = Array.isArray(descriptor.Tag) ? descriptor.Tag : [descriptor.Tag];
        for (const tag of tagList) {
            tags[tag.key] = tag.value;
        }
    }
    return tags;
}

async function sync() {
    const locMap = await fetchLocalization();
    const gameDefs = await fetchGameDefinitions();

    const existingData: Record<string, any[]> = {};
    const existingIds: Record<string, Set<string>> = {};

    for (const rating of RATINGS) {
        existingIds[rating] = new Set();
        try {
            const filePath = path.join(DATA_DIR, JSON_FILES[rating as keyof typeof JSON_FILES]);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            // Deduplicate existing data by ID
            const seen = new Set();
            existingData[rating] = data.filter((m: any) => {
                if (seen.has(m.id)) return false;
                seen.add(m.id);
                existingIds[rating].add(m.id);
                return true;
            });
        } catch (e) {
            existingData[rating] = [];
        }
    }

    function findAllEntityDescriptors(obj: any): any[] {
        let results: any[] = [];
        if (!obj || typeof obj !== 'object') return results;
        if (obj.EntityDescriptor) {
            const list = Array.isArray(obj.EntityDescriptor) ? obj.EntityDescriptor : [obj.EntityDescriptor];
            results = results.concat(list);
        }
        for (const key in obj) {
            if (key === '?xml') continue;
            results = results.concat(findAllEntityDescriptors(obj[key]));
        }
        return results;
    }

    const descriptors = findAllEntityDescriptors(gameDefs);
    const specimenDescriptors = descriptors.filter(d => {
        const isSpecimen = d.category === "specimen" || (d.id && d.id.startsWith("Specimen_"));
        if (!isSpecimen) return false;
        const name = locMap.get(d.id) || "";
        if (name.toLowerCase().includes("слабый") || name.toLowerCase().includes("weak")) return false;
        return true;
    });
    
    console.log(`Found ${specimenDescriptors.length} valid specimen descriptors.`);

    let modifiedCount = 0;

    // Parallelize processing mutants to avoid long hang times
    const mutantTasks = specimenDescriptors.map(async (desc) => {
        const fullId = desc.id; 
        const mutantId = fullId.replace('Specimen_', '');
        const mutantFolder = mutantId.toLowerCase();
        const tags = parseTags(desc);

        // Download all possible textures for this mutant once
        // This check is very fast if files already exist
        const hasTextures = await downloadMutantTextures(mutantId);
        
        // Skip if no textures, UNLESS it is FB_14 which we force update
        if (!hasTextures && mutantId !== 'FB_14') return;

        for (const rating of RATINGS) {
            const specimenId = `specimen_${mutantFolder}`;
            const finalId = rating === 'normal' ? specimenId : `${specimenId}_${rating === 'platinum' ? 'plat' : rating}`;
            
            // Check if we need to update this mutant
            // Update if:
            // 1. It doesn't exist
            // 2. It is FB_14 (force update)
            // 3. Description starts with "Описание для" (placeholder)
            const exists = existingIds[rating].has(finalId);
            const currentEntry = existingData[rating].find(m => m.id === finalId);
            const isPlaceholderLore = currentEntry && currentEntry.name_lore && currentEntry.name_lore.startsWith("Описание для");
            
            if (exists && mutantId !== 'FB_14' && !isPlaceholderLore) continue;

            const targetFull = path.join(TEXTURES_DIR, mutantFolder, `${mutantId.toUpperCase()}_${rating}.webp`);
            const targetIcon = path.join(TEXTURES_DIR, mutantFolder, `specimen_${mutantFolder}_${rating === 'platinum' ? 'platinum_platinum' : (rating === 'normal' ? 'normal' : rating + '_' + rating)}.webp`);
            
            let textureExists = false;
            try { await fs.access(targetFull); textureExists = true; } catch(e) {
                try { await fs.access(targetIcon); textureExists = true; } catch(e) {}
            }
            
            // For FB_14 we proceed even if textures missing (to update data), otherwise skip
            if (!textureExists && mutantId !== 'FB_14') continue;

            const name = locMap.get(fullId) || mutantId;
            // Enhanced lore lookup
            // Try: caption_specimen_id, desc_Specimen_ID, desc_ID
            const lore = locMap.get(`caption_${specimenId}`) || 
                        locMap.get(`desc_${fullId}`) || 
                        locMap.get(`desc_${mutantId}`) || 
                        `Описание для ${name}`;
            
            const hpBase = parseInt(tags.lifePoint || "0");
            const atk1Base = parseInt(tags.atk1 || "0");
            const atk1pBase = parseInt(tags.atk1p || "0");
            const atk1AOE = String(tags.atk1 || "").includes("AOE") || String(tags.atk1p || "").includes("AOE");
            const atk2Base = parseInt(tags.atk2 || "0");
            const atk2pBase = parseInt(tags.atk2p || "0");
            const atk2AOE = String(tags.atk2 || "").includes("AOE") || String(tags.atk2p || "").includes("AOE");
            
            const speedVal = parseFloat(tags.spX100 || "0");
            const speedFinal = speedVal > 0 ? parseFloat((1000 / speedVal).toFixed(3)) : 0;
            const genesChar = String(tags.dna || "");
            
            const abilitiesRaw = String(tags.abilities || "").split(';');
            const abilities = abilitiesRaw.map(a => {
                const parts = a.split(':');
                if (parts.length < 2) return null;
                const idx = parts[0];
                const abilityName = parts[1];
                const pctLow = parseInt(tags[`abilityPct${idx}`] || "0");
                const pctHigh = parseInt(tags[`abilityPct${parseInt(idx) + 1}`] || tags[`abilityPct${idx}`] || "0");
                const isRetaliate = abilityName.includes('retaliate');

                const calcValues = (lvl: number) => {
                    const pct = lvl >= 25 ? pctHigh : pctLow;
                    const mult = pct / 100;
                    const a1 = Math.round(calculateFinalStat(lvl >= 10 ? (atk1pBase || atk1Base) : atk1Base, rating, lvl) * mult);
                    const a2 = isRetaliate ? 0 : Math.round(calculateFinalStat(lvl >= 15 ? (atk2pBase || atk2Base) : atk2Base, rating, lvl) * mult);
                    return { a1, a2, pct };
                };
                const v1 = calcValues(1);
                const v30 = calcValues(30);
                return {
                    name: abilityName, pct: v1.pct,
                    value_atk1_lvl1: v1.a1, value_atk2_lvl1: v1.a2,
                    value_atk1_lvl30: v30.a1, value_atk2_lvl30: v30.a2
                };
            }).filter(Boolean);

            // Rarity fix: CAPTAINPEACE -> SPECIAL
            let rarity = tags.type || "default";
            if (rarity === "CAPTAINPEACE") rarity = "SPECIAL";

            const entry: any = {
                id: finalId, name: name, genes: genesChar.split(''), rarity: rarity,
                base_stats: {
                    lvl1: {
                        hp: calculateFinalStat(hpBase, rating, 1),
                        atk1: calculateFinalStat(atk1Base, rating, 1),
                        atk2: calculateFinalStat(atk2Base, rating, 1),
                        spd: speedFinal, atk1_gene: genesChar[0]?.toLowerCase() || 'neutro', atk1_AOE: atk1AOE
                    },
                    lvl30: {
                        hp: calculateFinalStat(hpBase, rating, 30),
                        // Level 30 is >= 10, so use atk1pBase if available
                        atk1: calculateFinalStat(atk1pBase || atk1Base, rating, 30),
                        // Level 30 is >= 15, so use atk2pBase if available
                        atk2: calculateFinalStat(atk2pBase || atk2Base, rating, 30),
                        spd: speedFinal, atk1_gene: genesChar[0]?.toLowerCase() || 'neutro', atk1_AOE: atk1AOE,
                        atk2_gene: genesChar[1]?.toLowerCase() || (genesChar[0]?.toLowerCase() || 'neutro'), atk2_AOE: atk2AOE
                    }
                },
                abilities: abilities,
                image: [
                    `textures_by_mutant/${mutantFolder}/${mutantId.toUpperCase()}_${rating}.webp`,
                    `textures_by_mutant/${mutantFolder}/specimen_${mutantFolder}_${rating === 'platinum' ? 'platinum_platinum' : (rating === 'normal' ? 'normal' : rating + '_' + rating)}.webp`,
                    `textures_by_mutant/${mutantFolder}/larva_${mutantFolder}.webp`
                ],
                type: rarity,
                incub_time: parseInt(tags.incubMin || "0"),
                orbs: { 
                    normal: String(tags.orbSlots || "").split('n').length - 1, 
                    special: String(tags.orbSlots || "").split('s').length - 1 
                },
                bingo: String(tags.bingo || "").split(';').filter(Boolean),
                chance: parseInt(tags.odds || "0"),
                name_attack1: locMap.get(`${fullId}_attack_1`) || locMap.get(`${fullId}_attack_1P`) || locMap.get(`${fullId}_attack_1p`) || `Атака 1 (${mutantId})`,
                name_attack2: locMap.get(`${fullId}_attack_2`) || locMap.get(`${fullId}_attack_2P`) || locMap.get(`${fullId}_attack_2p`) || `Атака 2 (${mutantId})`,
                name_attack3: locMap.get(`${fullId}_attack_3`) || "",
                name_lore: lore
            };

            if (rating !== 'normal') {
                entry.star = rating === 'platinum' ? 'platinum' : rating;
                entry.multiplier = MULTIPLIERS[rating];
            }

            // Remove existing if updating
            const existingIdx = existingData[rating].findIndex(m => m.id === finalId);
            if (existingIdx !== -1) {
                existingData[rating][existingIdx] = entry;
            } else {
                existingData[rating].push(entry);
            }
            existingIds[rating].add(finalId);
            modifiedCount++;
        }
    });

    await Promise.all(mutantTasks);

    if (modifiedCount > 0) {
        for (const rating of RATINGS) {
            const filePath = path.join(DATA_DIR, JSON_FILES[rating as keyof typeof JSON_FILES]);
            existingData[rating].sort((a, b) => a.id.localeCompare(b.id));
            await fs.writeFile(filePath, JSON.stringify(existingData[rating], null, 2), 'utf-8');
            console.log(`Updated ${filePath} (Processed ${modifiedCount} updates)`);
        }
    } else {
        console.log('Sync complete. No changes needed.');
    }
}

sync().catch(console.error);
