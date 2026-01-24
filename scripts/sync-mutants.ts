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
const BACKUP_DIR = '/home/godbtw/site-workspace/123123';
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
 * Formula: x * (level / 10 + 0.9)
 */
function calculateLevelScale(level: number) {
    return level / 10 + 0.9;
}

function calculateFinalStat(base: number, rating: string, level: number) {
    const mult = MULTIPLIERS[rating] || 1.0;
    return Math.round(base * mult * calculateLevelScale(level));
}

function calculateAttackStat(baseAtk1: number, baseAtkPlus: number, level: number, rating: string, attackNumber: number) {
    const mult = MULTIPLIERS[rating] || 1.0;
    const threshold = attackNumber === 1 ? 10 : 15;
    const base = level < threshold ? baseAtk1 : (baseAtkPlus || baseAtk1);
    return Math.round(base * mult * calculateLevelScale(level));
}

async function fetchLocalization() {
    console.log('Fetching localization...');
    const response = await axios.get(LOC_RU_URL);
    const lines = response.data.split('\r').join('').split('\n');
    const locMap = new Map<string, string>();
    for (const line of lines) {
        const parts = line.split(';');
        if (parts.length >= 2) {
            locMap.set(parts[0].trim(), parts.slice(1).join(';').trim());
        }
    }
    return locMap;
}

async function fetchGameDefinitions() {
    console.log('Fetching game definitions...');
    const response = await axios.get(GAME_DEFS_URL);
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", parseAttributeValue: true, trimValues: true });
    return parser.parse(response.data);
}

