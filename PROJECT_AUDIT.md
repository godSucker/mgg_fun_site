# Аудит проекта Archivist-Library

**Дата:** 2026-07-05
**URL:** https://archivist-library.com

---

## 1. Описание проекта

Archivist-Library — русскоязычный фандом-портал для игры Mutants Genetic Gladiators (MGG). Сочетает вики (база знаний по мутантам, скинам, материалам, бинго) и интерактивные симуляторы (разведение, рулетки, реактор/гача, крафт) с математически точными шансами, заимствованными из реальных игровых данных. Все UI-тексты на русском языке.

Архитектура: SSR (Astro на Vercel) + интерактивные «острова» на Svelte 5. Статические данные (JSON, XLSX, XML, TXT) загружаются на этапе сборки; единственное клиентское внешнее подключение — Google Sheets для топа эволюции.

---

## 2. Стек технологий

### Основные зависимости (11 шт.)

| Пакет | Версия | Роль |
|---|---|---|
| astro | ^5.13.5 | Фреймворк (SSR, Vercel-адаптер) |
| svelte | ^5.38.6 | Интерактивные UI-компоненты |
| @astrojs/svelte | ^7.1.0 | Интеграция Astro+Svelte |
| @astrojs/vercel | ^9.0.4 | Деплой на Vercel |
| @sveltejs/vite-plugin-svelte | ^6.1.4 | Vite-плагин для Svelte |
| sharp | ^0.34.5 | Оптимизация изображений |
| xlsx | ^0.18.5 | Парсинг Excel (SheetJS) |
| typescript | ^5.9.2 | Строгая типизация |
| dom-to-image-more | ^3.7.2 | Экспорт DOM в PNG (скриншоты калькулятора) |
| @vercel/analytics | ^1.5.0 | Веб-аналитика |
| @vercel/speed-insights | ^1.2.0 | Мониторинг производительности |

### Dev-зависимости (13 шт.)

| Пакет | Версия | Роль |
|---|---|---|
| @tailwindcss/vite | ^4.1.13 | Tailwind CSS v4 (Vite-плагин) |
| @tailwindcss/postcss | ^4.1.12 | PostCSS-интеграция |
| @tailwindcss/typography | ^0.5.16 | Плагин typography |
| fast-xml-parser | ^5.3.3 | Парсинг XML (breeding settings, craft recipes) |
| vite-plugin-raw | ^1.0.3 | Импорт .txt как строки |
| tsx | ^4.21.0 | Запуск .ts-скриптов |
| axios | ^1.13.2 | HTTP-клиент (утилиты) |
| eslint | ^9.35.0 | Линтер (flat config) |
| eslint-plugin-astro | ^1.3.1 | Правила для .astro |
| eslint-plugin-svelte | ^3.12.3 | Правила для .svelte |
| astro-eslint-parser | ^1.2.2 | Парсер .astro для ESLint |
| svelte-eslint-parser | ^1.3.2 | Парсер .svelte для ESLint |
| typescript-eslint | ^8.44.0 | TS+ESLint интеграция |

### Конфигурация

- **TypeScript**: strict-режим (extends `astro/tsconfigs/strict`)
- **Tailwind v4**: без tailwind.config.js, конфигурация через CSS-директивы
- **ESLint**: flat config, запрет `set-html` в Astro, `no-reactive-reassign` в Svelte
- **Prettier**: без точек запятой, одинарные кавычки, 100 символов
- **Сборка**: Vite через Astro, алиас `@` → `./src`

---

## 3. Карта сайта (роутинг)

### Корневые страницы (7)

| URL | Файл | Назначение |
|---|---|---|
| `/` | index.astro | Главная — навигационные карточки к разделам |
| `/404` | 404.astro | Страница ошибки (стиль glitch) |
| `/credits` | credits.astro | Команда разработчиков |
| `/bingo` | bingo.astro | Бинго-доски (табличный просмотр с вкладками) |
| `/top-evo` | top-evo.astro | Таблица лидеров эволюции (Google Sheets) |
| `/tier-list` | tier-list/index.astro | PvP tier-лист мутантов |
| `/evotech-calculator` | evotech-calculator.astro | Legacy-страница (дубликат) |

