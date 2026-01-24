import { secretCombos } from '@/lib/secretCombos';
import { normalizeSearch as normalizeName } from '@/lib/search-normalize';

// --- 1. Types ---
export interface Mutant {
  id: string;
  name: string;
  genes: string | string[];
  odds: number;
  type?: string;
  incub_time?: number;
  image?: string | string[];
}

export interface BreedingResult {
  child: Mutant;
  isSecret?: boolean;
  tag?: string; // Добавил тег сразу в результат
}

export interface ParentPair {
  p1: Mutant;
  p2: Mutant;
  isSecret: boolean;
}

// --- 2. Rules Configuration ---

// ГРУППА 1: СТРОГО ЗАПРЕЩЕНЫ К ВЫПАДЕНИЮ
// Они не падают НИКОГДА. Даже если скрещивать двух таких же.
const FORBIDDEN_TYPES = new Set([
  'seasonal',   // <--- Линкольн теперь тут и не выпадет
  'videogame',
  'boss',
  'zodiac',
  'gacha',
  'special',
  'community',
  'event'
]);

// ГРУППА 2: ОГРАНИЧЕНЫ (Выпадают, только если родитель такой же)
const RESTRICTED_TYPES = new Set([
  'pvp',
  'heroic',
  'legend',
  'legendary'
]);

// ГРУППА 3: БЕЛЫЙ СПИСОК (Легенды, которые падают свободно по генам)
const LEGEND_WHITELIST = new Set([
  'human', 'dezinger', 'mechanorog', 'invadron', 'cursedracer',
  'proklyatiygonshchik', 'touchdown', 'grimteddy', 'ragnar', 'buckmaurice',
  'galaxyguard', 'thor', 'kobrakai', 'cosmokong', 'absolem', 'longhorn',
  'startrooper', 'wampaa', 'masteryoda', 'anubis', 'raveneye',
  'bushi', 'captainbagobones', 'captainwrenchfury', 'mantidruid',
  'devourer', 'darkseer', 'interceptrix', 'cyberslug',
  'commodoreshark', 'hor', 'gore'
].map(normalizeName));

// --- 3. Helpers ---

function getGeneStr(genes: string | string[]): string {
  let str = Array.isArray(genes) ? genes[0] : genes;
  return str ? str.toUpperCase().trim() : '';
}

function splitGenes(genes: string | string[]): string[] {
  const g = getGeneStr(genes);
  if (!g) return [];
  if (g.length === 1) return [g];
  return g.split('');
}

function areGenesCompatible(childGenes: string, p1Genes: string, p2Genes: string): boolean {
  const cParts = splitGenes(childGenes);
  const pool = splitGenes(p1Genes).concat(splitGenes(p2Genes));
  return cParts.every(gene => pool.includes(gene));
}

// --- 4. CORE LOGIC ---

// Новая жесткая логика проверки генов
function isBreedingPossible(childCode: string, p1Code: string, p2Code: string): boolean {
  // Разбираем гены на массив символов ['A', 'B']
  const c = childCode.split('');
  const p1 = p1Code.split('');
  const p2 = p2Code.split('');

  // 1. Одногеновые дети (A, B...)
  // Могут получиться ТОЛЬКО если хотя бы один из родителей одногеновый (чистый).
  // Если оба родителя гибриды (AB + CD), одногеновые дети невозможны.
  if (c.length === 1) {
    if (p1.length > 1 && p2.length > 1) return false;
  }

  // 2. Дети с одинаковыми генами (AA, BB...)
  // Возможны ТОЛЬКО если этот ген есть у ОБОИХ родителей.
  // Пример: Human (AA) нужен ген A от папы и ген A от мамы.
  if (c.length === 2 && c[0] === c[1]) {
    const gene = c[0];
    if (!p1.includes(gene) || !p2.includes(gene)) return false;
  }

  // 3. Базовая проверка состава
  // Все гены ребенка должны быть в пуле родителей
  const pool = [...p1, ...p2];
  return c.every(g => pool.includes(g));
}

