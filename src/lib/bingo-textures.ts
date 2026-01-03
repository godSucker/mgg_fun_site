import { getItemTexture, translateItemId } from './craft-simulator';
import { getMutantTexture, getSkinTexture } from './mutant-textures';
import mutantTexturesJson from '@/data/simulators/reactor/mutant-textures.json';
import skinTexturesJson from '@/data/simulators/reactor/skin-textures.json';

const mutantTextureMap = new Map(Object.entries(mutantTexturesJson as Record<string, string>));
const skinTextureMap = new Map(Object.entries(skinTexturesJson as Record<string, string>));

/**
 * Нормализует specimenId для получения пути к текстуре
 */
function normalizeMutantId(specimenId: string): { folder: string; fileId: string; baseId: string } {
  if (!specimenId) return { folder: '', fileId: '', baseId: '' };
  
  let base = String(specimenId).trim();
  // Убираем префикс Specimen_ или specimen_
  base = base.replace(/^specimen[_-]/i, '');
  // Убираем суффиксы вариантов
  base = base.replace(/_(normal|bronze|silver|gold|platinum)$/i, '');
  base = base.replace(/_(plat|platinum)$/i, '');
  
  return {
    folder: base.toLowerCase(),
    fileId: base.toUpperCase(),
    baseId: base,
  };
}

/**
 * Получает путь к текстуре мутанта с правильными fallback'ами
 */
export function getMutantTexturePath(
  specimenId: string,
  skin: string = '_any',
  variant: 'normal' | 'bronze' | 'silver' | 'gold' | 'platinum' = 'normal'
): string {
  if (!specimenId) return '';
  
  // Handle case where rarity is passed as skin
  const rarities = ['bronze', 'silver', 'gold', 'platinum'];
  let effectiveVariant = variant;
  let effectiveSkin = skin;

  if (skin && rarities.includes(skin.toLowerCase())) {
     effectiveVariant = skin.toLowerCase() as 'normal' | 'bronze' | 'silver' | 'gold' | 'platinum';
     effectiveSkin = '_any';
  }
  
  // Если указан конкретный скин (не _any), используем текстуру скина
  if (effectiveSkin && effectiveSkin !== '_any' && effectiveSkin.trim() !== '') {
    // Используем существующую функцию для получения текстуры скина
    const skinPath = getSkinTexture(specimenId);
    if (skinPath) {
      // Если путь найден, но нужно проверить, что это нужный скин
      const skinName = effectiveSkin.toLowerCase();
      // Проверяем, содержит ли путь имя скина (грубая проверка, но эффективная)
      if (skinPath.toLowerCase().includes(skinName)) {
        return skinPath;
      }
    }
    
    // Если скин задан, но его нет в маппинге, мы НЕ должны пытаться угадать путь,
    // так как это часто ведет к 404 (например BF_04_starwars).
    // Вместо этого лучше сразу вернуть обычную версию мутанта (fallback),
    // чем показывать битую картинку.
    
    // Однако, мы можем проверить пару известных исключений или паттернов, если нужно.
    // Но для надежности - пропускаем ручное конструирование пути скина и идем к вариантам/нормалу.
  }
  
  // Используем существующую функцию для получения текстуры мутанта (только для normal)
  if (effectiveVariant === 'normal') {
    const mutantPath = getMutantTexture(specimenId);
    if (mutantPath) {
      return mutantPath;
    }
  }
  
  // Fallback: строим путь вручную (для вариантов или если normal не найден)
  const { folder, fileId } = normalizeMutantId(specimenId);
  if (!folder || !fileId) return '';
  
  const suffix = effectiveVariant === 'normal' ? 'normal' : effectiveVariant;
  return `/textures_by_mutant/${folder}/${fileId}_${suffix}.webp`;
}

/**
 * Получает все возможные fallback пути для мутанта
 */
