import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import sharp from 'sharp';

// ==================== КОНФИГУРАЦИЯ ====================

const CONFIG = {
    LOC_RU_URL: 'https://s-beta.kobojo.com/mutants/gameconfig/localisation_ru.txt',
    GAME_DEFS_URL: 'https://s-ak.kobojo.com/mutants/gameconfig/gamedefinitions.xml',
    KOBOJO_IMG_BASE: 'https://s-ak.kobojo.com/mutants/assets/thumbnails/',
    POKRADEX_ROOT_URL: 'https://pokradex.org/MutantsGG/MGG/',

    DATA_DIR: path.join(process.cwd(), 'src/data/mutants'),
    TEXTURES_DIR: path.join(process.cwd(), 'public/textures_by_mutant'),
    TEMP_DIR: path.join(process.cwd(), 'temp'),

    RATINGS: ['normal', 'bronze', 'silver', 'gold', 'platinum'] as const,
    MULTIPLIERS: {
        normal: 1.0,
        bronze: 1.1,
        silver: 1.3,
        gold: 1.75,
        platinum: 2.0
    } as Record<string, number>,
    VERSION_MAP: {
        bronze: 'V1',
        silver: 'V2',
        gold: 'V3',
        platinum: 'V4'
    } as Record<string, string>
};

type Rating = typeof CONFIG.RATINGS[number];

// ==================== ТИПЫ ====================

interface BaseStatsCalc {
    hp_base: number;
    atk1_base: number;
    atk1p_base: number;
    atk2_base: number;
    atk2p_base: number;
    speed_base: number;
    bank_base: number;
    abilityPct1: number;
    abilityPct2: number;
}

interface StatsResult {
    hp: number;
    atk1: number;
    atk2: number;
    ability: number;
    speed: number;
    silver: number;
}

interface StarInfo {
    images: string[];
    multiplier?: number;
}

interface UnifiedMutant {
    id: string;
    name: string;
    genes: string[];
    base_stats: any;
    abilities: any[];
    stars: Record<string, StarInfo>;
    type: string;
    incub_time: number;
    orbs: { normal: number; special: number };
    bingo: string[];
    chance: number;
    bank: number;
    tier: string;
    name_attack1: string;
    name_attack2: string;
    name_attack3: string;
    name_lore: string;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function roundSpeed(speed: number): number {
    return Math.round(speed * 100) / 100;
}

async function downloadFile(url: string, targetPath: string): Promise<boolean> {
    try {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (res.status === 200) {
            await fs.writeFile(targetPath, res.data);
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
}

async function loadLocalFiles() {
    await fs.mkdir(CONFIG.TEMP_DIR, { recursive: true });
    const xmlPath = path.join(CONFIG.TEMP_DIR, 'gamedefinitions.xml');
    const txtPath = path.join(CONFIG.TEMP_DIR, 'localisation_ru.txt');

    console.log('[SETUP] Загрузка данных из CDN...');
    await downloadFile(CONFIG.GAME_DEFS_URL, xmlPath);
    await downloadFile(CONFIG.LOC_RU_URL, txtPath);

    const xmlContent = await fs.readFile(xmlPath, 'utf-8');
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        parseAttributeValue: true,
        trimValues: true
    });
    const gameDefs = parser.parse(xmlContent);

    const txtContent = await fs.readFile(txtPath, 'utf-8');
    const locMap = new Map<string, string>();
    txtContent.split(/\r?\n/).forEach(line => {
        const parts = line.split(';');
        if (parts.length >= 2) {
            locMap.set(parts[0].trim(), parts.slice(1).join(';').trim());
        }
    });

    return { gameDefs, locMap };
}

async function downloadImage(url: string, targetPath: string): Promise<boolean> {
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
                return true;
            }
        } catch (err) {}
        return false;
    }
}

