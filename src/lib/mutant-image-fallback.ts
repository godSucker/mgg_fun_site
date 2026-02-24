/**
 * Утилита для выбора изображения мутанта с fallback на голову (specimen)
 * если полная текстура недоступна
 */

/**
 * Строит URL полной текстуры мутанта
 */
export function buildFullTextureUrl(mutantId: string, variant: string = 'normal'): string {
  const base = normalizeMutantId(mutantId);
  if (!base) return '';
  
  const folder = base.toLowerCase();
  const fileId = base.toUpperCase();
  return `/textures_by_mutant/${folder}/${fileId}_${variant}.webp`;
}

/**
 * Строит URL иконки (головы) мутанта
 */
export function buildSpecimenUrl(mutantId: string, variant: string = 'normal'): string {
  const base = normalizeMutantId(mutantId);
  if (!base) return '';
  
  const folder = base.toLowerCase();
  const fileId = base.toLowerCase();
  const suffix = variant === 'normal' ? '' : `_${variant}`;
  return `/textures_by_mutant/${folder}/specimen_${fileId}${suffix}.webp`;
}

/**
 * Нормализует ID мутанта: убирает префиксы и суффиксы
 */
export function normalizeMutantId(raw: string): string {
  if (!raw) return '';
  let s = String(raw).trim();
  s = s.replace(/^specimen[_-]/i, '');
  s = s.replace(/_(normal|bronze|silver|gold|platinum)$/i, '');
  s = s.replace(/_(plat|platinum)$/i, '');
  return s;
}

/**
 * Проверяет существует ли изображение (делает HEAD запрос)
 */
export async function imageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Возвращает URL изображения с fallback на голову (specimen)
 * Сначала проверяет полную текстуру, если нет — возвращает иконку
 * 
 * @param mutantId - ID мутанта (например "e_14" или "Specimen_E_14")
 * @param variant - Вариант редкости (normal, bronze, silver, gold, platinum)
 * @param preferSpecimen - Если true, сразу возвращает иконку без проверки
 */
export function getMutantImageWithFallback(
  mutantId: string,
  variant: string = 'normal',
  preferSpecimen: boolean = false
): string {
  if (preferSpecimen) {
    return buildSpecimenUrl(mutantId, variant);
  }
  
  const fullTexture = buildFullTextureUrl(mutantId, variant);
  const specimen = buildSpecimenUrl(mutantId, variant);
  
  // Возвращаем полную текстуру, а если её нет — иконку
  // Проверка происходит на стороне клиента через on:error
  return fullTexture;
}

/**
 * Svelte store для кэширования доступности изображений
 * Используется для предотвращения повторных проверок
 */
export function createImageCache() {
  const cache = new Map<string, boolean>();
  
  return {
    get(key: string): boolean | undefined {
      return cache.get(key);
    },
    set(key: string, exists: boolean) {
      cache.set(key, exists);
    },
    has(key: string): boolean {
      return cache.has(key);
    }
  };
}

/**
 * Глобальный кэш для всех изображений
 */
export const globalImageCache = createImageCache();
