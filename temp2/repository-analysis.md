# Анализ репозитория Archivist-Library (MGG Hub)

**Дата анализа:** 2026-06-29  
**Статус:** Стабильная версия после git reset

---

## 1. Краткая сводка структуры проекта

**Archivist-Library** — русскоязычная база знаний и инструментарий для игры "Mutants Genetic Gladiators" (MGG). Сайт предоставляет:

### Технологический стек
- **Astro 5** (SSG) + TypeScript
- **Svelte 5** (интерактивные компоненты)
- **Tailwind CSS 4** (через Vite-плагин)
- **XLSX** (парсинг Excel-данных)
- **Sharp** (оптимизация изображений)
- **Vercel Analytics & Speed Insights**

### Основные разделы сайта

| Раздел | URL | Описание |
|--------|-----|----------|
| Мутанты | `/mutants` | Браузер мутантов по тирам (bronze/silver/gold/platinum/normal) |
| Калькулятор статов | `/simulators/stats` | Расчёт статов мутантов |
| Калькулятор эволюции | `/evolution/evotech-calculator` | Расчёт ресурсов для эво |
| Материалы | `/materials` | Расходники, жетоны, бустеры, сферы, здания, зоны |
| Бинго | `/bingo` | Все доступные бинго с мутантами и наградами |
| Симуляторы | `/simulators` | Рулетки, крафт, реактор |
| Топ эволюции | `/top-evo` | Таблица лидеров |

### Структура каталогов

```
src/
├── assets/             # Изображения мутантов (thumbnails)
├── components/         # UI-компоненты
│   ├── breeding/       # Симулятор разведения
│   ├── materials/      # Таблица материалов
│   ├── simulators/     # Все симуляторы
│   │   ├── cash/       # Cash Machine
│   │   ├── craft/      # Крафт лаборатория
│   │   ├── lucky/      # Lucky Slots
│   │   ├── madness/    # Mutants Madness
│   │   └── reactor/    # Реактор/Гача
│   ├── Card.astro
│   ├── CardGrid.astro
│   ├── DataTable.astro
│   ├── Developers.svelte
│   ├── EvoLeaderboard.svelte
│   ├── EvotechCalculator.svelte
│   ├── Footer.svelte
│   ├── MutantCard.svelte
│   ├── MutantModal.svelte
│   ├── MutantsBrowser.svelte
│   ├── MutantsGrid.astro/.svelte
│   └── StatsCalculator.svelte
├── data/               # Игровые данные
│   ├── materials/      # JSON-данные материалов
│   ├── simulators/     # Данные симуляторов
│   │   ├── CRAFT/      # Рецепты крафта (.txt)
│   │   ├── lucky_slots/
│   │   ├── mutants_madness/
│   │   └── reactor/
│   ├── bingos.json     # Данные всех бинго
│   ├── evotech-data.js
│   └── mutant_names.json
├── layouts/
│   └── BaseLayout.astro
├── lib/                # Бизнес-логика
│   ├── breeding/       # Алгоритм разведения
│   ├── stats/          # Калькулятор статов
│   ├── breed-map.ts
│   ├── cash-machine.ts
│   ├── craft-simulator.ts
│   ├── lucky-machine.ts
│   ├── madness-machine.ts
│   ├── mutant-dicts.ts
│   ├── mutant-textures.ts
│   ├── orbing-map.ts
│   ├── reactor-gacha.ts
│   └── secretCombos.ts
├── pages/              # Astro-страницы
│   ├── api/telegram-webhook.ts
│   ├── bingo.astro
│   ├── credits.astro
│   ├── index.astro
│   ├── materials/
│   ├── mutants/
│   ├── simulators/
│   └── evolution/
├── styles/
│   ├── global.css
│   └── text-scaling.css
└── workers/
    └── breeding.worker.ts
```

---

## 2. Ключевые компоненты систем Bingo и Crafting