async function getAvailableRatingsAndDownload(
    mutantId: string,
    mode: 'full' | 'stats',
    isGacha: boolean
): Promise<string[]> {
    const idLower = mutantId.toLowerCase();
    const idUpper = mutantId.toUpperCase();
    const targetDir = path.join(CONFIG.TEXTURES_DIR, idLower);
    const foundRatings = new Set<string>();

    const ratingsToCheck = isGacha ? ['normal'] : CONFIG.RATINGS;

    for (const rating of ratingsToCheck) {
        const kobojoSuffix = rating === 'normal' ? '' : `_${rating}`;
        const kobojoUrl = `${CONFIG.KOBOJO_IMG_BASE}specimen_${idLower}${kobojoSuffix}.png`;

        const pokradexVersionPath = rating === 'normal' ? '' : `${CONFIG.VERSION_MAP[rating as keyof typeof CONFIG.VERSION_MAP]}/`;
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
            try {
                await fs.access(fullArtPath);
                ratingFound = true;
            } catch(e) {}
            if (!ratingFound) {
                try {
                    await fs.access(iconPath);
                    ratingFound = true;
                } catch(e) {}
            }
        }

        if (ratingFound) foundRatings.add(rating);
    }

    return Array.from(foundRatings);
}

function findAllEntityDescriptors(obj: any): any[] {
    let results: any[] = [];
    if (!obj || typeof obj !== 'object') return results;
    if (obj.EntityDescriptor) {
        results = results.concat(Array.isArray(obj.EntityDescriptor) ? obj.EntityDescriptor : [obj.EntityDescriptor]);
    }
    for (const key in obj) {
        if (key === '?xml') continue;
        results = results.concat(findAllEntityDescriptors(obj[key]));
    }
    return results;
}

function parseTags(descriptor: any): Record<string, any> {
    const tags: Record<string, any> = {};
    if (descriptor?.Tag) {
        const tagList = Array.isArray(descriptor.Tag) ? descriptor.Tag : [descriptor.Tag];
        for (const tag of tagList) {
            tags[tag.key] = tag.value;
        }
    }
    return tags;
}

// ==================== ЛОКАЛИЗАЦИЯ ====================

function findLocalizedText(locMap: Map<string, string>, id: string, suffix: string = ""): string {
    const mutantId = id.replace('Specimen_', '').replace('specimen_', '');

    const keys = [
        `specimen_${mutantId}${suffix}`,
        ...(suffix === '' ? [`Specimen_${mutantId}`, `${id}`] : []),
        `${id}${suffix}`,
        `Specimen_${mutantId}${suffix}`,
        `${id.toUpperCase()}${suffix}`,
        `${id.toLowerCase()}${suffix}`
    ];

    for (const key of keys) {
        if (locMap.has(key)) return locMap.get(key)!;
    }
    return "";
}

// ==================== РАСЧЕТ СТАТОВ ====================

function calculateFinalStats(baseStats: BaseStatsCalc, level: number, starMultiplier: number): StatsResult {
    const multiplier = starMultiplier;
    const lvl = Math.max(1, Math.min(30, level));

    const hpBase = baseStats.hp_base * multiplier;
    const atk1Base = baseStats.atk1_base * multiplier;
    const atk1PlusBase = baseStats.atk1p_base * multiplier;
    const atk2Base = baseStats.atk2_base * multiplier;
    const atk2PlusBase = baseStats.atk2p_base * multiplier;
    const speedBase = baseStats.speed_base;
    const bankBase = baseStats.bank_base;

    const levelScale = lvl / 10 + 0.9;
    const finalHp = hpBase * levelScale;

    const activeAtk1Base = lvl < 10 ? atk1Base : atk1PlusBase;
    const finalAtk1 = activeAtk1Base * levelScale;

    const activeAtk2Base = lvl < 15 ? atk2Base : atk2PlusBase;
    const finalAtk2 = activeAtk2Base * levelScale;

    const abilityPercent = lvl < 25 ? baseStats.abilityPct1 : baseStats.abilityPct2;
    const abilityValue = finalAtk1 * (Math.abs(abilityPercent) / 100);

    const finalSpeed = roundSpeed(speedBase);
    const finalSilver = bankBase * lvl;

    return {
        hp: Math.round(finalHp),
        atk1: Math.round(finalAtk1),
        atk2: Math.round(finalAtk2),
        ability: Math.round(abilityValue),
        speed: finalSpeed,
        silver: Math.round(finalSilver)
    };
}

