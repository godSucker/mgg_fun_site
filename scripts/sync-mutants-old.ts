import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import sharp from 'sharp';

// --- КОНФИГУРАЦИЯ ---
const CONFIG = {
    LOC_RU_URL: 'https://s-beta.kobojo.com/mutants/gameconfig/localisation_ru.txt',
    GAME_DEFS_URL: 'https://s-ak.kobojo.com/mutants/gameconfig/gamedefinitions.xml',
    KOBOJO_IMG_BASE: 'https://s-ak.kobojo.com/mutants/assets/thumbnails/',
    POKRADEX_ROOT_URL: 'https://pokradex.org/MutantsGG/MGG/',

    DATA_DIR: path.join(process.cwd(), 'src/data/mutants'),
    TEXTURES_DIR: path.join(process.cwd(), 'public/textures_by_mutant'),
    TEMP_DIR: path.join(process.cwd(), 'temp'),

    RATINGS: ['normal', 'bronze', 'silver', 'gold', 'platinum'],
    JSON_FILES: { normal: 'normal.json', bronze: 'bronze.json', silver: 'silver.json', gold: 'gold.json', platinum: 'platinum.json' },
    MULTIPLIERS: { normal: 1.0, bronze: 1.1, silver: 1.3, gold: 1.75, platinum: 2.0 },
    VERSION_MAP: { bronze: 'V1', silver: 'V2', gold: 'V3', platinum: 'V4' }
};

