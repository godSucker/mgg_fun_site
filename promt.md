# ЗАДАЧА: Рефакторинг парсера `sync-mutants.ts`

# КОНТЕКСТ
Мы работаем над парсером игровых данных. Текущий скрипт `sync-mutants.ts` парсит XML файлы мутантов и собирает их в JSON.
Необходимо жестко зафиксировать логику парсинга новых полей и формат выходного JSON.

# ИНСТРУКЦИИ
1. Проанализируй текущий файл `sync-mutants.ts`, чтобы понять существующую логику расчета уровней (lvl1 -> lvl30) и генерации путей к картинкам.
2. Измени (или перепиши) логику маппинга XML-тегов в свойства объекта, строго следуя правилам ниже.
3. Формат выходного JSON должен **байт-в-байт** совпадать с предоставленным шаблоном.

---

# 1. ПРАВИЛА ПАРСИНГА XML (SOURCE MAPPING)

Парсим элементы `<EntityDescriptor>` где `category="specimen"`.

| Поле JSON | Источник в XML (Tag key или Attribute) | Примечание/Логика |
| :--- | :--- | :--- |
| `id` | Attr `id` в `<EntityDescriptor>` | Привести к lowercase (напр. "Specimen_CB_04" -> "specimen_cb_04") |
| `genes` | Tag `dna` | Значение "CB" нужно разбить на массив `["C", "B"]` |
| `hp` (base) | Tag `lifePoint` | Базовое значение |
| `spd` (base) | Tag `spX100` | Обрати внимание: в XML "240", в JSON "4". Проверь формулу конвертации в текущем коде (вероятно деление). |
| `atk1_base` | Tag `atk1` | Базовый урон атаки 1 |
| `atk2_base` | Tag `atk2` | Базовый урон атаки 2 |
| `atk1p_base`| Tag `atk1p` | Усиленная атака 1 |
| `atk2p_base`| Tag `atk2p` | Усиленная атака 2 |
| `chance` | Tag `odds` | Шанс выпадения |
| `incub_time`| Tag `incubMin` | Время инкубации (в минутах) |
| `type` | Tag `type` | Напр. "LEGEND" -> "legend" (проверь регистр в JSON) |
| `bank` | Tag `bank` | Серебро |
| `abilities` | Tag `abilities` | Парсить строку вида `1:ability_retaliate;2:...`. Извлекать имена абилок. |
| `abilityPct1`| Tag `abilityPct1` | Процент для первой абилки (если применимо) |
| `abilityPct2`| Tag `abilityPct2` | Процент для второй абилки |
| `orbs` | Tag `orbSlots` | Строка "n;n;s". Считать кол-во: `normal` (n), `special` (s). |

**ИГНОРИРОВАТЬ ТЕГИ:**
`State`, `specimen` (boolean), `unlockAttack`, `recipes`, `changePriceXX`, `CustomScript`, `Script`, `Param`.

---

# 2. ЛОКАЛИЗАЦИЯ (LOCALIZATION MAPPING)

Данные берутся из файлов локализации (формат: `KEY;VALUE`).

| Поле JSON | Ключ в локализации (Pattern) | Пример |
| :--- | :--- | :--- |
| `name` | `{ID}` (как есть) | `Specimen_AB_14` -> "Телеведущий" |
| `name_attack1` | `{ID}_attack_1` | `Specimen_AB_14_attack_1` |
| `name_attack2` | `{ID}_attack_2` | `Specimen_AB_14_attack_2` |
| `name_attack3` | (Если есть, иначе пустая строка) | |
| `name_lore` | `caption_{lowercase_id}` | `caption_specimen_ab_14` |

---

# 3. ШАБЛОН JSON (TARGET FORMAT)

Твой код должен генерировать структуру, ИДЕНТИЧНУЮ этому примеру. Обрати внимание на вложенность `base_stats` и расчетные поля `lvl1`/`lvl30` (используй существующие формулы в коде для их расчета на основе базовых статов из XML).

```json
{
  "id": "specimen_a_01",
  "name": "Робот",
  "genes": ["A"],
  "base_stats": {
    "lvl1": {
      "hp": 1819,   // Рассчитано из lifePoint
      "atk1": 274,  // Рассчитано из atk1
      "atk2": 549,  // Рассчитано из atk2
      "spd": 4,     // Рассчитано из spX100
      "atk1_gene": "a", // Взять из генов
      "atk1_AOE": true  // Определить логику (если есть)
    },
    "lvl30": {
      "hp": 7094,   // Скейлинг по уровню (см. существующий код)
      "atk1": 1611,
      "atk2": 3218,
      "spd": 4,
      "atk1_gene": "a",
      "atk1_AOE": true,
      "atk2_gene": "neutro",
      "atk2_AOE": false
    },
    "atk1_base": 274,      // Raw value (или scaled lvl1?) УТОЧНИТЬ в коде
    "atk2_base": 549,
    "atk1p_base": 413.077, // Raw value from atk1p
    "atk2p_base": 825.128  // Raw value from atk2p
  },
  "abilities": [
    {
      "name": "ability_shield",
      "pct": 20,
      "value_atk1_lvl1": 55,  // Расчетные значения
      "value_atk2_lvl1": 110,
      "value_atk1_lvl30": 322,
      "value_atk2_lvl30": 644
    }
  ],
  "image": [
    "textures_by_mutant/a_01/A_01_normal.webp",
    "textures_by_mutant/a_01/specimen_a_01_normal.webp",
    "textures_by_mutant/a_01/larva_a_01.webp"
  ],
  "type": "default",
  "incub_time": 5,
  "orbs": {
    "normal": 1,
    "special": 1
  },
  "bingo": ["Starter", "reactor"], // Сохранить логику бинго если есть
  "chance": 40,
  "tier": "un-tired", // Сохранить логику тиров
  "name_attack1": "Ракеты «Антимутант»",
  "name_attack2": "Огнемет",
  "name_attack3": "",
  "name_lore": "Робот — идеальная боевая машина..."
}
