/*
 * Definitions for secret breeding recipes. Each secret mutant listed here can only be bred
 * from a specific pair of parents. If you know the exact mutant names for the parents,
 * update the `parents` array with those names. The simulator will display these recipes
 * separately from the general breeding engine.
 */

export interface SecretCombo {
  /** The display name of the secret mutant child. */
  childName: string;
  /**
   * Names of the two parent mutants required to breed this secret mutant. These
   * must correspond to the `name` fields in your mutants dataset (e.g. src/data/mutants/normal.json).
   */
  parents: [string, string];
}

/**
 * Secret breeding recipes. Fill in the parent names exactly as they appear in
 * your data files. Any names left as placeholders will be ignored by the UI
 * until you provide valid values.
 */
export const secretCombos: SecretCombo[] = [
  // Страхолюдочка (Secret Recipe)
  { childName: "Страхолюдочка", parents: ["Зомби", "Робот"] },
  // Буши: два возможных рецепта
  { childName: "Буши", parents: ["Зомборг", "Ниндзябот"] },
  { childName: "Буши", parents: ["Прилипала", "Марсианский Воин"] },
  // Капитан Костьмилягу (Captain Bag O' Bones)
  { childName: "Капитан Костьмилягу", parents: ["Драконежить", "Кошмарыцарь Севера"] },
  { childName: "Капитан Костьмилягу", parents: ["Капитан Гаечный Ключ", "Темновзор"] },
  // Капитан Гаечный Ключ (Captain Wrenchfury)
  { childName: "Капитан Гаечный Ключ", parents: ["Буши", "Страхолюдочка"] },
  { childName: "Капитан Гаечный Ключ", parents: ["Андроид", "Марсианский Воин"] },
  // Мантидроид (Mantidruid)
  { childName: "Мантидроид", parents: ["Гор", "Перехватчица"] },
  { childName: "Мантидроид", parents: ["Ракшаса", "Ниндзябот"] },
  // Пожиратель (The Devourers)
  { childName: "Пожиратель", parents: ["Зомборг", "Опустошитель"] },
  { childName: "Пожиратель", parents: ["Астромаг", "Страхолюдочка"] },
  // Темновзор (The Darkseer)
  { childName: "Темновзор", parents: ["Капитан Гаечный Ключ", "Буши"] },
  { childName: "Темновзор", parents: ["Мрачная Жница", "Бог Машин"] },
  // Перехватчица (Interceptrix)
  { childName: "Перехватчица", parents: ["Страхолюдочка", "Капитан Костьмилягу"] },
  { childName: "Перехватчица", parents: ["Бог Машин", "Гэндолфус"] },
  // Киберслизень (CyberSlug)
  { childName: "Киберслизень", parents: ["Ктулху", "Колосс"] },
  { childName: "Киберслизень", parents: ["Темновзор", "Коммодор Акула"] },
  // Коммодор Акула (Commodore Le Shark)
  { childName: "Коммодор Акула", parents: ["Королева Банши", "Марсианский Воин"] },
  { childName: "Коммодор Акула", parents: ["Пожиратель", "Капитан Костьмилягу"] },
];