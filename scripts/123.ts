import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src/data/mutants');
const TEXTURES_DIR = path.join(process.cwd(), 'public'); // Важно: путь от корня проекта
const FILES = ['normal.json', 'bronze.json', 'silver.json', 'gold.json', 'platinum.json'];

async function clean() {
    console.log('--- ЗАПУСК ЧИСТИЛЬЩИКА ---');

    for (const file of FILES) {
        const filePath = path.join(DATA_DIR, file);
        if (!fs.existsSync(filePath)) continue;

        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        const initialCount = data.length;

        // Фильтруем: оставляем только тех, у кого есть файл первой текстуры
        const cleanData = data.filter(mutant => {
            // mutant.image[0] это путь типа "textures_by_mutant/..."
            const fullPath = path.join(TEXTURES_DIR, mutant.image[0]);

            if (fs.existsSync(fullPath)) {
                return true;
            } else {
                console.log(`[DELETE] Удален мусор: ${mutant.name} (${mutant.id}) - нет файла ${fullPath}`);
                return false;
            }
        });

        if (initialCount !== cleanData.length) {
            fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 2), 'utf-8');
            console.log(`[CLEAN] ${file}: Было ${initialCount} -> Стало ${cleanData.length}`);
        } else {
            console.log(`[OK] ${file}: Чисто.`);
        }
    }
}

clean();
