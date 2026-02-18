import { readFileSync } from 'fs';
import { join } from 'path';

// Google Sheets ID из вашего URL
const SHEET_ID = '10hJePm-VDoM-fywzgHx8bPMcGfMoOJKQ2aFy99t0NKs';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

// Кэш для хранения данных
let cachedData: any[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export interface PlayerRecord {
  rank: number;
  name: string;
  level: number;
  id: string;
  tandem: string;
  atk1: string;
  atk2: string;
  socials: { type: 'fb' | 'vk' | 'tg' | 'link'; url: string; label: string }[];
}

function parseCSV(text: string): any[][] {
  const rows: any[][] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Простой парсинг CSV (для сложных случаев нужно использовать библиотеку)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim().replace(/^"|"$/g, ''));
    rows.push(values);
  }
  
  return rows;
}

export async function loadEvoTop(): Promise<PlayerRecord[]> {
  const now = Date.now();
  if (cachedData && (now - cacheTime) < CACHE_DURATION) {
    return cachedData;
  }
  
  try {
    const response = await fetch(SHEET_URL);
    
    if (!response.ok) {
      if (cachedData) return cachedData;
      return [];
    }
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    
    // Пропускаем заголовок и обрабатываем строки
    // Индексы колонок (с учетом пустой первой колонки):
    // 0='', 1='№', 2='Имя', 3='ЭВО', 4='Слава', 5='Тандем', 6='Атака1', 7='Атака2', 8='ФБ', 9='Контакт'
    const players: PlayerRecord[] = rows
      .slice(1)
      .map((row, index) => {
        const name = row[2];  // Имя/Ник
        const level = row[3];  // ЭВО
        const tandem = row[5];  // Тандем
        
        const formatNum = (val: any) => {
          if (!val) return '???';
          if (!isNaN(Number(val))) return Number(val).toLocaleString('ru-RU');
          return String(val).trim();
        };
        
        const atk1 = formatNum(row[6]);  // 1 атака
        const atk2 = formatNum(row[7]);  // 2 атака
        
        const socialRaw1 = String(row[8] || '').trim();  // Фейсбук
        const socialRaw2 = String(row[9] || '').trim();  // Контакт для связи
        
        const socials: { type: 'fb' | 'vk' | 'tg' | 'link'; url: string; label: string }[] = [];
        
        const addSocial = (raw: string) => {
          if (!raw || ['undefined', '-', 'нет', 'net', '—', '0'].includes(raw.toLowerCase())) return;
          
          let type: 'fb' | 'vk' | 'tg' | 'link' = 'link';
          let label = 'Ссылка';
          
          let url = raw;
          if (raw.includes('http')) {
            url = raw.substring(raw.indexOf('http'));
          } else {
            url = raw.replace(/^[\wа-яА-ЯёЁ]+\s*[-–—:]\s*/i, '').trim();
          }
          
          const lower = url.toLowerCase();
          
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
          atk1,
          atk2,
          socials,
          id: `p-${index}`
        };
      })
      .filter(p => p.name && p.level > 0 && p.name !== 'Имя/Ник')
      .sort((a, b) => b.level - a.level);
    
    const result = players.map((p, i) => ({ ...p, rank: i + 1 }));
    
    cachedData = result;
    cacheTime = Date.now();
    
    return result;
    
  } catch (e) {
    if (cachedData) return cachedData;
    return [];
  }
}