// --- ФУНКЦИЯ РАСЧЕТА СТАТОВ ---
function calculateFinalStats(baseStats, level, starMultiplier) {
    const multiplier = starMultiplier !== undefined ? starMultiplier : 1;
    const lvl = Math.max(1, Math.min(30, Number(level) || 1));

    // Применяем множитель
    const hpBase = (baseStats.hp_base || 0) * multiplier;
    const atk1Base = (baseStats.atk1_base || 0) * multiplier;
    const atk1PlusBase = (baseStats.atk1p_base || 0) * multiplier;
    const atk2Base = (baseStats.atk2_base || 0) * multiplier;
    const atk2PlusBase = (baseStats.atk2p_base || 0) * multiplier;

    const speedBase = baseStats.speed_base || 0;
    const bankBase = baseStats.bank_base || 0;

    const levelScale = lvl / 10 + 0.9;
    let finalHp = hpBase * levelScale;

    // Атака 1
    const activeAtk1Base = lvl < 10 ? atk1Base : atk1PlusBase;
    let finalAtk1 = activeAtk1Base * levelScale;

    // Атака 2
    const activeAtk2Base = lvl < 15 ? atk2Base : atk2PlusBase;
    let finalAtk2 = activeAtk2Base * levelScale;

    // Абилка
    let abilityValue = 0;
    const abilityPercent = lvl < 25 ? (baseStats.abilityPct1 || 0) : (baseStats.abilityPct2 || 0);
    abilityValue = finalAtk1 * (Math.abs(abilityPercent) / 100);

    // Скорость и Серебро
    let finalSpeed = speedBase;
    const finalSilver = bankBase * lvl;

    return {
        hp: Math.round(finalHp),
        atk1: Math.round(finalAtk1),
        atk2: Math.round(finalAtk2),
        ability: Math.round(abilityValue),
        speed: parseFloat(finalSpeed.toFixed(3)),
        silver: Math.round(finalSilver)
    };
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

async function downloadFile(url, targetPath) {
    try {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (res.status === 200) {
            await fs.writeFile(targetPath, res.data);
            console.log(`[CACHE] ✔️ Файл сохранен: ${path.basename(targetPath)}`);
            return true;
        }
    } catch (e) {
        console.error(`[CACHE] ❌ Не удалось скачать ${url}`);
        return false;
    }
    return false;
}

async function loadLocalFiles() {
    await fs.mkdir(CONFIG.TEMP_DIR, { recursive: true });
    const xmlPath = path.join(CONFIG.TEMP_DIR, 'gamedefinitions.xml');
    const txtPath = path.join(CONFIG.TEMP_DIR, 'localisation_ru.txt');

    console.log('[SETUP] Скачивание свежих данных...');
    await downloadFile(CONFIG.GAME_DEFS_URL, xmlPath);
    await downloadFile(CONFIG.LOC_RU_URL, txtPath);

    console.log('[PARSER] Чтение данных...');
    const xmlContent = await fs.readFile(xmlPath, 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", parseAttributeValue: true, trimValues: true });
    const gameDefs = parser.parse(xmlContent);

    const txtContent = await fs.readFile(txtPath, 'utf-8');
    const locMap = new Map();
    txtContent.split(/\r?\n/).forEach(line => {
        const parts = line.split(';');
        if (parts.length >= 2) locMap.set(parts[0].trim(), parts.slice(1).join(';').trim());
    });

    return { gameDefs, locMap };
}

async function downloadImage(url, targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch (e) {
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (res.status === 200 && res.data.length > 100) {
                await fs.mkdir(path.dirname(targetPath), { recursive: true });
                await sharp(res.data).webp({ quality: 80 }).toFile(targetPath);
                console.log(`[TEXTURE] ✔️ Скачано: ${path.basename(targetPath)}`);
                return true;
            }
        } catch (err) {}
        return false;
    }
}

async function getAvailableRatingsAndDownload(mutantId, mode) {
    const idLower = mutantId.toLowerCase();
    const idUpper = mutantId.toUpperCase();
    const targetDir = path.join(CONFIG.TEXTURES_DIR, idLower);
    const foundRatings = new Set();

    for (const rating of CONFIG.RATINGS) {
        const kobojoSuffix = rating === 'normal' ? '' : `_${rating}`;
        const kobojoUrl = `${CONFIG.KOBOJO_IMG_BASE}specimen_${idLower}${kobojoSuffix}.png`;

        const pokradexVersionPath = rating === 'normal' ? '' : `${CONFIG.VERSION_MAP[rating]}/`;
        const pokradexUrl = `${CONFIG.POKRADEX_ROOT_URL}${pokradexVersionPath}${idUpper}.png`;

        const fullArtName = `${idUpper}_${rating}.webp`;
        const iconName = `specimen_${idLower}_${rating}.webp`;

        const fullArtPath = path.join(targetDir, fullArtName);
        const iconPath = path.join(targetDir, iconName);

        let ratingFound = false;

        if (mode === 'full') {
            const d1 = await downloadImage(pokradexUrl, fullArtPath);
            const d2 = await downloadImage(kobojoUrl, iconPath);
            if (d1 || d2) ratingFound = true;
        } else {
            try { await fs.access(fullArtPath); ratingFound = true; } catch(e){}
            try { await fs.access(iconPath); ratingFound = true; } catch(e){}
        }

        if (ratingFound) foundRatings.add(rating);
    }
    return Array.from(foundRatings);
}

function findAllEntityDescriptors(obj) {
    let results = [];
    if (!obj || typeof obj !== 'object') return results;
    if (obj.EntityDescriptor) results = results.concat(Array.isArray(obj.EntityDescriptor) ? obj.EntityDescriptor : [obj.EntityDescriptor]);
    for (const key in obj) {
        if (key === '?xml') continue;
        results = results.concat(findAllEntityDescriptors(obj[key]));
    }
    return results;
}

function parseTags(descriptor) {
    const tags = {};
    if (descriptor?.Tag) {
        const tagList = Array.isArray(descriptor.Tag) ? descriptor.Tag : [descriptor.Tag];
        for (const tag of tagList) tags[tag.key] = tag.value;
    }
    return tags;
}

function findLocalizedText(locMap, id, suffix = "") {
    const keys = [
        `${id}${suffix}`,
        `Specimen_${id}${suffix}`,
        `caption_specimen_${id.toLowerCase()}`, // Твой пример для AD_14
        `${id.toUpperCase()}${suffix}`,
        `${id.toLowerCase()}${suffix}`,
        `Specimen_${id.toUpperCase()}${suffix}`,
        `${suffix.replace('_', '')}_${id}`,
        `${id}${suffix.toUpperCase()}`,
        `${id}${suffix.toLowerCase()}`
    ];
    for (const key of keys) {
        if (locMap.has(key)) return locMap.get(key);
    }
    return "";
}

// --- ГЛАВНАЯ ЛОГИКА ---

async function sync({ skipExisting, forceStatUpdate }) {
    const { gameDefs, locMap } = await loadLocalFiles();

    const existingData = {};
    const processedIds = new Set();

    for (const rating of CONFIG.RATINGS) {
        try {
            const data = JSON.parse(await fs.readFile(path.join(CONFIG.DATA_DIR, CONFIG.JSON_FILES[rating]), 'utf-8'));
            existingData[rating] = data;
            data.forEach(m => processedIds.add(m.id.replace('specimen_', '').split('_')[0].toUpperCase()));
        } catch (e) {
            existingData[rating] = [];
        }
    }

    if (skipExisting) console.log(`[INFO] Режим FULL: Пропуск существующих...`);

    const descriptors = findAllEntityDescriptors(gameDefs);
    const specimenDescriptors = descriptors.filter(d =>
        d.id && d.id.startsWith("Specimen_") &&
        !(locMap.get(d.id) || "").toLowerCase().includes("слабый") &&
        !(locMap.get(d.id) || "").toLowerCase().includes("weak")
    );

    let modifiedCount = 0;
    console.log(`[SYNC] Найдено ${specimenDescriptors.length} записей в XML. Сверка...`);

    for (const desc of specimenDescriptors) {
        const fullId = desc.id;
        const mutantId = fullId.replace('Specimen_', '');

        if (skipExisting && processedIds.has(mutantId.toUpperCase())) continue;

        const availableRatings = await getAvailableRatingsAndDownload(mutantId, skipExisting ? 'full' : 'stats');

        if (availableRatings.length === 0 && mutantId !== 'FB_14') continue;

        const tags = parseTags(desc);
        const hpBase = parseInt(tags.lifePoint || "0");
        if (hpBase === 0) continue;

        const speedValRaw = parseFloat(tags.spX100 || "0");
        const speedValFinal = speedValRaw > 0 ? 1000 / speedValRaw : 0;
        const bankVal = parseInt(tags.bank || tags.silverReward || tags.productionFactor || "10");

        const xmlMultiplier = parseFloat(tags.multiplier || tags.statMulti || tags.statMultiplier || "0");

        const baseStatsForCalc = {
            hp_base: hpBase,
            atk1_base: parseInt(tags.atk1 || "0"),
            atk1p_base: parseInt(tags.atk1p || "0"),
            atk2_base: parseInt(tags.atk2 || "0"),
            atk2p_base: parseInt(tags.atk2p || "0"),
            speed_base: speedValFinal,
            bank_base: bankVal,
            abilityPct1: parseInt(tags.abilityPct1 || "0"),
            abilityPct2: parseInt(tags.abilityPct2 || "0"),
            abilityId: (String(tags.abilities || "").split(':')[1] || "")
        };

        for (const rating of availableRatings) {
            const finalId = rating === 'normal'
                ? `specimen_${mutantId.toLowerCase()}`
                : `specimen_${mutantId.toLowerCase()}_${rating === 'platinum' ? 'plat' : rating}`;

            const existingIdx = existingData[rating].findIndex(m => m.id === finalId);
            const existingEntry = existingData[rating][existingIdx];

            if (skipExisting && existingEntry) continue;

            // !!! РАСЧЕТ МНОЖИТЕЛЯ: ТОЛЬКО GACHA = 2.0 !!!
            let curMult = CONFIG.MULTIPLIERS[rating];
            const typeUpper = (tags.type || "").toUpperCase();

            if (xmlMultiplier > 0) {
                if (rating === 'normal') {
                    curMult = xmlMultiplier;
                    console.log(`[FIX] ${mutantId}: Применен XML множитель ${curMult}`);
                }
            } else if (rating === 'normal' && typeUpper === 'GACHA') {
                curMult = 2.0;
                console.log(`[FIX] ${mutantId}: GACHA обнаружен, множитель 2.0`);
            }

            const statsLvl1 = calculateFinalStats(baseStatsForCalc, 1, curMult);
            const statsLvl30 = calculateFinalStats(baseStatsForCalc, 30, curMult);

            const abilitiesRaw = String(tags.abilities || "").split(';');
            const abilities = abilitiesRaw.map(a => {
                const parts = a.split(':');
                if (parts.length < 2) return null;
                const abilityName = parts[1];
                const isRetaliate = abilityName.includes('retaliate');

                const calcValues = (lvl) => {
                    const s = calculateFinalStats(baseStatsForCalc, lvl, curMult);
                    const pct = lvl >= 25 ? baseStatsForCalc.abilityPct2 : baseStatsForCalc.abilityPct1;
                    const val = s.atk1 * (Math.abs(pct)/100);
                    return { val, pct };
                };
                const v1 = calcValues(1);
                const v30 = calcValues(30);

                return {
                    name: abilityName,
                    pct: Math.abs(v1.pct),
                    value_atk1_lvl1: Math.round(v1.val),
                    value_atk2_lvl1: isRetaliate ? 0 : Math.round(v1.val),
                    value_atk1_lvl30: Math.round(v30.val),
                    value_atk2_lvl30: isRetaliate ? 0 : Math.round(v30.val)
                };
            }).filter(Boolean);

            let rarity = tags.type || "default";
            if (rarity === "CAPTAINPEACE") rarity = "SPECIAL";

            const name = findLocalizedText(locMap, fullId) || mutantId;
            // !!! ИСПРАВЛЕННЫЙ ПОИСК ОПИСАНИЯ !!!
            // Мы ищем точное совпадение с ключом caption_specimen_id (в нижнем регистре)
            const lore = locMap.get(`caption_${fullId.toLowerCase()}`) ||
                         locMap.get(`desc_${fullId.toLowerCase()}`) ||
                         locMap.get(`description_${fullId.toLowerCase()}`) ||
                         findLocalizedText(locMap, fullId, "_description") ||
                         `Описание для ${name}`;

            const atk1Name = findLocalizedText(locMap, fullId, "_attack_1") ||
                             findLocalizedText(locMap, fullId, "_attack_1_name") || `Атака 1`;

            const atk2Name = findLocalizedText(locMap, fullId, "_attack_2") ||
                             findLocalizedText(locMap, fullId, "_attack_2_name") || `Атака 2`;

            const genesChar = String(tags.dna || "");
            const atk1AOE = String(tags.atk1 || "").includes("AOE") || String(tags.atk1p || "").includes("AOE");
            const atk2AOE = String(tags.atk2 || "").includes("AOE") || String(tags.atk2p || "").includes("AOE");

            const entry = {
                id: finalId,
                name: name,
                genes: genesChar.split(''),
                base_stats: {
                    lvl1: { ...statsLvl1, atk1_gene: genesChar[0]?.toLowerCase() || 'neutro', atk1_AOE: atk1AOE },
                    lvl30: { ...statsLvl30, atk1_gene: genesChar[0]?.toLowerCase() || 'neutro', atk2_gene: genesChar[1]?.toLowerCase() || 'neutro', atk2_AOE: atk2AOE },

                    hp_base: Math.round(baseStatsForCalc.hp_base * curMult),
                    atk1_base: Math.round(baseStatsForCalc.atk1_base * curMult),
                    atk1p_base: Math.round(baseStatsForCalc.atk1p_base * curMult),
                    atk2_base: Math.round(baseStatsForCalc.atk2_base * curMult),
                    atk2p_base: Math.round(baseStatsForCalc.atk2p_base * curMult),

                    speed_base: baseStatsForCalc.speed_base,
                    bank_base: baseStatsForCalc.bank_base,

                    abilityPct1: baseStatsForCalc.abilityPct1,
                    abilityPct2: baseStatsForCalc.abilityPct2
                },
                abilities: abilities,
                image: [
                    `textures_by_mutant/${mutantId.toLowerCase()}/${mutantId.toUpperCase()}_${rating}.webp`,
                    `textures_by_mutant/${mutantId.toLowerCase()}/specimen_${mutantId.toLowerCase()}_${rating}.webp`,
                    `textures_by_mutant/${mutantId.toLowerCase()}/larva_${mutantId.toLowerCase()}.webp`
                ],
                type: rarity,
                incub_time: parseInt(tags.incubMin || "0"),
                orbs: {
                    normal: String(tags.orbSlots || "").split('n').length - 1,
                    special: String(tags.orbSlots || "").split('s').length - 1
                },
                bingo: String(tags.bingo || "").split(';').filter(Boolean),
                chance: parseInt(tags.odds || "0"),
                tier: "un-tired",
                name_attack1: atk1Name,
                name_attack2: atk2Name,
                name_attack3: "",
                name_lore: lore,
                star: rating,
                multiplier: curMult,
            };

             if (existingIdx !== -1) {
                if (forceStatUpdate) {
                    // Просто перезаписываем всегда. Это гарантирует обновление лора и имен.
                    existingData[rating][existingIdx] = entry;
                    modifiedCount++;
                    console.log(`[UPDATE] Обновлен: ${finalId}`); // Раскомментируй, если нужен лог
                }
            }
             else {
                existingData[rating].push(entry);
                modifiedCount++;
                console.log(`[NEW] ✨ Добавлен: ${finalId}`);
            }
        }
    }

    if (modifiedCount > 0) {
        console.log(`[SAVE] Запись ${modifiedCount} изменений...`);
        for (const rating of CONFIG.RATINGS) {
            const filePath = path.join(CONFIG.DATA_DIR, CONFIG.JSON_FILES[rating]);
            await fs.writeFile(filePath, JSON.stringify(existingData[rating], null, 2), 'utf-8');
        }
        console.log('[DONE] Готово.');
    } else {
        console.log('[DONE] Нет изменений.');
    }
}

async function main() {
    const mode = process.argv[2] || 'full';
    console.log(`\n================ MODE: ${mode.toUpperCase()} ================\n`);
    switch (mode) {
        case 'full': await sync({ skipExisting: true, forceStatUpdate: false }); break;
        case 'stats': await sync({ skipExisting: false, forceStatUpdate: true }); break;
        default: console.error('Используйте: node sync-mutants.ts [full | stats]');
    }
    console.log('\n--- ЗАВЕРШЕНО ---\n');
}

main().catch(console.error);
