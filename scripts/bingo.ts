import fs from 'fs';
import path from 'path';

// --- НАСТРОЙКИ ПУТЕЙ ---
// Путь к бекапам (откуда берем)
const BACKUP_DIR = path.join(process.cwd(), '123123');
// Путь к текущим файлам (куда вставляем)
const TARGET_DIR = path.join(process.cwd(), 'src/data/mutants');

const FILES = ['normal.json', 'bronze.json', 'silver.json', 'gold.json', 'platinum.json'];

function restore() {
    console.log('--- ЗАПУСК ВОССТАНОВЛЕНИЯ BINGO ---');

    for (const fileName of FILES) {
        const backupPath = path.join(BACKUP_DIR, fileName);
        const targetPath = path.join(TARGET_DIR, fileName);

        if (!fs.existsSync(backupPath)) {
            console.log(`[SKIP] Бекап не найден: ${fileName}`);
            continue;
        }
        if (!fs.existsSync(targetPath)) {
            console.log(`[SKIP] Целевой файл не найден: ${fileName}`);
            continue;
        }

        try {
            // Читаем файлы
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
            const targetData = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));

            // Создаем карту для быстрого поиска: ID -> Bingo Array
            const bingoMap = new Map();
            backupData.forEach(m => {
                if (m.bingo && m.bingo.length > 0) {
                    bingoMap.set(m.id, m.bingo);
                }
            });

            let restoredCount = 0;

            // Проходимся по целевому файлу и обновляем
            targetData.forEach(mutant => {
                if (bingoMap.has(mutant.id)) {
                    // Берем бинго из бекапа
                    const originalBingo = bingoMap.get(mutant.id);

                    // Сравниваем, чтобы не перезаписывать зря
                    if (JSON.stringify(mutant.bingo) !== JSON.stringify(originalBingo)) {
                        mutant.bingo = originalBingo;
                        restoredCount++;
                    }
                }
            });

            if (restoredCount > 0) {
                fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2), 'utf-8');
                console.log(`[OK] ${fileName}: Восстановлено бинго у ${restoredCount} мутантов.`);
            } else {
                console.log(`[OK] ${fileName}: Изменений не требуется.`);
            }

        } catch (e) {
            console.error(`[ERROR] Ошибка при обработке ${fileName}:`, e.message);
        }
    }
    console.log('--- ГОТОВО ---');
}

restore();