export function calculateBreeding(
  p1: Mutant,
  p2: Mutant,
  allMutants: Mutant[]
): BreedingResult[] {
  if (!p1 || !p2) return [];

  const candidates: BreedingResult[] = [];
  const seenIds = new Set<string>();

  const p1Name = normalizeName(p1.name);
  const p2Name = normalizeName(p2.name);
  const p1Id = String(p1.id);
  const p2Id = String(p2.id);

  // 1. СЕКРЕТЫ (RECIPE) - Самый высокий приоритет
  const secretMatch = secretCombos.find(combo => {
    const cP1 = normalizeName(combo.parents[0]);
    const cP2 = normalizeName(combo.parents[1]);
    return (cP1 === p1Name && cP2 === p2Name) || (cP1 === p2Name && cP2 === p1Name);
  });

  if (secretMatch) {
    const secretChild = allMutants.find(m => normalizeName(m.name) === normalizeName(secretMatch.childName));
    if (secretChild) {
      candidates.push({ child: secretChild, isSecret: true, tag: 'РЕЦЕПТ' });
      seenIds.add(String(secretChild.id));
    }
  }

  // 2. ОБЫЧНОЕ СКРЕЩИВАНИЕ
  const p1Genes = getGeneStr(p1.genes);
  const p2Genes = getGeneStr(p2.genes);

  for (const m of allMutants) {
    const mId = String(m.id);
    if (seenIds.has(mId)) continue;

    const mName = normalizeName(m.name);
    const mType = (m.type || 'default').toLowerCase();
    const mGenes = getGeneStr(m.genes);

    // Новая логика проверки генов
    if (!isBreedingPossible(mGenes, p1Genes, p2Genes)) continue;

    // --- ФИЛЬТРЫ ТИПОВ ---

    // 1. ЗАПРЕЩЕННЫЕ
    if (FORBIDDEN_TYPES.has(mType)) continue;

    // 2. РЕЦЕПТНЫЕ (Только если это копирование родителя)
    if (mType === 'recipe') {
        if (p1Id !== mId && p2Id !== mId) continue;
    }

    // 3. ОГРАНИЧЕННЫЕ (Legend, Heroic, PvP)
    if (RESTRICTED_TYPES.has(mType)) {
        // Либо белый список (выводимые легенды), либо копия родителя
        const isAllowed = LEGEND_WHITELIST.has(mName) || p1Id === mId || p2Id === mId;
        if (!isAllowed) continue;
    }

    let tag = (p1Id === mId || p2Id === mId) ? 'КОПИЯ' : 'ВОЗМОЖНО';

    candidates.push({ child: m, isSecret: false, tag });
    seenIds.add(mId);
  }

  // Сортировка: Секреты -> Копии -> Редкие -> Остальные
  return candidates.sort((a, b) => {
    if (a.isSecret !== b.isSecret) return a.isSecret ? -1 : 1;
    if (a.tag === 'КОПИЯ' && b.tag !== 'КОПИЯ') return -1;
    if (b.tag === 'КОПИЯ' && a.tag !== 'КОПИЯ') return 1;
    return (Number(b.child.odds)||0) - (Number(a.child.odds)||0);
  });
}

// --- 5. REVERSE FINDER ---

export function findParentsFor(
  target: Mutant,
  allMutants: Mutant[]
): ParentPair[] {
  const results: ParentPair[] = [];

  const tName = normalizeName(target.name);
  const tType = (target.type || 'default').toLowerCase();
  const tGenes = getGeneStr(target.genes);
  const tParts = splitGenes(tGenes);

  // 1. Рецепт
  const secretRecipe = secretCombos.filter(s => normalizeName(s.childName) === tName);
  if (secretRecipe.length > 0) {
    secretRecipe.forEach(r => {
        const p1 = allMutants.find(m => normalizeName(m.name) === normalizeName(r.parents[0]));
        const p2 = allMutants.find(m => normalizeName(m.name) === normalizeName(r.parents[1]));
        if (p1 && p2) results.push({ p1, p2, isSecret: true });
    });
    return results;
  }

  // 2. Если тип ЗАПРЕЩЕН -> Сразу нет
  if (FORBIDDEN_TYPES.has(tType)) {
      return [];
  }

  // 3. Проверка на ограничения
  const needsClone = RESTRICTED_TYPES.has(tType) && !LEGEND_WHITELIST.has(tName);

  const pool = allMutants.filter(m => {
      const g = getGeneStr(m.genes);
      // Отфильтровываем тех, кто вообще не может быть родителем (если есть такие правила),
      // но по тз "не выводятся" могут быть родителями.
      return tParts.some(p => g.includes(p));
  }).sort((a, b) => (Number(b.odds)||0) - (Number(a.odds)||0));

  if (needsClone) {
      // Стратегия: Нужен родитель-копия
      const p1 = target;
      for (const p2 of pool) {
          if (areGenesCompatible(tGenes, getGeneStr(p1.genes), getGeneStr(p2.genes))) {
             results.push({ p1, p2, isSecret: false });
          }
      }
  } else {
      // Стратегия: Обычный перебор
      let count = 0;
      outer: for (let i = 0; i < pool.length; i++) {
          for (let j = i; j < pool.length; j++) {
              if (count++ > 2000) break outer;
              const p1 = pool[i];
              const p2 = pool[j];

              if (!areGenesCompatible(tGenes, getGeneStr(p1.genes), getGeneStr(p2.genes))) continue;

              results.push({ p1, p2, isSecret: false });
              if (results.length >= 10) break outer;
          }
      }
  }

  return results;
}
