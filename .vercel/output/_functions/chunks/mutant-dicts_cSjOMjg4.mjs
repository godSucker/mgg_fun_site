const GENE_RU = {
  A: "Киборг",
  B: "Нежить",
  C: "Рубака",
  D: "Зверь",
  E: "Галактик",
  F: "Мифик"
};
const BINGO_RU = {
  hp: "ХП",
  health: "ХП",
  atk: "Атака",
  attack: "Атака",
  attack1: "Атака 1",
  attack2: "Атака 2",
  spd: "Скорость",
  speed: "Скорость",
  credit: "Кредиты",
  credits: "Кредиты",
  xp: "Опыт",
  gene_a: "Киборг",
  gene_b: "Нежить",
  gene_c: "Рубака",
  gene_d: "Зверь",
  gene_e: "Галактик",
  gene_f: "Мифик",
  "2025_events": "Ивенты 2025",
  "2025_mutants": "Мутанты 2025",
  "2025_skins": "Скины 2025",
  "2026_events": "Ивенты 2026",
  "2026_mutants": "Мутанты 2026",
  "2026_skins": "Скины 2026",
  amazons: "Амазонки",
  anniversary_25: "Годовщина",
  bingo_bronze: "Бронзовое разведение",
  bingo_silver: "Серебряное разведение",
  bingo_gold: "Золотое разведение",
  bingo_plat: "Платиновое разведение",
  cross_mutation: "Кросс-мутация",
  event_2019: "Ивенты 2019",
  event_2020: "Ивенты 2020",
  event_2021: "Ивенты 2021",
  event_2022: "Ивенты 2022",
  event_2024: "Ивенты 2024",
  events: "Праздники",
  heroic: "Герои",
  legend: "Легенды",
  reactor: "Реактор",
  research_1: "Исследование 1",
  research_2: "Исследование 2",
  research_3: "Исследование 3",
  research_4: "Исследование 4",
  research_5: "Исследование 5",
  research_6: "Исследование 6",
  research_7: "Исследование 7",
  research_8: "Исследование 8",
  research_9: "Исследование 9",
  research_10: "Исследование 10",
  research_11: "Исследование 11",
  rumble: "Грохот",
  Starter: "Базовое бинго",
  starter_plat: "Платиновое бинго",
  zodiac: "Зодиаки",
  zodiac_silver: "Серебряные зодиаки"
};
const TYPE_RU = {
  Pvp: "ПВП",
  Special: "Особые",
  SPECIAL: "Особые",
  special: "Особые",
  ZODIAC: "Зодиаки",
  GACHA: "Реактор",
  gacha: "Реактор",
  COMMUNITY: "Сообщество",
  default: "Обычные/Начальные",
  HEROIC: "Герои",
  LEGEND: "Легенды",
  RECIPE: "Секреты",
  SEASONAL: "Ивенты",
  VIDEOGAME: "Видеоигры"
};
function geneLabel(code) {
  if (!code) return "";
  return code.toUpperCase().split("").map((ch) => GENE_RU[ch] || ch).join("+");
}
function bingoLabel(key) {
  if (!key) return "";
  const lower = key.toLowerCase();
  return BINGO_RU[lower] || BINGO_RU[key] || key;
}

export { TYPE_RU as T, bingoLabel as b, geneLabel as g };
