const LATIN_TO_CYRILLIC = {
  "a": "а",
  "b": "в",
  "c": "с",
  "d": "д",
  "e": "е",
  "f": "ф",
  "g": "г",
  "h": "х",
  "i": "и",
  "j": "й",
  "k": "к",
  "l": "л",
  "m": "м",
  "n": "н",
  "o": "о",
  "p": "р",
  "q": "к",
  "r": "р",
  "s": "с",
  "t": "т",
  "u": "у",
  "v": "в",
  "w": "в",
  "x": "х",
  "y": "у",
  "z": "з"
};
function normalizeSearch(text) {
  if (!text) return "";
  let normalized = text.toLowerCase().replace(/0/g, "о").replace(/€/g, "е").replace(/‚/g, "г").replace(/ƒ/g, "ф").replace(/†/g, "а").replace(/‡/g, "с").replace(/‰/g, "е").replace(/Љ/g, "л").replace(/Њ/g, "н").replace(/Ћ/g, "т").replace(/Ќ/g, "к").replace(/Ў/g, "у").replace(/Џ/g, "ч").replace(/ђ/g, "д").replace(/ѓ/g, "г").replace(/ѕ/g, "п").replace(/ј/g, "я").replace(/і/g, "и").replace(/ї/g, "и").replace(/љ/g, "л").replace(/њ/g, "н").replace(/ћ/g, "м").replace(/ќ/g, "о").replace(/ў/g, "у").replace(/џ/g, "ж").replace(/Ѓ/g, "г").replace(/Ѕ/g, "з").replace(/Ј/g, "й").replace(/І/g, "и").replace(/Ї/g, "и").replace(/Ў/g, "у").replace(/Џ/g, "ч").replace(/[«»"''„"']/g, "").replace(/[.,;:!?$]/g, "").replace(/[()\[\]{}]/g, "").replace(/[-–—/\\]/g, "");
  normalized = normalized.replace(/[^\w\u0400-\u04FF]/g, "");
  let result = "";
  for (const ch of normalized) {
    result += LATIN_TO_CYRILLIC[ch] || ch;
  }
  return result;
}

export { normalizeSearch as n };
