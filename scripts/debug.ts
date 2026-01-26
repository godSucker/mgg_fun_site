import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

const XML_PATH = path.join(process.cwd(), 'temp/gamedefinitions.xml');
const MUTANT_ID = 'Specimen_AD_14'; // Брейкмастер

// Наша формула (копия из парсера)
function calculate(base, lvl, mult) {
    // base * mult * (lvl / 10 + 0.9)
    return Math.round(base * mult * (lvl / 10 + 0.9));
}

async function debug() {
    console.log(`--- ДИАГНОСТИКА ДЛЯ ${MUTANT_ID} ---`);

    if (!fs.existsSync(XML_PATH)) {
        console.error("ОШИБКА: Нет файла temp/gamedefinitions.xml. Запусти парсер хотя бы раз.");
        return;
    }

    const xmlContent = fs.readFileSync(XML_PATH, 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", parseAttributeValue: true, trimValues: true });
    const gameDefs = parser.parse(xmlContent);

    // Ищем вручную
    function findMutant(obj) {
        if (!obj) return null;
        if (obj.EntityDescriptor) {
            const list = Array.isArray(obj.EntityDescriptor) ? obj.EntityDescriptor : [obj.EntityDescriptor];
            const found = list.find(d => d.id === MUTANT_ID);
            if (found) return found;
        }
        for (const key in obj) {
            if (typeof obj[key] === 'object') {
                const res = findMutant(obj[key]);
                if (res) return res;
            }
        }
        return null;
    }

    const desc = findMutant(gameDefs);
    if (!desc) {
        console.error("Мутант не найден в XML!");
        return;
    }

    const tags = {};
    if (desc.Tag) {
        (Array.isArray(desc.Tag) ? desc.Tag : [desc.Tag]).forEach(t => tags[t.key] = t.value);
    }

    console.log("1. СЫРЫЕ ДАННЫЕ ИЗ XML (TAGS):");
    console.log(`   lifePoint: ${tags.lifePoint}`);
    console.log(`   atk1:      ${tags.atk1}`);
    console.log(`   atk1p:     ${tags.atk1p}`);
    console.log(`   atk2:      ${tags.atk2}`);
    console.log(`   atk2p:     ${tags.atk2p}`);
    console.log(`   abilities: ${tags.abilities}`);
    console.log(`   abilityPct1: ${tags.abilityPct1}`);
    console.log(`   abilityPct2: ${tags.abilityPct2}`);

    const baseHp = parseInt(tags.lifePoint);
    const baseAtk1 = parseInt(tags.atk1);

    console.log("\n2. ТЕСТ РАСЧЕТА (GOLD, x1.75):");
    console.log(`   База ХП: ${baseHp}`);
    console.log(`   Множитель: 1.75`);
    console.log(`   Формула: ${baseHp} * 1.75 * (30 / 10 + 0.9)`);
    console.log(`   Результат скрипта: ${calculate(baseHp, 30, 1.75)}`);
    console.log(`   ОЖИДАЕМОЕ (из игры): 19324 (для Платины x2) / ??? (для Голды)`);
}

debug();
