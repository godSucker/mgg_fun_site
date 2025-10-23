<script>
  import { onMount } from 'svelte';
  // Import the mutant data for each star tier. These JSON files are placed
  // at the repository root and contain additional fields (atk1_base, atk2_base,
  // atk1p_base, atk2p_base) used to calculate attacks on arbitrary levels.
  import normalData from '@/data/mutants/normal.json';
  import bronzeData from '@/data/mutants/bronze.json';
  import silverData from '@/data/mutants/silver.json';
  import goldData from '@/data/mutants/gold.json';
  import platinumData from '@/data/mutants/platinum.json';
<<<<<<< HEAD

  // Import all orbs. Each orb object has `id`, `name`, `percent` and
  // `description`. The `id` helps build the path to its image (e.g. `/orbs/${id}.png`).
  import allOrbs from '@/data/materials/orbs.json';

  // Group the datasets by star level for easy lookup (0=normal, 1=bronze, etc).
  const starDatasets = [normalData, bronzeData, silverData, goldData, platinumData];

  // Gene filter options and corresponding icons. `all` resets the filter.
  const geneFilters = [
    { key: 'all', icon: '/genes/gene_all.png', title: 'All Genes' },
    { key: 'A', icon: '/genes/icon_gene_a.png', title: 'Galactic' },
    { key: 'B', icon: '/genes/icon_gene_b.png', title: 'Zoomorph' },
    { key: 'C', icon: '/genes/icon_gene_c.png', title: 'Cyber' },
    { key: 'D', icon: '/genes/icon_gene_d.png', title: 'Saber' },
    { key: 'E', icon: '/genes/icon_gene_e.png', title: 'Necro' },
    { key: 'F', icon: '/genes/icon_gene_f.png', title: 'Mythic' },
  ];

  // Separate orbs into basic and special categories. We inspect the ID
  // to determine the category. Adjust these rules if naming changes.
  const basicOrbs = allOrbs.filter((o) => o.id.toLowerCase().includes('basic'));
  const specialOrbs = allOrbs.filter((o) => o.id.toLowerCase().includes('special'));

  // State variables for the UI.
  let selectedGene = 'all';
  let searchTerm = '';
  let selectedMutant = null;
  let starLevel = 0;
  let levelValue = 1;
  // Basic orb slots: heroics use four, others use three. All start empty (null).
  let basicSlots = [null, null, null, null];
  // Special orb slot starts empty.
  let specialSlot = null;
  // Track which orb menu is open (index of slot or 'special'), null if none.
  let openOrbMenu = null;

  /**
   * Compute the list of candidate mutants based on the current gene
   * filter and search term.  We search within the normal dataset so we
   * always show the same names independent of star level.  The filter
   * is case-insensitive and matches any gene among the mutant's genes.
   */
  $: candidateMutants = (() => {
    let list = normalData;
    if (selectedGene !== 'all') {
      const g = selectedGene.toUpperCase();
      list = list.filter((m) => Array.isArray(m.genes) && m.genes.some((v) => v.toUpperCase().includes(g)));
    }
    if (searchTerm.trim()) {
      const lc = searchTerm.trim().toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(lc));
    }
    // sort by name for convenience
    return list.sort((a, b) => a.name.localeCompare(b.name));
  })();

  /**
   * When the user selects a mutant, we reset orbs and set the
   * selection.  Star and level remain unchanged so you can quickly
   * compare different variants.
   */
      function selectMutant(mutant) {
    selectedMutant = mutant;
    // Reset orbs when changing mutant
    basicSlots = [null, null, null, null];
    specialSlot = null;
    openOrbMenu = null;
  }

  /**
   * Helper to get the dataset entry for the currently selected mutant
   * at the chosen star level.  Returns undefined if the mutant
   * doesn't exist in that dataset (which should never happen).
   */
  function getCurrentBase() {
    if (!selectedMutant) return undefined;
    const dataset = starDatasets[starLevel] || normalData;
    return dataset.find((m) => m.id === selectedMutant.id);
  }

  /**
   * Compute the final stats for the currently selected mutant.  This
   * uses the level slider and applies any orb bonuses.  The rules for
   * attacks follow the instructions: attack1 uses `atk1_base` until
   * level 10, then switches to `atk1p_base`.  Attack2 uses
   * `atk2_base` until level 15, then switches to `atk2p_base`.  Both
   * are scaled by (level/10 + 0.9).  HP always scales from the base
   * level1 value.  Speed is constant.  Orb percent bonuses are
   * applied afterwards: HP orbs modify HP, Attack orbs modify both
   * attacks, and Speed orbs increase the speed by the percent.
   */
  // Normalize an image path to ensure it is served from the site root.
  // Mutant image paths in the data are relative (e.g. `textures_by_mutant/a_01/A_01_normal.png`).
  // Prepending a leading slash ensures Astro serves them from the `/public` folder.
  function normalizeImage(path) {
    if (!path) return '';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function computeStats() {
    const baseEntry = getCurrentBase();
    if (!baseEntry) return null;
    const lvl = levelValue;
    // HP calculation
    let hp = baseEntry.base_stats.lvl1.hp * (lvl / 10 + 0.9);
        // Attack1 base selection. If custom base fields are missing (e.g. in legacy JSON), derive them from level 1/30 stats.
        const atk1BaseLvl1 = baseEntry.base_stats.atk1_base ?? baseEntry.base_stats.lvl1?.atk1 ?? 0;
        // atk1p_base corresponds to the boosted attack at level 10+, derived from level 30 stats when missing
        const atk1pBase = baseEntry.base_stats.atk1p_base ?? (baseEntry.base_stats?.lvl30?.atk1
          ? baseEntry.base_stats.lvl30.atk1 / 3.9
          : atk1BaseLvl1);
        const a1base = lvl < 10 ? atk1BaseLvl1 : atk1pBase;
        let atk1 = a1base * (lvl / 10 + 0.9);
        // Attack2 base selection. If custom base fields are missing (e.g. in legacy JSON), derive them from level 1/30 stats.
        const atk2BaseLvl1 = baseEntry.base_stats.atk2_base ?? baseEntry.base_stats.lvl1?.atk2 ?? 0;
        const atk2pBase = baseEntry.base_stats.atk2p_base ?? (baseEntry.base_stats?.lvl30?.atk2
          ? baseEntry.base_stats.lvl30.atk2 / 3.9
          : atk2BaseLvl1);
        const a2base = lvl < 15 ? atk2BaseLvl1 : atk2pBase;
        let atk2 = a2base * (lvl / 10 + 0.9);
    // Speed is constant
    let spd = baseEntry.base_stats.lvl1.spd;
    // Apply orb bonuses
    const applyOrb = (orb) => {
      if (!orb) return;
      const pct = parseFloat(orb.percent);
      const nameLower = orb.name.toLowerCase();
      // Attack orbs
      if (nameLower.includes('атака') || nameLower.includes('attack')) {
        atk1 *= 1 + pct / 100;
        atk2 *= 1 + pct / 100;
      } else if (nameLower.includes('hp') || nameLower.includes('здоров')) {
        hp *= 1 + pct / 100;
      } else if (nameLower.includes('speed') || nameLower.includes('скорость')) {
        spd += pct;
      }
    };
    // Apply basic orbs
    basicSlots.forEach(o => applyOrb(o));
    // Apply special orb
    applyOrb(specialSlot);
    return {
      hp: Math.round(hp),
      atk1: Math.round(atk1),
      atk2: Math.round(atk2),
      spd: spd,
      name: baseEntry.name,
      image: baseEntry.image,
      genes: baseEntry.genes,
      type: baseEntry.type,
      bingo: baseEntry.bingo,
      abilities: baseEntry.abilities,
      name_attack1: baseEntry.name_attack1,
      name_attack2: baseEntry.name_attack2,
      name_attack3: baseEntry.name_attack3
    };
  }

  $: currentStats = computeStats();

  // Determine how many basic slots to show based on mutant type.
  $: basicSlotCount = (() => {
    if (!selectedMutant) return 0;
    // HEROIC mutants get 4 basic slots, all others 3
    return selectedMutant.type && selectedMutant.type.toUpperCase() === 'HEROIC' ? 4 : 3;
  })();
=======
  import allOrbs from '@/data/materials/orbs.json';
  import { ABILITY_RU, TYPE_RU } from '@/lib/mutant-dicts';

  type RawMutant = (typeof normalData)[number];
  type RawAbility = NonNullable<RawMutant['abilities']>[number];
  type OrbEntry = (typeof allOrbs)[number];

  type AbilityState = {
    name: string;
    normalized: string;
    pct: number;
    basePct: number;
    orbBonus: number;
    addedByOrb: boolean;
  };

  const STAR_DATASETS = [
    { level: 0, label: 'Обычный', icon: '/stars/no_stars.png', data: normalData },
    { level: 1, label: 'Бронза', icon: '/stars/star_bronze.png', data: bronzeData },
    { level: 2, label: 'Серебро', icon: '/stars/star_silver.png', data: silverData },
    { level: 3, label: 'Золото', icon: '/stars/star_gold.png', data: goldData },
    { level: 4, label: 'Платина', icon: '/stars/star_platinum.png', data: platinumData },
  ] as const;

  function canonicalId(id: string | undefined) {
    if (!id) return '';
    return id.replace(/_(bronze|silver|gold|platinum)$/i, '');
  }

  function buildLookup(dataset: readonly RawMutant[]) {
    const map = new Map<string, RawMutant>();
    dataset.forEach((entry) => {
      map.set(canonicalId(entry.id), entry);
    });
    return map;
  }

  const starLookups = STAR_DATASETS.map(({ data }) => buildLookup(data));
  const starOptions = STAR_DATASETS.map(({ level, label, icon }) => ({ level, label, icon }));

  const GENE_ICONS: Record<string, string> = {
    C: '/genes/icon_gene_c.png',
    A: '/genes/icon_gene_a.png',
    E: '/genes/icon_gene_e.png',
    B: '/genes/icon_gene_b.png',
    F: '/genes/icon_gene_f.png',
    D: '/genes/icon_gene_d.png',
  };

  const GENE_NAMES: Record<string, string> = {
    C: 'Рубака',
    A: 'Кибер',
    E: 'Галактик',
    B: 'Зомби',
    F: 'Мифик',
    D: 'Зверь',
  };

  const geneOrder = ['all', 'C', 'A', 'E', 'B', 'F', 'D'] as const;

  const geneOptions = geneOrder.map((key) => {
    if (key === 'all') {
      return { key, icon: '/genes/gene_all.png', title: 'Все' };
    }
    return { key, icon: GENE_ICONS[key] || '/genes/gene_all.png', title: GENE_NAMES[key] || key };
  });

  const geneOptionMap = new Map(geneOptions.map((opt) => [opt.key, opt]));

  const sortOptions = [
    { value: 'name', label: 'Имя (А-Я)' },
    { value: 'hp', label: 'Здоровье' },
    { value: 'atk1', label: 'Атака 1' },
    { value: 'atk2', label: 'Атака 2' },
    { value: 'spd', label: 'Скорость' },
  ] as const;

  const orbMap = new Map(allOrbs.map((orb) => [orb.id, orb]));

  function isSpecialOrb(orb: OrbEntry) {
    return orb.id.toLowerCase().includes('special');
  }

  const basicOrbs = allOrbs.filter((orb) => !isSpecialOrb(orb));
  const specialOrbs = allOrbs.filter((orb) => isSpecialOrb(orb));

  function filterByKeywords(orbs: OrbEntry[], keywords: string[]) {
    const lowered = keywords.map((token) => token.toLowerCase());
    return orbs.filter((orb) => {
      const name = orb.name.toLowerCase();
      return lowered.some((token) => name.includes(token));
    });
  }

  function sortByStrength(orbs: OrbEntry[]) {
    return [...orbs].sort((a, b) => Math.abs(parseFloat(b.percent)) - Math.abs(parseFloat(a.percent)));
  }

  const attackBasics = sortByStrength(filterByKeywords(basicOrbs, ['атака', 'attack']));
  const hpBasics = sortByStrength(filterByKeywords(basicOrbs, ['здоров', 'life', 'hp']));
  const boostBasics = sortByStrength(filterByKeywords(basicOrbs, ['усилен', 'boost']));

  const strengthenSpecial = sortByStrength(filterByKeywords(specialOrbs, ['усилен', 'strength']));
  const shieldSpecial = sortByStrength(filterByKeywords(specialOrbs, ['щит', 'shield']));
  const speedSpecial = sortByStrength(filterByKeywords(specialOrbs, ['скорост', 'speed']));

  type RecommendedSet = {
    id: string;
    label: string;
    description: string;
    basic: string[];
    special: string | null;
  };

  function createRecommendedSet(
    id: string,
    label: string,
    description: string,
    basic: (string | undefined)[],
    special?: string | undefined | null,
  ): RecommendedSet | null {
    const filteredBasics = basic.filter(Boolean) as string[];
    const uniqueBasics = Array.from(new Set(filteredBasics));
    const specialId = special ?? null;
    if (!uniqueBasics.length && !specialId) {
      return null;
    }
    return {
      id,
      label,
      description,
      basic: uniqueBasics,
      special: specialId,
    };
  }

  const recommendedOrbSets: RecommendedSet[] = [
    { id: 'custom', label: 'Выбрать вручную', description: 'Настройте сферы самостоятельно', basic: [], special: null },
    createRecommendedSet(
      'attack',
      'Агрессивная сборка',
      'Максимальный урон за счёт атакующих сфер',
      [attackBasics[0]?.id, attackBasics[1]?.id, attackBasics[2]?.id],
      strengthenSpecial[0]?.id,
    ),
    createRecommendedSet(
      'defense',
      'Железная оборона',
      'Повышение живучести и защита',
      [hpBasics[0]?.id, hpBasics[1]?.id, hpBasics[2]?.id],
      shieldSpecial[0]?.id,
    ),
    createRecommendedSet(
      'speed',
      'Молниеносный удар',
      'Баланс атаки и скорости',
      [attackBasics[0]?.id, boostBasics[0]?.id, speedSpecial[0]?.id],
      speedSpecial[1]?.id ?? speedSpecial[0]?.id ?? null,
    ),
  ].filter((set): set is RecommendedSet => Boolean(set));

  const recommendedSetMap = new Map(recommendedOrbSets.map((set) => [set.id, set]));

  const basicSlotImage = '/orbs/basic/orb_slot.png';
  const specialSlotImage = '/orbs/special/orb_slot_spe.png';

  function normalizeImage(path: string) {
    if (!path) return '';
    return path.startsWith('/') ? path : `/${path}`;
  }
>>>>>>> origin/main

  // Provide a human-readable label for the star level
  const starLabels = ['Normal', 'Bronze', 'Silver', 'Gold', 'Platinum'];

<<<<<<< HEAD
  // Provide a label for mutant type
  function typeLabel(type) {
    if (!type) return '';
    const t = type.toUpperCase();
    if (t === 'DEFAULT') return 'Common';
    if (t === 'LEGEND') return 'Legendary';
    if (t === 'HEROIC') return 'Heroic';
    if (t === 'ZODIAC') return 'Zodiac';
    if (t === 'SPECIAL' || t === 'EXCLUSIVE') return 'Special';
    if (t === 'SEASONAL') return 'Seasonal';
    if (t === 'VIDEOGAME') return 'Videogame';
    if (t === 'GACHA') return 'Gacha';
    if (t === 'COMMUNITY') return 'Community';
    if (t === 'PVP') return 'PvP';
    if (t === 'RECIPE') return 'Recipe';
    return type;
  }

  // Close open orb menus when clicking outside
  function handleDocumentClick(e) {
    const path = e.composedPath();
    const clickedInsideMenu = path.some((el) => el.classList && el.classList.contains('orb-menu'));
    const clickedSlotButton = path.some((el) => el.classList && el.classList.contains('orb-slot-button'));
    if (!clickedInsideMenu && !clickedSlotButton) {
=======
  function clampStarNumber(value: number) {
    if (Number.isNaN(value)) return 0;
    return Math.min(Math.max(Math.round(value), 0), starOptions.length - 1);
  }

  let selectedGene = 'all';
  let searchTerm = '';
  let selectedSort = 'name';
  let selectedMutant: RawMutant | null = null;
  let selectedMutantKey = '';
  let starLevel = 0;
  let levelValue = 30;
  let levelText = '30';
  const levelInputId = 'mutant-level-input';

  let currentBase: RawMutant | null = null;
  let currentStats: any = null;
  let displayMutant: RawMutant | null = null;

  let basicSlots: (OrbEntry | null)[] = [null, null, null, null];
  let specialSlot: OrbEntry | null = null;
  let openOrbMenu: number | 'special' | null = null;
  let selectedOrbSet = 'custom';

  const orbImageCandidatesCache = new Map<string, string[]>();

  function getOrbImageCandidates(orb: OrbEntry | null) {
    const id = orb?.id?.toLowerCase?.();
    if (!id) return [];
    if (orbImageCandidatesCache.has(id)) {
      return orbImageCandidatesCache.get(id) ?? [];
    }
    const candidates = new Set<string>();
    const base = id.replace(/\.png$/i, '');
    candidates.add(base);
    if (base.includes('_ephemeral')) {
      candidates.add(base.replace(/_ephemeral_.+$/, ''));
    }
    if (/_\d+$/.test(base)) {
      candidates.add(base.replace(/_\d+$/, ''));
    }
    if (base.includes('_add') && base.includes('_special_')) {
      candidates.add(base.replace('_add', '_'));
    }
    const result = Array.from(candidates);
    orbImageCandidatesCache.set(id, result);
    return result;
  }

  function orbImagePath(orb: OrbEntry | null) {
    if (!orb?.id) return '';
    const isSpecial = isSpecialOrb(orb);
    const folder = isSpecial ? 'special' : 'basic';
    const candidates = getOrbImageCandidates(orb);
    if (!candidates.length) return '';
    return `/orbs/${folder}/${candidates[0]}.png`;
  }

  function handleOrbImageError(event: Event, orb: OrbEntry | null) {
    if (!orb?.id) return;
    const img = event.currentTarget as HTMLImageElement;
    const candidates = getOrbImageCandidates(orb);
    const isSpecial = isSpecialOrb(orb);
    const folder = isSpecial ? 'special' : 'basic';
    const currentIndex = Number(img.dataset.fallbackIndex ?? '0');
    const nextIndex = currentIndex + 1;
    if (nextIndex < candidates.length) {
      img.dataset.fallbackIndex = String(nextIndex);
      img.src = `/orbs/${folder}/${candidates[nextIndex]}.png`;
    } else {
      img.dataset.fallbackIndex = String(nextIndex);
      img.src = isSpecial ? specialSlotImage : basicSlotImage;
    }
  }

  function typeLabel(type: string) {
    if (!type) return '';
    return TYPE_RU[type] || TYPE_RU[type.toUpperCase?.()] || TYPE_RU[type.toLowerCase?.()] || type;
  }

  function typeIcon(type: string) {
    if (!type) return '';
    const t = type.toUpperCase();
    if (t === 'LEGEND') return '/mut_icons/icon_legendary.png';
    if (t === 'HEROIC') return '/mut_icons/icon_heroic.png';
    if (t === 'ZODIAC') return '/mut_icons/icon_zodiac.png';
    if (t === 'SPECIAL' || t === 'EXCLUSIVE') return '/mut_icons/icon_special.png';
    if (t === 'SEASONAL') return '/mut_icons/icon_seasonal.png';
    if (t === 'VIDEOGAME') return '/mut_icons/icon_videogame.png';
    if (t === 'GACHA') return '/mut_icons/icon_gacha.png';
    if (t === 'COMMUNITY') return '/mut_icons/icon_recipe.png';
    if (t === 'PVP') return '/mut_icons/icon_pvp.png';
    if (t === 'RECIPE') return '/mut_icons/icon_recipe.png';
    return '';
  }

  function fallbackAbilityName(value: string) {
    return value.replace(/_/g, ' ');
  }

  function abilityLabel(name: string) {
    if (!name) return 'Неизвестная способность';
    const normalized = name.replace(/_plus$/i, '');
    return ABILITY_RU[name] || ABILITY_RU[normalized] || fallbackAbilityName(name);
  }

  function formatPercent(value: number) {
    if (!Number.isFinite(value)) return '0';
    if (Math.abs(value - Math.round(value)) < 0.001) {
      return Math.round(value).toString();
    }
    return value.toFixed(1);
  }

  function formatMultiplier(value: number) {
    if (!Number.isFinite(value)) return '1';
    if (Math.abs(value - Math.round(value)) < 0.001) {
      return Math.round(value).toString();
    }
    return value.toFixed(2);
  }

  function getSortValue(mutant: RawMutant, key: string) {
    const lvl1 = mutant.base_stats?.lvl1 ?? {};
    const lvl30 = mutant.base_stats?.lvl30 ?? {};
    switch (key) {
      case 'hp':
        return lvl30.hp ?? lvl1.hp ?? 0;
      case 'atk1':
        return lvl30.atk1 ?? lvl1.atk1 ?? 0;
      case 'atk2':
        return lvl30.atk2 ?? lvl1.atk2 ?? 0;
      case 'spd':
        return lvl1.spd ?? 0;
      default:
        return mutant.name ?? '';
    }
  }

  function geneBadges(mutant: RawMutant | null) {
    if (!mutant?.genes?.length) {
      return [] as { icon: string; title: string }[];
    }
    const geneCodes = mutant.genes.flatMap((code) => code.toUpperCase().split(''));
    return geneCodes
      .slice(0, 2)
      .map((code) => geneOptionMap.get(code) || geneOptionMap.get('all'))
      .filter(Boolean) as { icon: string; title: string }[];
  }

  function normalizedAbilityName(name: string) {
    return name.replace(/_plus$/i, '');
  }

  function buildAbilityMap(rawAbilities: RawAbility[] = []) {
    const map = new Map<string, AbilityState>();
    rawAbilities.forEach((ability) => {
      const name = ability.name ?? 'ability_unknown';
      const normalized = normalizedAbilityName(name);
      const pct = Number(ability.pct ?? 0);
      map.set(name, {
        name,
        normalized,
        pct,
        basePct: pct,
        orbBonus: 0,
        addedByOrb: false,
      });
    });
    return map;
  }

  function ensureAbility(map: Map<string, AbilityState>, name: string) {
    if (map.has(name)) {
      return map.get(name)!;
    }
    const normalized = normalizedAbilityName(name);
    const entry: AbilityState = {
      name,
      normalized,
      pct: 0,
      basePct: 0,
      orbBonus: 0,
      addedByOrb: true,
    };
    map.set(name, entry);
    return entry;
  }

  function addAbilityBonus(map: Map<string, AbilityState>, normalizedKey: string, amount: number, allowCreate: boolean) {
    if (!Number.isFinite(amount) || amount === 0) return;
    const matches = Array.from(map.values()).filter((ability) => ability.normalized === normalizedKey);
    if (matches.length) {
      matches.forEach((ability) => {
        ability.orbBonus += amount;
        ability.pct += amount;
      });
      return;
    }
    if (allowCreate) {
      const ability = ensureAbility(map, normalizedKey);
      ability.orbBonus = amount;
      ability.pct = amount;
    }
  }

  const ORB_ABILITY_PATTERNS = [
    { key: 'ability_shield', tokens: ['shield'] },
    { key: 'ability_strengthen', tokens: ['strengthen'] },
    { key: 'ability_weaken', tokens: ['weaken'] },
    { key: 'ability_slash', tokens: ['slash'] },
    { key: 'ability_retaliate', tokens: ['retaliate'] },
    { key: 'ability_regen', tokens: ['regen', 'regenerate'] },
  ] as const;

  function applyOrbEffects(
    orb: OrbEntry | null,
    modifiers: { attack: number; hp: number; speed: number },
    abilityMap: Map<string, AbilityState>,
  ) {
    if (!orb) return;
    const id = orb.id?.toLowerCase?.();
    const percentValue = Number(orb.percent ?? 0);
    if (!id || Number.isNaN(percentValue)) return;

    if (id.includes('attack')) {
      modifiers.attack += percentValue;
    }
    if (id.includes('life') || id.includes('health') || id.includes('hp')) {
      modifiers.hp += percentValue;
    }
    if (id.includes('speed')) {
      modifiers.speed += percentValue;
    }

    const amount = Math.abs(percentValue);
    for (const pattern of ORB_ABILITY_PATTERNS) {
      if (pattern.tokens.some((token) => id.includes(`add${token}`))) {
        addAbilityBonus(abilityMap, pattern.key, amount, true);
        return;
      }
    }
    for (const pattern of ORB_ABILITY_PATTERNS) {
      if (pattern.tokens.some((token) => id.includes(`_${token}`))) {
        addAbilityBonus(abilityMap, pattern.key, amount, true);
        return;
      }
    }
  }

  function finalizeAbilities(map: Map<string, AbilityState>) {
    return Array.from(map.values())
      .filter((ability) => ability.pct > 0 || ability.orbBonus > 0 || ability.addedByOrb)
      .sort((a, b) => b.pct - a.pct)
      .map((ability) => ({
        ...ability,
        label: abilityLabel(ability.name),
        isPlus: /_plus$/i.test(ability.name),
      }));
  }

  function baseAttackValue(entry: RawMutant, key: 'atk1' | 'atk2', level: number) {
    const baseKey = key === 'atk1' ? 'atk1_base' : 'atk2_base';
    const boostedKey = key === 'atk1' ? 'atk1p_base' : 'atk2p_base';
    const threshold = key === 'atk1' ? 10 : 15;
    const lvl1Value = Number(entry.base_stats?.[baseKey as keyof RawMutant['base_stats']] ?? entry.base_stats?.lvl1?.[key] ?? 0);
    const boostedValue = Number(
      entry.base_stats?.[boostedKey as keyof RawMutant['base_stats']] ??
        (entry.base_stats?.lvl30?.[key] ? (entry.base_stats.lvl30[key] as number) / 3.9 : lvl1Value),
    );
    return level < threshold ? lvl1Value : boostedValue;
  }

  function computeStats(baseEntry: RawMutant | null) {
    if (!baseEntry) return null;
    const lvl = clampLevelNumber(levelValue);
    if (lvl !== levelValue) {
      levelValue = lvl;
      levelText = String(lvl);
    }

    const hpBase = Number(baseEntry.base_stats?.lvl1?.hp ?? 0);
    const hp = hpBase * (lvl / 10 + 0.9);

    const atk1Base = baseAttackValue(baseEntry, 'atk1', lvl);
    const atk1 = atk1Base * (lvl / 10 + 0.9);

    const atk2Base = baseAttackValue(baseEntry, 'atk2', lvl);
    const atk2 = atk2Base * (lvl / 10 + 0.9);

    const spdBase = Number(baseEntry.base_stats?.lvl1?.spd ?? 0);

    const modifiers = { attack: 0, hp: 0, speed: 0 };
    const abilityMap = buildAbilityMap(baseEntry.abilities ?? []);

    const activeBasicSlots = basicSlots.slice(0, baseEntry.type?.toUpperCase() === 'HEROIC' ? 4 : 3);
    activeBasicSlots.forEach((orb) => applyOrbEffects(orb, modifiers, abilityMap));
    applyOrbEffects(specialSlot, modifiers, abilityMap);

    const attackMultiplier = 1 + modifiers.attack / 100;
    const hpMultiplier = 1 + modifiers.hp / 100;
    const speedMultiplier = 1 + modifiers.speed / 100;

    return {
      hp: Math.round(hp * hpMultiplier),
      atk1: Math.round(atk1 * attackMultiplier),
      atk2: Math.round(atk2 * attackMultiplier),
      spd: Number((spdBase * speedMultiplier).toFixed(2)),
      name: baseEntry.name,
      image: baseEntry.image,
      genes: baseEntry.genes,
      type: baseEntry.type,
      abilities: finalizeAbilities(abilityMap),
      name_attack1: baseEntry.name_attack1,
      name_attack2: baseEntry.name_attack2,
      name_attack3: baseEntry.name_attack3,
      multiplier: Number(baseEntry.multiplier ?? 1),
    };
  }

  function handleLevelInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const numericText = input.value.replace(/[^0-9]/g, '');
    levelText = numericText;
    if (numericText === '') {
      return;
    }
    const parsed = Number(numericText);
    const clamped = clampLevelNumber(parsed);
    levelValue = clamped;
    if (String(clamped) !== numericText) {
      levelText = String(clamped);
    }
  }

  function handleLevelBlur() {
    if (levelText === '') {
      levelValue = 1;
      levelText = '1';
      return;
    }
    const parsed = Number(levelText);
    const clamped = clampLevelNumber(parsed);
    levelValue = clamped;
    levelText = String(clamped);
  }

  $: candidateMutants = (() => {
    let list = normalData as RawMutant[];
    if (selectedGene !== 'all') {
      const geneCode = selectedGene.toUpperCase();
      list = list.filter((mutant) => Array.isArray(mutant.genes) && mutant.genes.some((gene) => gene.toUpperCase().includes(geneCode)));
    }
    if (searchTerm.trim()) {
      const lower = searchTerm.trim().toLowerCase();
      list = list.filter((mutant) => mutant.name.toLowerCase().includes(lower));
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (selectedSort === 'name') {
        return a.name.localeCompare(b.name, 'ru');
      }
      const av = getSortValue(a, selectedSort);
      const bv = getSortValue(b, selectedSort);
      if (bv === av) {
        return a.name.localeCompare(b.name, 'ru');
      }
      return bv - av;
    });
    return sorted;
  })();

  $: if (!selectedMutant && candidateMutants.length) {
    selectMutant(candidateMutants[0]);
  }

  function selectMutant(mutant: RawMutant) {
    if (!mutant) return;
    selectedMutantKey = canonicalId(mutant.id);
    selectedMutant = starLookups[0].get(selectedMutantKey) ?? mutant;
    basicSlots = [null, null, null, null];
    specialSlot = null;
    openOrbMenu = null;
    selectedOrbSet = 'custom';
  }

  function getCurrentBase() {
    if (!selectedMutantKey) return null;
    const lookup = starLookups[clampStarNumber(starLevel)] ?? starLookups[0];
    return lookup.get(selectedMutantKey) ?? starLookups[0].get(selectedMutantKey) ?? null;
  }

  $: starLevel = clampStarNumber(starLevel);
  $: currentBase = getCurrentBase();
  $: currentStats = computeStats(currentBase);
  $: displayMutant = currentBase ?? selectedMutant;

  $: basicSlotCount = (() => {
    if (!currentBase) return 0;
    return currentBase.type && currentBase.type.toUpperCase() === 'HEROIC' ? 4 : 3;
  })();

  function applyRecommendedSet(setId: string) {
    selectedOrbSet = setId;
    const set = recommendedSetMap.get(setId);
    if (!set || setId === 'custom') {
      return;
    }
    const nextBasic: (OrbEntry | null)[] = [null, null, null, null];
    for (let i = 0; i < Math.min(basicSlotCount, set.basic.length); i += 1) {
      const orbId = set.basic[i];
      nextBasic[i] = orbId ? orbMap.get(orbId) ?? null : null;
    }
    basicSlots = nextBasic;
    specialSlot = set.special ? orbMap.get(set.special) ?? null : null;
    openOrbMenu = null;
  }

  function handleDocumentClick(event: MouseEvent) {
    const path = event.composedPath() as HTMLElement[];
    const clickedInsideMenu = path.some((element) => element instanceof HTMLElement && element.classList?.contains('orb-menu'));
    const clickedSlot = path.some((element) => element instanceof HTMLElement && element.classList?.contains('orb-slot-button'));
    if (!clickedInsideMenu && !clickedSlot) {
>>>>>>> origin/main
      openOrbMenu = null;
    }
  }
  onMount(() => {
    window.addEventListener('click', handleDocumentClick);
    return () => window.removeEventListener('click', handleDocumentClick);
  });
</script>

<style>
  .scroll-container {
    max-height: 30rem;
    overflow-y: auto;
  }
  .orb-menu {
    z-index: 50;
  }
</style>

<!-- Main Stats Calculator Layout -->
<div class="space-y-6 p-4">
  <h2 class="text-2xl font-bold text-center text-white flex items-center justify-center space-x-2">
    <img src="/placeholder_light_gray_block.png" alt="logo" class="w-6 h-6" />
    <span>Stats Calculator</span>
  </h2>

  <!-- Gene filter and search bar -->
  <div class="bg-gray-800 rounded-lg p-4">
    <div class="flex items-center space-x-3 mb-4">
      {#each geneFilters as gf}
        <img
          src={gf.icon}
          alt={gf.title}
          title={gf.title}
          class="w-6 h-6 cursor-pointer rounded-full border-2 {selectedGene === gf.key ? 'border-green-500' : 'border-transparent'}"
          on:click={() => selectedGene = gf.key}
        />
      {/each}
    </div>
    <input
      type="text"
      placeholder="Start typing mutant name..."
      bind:value={searchTerm}
      class="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400"
    />
    <!-- Mutant selection grid -->
    {#if searchTerm.trim().length > 0 && candidateMutants.length > 0}
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mt-2 max-h-80 overflow-y-auto p-1">
        {#each candidateMutants.slice(0, 40) as m}
          <div
            class="cursor-pointer bg-gray-800 hover:bg-gray-700 p-2 rounded text-center"
            on:click={() => { selectMutant(m); searchTerm = m.name; }}
          >
            <img
              src={normalizeImage(m.image[1] || m.image[0])}
              alt={m.name}
              class="w-10 h-10 mx-auto mb-1"
            />
            <div class="text-xs text-white truncate">{m.name}</div>
            <div class="flex justify-center space-x-0.5 mt-1">
              {#each m.genes as g}
                <img
                  src={geneFilters.find(f => f.key === g?.[0]?.toUpperCase())?.icon || '/genes/gene_all.png'}
                  alt={g}
                  class="w-3 h-3"
                />
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Configuration panel -->
  {#if selectedMutant}
    <div class="space-y-4">
      <!-- Level and star sliders -->
      <div class="bg-gray-800 rounded-lg p-4">
        <div class="mb-4">
          <label class="block text-gray-300 text-sm mb-1">Mutant Level: {levelValue}</label>
          <input type="range" min="1" max="100" step="1" bind:value={levelValue} class="w-full" />
        </div>
        <div class="mb-4">
          <label class="block text-gray-300 text-sm mb-1">Star Level: {starLabels[starLevel]}</label>
          <input type="range" min="0" max="4" step="1" bind:value={starLevel} class="w-full" />
        </div>
      </div>
      <!-- Orb selection panel -->
      <div class="bg-gray-800 rounded-lg p-4">
        <label class="block text-gray-300 text-sm mb-2">Select Orbs</label>
        <div class="flex items-center space-x-4">
          {#each Array(basicSlotCount) as _, i}
            <div class="relative">
<<<<<<< HEAD
              <!-- Slot button -->
              <button
                class="orb-slot-button w-10 h-10 rounded-full overflow-hidden focus:outline-none"
                on:click={() => openOrbMenu = openOrbMenu === i ? null : i}
              >
                <img src="/orbs/orb_slot.png" alt="slot" class="w-full h-full" />
                {#if basicSlots[i]}
                  <img src={`/orbs/${basicSlots[i].id}.png`} alt={basicSlots[i].name} class="absolute inset-0 w-full h-full object-contain" />
                {/if}
              </button>
              {#if openOrbMenu === i}
                <div class="orb-menu absolute left-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg max-h-56 overflow-y-auto p-2 w-52">
                  {#each basicOrbs as orb}
                    <div
                      class="flex items-center p-1 hover:bg-gray-700 cursor-pointer text-sm text-white"
                      on:click={() => { basicSlots[i] = orb; openOrbMenu = null; }}
                    >
                      <img src={`/orbs/${orb.id}.png`} alt={orb.name} class="w-6 h-6 mr-2" />
                      <span>{orb.name}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
          <!-- Special orb slot -->
          <div class="relative">
            <button
              class="orb-slot-button w-10 h-10 rounded-full overflow-hidden focus:outline-none"
              on:click={() => openOrbMenu = openOrbMenu === 'special' ? null : 'special'}
            >
              <img src="/orbs/orb_slot_spe.png" alt="special slot" class="w-full h-full" />
              {#if specialSlot}
                <img src={`/orbs/${specialSlot.id}.png`} alt={specialSlot.name} class="absolute inset-0 w-full h-full object-contain" />
              {/if}
            </button>
            {#if openOrbMenu === 'special'}
              <div class="orb-menu absolute left-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg max-h-56 overflow-y-auto p-2 w-52">
                {#each specialOrbs as orb}
                  <div
                    class="flex items-center p-1 hover:bg-gray-700 cursor-pointer text-sm text-white"
                    on:click={() => { specialSlot = orb; openOrbMenu = null; }}
                  >
                    <img src={`/orbs/${orb.id}.png`} alt={orb.name} class="w-6 h-6 mr-2" />
                    <span>{orb.name}</span>
                  </div>
                {/each}
              </div>
            {/if}
=======
              <img src={normalizeImage(mutant.image?.[1] || mutant.image?.[0])} alt={mutant.name} class="w-14 h-14 rounded-xl object-cover border border-white/10" />
              <div class="absolute -bottom-1 right-1 flex -space-x-1">
                {#each geneBadges(mutant) as gene}
                  <img src={gene?.icon || '/genes/gene_all.png'} alt={gene?.title} class="w-4 h-4 border border-black rounded-full" />
                {/each}
              </div>
            </div>
            <div class="flex-1">
              <div class="font-semibold text-sm text-gray-100 group-hover:text-white">{mutant.name}</div>
              <div class="text-xs text-gray-400 mt-1">{typeLabel(mutant.type)}</div>
            </div>
            <div class="text-right text-xs text-gray-500 leading-5">
              <div>HP {getSortValue(mutant, 'hp')}</div>
              <div>SPD {getSortValue(mutant, 'spd')}</div>
            </div>
          </button>
        {/each}
        {#if candidateMutants.length === 0}
          <div class="text-center text-sm text-gray-400 py-6">Не найдено мутантов с такими условиями.</div>
        {/if}
      </div>
    </aside>

    <section class="mutant-card p-6 lg:p-8">
      {#if displayMutant && currentStats}
        <div class="flex flex-col gap-6">
          <header class="bg-black/30 border border-white/10 rounded-2xl px-5 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-gray-400">Рекомендуемые сферы</p>
              <h1 class="text-2xl font-semibold mt-1 text-gray-100">{currentStats.name}</h1>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
              <select
                class="bg-[#1f2130] border border-violet-400/40 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                bind:value={selectedOrbSet}
                on:change={(event) => applyRecommendedSet((event.target as HTMLSelectElement).value)}
              >
                {#each recommendedOrbSets as set}
                  <option value={set.id} class="bg-[#1f2130]">{set.id === 'custom' ? 'Выберите набор сфер' : set.label}</option>
                {/each}
              </select>
              {#if selectedOrbSet !== 'custom'}
                <div class="text-xs text-gray-400 max-w-xs sm:max-w-[220px]">
                  {recommendedSetMap.get(selectedOrbSet)?.description}
                </div>
              {/if}
            </div>
          </header>

          <div class="flex flex-col lg:flex-row gap-6">
            <div class="lg:w-1/2 flex flex-col items-center text-center gap-4">
              <div class="relative">
                <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500/30 border border-violet-400/60 rounded-full px-4 py-1 text-xs uppercase tracking-[0.3em] text-violet-100">
                  {starOptions[starLevel]?.label || 'Обычный'}
                </div>
                <img
                  src={normalizeImage(currentStats.image?.[0] || displayMutant.image?.[0])}
                  alt={currentStats.name}
                  class="w-44 h-44 rounded-3xl object-cover border border-white/10 shadow-lg"
                />
                <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
                  {#each Array(basicSlotCount) as _, i}
                    <button
                      type="button"
                      class="orb-slot-button relative w-12 h-12"
                      on:click={() => openOrbMenu = openOrbMenu === i ? null : i}
                    >
                      <img src={basicSlotImage} alt="orb slot" class="w-full h-full" />
                      {#if basicSlots[i]}
                        <img
                          src={orbImagePath(basicSlots[i])}
                          alt={basicSlots[i].name}
                          class="absolute inset-0 object-contain"
                          data-fallback-index="0"
                          on:error={(event) => handleOrbImageError(event, basicSlots[i])}
                        />
                      {/if}
                    </button>
                    {#if openOrbMenu === i}
                      <div class="orb-menu absolute mt-2 left-1/2 -translate-x-1/2 bg-[#151622] border border-white/10 rounded-2xl shadow-xl p-2 w-56">
                        <p class="text-xs text-gray-400 px-2 pb-2">Базовые сферы</p>
                        {#each basicOrbs as orb}
                          <button
                            type="button"
                            class="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-violet-500/15"
                            on:click={() => {
                              basicSlots[i] = orb;
                              selectedOrbSet = 'custom';
                              openOrbMenu = null;
                            }}
                          >
                            <img src={orbImagePath(orb)} alt={orb.name} class="w-8 h-8" />
                            <div class="text-left">
                              <div class="text-sm text-gray-100">{orb.name}</div>
                              <div class="text-xs text-gray-500">{orb.description}</div>
                            </div>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  {/each}
                  <button
                    type="button"
                    class="orb-slot-button relative w-12 h-12"
                    on:click={() => openOrbMenu = openOrbMenu === 'special' ? null : 'special'}
                  >
                    <img src={specialSlotImage} alt="special slot" class="w-full h-full" />
                    {#if specialSlot}
                      <img
                        src={orbImagePath(specialSlot)}
                        alt={specialSlot.name}
                        class="absolute inset-0 object-contain"
                        data-fallback-index="0"
                        on:error={(event) => handleOrbImageError(event, specialSlot)}
                      />
                    {/if}
                  </button>
                  {#if openOrbMenu === 'special'}
                    <div class="orb-menu absolute mt-2 left-1/2 -translate-x-1/2 bg-[#151622] border border-white/10 rounded-2xl shadow-xl p-2 w-56">
                      <p class="text-xs text-gray-400 px-2 pb-2">Специальные сферы</p>
                      {#each specialOrbs as orb}
                        <button
                          type="button"
                          class="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-violet-500/15"
                          on:click={() => {
                            specialSlot = orb;
                            selectedOrbSet = 'custom';
                            openOrbMenu = null;
                          }}
                        >
                          <img
                            src={orbImagePath(orb)}
                            alt={orb.name}
                            class="w-8 h-8"
                            data-fallback-index="0"
                            on:error={(event) => handleOrbImageError(event, orb)}
                          />
                          <div class="text-left">
                            <div class="text-sm text-gray-100">{orb.name}</div>
                            <div class="text-xs text-gray-500">{orb.description}</div>
                          </div>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>

              <div class="flex items-center gap-3 mt-10">
                {#if typeIcon(displayMutant.type)}
                  <img src={typeIcon(displayMutant.type)} alt={typeLabel(displayMutant.type)} class="w-10 h-10" />
                {/if}
                <div class="text-left">
                  <div class="text-sm text-gray-400 uppercase tracking-[0.3em]">{typeLabel(displayMutant.type)}</div>
                  <div class="text-2xl font-semibold text-gray-100">Уровень {levelValue}</div>
                </div>
              </div>

              <div class="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-4 space-y-4">
                <div>
                  <label class="text-xs uppercase tracking-[0.3em] text-gray-400" for={levelInputId}>Уровень мутанта</label>
                  <div class="flex items-center gap-3 mt-2">
                    <input
                      id={levelInputId}
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      value={levelText}
                      on:input={handleLevelInput}
                      on:blur={handleLevelBlur}
                      class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-center text-sm text-gray-100 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                    />
                    <span class="px-3 py-2 text-xs uppercase tracking-[0.3em] text-gray-400 border border-white/10 rounded-lg bg-black/40">
                      lvl
                    </span>
                  </div>
                </div>
                <div>
                  <label class="text-xs uppercase tracking-[0.3em] text-gray-400">Звёздность</label>
                  <div class="mt-3 flex flex-col gap-3">
                    <div class="flex flex-wrap items-center gap-2">
                      {#each starOptions as option}
                        <button
                          type="button"
                          class={`p-1.5 rounded-full border transition ${starLevel === option.level ? 'border-violet-400 bg-violet-500/20 shadow-lg shadow-violet-500/20' : 'border-white/10 hover:border-violet-300/60 bg-black/40'}`}
                          on:click={() => starLevel = option.level}
                          aria-label={`Звезда ${option.label}`}
                        >
                          <img src={option.icon} alt={option.label} class="w-9 h-9" />
                        </button>
                      {/each}
                    </div>
                    <div class="flex items-center justify-between text-xs text-gray-400">
                      <span>{starOptions[starLevel]?.label || 'Обычный'}</span>
                      <span>Множитель: ×{formatMultiplier(currentStats.multiplier)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="lg:w-1/2 flex flex-col justify-between">
              <div>
                <div class="stat-row">
                  <img src="/etc/icon_hp.png" alt="HP" class="w-6 h-6" />
                  <div class="text-sm text-gray-400 uppercase tracking-[0.2em]">HP</div>
                  <div class="text-lg font-semibold text-[#75d6ff]">{currentStats.hp.toLocaleString('ru-RU')}</div>
                </div>
                <div class="stat-row">
                  <img src="/etc/icon_atk.png" alt="Attack" class="w-6 h-6" />
                  <div class="text-sm text-gray-400 uppercase tracking-[0.2em]">{currentStats.name_attack1 || 'Attack 1'}</div>
                  <div class="text-lg font-semibold text-[#f7a6ff]">{currentStats.atk1.toLocaleString('ru-RU')}</div>
                </div>
                <div class="stat-row">
                  <img src="/etc/icon_atk.png" alt="Attack" class="w-6 h-6" />
                  <div class="text-sm text-gray-400 uppercase tracking-[0.2em]">{currentStats.name_attack2 || 'Attack 2'}</div>
                  <div class="text-lg font-semibold text-[#ffa76d]">{currentStats.atk2.toLocaleString('ru-RU')}</div>
                </div>
                <div class="stat-row">
                  <img src="/etc/icon_speed.png" alt="Speed" class="w-6 h-6" />
                  <div class="text-sm text-gray-400 uppercase tracking-[0.2em]">Speed</div>
                  <div class="text-lg font-semibold text-[#ffd76d]">{currentStats.spd}</div>
                </div>
              </div>

              <div class="mt-6 bg-black/25 border border-white/10 rounded-2xl px-5 py-4 space-y-3">
                <div class="text-xs uppercase tracking-[0.3em] text-gray-400">Способности</div>
                {#if currentStats.abilities?.length}
                  <ul class="space-y-2">
                    {#each currentStats.abilities as ability}
                      <li class="flex items-center justify-between text-sm text-gray-200">
                        <span>{ability.label}{ability.isPlus ? ' +' : ''}</span>
                        <span class="text-gray-300">
                          {formatPercent(ability.pct)}%
                          {#if ability.orbBonus > 0}
                            <span class="text-violet-200">(+{formatPercent(ability.orbBonus)}%)</span>
                          {/if}
                        </span>
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <div class="text-sm text-gray-500">Нет дополнительных способностей.</div>
                {/if}
              </div>
            </div>
>>>>>>> origin/main
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Display the calculated stats -->
  {#if selectedMutant && currentStats}
    <div class="mx-auto max-w-xs bg-gray-800 rounded-lg p-4 text-white">
      <h3 class="text-xl font-bold mb-2 text-center">{currentStats.name}</h3>
          <div class="relative w-32 h-32 mx-auto mb-2">
            <img
              src={normalizeImage(selectedMutant.image[0])}
              alt={currentStats.name}
              class="w-full h-full object-cover rounded"
            />
        <!-- Genes overlay -->
        <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-1 mb-1">
          {#each currentStats.genes as g}
            <img src={geneFilters.find(f => f.key === g?.[0]?.toUpperCase())?.icon || '/genes/gene_all.png'} alt={g} class="w-5 h-5" />
          {/each}
        </div>
      </div>
      <!-- Orbs row underneath image -->
      <div class="flex justify-center space-x-2 mb-2">
        {#each Array(basicSlotCount) as _, i}
          <img src={basicSlots[i] ? `/orbs/${basicSlots[i].id}.png` : '/orbs/orb_slot.png'} alt="orb" class="w-6 h-6" />
        {/each}
        <img src={specialSlot ? `/orbs/${specialSlot.id}.png` : '/orbs/orb_slot_spe.png'} alt="special orb" class="w-6 h-6" />
      </div>
      <!-- Level and type -->
      <div class="text-center mb-2">
        <div class="text-sm">Level {levelValue}</div>
        <div class="text-xs bg-purple-700 px-2 py-0.5 rounded inline-block mt-1">{typeLabel(selectedMutant.type)}</div>
      </div>
      <!-- Stats list -->
      <ul class="space-y-1 text-sm">
        <li class="flex justify-between items-center">
          <span>HP</span>
          <span>{currentStats.hp.toLocaleString()}</span>
        </li>
        <li class="flex justify-between items-center">
          <span>{currentStats.name_attack1 || 'Attack 1'}</span>
          <span>{currentStats.atk1.toLocaleString()}</span>
        </li>
        <li class="flex justify-between items-center">
          <span>{currentStats.name_attack2 || 'Attack 2'}</span>
          <span>{currentStats.atk2.toLocaleString()}</span>
        </li>
        {#if currentStats.abilities && currentStats.abilities.length > 0}
          <li class="flex justify-between items-center">
            <span>{currentStats.abilities[0]?.name?.replace(/_/g, ' ') || currentStats.abilities[0]?.replace(/_/g, ' ') || 'Ability'}</span>
            <span></span>
          </li>
        {/if}
        <li class="flex justify-between items-center">
          <span>Speed</span>
          <span>{currentStats.spd}</span>
        </li>
        <li class="flex justify-between items-center">
          <span>Bingo</span>
          <span>{currentStats.bingo && currentStats.bingo.length > 0 ? currentStats.bingo[0] : '-'}</span>
        </li>
      </ul>
    </div>
  {/if}
</div>