### Мутанты (8 файлов)

| URL | Файл | Назначение |
|---|---|---|
| `/mutants` | mutants/index.astro | Полный браузер мутантов и скинов |
| `/mutants/[tier]` | mutants/[tier].astro | Динамический фильтр по тиру |
| `/mutants/normal` | mutants/normal.astro | Фильтр normal-тира |
| `/mutants/bronze` | mutants/bronze.astro | Meta-редирект → /mutants/ |
| `/mutants/silver` | mutants/silver.astro | Meta-редирект → /mutants/ |
| `/mutants/gold` | mutants/gold.astro | Meta-редирект → /mutants/ |
| `/mutants/platinum` | mutants/platinum.astro | Meta-редирект → /mutants/ |

### Материалы (4 файла)

| URL | Файл | Назначение |
|---|---|---|
| `/materials` | materials/index.astro | Сферы, бустеры, материалы, здания, зоны (табы) |
| `/materials/orbs` | materials/orbs.astro | Только сферы |
| `/materials/charms` | materials/charms.astro | Только бустеры |
| `/materials/material` | materials/material.astro | Только материалы |

### Симуляторы (10 файлов)

| URL | Файл | Назначение |
|---|---|---|
| `/simulators` | simulators/index.astro | Каталог симуляторов |
| `/simulators/breeding` | simulators/breeding.astro | Симулятор скрещивания |
| `/simulators/stats` | simulators/stats.astro | Калькулятор статов мутанта |
| `/simulators/craft` | simulators/craft.astro | Симулятор крафта |
| `/simulators/reactor` | simulators/reactor/index.astro | Список всех генераторов |
| `/simulators/reactor/[id]` | simulators/reactor/[gachaId].astro | Конкретный генератор (динамический) |
| `/simulators/roulette` | simulators/roulette/index.astro | Список рулеток |
| `/simulators/roulette/cash` | simulators/roulette/cash.astro | Cash Machine |
| `/simulators/roulette/lucky` | simulators/roulette/lucky.astro | Lucky Slots |
| `/simulators/roulette/madness` | simulators/roulette/madness.astro | Mutants Madness |

### Эволюция (1)

| URL | Файл | Назначение |
|---|---|---|
| `/evolution/evotech-calculator` | evolution/evotech-calculator.astro | Калькулятор ресурсов эволюции |

### API (1)

| URL | Файл | Метод | Назначение |
|---|---|---|---|
| `/api/telegram-webhook` | api/telegram-webhook.ts | POST | Приём файлов от Telegram-бота, парсинг tier-данных, обновление mutants.json через GitHub API |

---

## 4. Архитектура и компоненты

### 4.1. Слой макетов