### 2.1. Система Бинго (Bingo)

#### Файлы

| Файл | Назначение |
|------|------------|
| `src/pages/bingo.astro` | Главная страница бинго (895 строк) |
| `src/lib/bingo-textures.ts` | Получение текстур мутантов и наград (292 строки) |
| `src/data/bingos.json` | Данные всех бинго (массив объектов) |
| `src/lib/mutant-dicts.ts` | Словарь названий (функция `bingoLabel()`) |
| `src/data/mutant_names.json` | Имена мутантов |

#### Архитектура

**Формат данных (`bingos.json`):**
```typescript
interface Bingo {
  title: string;           // Внутреннее название (напр. "morphology_starter")
  id: string;              // Уникальный ID (напр. "Starter")
  mutants: BingoMutant[];  // Массив мутантов в сетке
  rewards: BingoReward[];  // Массив наград (строки + столбцы + финальная)
  columns?: number;        // Количество столбцов (авто если не задано)
}

interface BingoMutant {
  specimenId: string;  // ID мутанта (напр. "Specimen_A_01")
  skin: string;        // Скин или "_any"
}

interface BingoReward {
  name: string;   // ID награды
  amount: number; // Количество
  type: 'entity' | 'hardcurrency' | 'softcurrency';
  skin?: string;
}
```

**Функции отображения (`bingo.astro`):**
- `getBingoLayout()` — вычисляет количество строк/столбцов, заголовки, награды
- `getSubBingos()` — разбивает большие бинго (32 мутанта) на 2 части
- `formatBingoTitle()` — форматирует название через словарь локализации
- `getMutantName()` — получает название мутанта по ID

**Текстуры (`bingo-textures.ts`):**
- `getMutantTexturePath()` — путь к текстуре мутанта с учётом скина
- `getMutantTextureFallbacks()` — цепочка fallback для текстур
- `getRewardTexturePath()` — путь к текстуре награды (монеты, звёзды, сферы, токены)
- `getRewardLabel()` — человекочитаемая надпись награды

**Поддерживаемые типы бинго:**
1. **Starter** — базовое бинго (3x4 сетка с генами A/B/C)
2. **2025/2026 Skins/Mutants/Events** — сезонные бинго (5x5 сетка)
3. **Anniversary** — юбилейное
4. **Cross Mutation** — скрещивание (6x6)
5. **Research 1-11** — исследования (6x6)
6. **Reactor/Legend** — реакторное/легендарное
7. **Bingo Bronze/Silver/Gold/Plat** — по тирам
8. **Zodiac/Zodiac Silver** — зодиакальные
9. **Amazons/Rumble/Heroic** — ивентовые
10. **Event 2019-2024** — исторические ивенты

**Особенности реализации:**
- Полностью статическая страница (SSG), без интерактивности на клиенте
- Вкладки для переключения между бинго (vanilla JS)
- Магические числа `Specimen_FF_98` и `Specimen_FF_99` — заглушки для будущих мутантов
- Награды парсятся по порядку: first N = строки, next M = столбцы, последняя = финальная

---

### 2.2. Система Крафта (Crafting)

#### Файлы

| Файл | Назначение |
|------|------------|
| `src/pages/simulators/craft.astro` | Страница-обёртка (11 строк) |
| `src/components/simulators/craft/CraftSimulator.svelte` | UI симулятора (1400+ строк) |
| `src/lib/craft-simulator.ts` | Бизнес-логика крафта (695 строк) |
| `src/data/simulators/CRAFT/blackhole.txt` | Рецепты Black Hole |
| `src/data/simulators/CRAFT/lab.txt` | Рецепты Supplies Lab |
| `src/data/simulators/CRAFT/orb.txt` | Рецепты Transformatron |
| `src/data/simulators/CRAFT/star.txt` | Рецепты Metal Factory |
| `src/data/simulators/CRAFT/incentreward.txt` | Доп. награды (incentive) |
| `src/data/simulators/CRAFT/craft.py` | Оригинальный Python-скрипт (референс) |