export function getMutantTextureFallbacks(
  specimenId: string,
  skin: string = '_any',
  variant: 'normal' | 'bronze' | 'silver' | 'gold' | 'platinum' = 'normal'
): string[] {
  const { folder, fileId } = normalizeMutantId(specimenId);
  if (!folder || !fileId) return [];
  
  // Handle case where rarity is passed as skin
  const rarities = ['bronze', 'silver', 'gold', 'platinum'];
  let effectiveVariant = variant;
  let effectiveSkin = skin;

  if (skin && rarities.includes(skin.toLowerCase())) {
     effectiveVariant = skin.toLowerCase() as 'normal' | 'bronze' | 'silver' | 'gold' | 'platinum';
     effectiveSkin = '_any';
  }
  
  const fallbacks: string[] = [];
  
  if (effectiveSkin && effectiveSkin !== '_any' && effectiveSkin.trim() !== '') {
    const skinName = effectiveSkin.toLowerCase();
    // Добавляем fallback для скинов
    fallbacks.push(`/textures_by_skins/textures_by_skin/semi-full/specimen_${folder}_${skinName}.webp`);
    fallbacks.push(`/textures_by_skins/textures_by_skin/full-char/${fileId}_${skinName}.webp`);
  }
  
  // Fallback на текстуру с вариантом
  const suffix = effectiveVariant === 'normal' ? 'normal' : effectiveVariant;
  fallbacks.push(`/textures_by_mutant/${folder}/${fileId}_${suffix}.webp`);
  
  // Если вариант не normal, добавляем normal как самый последний fallback
  if (effectiveVariant !== 'normal') {
    fallbacks.push(`/textures_by_mutant/${folder}/${fileId}_normal.webp`);
  }
  
  return fallbacks;
}

/**
 * Получает путь к текстуре награды
 */
