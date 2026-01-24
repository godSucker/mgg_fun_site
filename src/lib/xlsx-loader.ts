import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface PlayerRecord {
  rank: number;
  name: string;
  level: number;
  id: string;
  tandem: string;
  atk1: string; // Новое поле
  atk2: string; // Новое поле
  socials: { type: 'fb' | 'vk' | 'tg' | 'link'; url: string; label: string }[];
}

export function loadEvoTop() {
  const filePath = path.join(process.cwd(), 'src/data/evo_top.xlsx');

  try {
    if (!fs.existsSync(filePath)) return [];

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const players: PlayerRecord[] = rows
      .slice(1)
      .map((row, index) => {
        const name = row[1];
        const level = row[2];
        const tandem = row[4];

        // Читаем атаки (5 и 6 колонки)
        // Форматируем числа с пробелами (если это числа), или оставляем как текст
        const formatNum = (val: any) => {
          if (!val) return '???';
          if (!isNaN(Number(val))) return Number(val).toLocaleString('ru-RU');
          return String(val).trim();
        };

        const atk1 = formatNum(row[5]);
        const atk2 = formatNum(row[6]);

        // Соцсети (7 и 8)
        const socialRaw1 = String(row[7] || '').trim();
        const socialRaw2 = String(row[8] || '').trim();

        const socials: { type: 'fb' | 'vk' | 'tg' | 'link'; url: string; label: string }[] = [];

        const addSocial = (raw: string) => {
          if (!raw || ['undefined', '-', 'нет', 'net', '—', '0'].includes(raw.toLowerCase())) return;

          let type: 'fb' | 'vk' | 'tg' | 'link' = 'link';
          let label = 'Ссылка';

          // 1. Чистим префиксы
          let url = raw;
          if (raw.includes('http')) {
            url = raw.substring(raw.indexOf('http'));
          } else {
            url = raw.replace(/^[\wа-яА-ЯёЁ]+\s*[-–—:]\s*/i, '').trim();
          }

          const lower = url.toLowerCase();

          // 2. Типы
          if (lower.includes('vk.com') || lower.includes('vk.cc')) { type = 'vk'; label = 'VKontakte'; }
          else if (lower.includes('facebook') || lower.includes('fb.com')) { type = 'fb'; label = 'Facebook'; }
          else if (lower.includes('t.me') || lower.includes('tg') || raw.toLowerCase().includes('тг')) {
            type = 'tg';
            label = 'Telegram';
            if (!url.includes('http') && !url.includes('t.me')) {
               let nick = url.replace('@', '').trim().split(' ')[0];
               url = `https://t.me/${nick}`;
            }
          }

          if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
          socials.push({ type, url, label });
        };

        addSocial(socialRaw1);
        addSocial(socialRaw2);

        const cleanName = String(name || '').trim();
        const cleanLvl = Number(String(level).replace(/[^0-9]/g, ''));
        const cleanTandem = String(tandem || '').trim();

        return {
          rank: 0,
          name: cleanName,
          level: cleanLvl || 0,
          tandem: cleanTandem === 'undefined' ? '' : cleanTandem,
          atk1, // Сохраняем атаку из таблицы
          atk2,
          socials,
          id: `p-${index}`
        };
      })
      .filter(p => p.name && p.level > 0 && p.name !== 'Имя/Ник')
      .sort((a, b) => b.level - a.level);

    return players.map((p, i) => ({ ...p, rank: i + 1 }));

  } catch (e) {
    return [];
  }
}
