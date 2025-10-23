<script lang="ts">
  import { onMount } from 'svelte';

  import normalData from '@/data/mutants/normal.json';
  import bronzeData from '@/data/mutants/bronze.json';
  import silverData from '@/data/mutants/silver.json';
  import goldData from '@/data/mutants/gold.json';
  import platinumData from '@/data/mutants/platinum.json';
  import allOrbs from '@/data/materials/orbs.json';
  import { ABILITY_RU } from '@/lib/mutant-dicts';

  const starDatasets = [normalData, bronzeData, silverData, goldData, platinumData];

  function canonicalId(id: string | undefined) {
    if (!id) return '';
    return id.replace(/_(bronze|silver|gold|platinum)$/i, '');
  }

  const starMaps = starDatasets.map(dataset => {
    const map = new Map<string, any>();
    dataset.forEach((entry: any) => {
      const key = canonicalId(entry.id);
      const hasStarSuffix = /_(bronze|silver|gold|platinum)$/i.test(entry.id ?? '');
      const existing = map.get(key);
      if (!existing) {
        map.set(key, entry);
        return;
      }
      const existingHasSuffix = /_(bronze|silver|gold|platinum)$/i.test(existing.id ?? '');
      if (!hasStarSuffix || (hasStarSuffix && existingHasSuffix)) {
        if (!hasStarSuffix || existingHasSuffix) {
          map.set(key, entry);
        }
      }
    });
    return map;
  });

  const geneFilters: { key: string; icon: string; title: string }[] = [
    { key: 'all', icon: '/genes/gene_all.png', title: 'Все' },
    { key: 'C', icon: '/genes/icon_gene_c.png', title: 'Рубака' },
    { key: 'A', icon: '/genes/icon_gene_a.png', title: 'Кибер' },
    { key: 'E', icon: '/genes/icon_gene_e.png', title: 'Галактик' },
    { key: 'B', icon: '/genes/icon_gene_b.png', title: 'Зомби' },
    { key: 'F', icon: '/genes/icon_gene_f.png', title: 'Мифик' },
    { key: 'D', icon: '/genes/icon_gene_d.png', title: 'Зверь' }
  ];

  const starOptions = [
    { level: 0, label: 'Обычный', icon: '/stars/no_stars.png' },
    { level: 1, label: 'Бронза', icon: '/stars/star_bronze.png' },
    { level: 2, label: 'Серебро', icon: '/stars/star_silver.png' },
    { level: 3, label: 'Золото', icon: '/stars/star_gold.png' },
    { level: 4, label: 'Платина', icon: '/stars/star_platinum.png' }
  ];

  const sortOptions = [
    { value: 'name', label: 'Имя (А-Я)' },
    { value: 'hp', label: 'Здоровье' },
    { value: 'atk1', label: 'Атака 1' },
    { value: 'atk2', label: 'Атака 2' },
    { value: 'spd', label: 'Скорость' }
  ];

  const orbMap = new Map(allOrbs.map(orb => [orb.id, orb]));

  const basicOrbs = allOrbs.filter(orb => !orb.id.toLowerCase().includes('special'));
  const specialOrbs = allOrbs.filter(orb => orb.id.toLowerCase().includes('special'));

  const basicSlotImage = '/orbs/basic/orb_slot.png';
  const specialSlotImage = '/orbs/special/orb_slot_spe.png';

  function filterByKeywords(orbs: typeof allOrbs, keywords: string[]) {
    const lowered = keywords.map(k => k.toLowerCase());
    return orbs.filter(orb => {
      const name = orb.name.toLowerCase();
      return lowered.some(k => name.includes(k));
    });
  }

  function sortByStrength(list: typeof allOrbs) {
    return [...list].sort((a, b) => Math.abs(parseFloat(b.percent)) - Math.abs(parseFloat(a.percent)));
  }

  const attackBasics = sortByStrength(filterByKeywords(basicOrbs, ['атака', 'attack']));
  const hpBasics = sortByStrength(filterByKeywords(basicOrbs, ['здоров', 'life', 'hp']));
  const boostBasics = sortByStrength(filterByKeywords(basicOrbs, ['усилен', 'boost']));

  const strengthenSpecial = sortByStrength(filterByKeywords(specialOrbs, ['усилен', 'strength']));
  const shieldSpecial = sortByStrength(filterByKeywords(specialOrbs, ['щит', 'shield']));
  const speedSpecial = sortByStrength(filterByKeywords(specialOrbs, ['скорост', 'speed']));

  const recommendedOrbSets = [
    {
      id: 'custom',
      label: 'Выбрать вручную',
      description: 'Настройте сферы самостоятельно',
      basic: [] as string[],
      special: null as string | null
    },
    {
      id: 'attack',
      label: 'Агрессивная сборка',
      description: 'Максимальный урон за счёт атакующих сфер',
      basic: attackBasics.slice(0, 3).map(o => o.id),
      special: strengthenSpecial[0]?.id ?? null
    },
    {
      id: 'defense',
      label: 'Железная оборона',
      description: 'Повышение живучести и защита',
      basic: hpBasics.slice(0, 3).map(o => o.id),
      special: shieldSpecial[0]?.id ?? null
    },
    {
      id: 'speed',
      label: 'Молниеносный удар',
      description: 'Баланс атаки и скорости',
      basic: [attackBasics[0]?.id, attackBasics[1]?.id, boostBasics[0]?.id].filter(Boolean) as string[],
      special: speedSpecial[0]?.id ?? null
    }
  ].filter(set => set.id === 'custom' || set.basic.length > 0 || set.special);

  let selectedGene = 'all';
  let searchTerm = '';
  let selectedSort = 'name';
  let selectedMutant: any = null;
  let selectedMutantKey = '';
  let starLevel = 0;
  let levelValue = 30;
  let levelText = '30';
  const levelInputId = 'mutant-level-input';

  let currentBase: any = null;
  let currentStats: any = null;
  let displayMutant: any = null;

  let basicSlots: (any | null)[] = [null, null, null, null];
  let specialSlot: any | null = null;
  let openOrbMenu: number | 'special' | null = null;
  let selectedOrbSet = 'custom';

  function normalizeImage(path: string) {
    if (!path) return '';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function clampLevelNumber(value: number) {
    if (Number.isNaN(value)) return 1;
    return Math.min(Math.max(Math.round(value), 1), 100);
  }

  function clampStarNumber(value: number) {
    if (Number.isNaN(value)) return 0;
    return Math.min(Math.max(Math.round(value), 0), starOptions.length - 1);
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

  function getOrbImageCandidates(orb: any) {
    const id = orb?.id?.toLowerCase?.();
    if (!id) return [];
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
    return Array.from(candidates);
  }

  const orbImageCandidatesCache = new Map<string, string[]>();

  function orbImagePath(orb: any) {
    if (!orb?.id) return '';
    const isSpecial = orb.id.toLowerCase().includes('special');
    const folder = isSpecial ? 'special' : 'basic';
    const candidates = getOrbImageCandidates(orb);
    if (!candidates.length) return '';
    orbImageCandidatesCache.set(orb.id, candidates);
    return `/orbs/${folder}/${candidates[0]}.png`;
  }

  function handleOrbImageError(event: Event, orb: any) {
    const img = event.currentTarget as HTMLImageElement;
    const id = orb?.id;
    if (!id) return;
    const isSpecial = id.toLowerCase().includes('special');
    const folder = isSpecial ? 'special' : 'basic';
    const candidates = orbImageCandidatesCache.get(id) ?? getOrbImageCandidates(orb);
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
    return (
      ABILITY_RU[name] ||
      ABILITY_RU[normalized] ||
      fallbackAbilityName(name)
    );
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

  function getSortValue(mutant: any, key: string) {
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

  $: candidateMutants = (() => {
    let list = normalData;
    if (selectedGene !== 'all') {
      const g = selectedGene.toUpperCase();
      list = list.filter(m => Array.isArray(m.genes) && m.genes.some((v: string) => v.toUpperCase().includes(g)));
    }
    if (searchTerm.trim()) {
      const lc = searchTerm.trim().toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(lc));
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

  function selectMutant(mutant: any) {
    if (!mutant) return;
    selectedMutantKey = canonicalId(mutant.id);
    selectedMutant = starMaps[0].get(selectedMutantKey) ?? mutant;
    levelValue = clampLevelNumber(levelValue);
    levelText = String(levelValue);
    basicSlots = [null, null, null, null];
    specialSlot = null;
    openOrbMenu = null;
    selectedOrbSet = 'custom';
  }

  function getCurrentBase() {
    if (!selectedMutantKey) return undefined;
    const datasetMap = starMaps[starLevel] || starMaps[0];
    return datasetMap.get(selectedMutantKey) || starMaps[0].get(selectedMutantKey) || null;
  }

  const abilityPatterns = [
    { key: 'shield', tokens: ['shield'] },
    { key: 'strengthen', tokens: ['strengthen'] },
    { key: 'weaken', tokens: ['weaken'] },
    { key: 'slash', tokens: ['slash'] },
    { key: 'retaliate', tokens: ['retaliate'] },
    { key: 'regen', tokens: ['regen', 'regenerate'] }
  ];

  function boostAbility(abilities: any[], key: string, amount: number, addIfMissing: boolean) {
    const lowerKey = key.toLowerCase();
    const matches = abilities.filter(ab => ab.name?.toLowerCase()?.includes(lowerKey));
    if (matches.length) {
      matches.forEach(ab => {
        const bonus = Number.isFinite(ab.orbBonus) ? Number(ab.orbBonus) : 0;
        ab.orbBonus = bonus + amount;
        const current = Number.isFinite(ab.pct) ? Number(ab.pct) : 0;
        ab.pct = current + amount;
      });
      return;
    }
    if (addIfMissing) {
      abilities.push({
        name: `ability_${key}`,
        pct: amount,
        basePct: 0,
        orbBonus: amount,
        addedByOrb: true
      });
    }
  }

  function applyOrbEffects(orb: any, modifiers: { attack: number; hp: number; speed: number }, abilities: any[]) {
    if (!orb) return;
    const id = orb.id?.toLowerCase?.();
    const percentValue = Number(orb.percent ?? 0);
    if (!id || Number.isNaN(percentValue)) return;
    if (id.includes('attack')) {
      modifiers.attack += percentValue;
    }
    if (id.includes('life') || id.includes('health')) {
      modifiers.hp += percentValue;
    }
    if (id.includes('speed')) {
      modifiers.speed += percentValue;
    }
    const amount = Math.abs(percentValue);
    for (const pattern of abilityPatterns) {
      if (pattern.tokens.some(token => id.includes(`add${token}`))) {
        boostAbility(abilities, pattern.key, amount, true);
        return;
      }
    }
    for (const pattern of abilityPatterns) {
      if (pattern.tokens.some(token => id.includes(`_${token}`))) {
        boostAbility(abilities, pattern.key, amount, true);
        return;
      }
    }
  }

  function prepareAbilities(baseAbilities: any[]) {
    return baseAbilities
      .map(ab => ({
        ...ab,
        pct: Number(ab.pct ?? 0),
        basePct: Number(ab.basePct ?? ab.pct ?? 0),
        orbBonus: Number(ab.orbBonus ?? 0),
        addedByOrb: Boolean(ab.addedByOrb)
      }))
      .filter(ab => ab.pct > 0 || ab.basePct > 0 || ab.addedByOrb || ab.orbBonus > 0)
      .map(ab => ({
        ...ab,
        label: abilityLabel(ab.name),
        isPlus: /_plus$/i.test(ab.name ?? '')
      }));
  }

  function computeStats(baseEntry: any) {
    if (!baseEntry) return null;
    const lvl = clampLevelNumber(levelValue);
    if (lvl !== levelValue) {
      levelValue = lvl;
      levelText = String(lvl);
    }
    const hpBase = Number(baseEntry.base_stats?.lvl1?.hp ?? 0);
    const hp = hpBase * (lvl / 10 + 0.9);

    const atk1BaseLvl1 = Number(baseEntry.base_stats?.atk1_base ?? baseEntry.base_stats?.lvl1?.atk1 ?? 0);
    const atk1pBase = Number(
      baseEntry.base_stats?.atk1p_base ??
        (baseEntry.base_stats?.lvl30?.atk1 ? baseEntry.base_stats.lvl30.atk1 / 3.9 : atk1BaseLvl1)
    );
    const atk1Base = lvl < 10 ? atk1BaseLvl1 : atk1pBase;
    const atk1 = atk1Base * (lvl / 10 + 0.9);

    const atk2BaseLvl1 = Number(baseEntry.base_stats?.atk2_base ?? baseEntry.base_stats?.lvl1?.atk2 ?? 0);
    const atk2pBase = Number(
      baseEntry.base_stats?.atk2p_base ??
        (baseEntry.base_stats?.lvl30?.atk2 ? baseEntry.base_stats.lvl30.atk2 / 3.9 : atk2BaseLvl1)
    );
    const atk2Base = lvl < 15 ? atk2BaseLvl1 : atk2pBase;
    const atk2 = atk2Base * (lvl / 10 + 0.9);

    const spdBase = Number(baseEntry.base_stats?.lvl1?.spd ?? 0);

    const modifiers = { attack: 0, hp: 0, speed: 0 };
    const abilities = (baseEntry.abilities ? baseEntry.abilities.map((ab: any) => ({
      ...ab,
      pct: Number(ab.pct ?? 0),
      basePct: Number(ab.pct ?? 0),
      orbBonus: 0,
      addedByOrb: false
    })) : []) as any[];

    basicSlots.forEach(orb => applyOrbEffects(orb, modifiers, abilities));
    applyOrbEffects(specialSlot, modifiers, abilities);

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
      abilities: prepareAbilities(abilities),
      name_attack1: baseEntry.name_attack1,
      name_attack2: baseEntry.name_attack2,
      name_attack3: baseEntry.name_attack3,
      multiplier: Number(baseEntry.multiplier ?? 1)
    };
  }

  $: if (starLevel !== clampStarNumber(starLevel)) {
    starLevel = clampStarNumber(starLevel);
  }

  $: currentBase = getCurrentBase();
  $: currentStats = computeStats(currentBase);
  $: displayMutant = currentBase ?? selectedMutant;

  $: basicSlotCount = (() => {
    if (!currentBase) return 0;
    return currentBase.type && currentBase.type.toUpperCase() === 'HEROIC' ? 4 : 3;
  })();

  function applyRecommendedSet(setId: string) {
    selectedOrbSet = setId;
    const set = recommendedOrbSets.find(s => s.id === setId);
    if (!set || setId === 'custom') {
      return;
    }
    const nextBasic = [null, null, null, null];
    for (let i = 0; i < basicSlotCount; i += 1) {
      const orbId = set.basic[i] ?? set.basic[set.basic.length - 1];
      nextBasic[i] = orbId ? orbMap.get(orbId) ?? null : null;
    }
    for (let i = basicSlotCount; i < 4; i += 1) {
      nextBasic[i] = null;
    }
    basicSlots = nextBasic;
    specialSlot = set.special ? orbMap.get(set.special) ?? null : null;
    openOrbMenu = null;
  }

  function handleDocumentClick(e: MouseEvent) {
    const path = e.composedPath() as HTMLElement[];
    const clickedInsideMenu = path.some(el => (el as HTMLElement).classList?.contains('orb-menu'));
    const clickedSlotButton = path.some(el => (el as HTMLElement).classList?.contains('orb-slot-button'));
    if (!clickedInsideMenu && !clickedSlotButton) {
      openOrbMenu = null;
    }
  }

  onMount(() => {
    window.addEventListener('click', handleDocumentClick);
    return () => window.removeEventListener('click', handleDocumentClick);
  });
</script>

<style>
  :global(body) {
    background-color: #2f3140;
  }
  .scroll-container {
    max-height: 32rem;
    overflow-y: auto;
  }
  .orb-menu {
    z-index: 60;
    max-height: 14rem;
    overflow-y: auto;
  }
  .stat-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.85rem;
    border-radius: 0.75rem;
    background: linear-gradient(120deg, rgba(87, 92, 121, 0.4), rgba(59, 63, 84, 0.8));
  }
  .stat-row + .stat-row {
    margin-top: 0.6rem;
  }
  .mutant-card {
    background: radial-gradient(circle at top, rgba(86, 93, 126, 0.6), rgba(38, 41, 56, 0.9));
    border: 1px solid rgba(126, 137, 189, 0.25);
    border-radius: 1.5rem;
    box-shadow: 0 30px 50px rgba(8, 10, 25, 0.45);
  }
  .selector-panel {
    background: rgba(32, 34, 45, 0.85);
    border: 1px solid rgba(88, 95, 135, 0.35);
    border-radius: 1.25rem;
    box-shadow: 0 20px 40px rgba(6, 8, 20, 0.35);
  }
  .gene-chip {
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .gene-chip:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 18px rgba(21, 24, 38, 0.4);
  }
</style>

<div class="min-h-screen py-10 px-3 sm:px-6 lg:px-12 bg-gradient-to-b from-[#232530] via-[#20222c] to-[#1a1b23] text-white">
  <div class="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
    <aside class="selector-panel p-6 space-y-6">
      <div>
        <h2 class="text-lg font-semibold tracking-wide text-gray-200 uppercase">Каталог мутантов</h2>
        <p class="text-sm text-gray-400 mt-1">Фильтруйте по генам, находите мутантов и выбирайте нужного бойца.</p>
      </div>

      <div class="flex flex-wrap gap-3">
        {#each geneFilters as gf}
          <button
            type="button"
            class="gene-chip flex items-center gap-2 rounded-full px-3 py-1.5 border transition {selectedGene === gf.key ? 'border-violet-400 bg-violet-500/20' : 'border-transparent bg-black/30'}"
            on:click={() => selectedGene = gf.key}
          >
            <img src={gf.icon} alt={gf.title} class="w-5 h-5" />
            <span class="text-xs tracking-wide uppercase text-gray-200">{gf.title}</span>
          </button>
        {/each}
      </div>

      <div class="space-y-4">
        <div class="bg-black/30 border border-white/5 rounded-xl flex items-center px-3 py-2">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M18.65 10.83a7.83 7.83 0 11-15.66 0 7.83 7.83 0 0115.66 0z" />
          </svg>
          <input
            type="text"
            placeholder="Введите имя мутанта"
            bind:value={searchTerm}
            class="flex-1 bg-transparent px-3 py-1 text-sm focus:outline-none placeholder:text-gray-500"
          />
        </div>
        <div class="flex items-center gap-3 text-sm text-gray-300">
          <span class="text-gray-400">Сортировка:</span>
          <select
            class="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400"
            bind:value={selectedSort}
          >
            {#each sortOptions as opt}
              <option value={opt.value} class="bg-[#1f2130]">{opt.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="scroll-container pr-2 space-y-2">
        {#each candidateMutants.slice(0, 120) as mutant}
          <button
            type="button"
            class="w-full text-left group rounded-2xl border transition flex items-center gap-3 px-3 py-3 {selectedMutant?.id === mutant.id ? 'bg-violet-500/15 border-violet-400/60' : 'bg-black/25 border-white/5 hover:border-violet-300/40 hover:bg-violet-400/10'}"
            on:click={() => selectMutant(mutant)}
          >
            <div class="relative">
              <img src={normalizeImage(mutant.image?.[1] || mutant.image?.[0])} alt={mutant.name} class="w-14 h-14 rounded-xl object-cover border border-white/10" />
              <div class="absolute -bottom-1 right-1 flex -space-x-1">
                {#each mutant.genes?.slice(0, 2) as g}
                  <img src={geneFilters.find(f => f.key === g?.[0]?.toUpperCase())?.icon || '/genes/gene_all.png'} alt={g} class="w-4 h-4 border border-black rounded-full" />
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
                on:change={(e) => applyRecommendedSet((e.target as HTMLSelectElement).value)}
              >
                {#each recommendedOrbSets as set}
                  <option value={set.id} class="bg-[#1f2130]">{set.id === 'custom' ? 'Выберите набор сфер' : set.label}</option>
                {/each}
              </select>
              {#if selectedOrbSet !== 'custom'}
                <div class="text-xs text-gray-400 max-w-xs sm:max-w-[220px]">
                  {recommendedOrbSets.find(s => s.id === selectedOrbSet)?.description}
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
          </div>
        </div>
      {:else}
        <div class="h-full flex items-center justify-center text-gray-400 text-sm">
          Выберите мутанта слева, чтобы увидеть подробную карточку.
        </div>
      {/if}
    </section>
  </div>
</div>
