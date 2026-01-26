import fs from 'fs';
import path from 'path';

// --- ПУТИ ---
const BACKUP_DIR = path.join(process.cwd(), '123123');
const TARGET_DIR = path.join(process.cwd(), 'src/data/mutants');
const FILES = ['normal.json', 'bronze.json', 'silver.json', 'gold.json', 'platinum.json'];

// Поля для восстановления
const TEXT_FIELDS = [
    'name_attack1',
    'name_attack2',
    'name_attack3',
    'name_lore'
];

function restore() {
    console.log('--- ЗАПУСК ВОССТАНОВЛЕНИЯ ТЕКСТОВ И АТАК ---');

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

                    TEXT_FIELDS.forEach(field => {
                        // Если в бекапе есть текст, и он отличается от текущего (или текущего нет)
                        // То восстанавливаем из бекапа
                        if (original[field] && original[field] !== mutant[field]) {
                            mutant[field] = original[field];
                            changed = true;
                        }
                    });

                    if (changed) {
                        restoredCount++;
                    }
                }
            });

            if (restoredCount > 0) {
                fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2), 'utf-8');
                console.log(`[OK] ${fileName}: Восстановлены тексты для ${restoredCount} мутантов.`);
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