// ==================== ОПРЕДЕЛЕНИЕ РЕЙТИНГА ====================

function getTrueRating(type: string, multiplier: number): Rating {
    const typeUpper = type.toUpperCase();

    if (typeUpper === 'GACHA') {
        if (multiplier >= 2.0) return 'platinum';
        if (multiplier >= 1.75) return 'gold';
        if (multiplier >= 1.3) return 'silver';
        if (multiplier >= 1.1) return 'bronze';
        return 'normal';
    }

    return 'normal';
}

// ==================== ТЕКСТУРЫ ====================

function buildImagePaths(mutantId: string, rating: string): string[] {
    const idLower = mutantId.toLowerCase();
    const idUpper = mutantId.toUpperCase();
    return [
        `textures_by_mutant/${idLower}/${idUpper}_${rating}.webp`,
        `textures_by_mutant/${idLower}/specimen_${idLower}_${rating}.webp`,
        `textures_by_mutant/${idLower}/larva_${idLower}.webp`
    ];
}

// ==================== ВАЛИДАЦИЯ ====================

function validateEntry(entry: UnifiedMutant, mutantId: string): { errors: string[]; warnings: string[]; isValid: boolean } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (entry.base_stats.lvl1.hp === 0) errors.push('HP lvl1 = 0');
    if (entry.base_stats.lvl1.atk1 === 0) errors.push('ATK1 lvl1 = 0');
    if (!entry.name || entry.name === entry.id) errors.push('Имя не найдено');

    if (!entry.name_attack1 || entry.name_attack1.includes('Атака 1'))
        warnings.push('attack1 не найдена');
    if (!entry.name_attack2 || entry.name_attack2.includes('Атака 2'))
        warnings.push('attack2 не найдена');
    if (!entry.name_lore || entry.name_lore.includes('Описание для'))
        warnings.push('описание не найдено');
    if (entry.abilities.length === 0)
        warnings.push('способности отсутствуют');

    return { errors, warnings, isValid: errors.length === 0 };
}

// ==================== DIFF ENGINE ====================

