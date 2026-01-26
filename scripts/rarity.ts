import fs from 'fs';
import path from 'path';

// --- ПУТИ ---
const BACKUP_DIR = path.join(process.cwd(), '123123');
const TARGET_DIR = path.join(process.cwd(), 'src/data/mutants');
const FILES = ['normal.json', 'bronze.json', 'silver.json', 'gold.json', 'platinum.json'];

// Поля, которые отвечают за внешний вид (рамку, звезду, тип)
const FIELDS_TO_RESTORE = ['type', 'rarity', 'star'];

function restore() {
    console.log('--- ЗАПУСК ВОССТАНОВЛЕНИЯ РЕДКОСТИ (GACHA FIX) ---');

    for (const fileName of FILES) {
        const backupPath = path.join(BACKUP_DIR, fileName);
        const targetPath = path.join(TARGET_DIR, fileName);

        if (!fs.existsSync(backupPath) || !fs.existsSync(targetPath)) continue;

        try {
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
            const targetData = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));

            // Карта: ID -> Объект мутанта из бекапа
            const backupMap = new Map();
            backupData.forEach(m => backupMap.set(m.id, m));

            let restoredCount = 0;

            targetData.forEach(mutant => {
                if (backupMap.has(mutant.id)) {
                    const original = backupMap.get(mutant.id);
                    let changed = false;

                    // Если в бекапе этот мутант был GACHA, HERO или GALACTIC
                    // мы принудительно возвращаем ему эти свойства
                    const isSpecial = ['GACHA', 'HERO', 'GALACTIC', 'SPECIAL'].includes((original.type || '').toUpperCase());

                    if (isSpecial) {
                        FIELDS_TO_RESTORE.forEach(field => {
                            // Если в текущем файле отличается от бекапа - восстанавливаем
                            if (original[field] !== undefined && mutant[field] !== original[field]) {
                                mutant[field] = original[field];
                                changed = true;
                            }
                        });
                    }

                    if (changed) {
                        restoredCount++;
                        // console.log(`[FIX] Восстановлен вид для: ${mutant.name} (${mutant.type})`);
                    }
                }
            });

            if (restoredCount > 0) {
                fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2), 'utf-8');
                console.log(`[OK] ${fileName}: Исправлено отображение для ${restoredCount} мутантов.`);
            } else {
                console.log(`[OK] ${fileName}: Изменений не требуется.`);
            }

        } catch (e) {
            console.error(`[ERROR] ${fileName}:`, e.message);
        }
    }
    console.log('--- ГОТОВО ---');
}

restore();