#### Архитектура

**Станции крафта (4 фабрики):**

| ID | Название | Категория | Описание |
|----|----------|-----------|----------|
| `metal` | Metal Factory | `star` | Переплавка звёзд (5 → 1 следующий ранг) |
| `transformatron` | Transformatron | `orb` | Крафт/реролл сфер |
| `supplies` | Supplies Lab | `lab` | Медикаменты, XP, мутостерон |
| `blackhole` | Black Hole Experiment | `blackhole` | Универсальный крафт всех предметов |

**Формат данных (XML-файлы):**
```xml
<Recipe id="star_1" bonusPer1000="200" okHC="0">
  <ingredient regex="Star_Bronze" amount="5" />
  <reward id="Star_Silver" amount="1" odds="800" />
  <reward id="Star_Bronze" amount="1" odds="200" />
</Recipe>
```

**Типы данных:**
```typescript
interface CraftRecipe {
  id: string;
  category: CraftCategory;  // 'blackhole' | 'lab' | 'orb' | 'star'
  bonusPer1000: number;     // Шанс бонусной награды (из 1000)
  okHC: number;             // Шанс HC-награды
  ingredients: CraftIngredient[];
  rewards: CraftReward[];
}

interface CraftIngredient {
  regex: string;  // Паттерн匹配 предметов
  amount: number; // Количество
}

interface CraftReward {
  id: string;    // ID награды
  amount: number; // Количество
  odds: number;  // Вес шанса (из 1000)
}
```

**Ключевые функции (`craft-simulator.ts`):**
- `parseRecipes()` — парсинг XML-рецептов
- `parseIncentives()` — парсинг доп. наград
- `simulateRecipe()` — симуляция N крафтов с учётом шансов
- `calculateIncentiveChance()` — расчёт шанса доп. награды
- `translateItemId()` — перевод ID → русское название
- `getItemTexture()` — путь к текстуре предмета
- `describeIngredientRegex()` — описание regex-паттерна ингредиента
- `getFeaturedRewardIds()` — топ наград станции

**Интерфейс симулятора (`CraftSimulator.svelte`):**
- Выбор станции через табы
- Выбор рецепта из списка (с иконками)
- Ввод количества крафтов (до 1,000,000)
- Выбор активного бонуса (incentive)
- Отображение результатов симуляции:
  - Основные награды (количество, % за крафт, % от дропа)
  - Доп. награды
  - Текстовый лог

**Black Hole — особая логика:**
- Рецепты делятся на "Рецепты" (левая колонка) и "Крафты" (правая)
- Включает pot_pourri_* (мусорные рецепты) и token_sink_*
- Специальные рецепты: `little_rewards_01`, `big_rewards_01`, `big_rewards_02`

**Transformatron — группировка:**
- Рецепты группируются по уровню输出ной сферы (1-4)
- Взаимоисключающая фильтрация дубликатов

---

## 3. Зависимости между системами

```
bingo-textures.ts
├── craft-simulator.ts (getItemTexture, translateItemId)
├── mutant-textures.ts (getMutantTexture, getSkinTexture)
├── search-normalize.ts
└── reactor textures (mutant-textures.json, skin-textures.json)

craft-simulator.ts
├── data/simulators/CRAFT/*.txt (рецепты)
├── mutant_names.json
└── (standalone — не зависит от других либ)
```

---

## 4. Общие observations

1. **Бинго** — чисто статическая страница, все данные в `bingos.json`
2. **Крафт** — интерактивный симулятор с клиентской симуляцией
3. **Обе системы** используют общие функции для текстур и переводов
4. **Нет тестов** в `src/` (только в `node_modules`)
5. **Весь UI на русском языке**
6. **Python-скрипт** `craft.py` — референсная реализация, TypeScript-порт полностью синхронизирован