Единственный макет: `BaseLayout.astro`. Включает:
- Sticky-хедер с логотипом и навигацией
- Мобильное выпадающее меню (hamburger)
- Фоновое изображение (CDN, blur + saturation фильтры)
- Тёмная тема (#0d1117 фон, #c9d1d9 текст)
- Футер с копирайтом
- Vercel Analytics + Speed Insights

### 4.2. Svelte-компоненты (16 шт.)

| Компонент | Файл | Строк | Назначение |
|---|---|---|---|
| MutantsBrowser | MutantsBrowser.svelte | ~800+ | Главный браузер: поиск, фильтры, грид |
| MutantsGrid | MutantsGrid.astro | — | Статичная сетка мутантов |
| MutantCard | MutantCard.svelte | — | Карточка мутанта в сете |
| MutantModal | MutantModal.svelte | — | Модальное окно с деталями и статами |
| BreedingUI | breeding/BreedingUI.svelte | — | Симулятор скрещивания |
| ReactorSimulator | reactor/ReactorSimulator.svelte | — | Симулятор реактора/гача |
| CashMachineSimulator | cash/CashMachineSimulator.svelte | — | Рулетка Cash Machine |
| LuckyMachineSimulator | lucky/LuckyMachineSimulator.svelte | — | Рулетка Lucky Slots |
| MutantsMadnessSimulator | madness/MutantsMadnessSimulator.svelte | — | Рулетка Mutants Madness |
| CraftSimulator | craft/CraftSimulator.svelte | — | Симулятор крафта |
| StatsCalculator | StatsCalculator.svelte | ~1800+ | Калькулятор статов (орбы, звёзды, скоринг) |
| EvotechCalculator | EvotechCalculator.svelte | 343 | Калькулятор ресурсов эволюции |
| EvoLeaderboard | EvoLeaderboard.svelte | 348 | Таблица лидеров с поиском |
| Developers | Developers.svelte | 335 | Карточки команды |
| TierList | TierList.svelte | 208 | Tier-лист с подразделами |
| Footer | Footer.svelte | 4 | Футер |

### 4.3. Astro-компоненты (5)

| Компонент | Роль |
|---|---|
| Card.astro | Навигационная карточка |
| CardGrid.astro | Сетка карточек |
| DataTable.astro | Универсальная таблица |
| MaterialsTable.astro | Таблица материалов с иконками источников |
| MutantsGrid.astro | Сетка мутантов (статичная часть) |

### 4.4. Управление состоянием

Проект **не использует** глобальные stores или context API Svelte. Вся реактивность — компонентные Runes:

- `$state()` — мутабельное UI-состояние (поиск, выбранные элементы, модалки)
- `$derived()` — вычисляемые списки (фильтрованные мутанты, рассчитанные статы)
- `$effect()` — побочные эффекты (сброс страницы, запуск расчётов)
- `$props()` — передача данных от родителя

Межкомпонентное взаимодействие: prop drilling + callback-пропсы (onSelect, onClose).

### 4.5. Поток данных

1. **Статические данные** (сборка): JSON/TXT/XLSX файлы из `src/data/` импортируются напрямую в компоненты
2. **CDN**: все текстуры мутантов, орбов, генов — с `cdn.archivist-library.com`
3. **Клиентский fetch**: только Google Sheets CSV (топ эволюции, кэш 5 мин)
4. **API endpoint**: `/api/telegram-webhook` — приём данных от Telegram-бота

---

## 5. Ключевые алгоритмы и нестандартные решения

### 5.1. Симулятор скрещивания (breeding/)

Самый сложный алгоритмический модуль, разбит на 5 файлов:

**core-algorithm.ts** — комбинаторика генов:
- Каждый родитель вносит гены из своего пуля (single=1 аллель, mono=2 одинаковых, hybrid=2 разных)
- Декартово произведение пулов родителей → все комбинации потомков
- Правило редукции: при одинаковых генах от обоих родителей возможны и Mono (AA), и Single (A)

**engine.ts** — вероятностная модель на XML-весах:
- Парсит `settings.xml` с весами гибридов (типы скрещиваний 1×1, 1×2, 2×1, 2×2)
- Каждый тип определяет веса для: одинаковые пары (AA), разные пары (AB), однобуквенные дети (A)
- `predict()` возвращает нормализованные вероятности

**type-filters.ts** — правила размножения:
- 9 неразмножаемых типов: secret, recipe, videogame, zodiac, event, special, gacha, community, seasonal, boss
- 3 типа-наследника: heroic, hero, pvp — только если один родитель — этот мутант
- 20+ легендарных мутантов с белым списком (исключение из правила наследника)

**breeding.ts** — оркестратор:
1. Проверяет секретные рецепты (28 шт. из `secretCombos.ts`)
2. Генерирует комбинации генов
3. Сопоставляет с мутантами
4. Фильтрует по типовым правилам
5. Сортирует: рецепты → копии → по шансу

### 5.2. Симуляторы рулеток (cash, lucky, madness)

Три рулетки с общей архитектурой:
- Взвешенный случайный выбор через кумулятивные веса
- Асинхронное выполнение пакетами (2000 спинов за тик) с `AbortSignal`
- Кольцевой буфер истории

Особенности:
- **Lucky Slots**: механика бесплатного спина (при выпадении free-spin очередь растёт)
- **Mutants Madness**: система уровней исследований (research level блокирует награды до определённого уровня)

### 5.3. Симулятор крафта (craft-simulator.ts)

Самый复杂的 парсер данных:
- Сырые `.txt` файлы содержат XML-подобные блоки `<Recipe>`
- Регулярные выражения для сопоставления ингредиентов (например, `orb_(basic|special)_.*`)
- 80+ маппингов ID → русские названия (звёзды, орбы, материалы, токены, бустеры)
- 4 объекта: Металлзавод, Трансформатрон, Лаборатория, Чёрная Дыра

### 5.4. Калькулятор статов (stats/)

**unified-calculator.ts** — единый источник правды:
- Множители звёзд: normal=1.0, bronze=1.1, silver=1.3, gold=1.75, platinum=2.0
- Формула масштабирования: `scale = level/10 + 0.9`
- ATK1 обновляет базу на уровне 10; ATK2 — на 15
- Способность переключается с abilityPct1 на abilityPct2 на уровне 25

**speed-sphere-table.ts** — нетривиальная таблица:
- Игра использует нерегулярную lookup-таблицу (не процентную математику) для бонусов скорости
- Покрывает базовые скорости от 3.13 до 12.66

### 5.5. Нормализация поиска

`search-normalize.ts` реализует:
- Латиница → кириллица (транслитерация)
- Удаление спецсимволов
- Исправление артефактов кодировки (например, знак евро → кириллическое «Е»)
- Нечёткое сопоставление имён мутантов

### 5.6. Система текстур

- `texture-cdn.ts` — обёртка добавляет CDN-префикс ко всем путям
- `mutant-textures.ts` — канонизация specimen ID и поиск текстур мутантов/скинов
- `mutant-image-fallback.ts` — цепочка fallback: webp → jpg, глобальный кэш существования
- `bingo-textures.ts` — резолвинг текстур наград бинго с цепочкой fallback

### 5.7. Орб-карта (orbing-map.ts)

1239 строк — таблица соответствий ID мутантов → раскладки слотов орбов. Largest lookup table в проекте.

---

## 6. Слой данных

### Основные JSON-файлы

| Файл | Содержимое |
|---|---|
| mutants/mutants.json | Полная БД мутантов (id, имя, гены, тип, базовые статы, звёзды, способности) |
| mutants/skins.json | Скины с данными звёзд, изображениями, объединёнными статами |
| bingos.json | Определения карточек бинго |
| mutant_names.json | Глобальный маппинг specimen ID → отображаемое имя |
| materials/*.json | Сферы, бустеры, материалы, здания, зоны, источники |
| simulators/reactor/gacha.json | Пулы генераторов (шансы, стоимость, награды за завершение) |
| simulators/*/machine.json | Таблицы наград рулеток |
| evotech-data.js | Таблица стоимостей эволюции |

### Текстовые/XML-файлы

| Файл | Содержимое |
|---|---|
| breeding/settings.xml | Веса гибридов для предсказания скрещивания |
| simulators/CRAFT/*.txt | XML-рецепты крафта (orb, lab, star, blackhole) |
| localisation_ru.txt | Русская локализация |
| localisation_en.txt | Английская локализация |
| base.txt | Базовые игровые данные |
| mut_orbs.txt | Сырые данные об орбах |

---

## 7. Стилизация

- **Глобальные стили**: `src/styles/global.css` (Tailwind v4 + кастомные CSS-переменные)
- **Тёмная тема**: #0d1117 фон, #c9d1d9 текст, полупрозрачные стеклянные эффекты
- **Шрифт**: TT Supermolot Neue (woff2, прелоад)
- **Мобильность**: mobile-first, breakpoints: <768px, 768-1023px, 1024px+, 1921px+ (2K/4K)
- **CDN**: все ассеты через `cdn.archivist-library.com`

---

## 8. Итоговая сводка

| Метрика | Значение |
|---|---|
| Всего страниц | 29 .astro + 1 API endpoint |
| Svelte-компонентов | 16 |
| Astro-компонентов | 5 |
| TypeScript-модулей | 28 (.ts) + 1 (.js) |
| JSON-файлов данных | 19 |
| Динамических маршрутов | 2 (`[tier]`, `[gachaId]`) |
| Секретных рецептов скрещивания | 28 |
| Уникальных пакетов | 24 |
| Язык интерфейса | Русский (100%) |
| Внешние зависимости (runtime) | Google Sheets (CSV), CDN (изображения), Qwen API (AI) |
