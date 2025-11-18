import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Получаем путь к папке public
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

// Функция для рекурсивного прохода по папкам
async function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await processDirectory(fullPath); // Лезем вглубь
    } else if (path.extname(file).toLowerCase() === '.webp') {
      const outputPath = fullPath.replace(/\.webp$/i, '.webp');

      console.log(`Конвертирую: ${file} -> .webp`);

      try {
        // Конвертация
        await sharp(fullPath)
          .webp({ quality: 80 }) // Качество 80% (глаз не заметит, вес упадет в разы)
          .toFile(outputPath);

        // Удаление старого PNG (раскомментируй, если уверен)
        fs.unlinkSync(fullPath);

      } catch (err) {
        console.error(`Ошибка с файлом ${file}:`, err);
      }
    }
  }
}

console.log('🚀 Начинаю оптимизацию картинок...');
await processDirectory(publicDir);
console.log('✅ Готово! Все PNG стали WebP.');