export function getRewardTexturePath(reward: {
  name: string;
  type: 'entity' | 'hardcurrency' | 'softcurrency';
  amount?: number;
}): string | null {
  // Используем существующую функцию для entity
  if (reward.type === 'entity') {
    const name = reward.name;

    // 1. Проверяем, не является ли награда мутантом
    if (name.startsWith('Specimen_') || name.startsWith('specimen_')) {
        // Пытаемся получить текстуру мутанта.
        // Передаем _any как скин, чтобы сработал дефолтный поиск
        const mutantTex = getMutantTexturePath(name, '_any');
        if (mutantTex) return mutantTex;
    }

    // 2. Проверяем Orbs
    if (name.toLowerCase().includes('orb_')) {
        // Проверяем common paths
        // В public/orbs/special/ или public/orbs/
        // Так как мы не можем проверить существование файла, вернем наиболее вероятный,
        // но лучше если мы знаем точное имя.
        // В find мы видели: public/orbs/special/orb_special_addregenerate.webp
        
        // Попробуем угадать папку по имени
        if (name.includes('special')) {
             return `/orbs/special/${name}.webp`;
        }
        // Basic orbs? Мы не видели папку basic, но видели orb_basic в именах?
        // Нет, в find results были только special и boosters.
        // Но `orb_basic_xp_04` был в списке.
        // Если он не найден, попробуем вернуть просто в /materials/ или /items/?
        // В списке файлов я не видел orb_basic...
        
        // Стоп, я видел 'public/orbs/special/orb_slot_spe.webp' и кучу 'orb_special...'.
        // 'orb_basic_...' я НЕ видел в выводе find.
        // Значит orb_basic, вероятно, отсутствует или называется иначе.
        // Но я добавлю путь /orbs/basic/ на всякий случай.
        if (name.includes('basic')) {
             return `/orbs/basic/${name}.webp`; 
        }
        return `/orbs/${name}.webp`;
    }

    // 3. Проверяем Charms/Boosters
    if (name.toLowerCase().includes('charm_') || name.toLowerCase().includes('booster_')) {
        // Charms лежат в public/boosters/ и имеют lowercase имена
        return `/boosters/${name.toLowerCase()}.webp`;
    }
    
    // 4. Проверяем известные материалы
    const texture = getItemTexture(name);
    if (texture) return texture;
    
    // Специальные случаи для звезд
    if (name === 'Star_Bronze') return '/stars/star_bronze.webp';
    if (name === 'Star_Silver') return '/stars/star_silver.webp';
    if (name === 'Star_Gold') return '/stars/star_gold.webp';
    if (name === 'Star_Platinum') return '/stars/star_platinum.webp';
    
    // Специальный фикс для Energy
    if (name === 'Material_Energy25') return '/materials/icon_ticket.webp'; 
    // Фикс для XP
    if (name === 'Material_XP1000') return '/materials/normal_xp.webp';
    
    // Фиксы для зданий
    if (name === 'Building_HC_1') return '/buildings/gold_hc1.webp';
    if (name === 'Building_HC_2') return '/buildings/gold_hc2.webp';
    
    // Фиксы для Хабитатов (Luxe)
    if (name.toLowerCase().includes('habitat_') && name.toLowerCase().includes('_hc')) {
        return `/zones/luxe/${name.toLowerCase()}.webp`;
    }

    // Fallback для материалов: пробуем найти в /materials/
    // Приводим к lowercase, так как многие файлы там lowercase (material_jackpot_token.webp)
    // Но некоторые uppercase (Material_Antimatter.webp).
    // Мы вернем исходный вариант, а браузер попытается загрузить.
    // Если 404, можно было бы onError, но здесь мы возвращаем строку.
    // Попробуем вернуть точное совпадение сначала.
    
    // Хак: для токенов часто используется lowercase
    if (name.includes('Token') || name.includes('token')) {
        return `/materials/${name.toLowerCase()}.webp`;
    }

    return `/materials/${name}.webp`;
  }
  
  // Для валюты
  if (reward.type === 'hardcurrency') {
    const amount = reward.amount || 0;
    if (amount >= 5000) return '/cash/g5000.webp';
    if (amount >= 2000) return '/cash/g2000.webp';
    if (amount >= 1000) return '/cash/g1000.webp';
    if (amount >= 500) return '/cash/g500.webp';
    if (amount >= 200) return '/cash/g200.webp';
    if (amount >= 100) return '/cash/g100.webp';
    if (amount >= 80) return '/cash/g80.webp';
    if (amount >= 50) return '/cash/g50.webp';
    if (amount >= 40) return '/cash/g40.webp';
    if (amount >= 30) return '/cash/g30.webp';
    if (amount >= 20) return '/cash/g20.webp';
    if (amount >= 10) return '/cash/g10.webp';
    return '/cash/hardcurrency.webp';
  }
  
  if (reward.type === 'softcurrency') {
    const amount = reward.amount || 0;
    if (amount >= 10000000000) return '/cash/s10000000000.webp';
    if (amount >= 1000000000) return '/cash/s5000000000.webp';
    if (amount >= 100000000) return '/cash/s10000000000.webp';
    if (amount >= 10000000) return '/cash/s10000000.webp';
    if (amount >= 1000000) return '/cash/s1000000.webp';
    if (amount >= 100000) return '/cash/s100000.webp';
    if (amount >= 75000) return '/cash/s75000.webp';
    if (amount >= 50000) return '/cash/s50000.webp';
    if (amount >= 10000) return '/cash/s10000.webp';
    if (amount >= 1000) return '/cash/s1000.webp';
    if (amount >= 500) return '/cash/s500.webp';
    if (amount >= 100) return '/cash/s100.webp';
    return '/cash/softcurrency.webp';
  }
  
  return null;
}

/**
 * Получает название награды для отображения
 */
export function getRewardLabel(reward: {
  name: string;
  type: 'entity' | 'hardcurrency' | 'softcurrency';
  amount?: number;
}): string {
  if (reward.type === 'hardcurrency') {
    return `${reward.amount?.toLocaleString('ru-RU') || 0} золота`;
  }
  
  if (reward.type === 'softcurrency') {
    return `${reward.amount?.toLocaleString('ru-RU') || 0} серебра`;
  }
  
  // Для entity используем перевод из craft-simulator
  const translated = translateItemId(reward.name);
  if (reward.amount && reward.amount > 1) {
    return `${translated} ×${reward.amount}`;
  }
  return translated;
}