async function sync() {
    const locMap = await fetchLocalization();
    const gameDefs = await fetchGameDefinitions();

    // Загружаем бекапы для путей картинок, атак, описаний и бинго
    console.log('Loading backups...');
    const imageBackupMap = new Map<string, string[]>();
    const attack1BackupMap = new Map<string, string>();
    const attack2BackupMap = new Map<string, string>();
    const loreBackupMap = new Map<string, string>();
    const bingoBackupMap = new Map<string, string[]>();

    for (const rating of RATINGS) {
        try {
            const bPath = path.join(BACKUP_DIR, JSON_FILES[rating as keyof typeof JSON_FILES]);
            const content = await fs.readFile(bPath, 'utf-8');
            const data = JSON.parse(content);
            data.forEach((m: any) => {
                if (m.id) {
                    if (m.image) imageBackupMap.set(m.id, m.image);
                    if (m.name_attack1) attack1BackupMap.set(m.id, m.name_attack1);
                    if (m.name_attack2) attack2BackupMap.set(m.id, m.name_attack2);
                    if (m.name_lore) loreBackupMap.set(m.id, m.name_lore);
                    if (m.bingo && Array.isArray(m.bingo)) bingoBackupMap.set(m.id, m.bingo);
                }
            });
        } catch (e) { console.warn(`Backup for ${rating} not found`); }
    }

    function findAllEntityDescriptors(obj: any): any[] {
        let results: any[] = [];
        if (!obj || typeof obj !== 'object') return results;
        if (obj.EntityDescriptor) {
            const list = Array.isArray(obj.EntityDescriptor) ? obj.EntityDescriptor : [obj.EntityDescriptor];
            results = results.concat(list);
        }
        for (const key in obj) { if (key !== '?xml') results = results.concat(findAllEntityDescriptors(obj[key])); }
        return results;
    }

    const descriptors = findAllEntityDescriptors(gameDefs);
    const specimenDescriptors = descriptors.filter(d => {
        const isSpecimen = d.category === "specimen" || (d.id && d.id.startsWith("Specimen_"));
        if (!isSpecimen) return false;
        const name = locMap.get(d.id) || "";
        return !(name.toLowerCase().includes("слабый") || name.toLowerCase().includes("weak"));
    });

    for (const rating of RATINGS) {
        const resultMutants = [];
        for (const desc of specimenDescriptors) {
            const fullId = desc.id; 
            const mutantId = fullId.replace('Specimen_', '');
            const mutantFolder = mutantId.toLowerCase();
            
            const specimenId = `specimen_${mutantFolder}`;
            const finalId = rating === 'normal' ? specimenId : `${specimenId}_${rating === 'platinum' ? 'plat' : rating}`;
            
            // Проверяем наличие в бекапе (фильтр мутантов без скинов/картинок)
            const backupImages = imageBackupMap.get(finalId);
            if (!backupImages || backupImages.length === 0) continue;

            const tags: Record<string, any> = {};
            if (desc.Tag) {
                const tagList = Array.isArray(desc.Tag) ? desc.Tag : [desc.Tag];
                tagList.forEach((t: any) => { tags[t.key] = t.value; });
            }

            const name = locMap.get(fullId) || mutantId;
            const lore = loreBackupMap.get(finalId) || locMap.get(`caption_${specimenId}`) || locMap.get(`desc_${fullId}`) || locMap.get(`desc_${mutantId}`) || `Описание для ${name}`;
            
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
            const bankBase = parseInt(tags.bank || "0");
            const abilityPct1 = parseInt(tags.abilityPct1 || "0");
            const abilityPct2 = parseInt(tags.abilityPct2 || "0");
            
            const abilitiesRaw = String(tags.abilities || "").split(';');
            const abilities = abilitiesRaw.map(a => {
                const parts = a.split(':');
                if (parts.length < 2) return null;
                const idx = parts[0];
                const abilityName = parts[1];
                const isRetaliate = abilityName.includes('retaliate');

                const calcValues = (lvl: number) => {
                    const pct = lvl >= 25 ? abilityPct2 : abilityPct1;
                    const mult = Math.abs(pct) / 100;
                    const a1 = Math.round(calculateAttackStat(atk1Base, atk1pBase, lvl, rating, 1) * mult);
                    const a2 = isRetaliate ? 0 : Math.round(calculateAttackStat(atk2Base, atk2pBase, lvl, rating, 2) * mult);
                    return { a1, a2, pct };
                };
                const v1 = calcValues(1); const v30 = calcValues(30);
                return {
                    name: abilityName, pct: v1.pct,
                    value_atk1_lvl1: v1.a1, value_atk2_lvl1: v1.a2,
                    value_atk1_lvl30: v30.a1, value_atk2_lvl30: v30.a2
                };
            }).filter(Boolean);

            let typeValue = tags.type || "default";
            if (typeValue === "CAPTAINPEACE") typeValue = "Special";

            const entry: any = {
                id: finalId, name, genes: genesChar.split(''), rarity: typeValue,
                base_stats: {
                    hp_base: hpBase, atk1_base: atk1Base, atk1p_base: atk1pBase, atk2_base: atk2Base, atk2p_base: atk2pBase,
                    speed_base: speedFinal, bank_base: bankBase, abilityPct1, abilityPct2,
                    lvl1: {
                        hp: calculateFinalStat(hpBase, rating, 1),
                        atk1: calculateAttackStat(atk1Base, atk1pBase, 1, rating, 1),
                        atk2: calculateAttackStat(atk2Base, atk2pBase, 1, rating, 2),
                        spd: speedFinal, atk1_gene: genesChar[0]?.toLowerCase() || 'neutro', atk1_AOE: atk1AOE, bank: bankBase
                    },
                    lvl30: {
                        hp: calculateFinalStat(hpBase, rating, 30),
                        atk1: calculateAttackStat(atk1Base, atk1pBase, 30, rating, 1),
                        atk2: calculateAttackStat(atk2Base, atk2pBase, 30, rating, 2),
                        spd: speedFinal, atk1_gene: genesChar[0]?.toLowerCase() || 'neutro', atk1_AOE: atk1AOE,
                        atk2_gene: genesChar[1]?.toLowerCase() || (genesChar[0]?.toLowerCase() || 'neutro'), atk2_AOE: atk2AOE, bank: bankBase * 30
                    }
                },
                abilities,
                image: backupImages,
                type: typeValue, incub_time: parseInt(tags.incubMin || "0"),
                orbs: { normal: String(tags.orbSlots || "").split('n').length - 1, special: String(tags.orbSlots || "").split('s').length - 1 },
                bingo: bingoBackupMap.get(finalId) || String(tags.bingo || "").split(';').filter(Boolean),
                chance: parseInt(tags.odds || "0"),
                name_attack1: attack1BackupMap.get(finalId) || locMap.get(`${fullId}_attack_1`) || locMap.get(`Specimen_${mutantId}_attack_1`) || `Атака 1`,
                name_attack2: attack2BackupMap.get(finalId) || locMap.get(`${fullId}_attack_2`) || locMap.get(`Specimen_${mutantId}_attack_2`) || `Атака 2`,
                name_lore: lore
            };
            if (rating !== 'normal') { entry.star = rating === 'platinum' ? 'platinum' : rating; entry.multiplier = MULTIPLIERS[rating]; }
            resultMutants.push(entry);
        }
        const filePath = path.join(DATA_DIR, JSON_FILES[rating as keyof typeof JSON_FILES]);
        resultMutants.sort((a, b) => a.id.localeCompare(b.id));
        await fs.writeFile(filePath, JSON.stringify(resultMutants, null, 2), 'utf-8');
        console.log(`Saved ${filePath} with ${resultMutants.length} mutants`);
    }
}
sync().catch(console.error);