function compareStats(oldEntry: any, newEntry: any): { hasChanges: boolean; changes: string[] } {
    if (!oldEntry) return { hasChanges: true, changes: ['NEW'] };

    const changes: string[] = [];

    const oldL1 = oldEntry.base_stats.lvl1;
    const newL1 = newEntry.base_stats.lvl1;
    if (oldL1.hp !== newL1.hp) changes.push(`hp1: ${oldL1.hp}→${newL1.hp}`);
    if (oldL1.atk1 !== newL1.atk1) changes.push(`atk1_1: ${oldL1.atk1}→${newL1.atk1}`);
    if (oldL1.atk2 !== newL1.atk2) changes.push(`atk2_1: ${oldL1.atk2}→${newL1.atk2}`);

    const oldL30 = oldEntry.base_stats.lvl30;
    const newL30 = newEntry.base_stats.lvl30;
    if (oldL30.hp !== newL30.hp) changes.push(`hp30: ${oldL30.hp}→${newL30.hp}`);
    if (oldL30.atk1 !== newL30.atk1) changes.push(`atk1_30: ${oldL30.atk1}→${newL30.atk1}`);
    if (oldL30.atk2 !== newL30.atk2) changes.push(`atk2_30: ${oldL30.atk2}→${newL30.atk2}`);

    if (JSON.stringify(oldEntry.abilities) !== JSON.stringify(newEntry.abilities)) {
        changes.push('abilities');
    }

    if (oldEntry.name_attack1 !== newEntry.name_attack1 && newEntry.name_attack1 && !newEntry.name_attack1.includes('Атака')) {
        changes.push('loc:attack1');
    }
    if (oldEntry.name_attack2 !== newEntry.name_attack2 && newEntry.name_attack2 && !newEntry.name_attack2.includes('Атака')) {
        changes.push('loc:attack2');
    }

    return { hasChanges: changes.length > 0, changes };
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

async function sync(options: {
    skipExisting: boolean;
    forceStatUpdate: boolean;
    compareBeforeUpdate: boolean
}) {
    const { skipExisting, forceStatUpdate, compareBeforeUpdate } = options;
    const { gameDefs, locMap } = await loadLocalFiles();

    // Загрузка bingos.json для маппинга мутантов к бинго
    let bingoMap = new Map<string, string[]>();
    try {
        const bingosPath = path.join(process.cwd(), 'src/data/bingos.json');
        const bingosData = JSON.parse(await fs.readFile(bingosPath, 'utf-8'));
        for (const bingo of bingosData) {
            if (!bingo.mutants || !Array.isArray(bingo.mutants)) continue;
            for (const mutant of bingo.mutants) {
                const specId = String(mutant.specimenId || '').toUpperCase();
                if (!specId) continue;
                if (!bingoMap.has(specId)) {
                    bingoMap.set(specId, []);
                }
                bingoMap.get(specId)!.push(bingo.id);
            }
        }
        console.log(`[BINGO] Загружено ${bingoMap.size} мутантов с бинго данными`);
    } catch (e) {
        console.warn('[BINGO] Не удалось загрузить bingos.json, bingo поля будут пустыми');
    }

    // Загрузка существующих данных — единый файл
    const existingData = new Map<string, UnifiedMutant>();
    const processedIds = new Set<string>();

    try {
        const data = JSON.parse(
            await fs.readFile(path.join(CONFIG.DATA_DIR, 'mutants.json'), 'utf-8')
        );
        for (const m of data) {
            existingData.set(m.id, m);
            processedIds.add(m.id.replace(/^specimen_/, '').toUpperCase());
        }
    } catch (e) {
        console.log('[INFO] mutants.json не найден, создаём с нуля');
    }

    const stats = {
        added: 0,
        updatedStats: 0,
        updatedLocalization: 0,
        skipped: 0,
        errors: 0,
        warnings: 0,
        deleted: 0
    };

    if (skipExisting) console.log(`[INFO] Режим FULL: Пропуск существующих мутантов`);
    if (compareBeforeUpdate) console.log(`[INFO] Режим REBALANCE: Обновление только изменившихся данных`);

    const descriptors = findAllEntityDescriptors(gameDefs);
    const specimenDescriptors = descriptors.filter(d =>
        d.id && d.id.startsWith("Specimen_") &&
        !(locMap.get(d.id) || "").toLowerCase().includes("слабый") &&
        !(locMap.get(d.id) || "").toLowerCase().includes("weak")
    );

    let modifiedCount = 0;
    console.log(`[SYNC] Найдено ${specimenDescriptors.length} записей. Обработка...\n`);

    const xmlMutantIds = new Set<string>();

    for (const desc of specimenDescriptors) {
        const fullId = desc.id;
        const mutantId = fullId.replace('Specimen_', '');
        const baseId = `specimen_${mutantId.toLowerCase()}`;
        xmlMutantIds.add(mutantId.toUpperCase());

        if (skipExisting && processedIds.has(mutantId.toUpperCase())) continue;

        const tags = parseTags(desc);
        const hpBase = parseInt(tags.lifePoint || "0");
        if (hpBase === 0) continue;

        const typeUpper = (tags.type || "").toUpperCase();
        const isGacha = typeUpper === 'GACHA';

        const textureRatings = await getAvailableRatingsAndDownload(
            mutantId,
            skipExisting ? 'full' : 'stats',
            isGacha
        );

        if (textureRatings.length === 0 && mutantId !== 'FB_14') {
            console.log(`[SKIP] ${mutantId}: текстуры не найдены`);
            continue;
        }

        const speedValRaw = parseFloat(tags.spX100 || "0");
        const speedValFinal = speedValRaw > 0 ? roundSpeed(1000 / speedValRaw) : 0;
        const bankVal = parseInt(tags.bank || tags.silverReward || tags.productionFactor || "10");
        const xmlMultiplier = parseFloat(tags.multiplier || tags.statMulti || tags.statMultiplier || "0");

        const baseStatsForCalc: BaseStatsCalc = {
            hp_base: hpBase,
            atk1_base: parseInt(tags.atk1 || "0"),
            atk1p_base: parseInt(tags.atk1p || "0"),
            atk2_base: parseInt(tags.atk2 || "0"),
            atk2p_base: parseInt(tags.atk2p || "0"),
            speed_base: speedValFinal,
            bank_base: bankVal,
            abilityPct1: parseInt(tags.abilityPct1 || "0"),
            abilityPct2: parseInt(tags.abilityPct2 || "0")
        };

        // Определение множителя для GACHA
        let gachaMult = 1.0;
        if (xmlMultiplier > 0) {
            gachaMult = xmlMultiplier;
        } else if (isGacha) {
            gachaMult = 2.0;
        }

        // Определяем какие звёзды доступны
        const starsObj: Record<string, StarInfo> = {};

        if (isGacha) {
            // GACHA — только одна звезда
            const trueRating = getTrueRating(typeUpper, gachaMult);
            const imageRating = 'normal'; // текстуры всегда с суффиксом _normal
            starsObj[trueRating] = {
                images: buildImagePaths(mutantId, imageRating),
                ...(trueRating !== 'normal' && { multiplier: gachaMult })
            };
        } else {
            // Обычные мутанты — все доступные звёзды
            for (const rating of textureRatings) {
                starsObj[rating] = {
                    images: buildImagePaths(mutantId, rating),
                    ...(rating !== 'normal' && { multiplier: CONFIG.MULTIPLIERS[rating] })
                };
            }
        }

        // Статы при множителе 1.0x (raw)
        const statsLvl1 = calculateFinalStats(baseStatsForCalc, 1, 1.0);
        const statsLvl30 = calculateFinalStats(baseStatsForCalc, 30, 1.0);

        // Способности при 1.0x
        const abilitiesRaw = String(tags.abilities || "").split(';');
        const abilities = abilitiesRaw.map(a => {
            const parts = a.split(':');
            if (parts.length < 2) return null;
            const abilityIndex = parseInt(parts[0]) || 1;
            const abilityName = parts[1];
            const isRetaliate = abilityName.includes('retaliate');
            const abilityPct = abilityIndex === 1 ? baseStatsForCalc.abilityPct1 : baseStatsForCalc.abilityPct2;

            const calcValues = (lvl: number) => {
                const s = calculateFinalStats(baseStatsForCalc, lvl, 1.0);
                const val_atk1 = s.atk1 * (Math.abs(abilityPct)/100);
                const val_atk2 = s.atk2 * (Math.abs(abilityPct)/100);
                return { val_atk1, val_atk2 };
            };
            const v1 = calcValues(1);
            const v30 = calcValues(30);

            return {
                name: abilityName,
                pct: Math.abs(abilityPct),
                value_atk1_lvl1: Math.round(v1.val_atk1),
                value_atk2_lvl1: isRetaliate ? 0 : Math.round(v1.val_atk2),
                value_atk1_lvl30: Math.round(v30.val_atk1),
                value_atk2_lvl30: isRetaliate ? 0 : Math.round(v30.val_atk2)
            };
        }).filter(Boolean);

        let rarity = tags.type || "default";
        if (rarity === "CAPTAINPEACE") rarity = "SPECIAL";

        const name = findLocalizedText(locMap, fullId) || mutantId;
        const lore = locMap.get(`caption_${fullId.toLowerCase()}`) ||
                     locMap.get(`desc_${fullId.toLowerCase()}`) ||
                     findLocalizedText(locMap, fullId, "_description") ||
                     `Описание для ${name}`;

        const atk1Name = findLocalizedText(locMap, fullId, "_attack_1") || `Атака 1`;
        const atk2Name = findLocalizedText(locMap, fullId, "_attack_2") || `Атака 2`;

        const genesChar = String(tags.dna || "");
        const atk1AOE = String(tags.atk1 || "").includes("AOE") || String(tags.atk1p || "").includes("AOE");
        const atk2AOE = String(tags.atk2 || "").includes("AOE") || String(tags.atk2p || "").includes("AOE");

        const entry: UnifiedMutant = {
            id: baseId,
            name: name,
            genes: genesChar.split(''),
            base_stats: {
                lvl1: {
                    ...statsLvl1,
                    atk1_gene: genesChar[0]?.toLowerCase() || 'neutro',
                    atk1_AOE: atk1AOE
                },
                lvl30: {
                    ...statsLvl30,
                    atk1_gene: genesChar[0]?.toLowerCase() || 'neutro',
                    atk2_gene: genesChar[1]?.toLowerCase() || 'neutro',
                    atk2_AOE: atk2AOE
                },
                hp_base: baseStatsForCalc.hp_base,
                atk1_base: baseStatsForCalc.atk1_base,
                atk1p_base: baseStatsForCalc.atk1p_base,
                atk2_base: baseStatsForCalc.atk2_base,
                atk2p_base: baseStatsForCalc.atk2p_base,
                speed_base: baseStatsForCalc.speed_base,
                bank_base: baseStatsForCalc.bank_base,
                abilityPct1: baseStatsForCalc.abilityPct1,
                abilityPct2: baseStatsForCalc.abilityPct2
            },
            abilities: abilities,
            stars: starsObj,
            type: rarity,
            incub_time: parseInt(tags.incubMin || "0"),
            orbs: {
                normal: String(tags.orbSlots || "").split('n').length - 1,
                special: String(tags.orbSlots || "").split('s').length - 1
            },
            bingo: bingoMap.get(fullId.toUpperCase()) || [],
            chance: parseInt(tags.odds || "0"),
            bank: bankVal,
            tier: "un-tired",
            name_attack1: atk1Name,
            name_attack2: atk2Name,
            name_attack3: "",
            name_lore: lore
        };

        // Валидация
        const validation = validateEntry(entry, mutantId);
        if (!validation.isValid) {
            console.log(`[ERROR] ${baseId}: ${validation.errors.join(', ')}`);
            stats.errors++;
            continue;
        }
        if (validation.warnings.length > 0) {
            stats.warnings += validation.warnings.length;
        }

        // Обновление/добавление
        const existingEntry = existingData.get(baseId);

        if (existingEntry) {
            if (skipExisting) {
                stats.skipped++;
                continue;
            }

            if (compareBeforeUpdate) {
                const diff = compareStats(existingEntry, entry);
                if (!diff.hasChanges) {
                    stats.skipped++;
                    continue;
                }

                // Сохраняем существующие звёзды, добавляем новые
                entry.stars = { ...existingEntry.stars, ...entry.stars };
                existingData.set(baseId, entry);
                modifiedCount++;

                const hasStatsChanges = diff.changes.some(c => !c.startsWith('loc:'));
                const hasLocChanges = diff.changes.some(c => c.startsWith('loc:'));

                if (hasStatsChanges) {
                    stats.updatedStats++;
                    console.log(`[REBALANCE] ${baseId}: ${diff.changes.join(', ')}`);
                } else if (hasLocChanges) {
                    stats.updatedLocalization++;
                    console.log(`[LOC] ${baseId}`);
                }
            } else if (forceStatUpdate) {
                // Сохраняем существующие звёзды, добавляем/обновляем новые
                entry.stars = { ...existingEntry.stars, ...entry.stars };
                existingData.set(baseId, entry);
                modifiedCount++;
                stats.updatedStats++;
            }
        } else {
            existingData.set(baseId, entry);
            modifiedCount++;
            stats.added++;
            console.log(`[NEW] ${baseId}`);
        }
    }

    // Удаление мутантов без текстур
    if (!skipExisting) {
        for (const [id, m] of existingData) {
            const mutId = id.replace(/^specimen_/, '').toUpperCase();
            if (!xmlMutantIds.has(mutId)) {
                console.log(`[DELETE] ${id}: отсутствует в XML`);
                existingData.delete(id);
                stats.deleted++;
            }
        }
    }

    // Статистика
    console.log('\n' + '='.repeat(60));
    console.log('ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    if (stats.added > 0) console.log(`Добавлено: ${stats.added}`);
    if (stats.updatedStats > 0) console.log(`Обновлено (статы): ${stats.updatedStats}`);
    if (stats.updatedLocalization > 0) console.log(`Обновлено (локализация): ${stats.updatedLocalization}`);
    if (stats.deleted > 0) console.log(`Удалено: ${stats.deleted}`);
    if (stats.skipped > 0) console.log(`Пропущено: ${stats.skipped}`);
    if (stats.warnings > 0) console.log(`Предупреждений: ${stats.warnings}`);
    if (stats.errors > 0) console.log(`Ошибок: ${stats.errors}`);

    const totalProcessed = stats.added + stats.updatedStats + stats.updatedLocalization + stats.skipped + stats.errors;
    console.log(`\nВсего обработано: ${totalProcessed} записей`);
    console.log('='.repeat(60) + '\n');

    if (modifiedCount > 0) {
        console.log(`[SAVE] Сохранение ${modifiedCount} изменений...`);
        const outputArray = Array.from(existingData.values());
        const filePath = path.join(CONFIG.DATA_DIR, 'mutants.json');
        await fs.writeFile(filePath, JSON.stringify(outputArray, null, 2), 'utf-8');
        console.log(`[DONE] mutants.json обновлён! (${outputArray.length} мутантов)`);
    } else {
        console.log('[DONE] Нет изменений.');
    }
}

// ==================== MAIN ====================

async function main() {
    const mode = process.argv[2] || 'full';
    console.log(`\n${'='.repeat(60)}`);
    console.log(`ПАРСЕР V3 | РЕЖИМ: ${mode.toUpperCase()}`);
    console.log('='.repeat(60) + '\n');

    switch (mode) {
        case 'full':
            console.log('Скачивание текстур + добавление новых мутантов');
            console.log('Существующие: пропускаются\n');
            await sync({ skipExisting: true, forceStatUpdate: false, compareBeforeUpdate: false });
            break;

        case 'stats':
            console.log('Полное обновление всех мутантов');
            console.log('Статы и локализация: обновляются\n');
            await sync({ skipExisting: false, forceStatUpdate: true, compareBeforeUpdate: false });
            break;

        case 'rebalance':
            console.log('Умное обновление (только изменения)');
            console.log('Обновляются только измененные данные\n');
            await sync({ skipExisting: false, forceStatUpdate: false, compareBeforeUpdate: true });
            break;

        default:
            console.error('Неизвестный режим!');
            console.error('\nДоступные режимы:');
            console.error('  full      - Добавление новых + текстуры');
            console.error('  stats     - Полное обновление');
            console.error('  rebalance - Быстрое обновление');
            process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('ЗАВЕРШЕНО');
    console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
