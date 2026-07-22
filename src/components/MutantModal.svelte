<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    STAR_LABEL,
    STAR_COLOR,
    TYPE_RU,
    geneLabel,
    bingoLabel,
    ABILITY_RU
  } from '@/lib/mutant-dicts';
  import { orbingMap } from '@/lib/orbing-map';
  import { calculateFinalStats } from '@/lib/stats/unified-calculator';
  import { textureUrl } from '@/lib/texture-cdn';

  let { open = false, mutant = null, star = 'normal', skins = [], onclose = undefined }: {
    open?: boolean;
    mutant?: any;
    star?: string;
    skins?: any[];
    onclose?: () => void;
  } = $props();

  const close = () => onclose?.();

  const STAR_MULTIPLIERS: Record<string, number> = {
    normal: 1.0,
    bronze: 1.1,
    silver: 1.3,
    gold: 1.75,
    platinum: 2.0
  };

  const STAR_ICONS: Record<string, string> = {
    normal: '/stars/no_stars.webp',
    bronze: '/stars/star_bronze.webp',
    silver: '/stars/star_silver.webp',
    gold: '/stars/star_gold.webp',
    platinum: '/stars/star_platinum.webp'
  };

  let originalFontSize = '';
  onMount(() => {
    originalFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '16px';
  });
  onDestroy(() => {
    document.documentElement.style.fontSize = originalFontSize;
  });

  // ===== Star switching =====
  const STAR_SWITCHER_BLOCKED = new Set(['specimen_bf_11', 'specimen_ce_10']);
  let selectedStar = $state('normal');

  $effect(() => {
    if (mutant?.stars) {
      const available = Object.keys(mutant.stars);
      if (available.includes(star)) {
        selectedStar = star;
      } else if (available.length > 0) {
        selectedStar = available[0];
      }
    } else {
      selectedStar = star || 'normal';
    }
  });

  let availableStars = $derived(mutant?.stars ? (() => {
    const stars = ['normal', 'bronze', 'silver', 'gold', 'platinum'];
    return stars.filter(s => mutant.stars?.[s]);
  })() : []);
  let currentMultiplier = $derived(mutant?.stars?.[selectedStar]?.multiplier ?? STAR_MULTIPLIERS[selectedStar] ?? 1.0);

  // ===== Skin switching =====
  let selectedSkin = $state(null);

  $effect(() => {
    if (mutant?.id) {
      selectedSkin = null;
    }
  });

  let displayMutant = $derived(selectedSkin ?? mutant);
  // Метка звезды в шапке: у скина своя звезда, она главнее выбранной вручную.
  let shownStar = $derived(selectedSkin?.star ?? selectedStar);
  // Кандидаты главной картинки + указатель на текущий; onerror двигает указатель.
  let heroSrcs = $derived(
    selectedSkin
      ? heroCandidates(selectedSkin, selectedSkin.star || 'normal')
      : heroCandidates(mutant, selectedStar)
  );
  let heroIdx = $state(0);
  // Сброс при смене мутанта/скина/звезды: heroSrcs пересобирается -> начинаем с лучшего.
  $effect(() => {
    heroSrcs;
    heroIdx = 0;
  });
  // Skin uses its own star for multiplier; base mutant uses selectedStar
  let displayMultiplier = $derived(
    selectedSkin
      ? (mutant?.stars?.[selectedSkin.star]?.multiplier ?? STAR_MULTIPLIERS[selectedSkin.star] ?? 1.0)
      : currentMultiplier
  );

  const SKIN_ICON: Record<string, string> = {
    // --- Имена гачи (skins.json генерируется из gacha.xml) -> существующие файлы иконок.
    // Старые ключи ниже оставлены как алиасы на случай ручных/легаси-данных.
    'girl': '/skins/icon_girl_power.webp',
    'starwars': '/skins/icon_star_wars.webp',
    'summer': '/skins/icon_summer_skin.webp',
    'spring': '/skins/icon_spring_skin.webp',
    'autumn': '/skins/icon_autumn_skin.webp',
    'school': '/skins/icon_school_skin.webp',
    'villains': '/skins/icon_villain.webp',
    'heroes': '/skins/icon_hero.webp',
    'worker': '/skins/icon_workers_day.webp',
    'labor': '/skins/icon_workers_day.webp',
    'europe': '/skins/icon_europe_day.webp',
    'independence': '/skins/icon_independence_day.webp',
    'blueplanet': '/skins/icon_blue_planet.webp',
    'valentines': '/skins/icon_valentine_s_day.webp',
    'aprilfools': '/skins/icon_1_april.webp',
    'tcg': '/skins/icon_card_game_skin.webp',
    'elements': '/skins/icon_elementals_team.webp',
    'lucha': '/skins/icon_muchachos.webp',
    'olympians': '/skins/icon_gods_of_olympus.webp',
    'patrick': '/skins/icon_saint_patrick_day.webp',
    'vegetal': '/skins/icon_photosynthesis.webp',
    'camo': '/skins/icon_army.webp',
    'revolution': '/skins/icon_french_revolution.webp',
    'beach': '/skins/icon_tropical_summer.webp',
    'music': '/skins/icon_disco.webp',
    'gachaboss': '/skins/icon_big_boss.webp',
    'movies': '/skins/icon_film.webp',
    'kings': '/skins/icon_royal.webp',
    // Скачаны с CDN игры (assets/gachacontent/icon_<gachaId>.png) -> webp.
    'advent': '/skins/icon_advent.webp',
    'chess': '/skins/icon_chess.webp',
    'confrontation': '/skins/icon_confrontation.webp',
    'honeybee': '/skins/icon_honeybee.webp',
    'jefferson': '/skins/icon_jefferson.webp',
    'masks': '/skins/icon_masks.webp',
    'olympics': '/skins/icon_olympics.webp',
    'science': '/skins/icon_science.webp',
    'soldiers': '/skins/icon_soldiers.webp',
    'xinnian': '/skins/icon_xinnian.webp',
    'xmas25': '/skins/icon_xmas25.webp',

    'anniversary': '/skins/icon_anniversary.webp',
    '1_april': '/skins/icon_1_april.webp',
    'autumn_skin': '/skins/icon_autumn_skin.webp',
    'carnival': '/skins/icon_carnival.webp',
    'card_game_skin': '/skins/icon_card_game_skin.webp',
    'easter': '/skins/icon_easter.webp',
    'elementals_team': '/skins/icon_elementals_team.webp',
    'europe_day': '/skins/icon_europe_day.webp',
    'fantasy': '/skins/icon_fantasy.webp',
    'girl_power': '/skins/icon_girl_power.webp',
    'gothic': '/skins/icon_gothic.webp',
    'halloween': '/skins/icon_halloween.webp',
    'hero': '/skins/icon_hero.webp',
    'japan': '/skins/icon_japan.webp',
    'muchachos': '/skins/icon_muchachos.webp',
    'oktoberfest': '/skins/icon_oktoberfest.webp',
    'Gods_of_Olympus': '/skins/icon_gods_of_olympus.webp',
    'royal': '/skins/icon_royal.webp',
    'saint_patrick_day': '/skins/icon_saint_patrick_day.webp',
    'school_skin': '/skins/icon_school_skin.webp',
    'photosynthesis': '/skins/icon_photosynthesis.webp',
    'army': '/skins/icon_army.webp',
    'spring_skin': '/skins/icon_spring_skin.webp',
    'star_wars': '/skins/icon_star_wars.webp',
    'steampunk': '/skins/icon_steampunk.webp',
    'summer_skin': '/skins/icon_summer_skin.webp',
    'blue_planet': '/skins/icon_blue_planet.webp',
    "valentine's_day": '/skins/icon_valentine_s_day.webp',
    "St. Valentine's Day": '/skins/icon_st._valentine_s_day.webp',
    'villain': '/skins/icon_villain.webp',
    'western': '/skins/icon_western.webp',
    'winter': '/skins/icon_winter.webp',
    'workers_day': '/skins/icon_workers_day.webp',
    'french_revolution': '/skins/icon_french_revolution.webp',
    'tropical_summer': '/skins/icon_tropical_summer.webp',
    'tropical summer': '/skins/icon_tropical_summer.webp',
    'disco': '/skins/icon_disco.webp',
    'independence_day': '/skins/icon_independence_day.webp',
    'big_boss': '/skins/icon_big_boss.webp',
    'blood_sport': '/skins/icon_blood_sport.webp',
    'britani_buranka': '/skins/icon_britani_buranka.webp',
    'film': '/skins/icon_film.webp',
    'timecop': '/skins/icon_timecop.webp',
  };
  const skinIcon = (skinName: string) => {
    if (!skinName) return null;
    if (SKIN_ICON[skinName]) return SKIN_ICON[skinName];
    const lower = skinName.toLowerCase();
    if (SKIN_ICON[lower]) return SKIN_ICON[lower];
    // Normalize Unicode apostrophes and special chars
    const normalized = lower.replace(/[\u2018\u2019\u201A\uFF07]/g, "'").replace(/[^a-z0-9'_ ]/g, '');
    for (const [key, val] of Object.entries(SKIN_ICON)) {
      const normKey = key.toLowerCase().replace(/[\u2018\u2019\u201A\uFF07]/g, "'").replace(/[^a-z0-9'_ ]/g, '');
      if (normKey === normalized) return val;
    }
    return null;
  };

  // ===== helpers =====
  const baseId = (id?: string) =>
    String(id ?? '')
      .toLowerCase()
      .replace(/_+(?:normal|bronze|silver|gold|plat).*$/i, '');

  // Bingo from mutant data directly
  let displayBingo = $derived((() => {
    const raw = displayMutant?.bingo;
    let arr: string[] = [];
    if (Array.isArray(raw)) {
      arr = raw.map((x: any) =>
        typeof x === 'string' ? x : (x && typeof x === 'object' && typeof x.key === 'string' ? x.key : '')
      ).filter(Boolean);
    } else if (raw && typeof raw === 'object') {
      arr = Object.keys(raw);
    }
    return arr;
  })());

  const TYPE_ICON: Record<string, string> = {
    zodiac: '/mut_icons/icon_zodiac.webp',
    videogame: '/mut_icons/icon_videogame.webp',
    special: '/mut_icons/icon_special.webp',
    seasonal: '/mut_icons/icon_seasonal.webp',
    recipe: '/mut_icons/icon_recipe.webp',
    pvp: '/mut_icons/icon_pvp.webp',
    heroic: '/mut_icons/icon_heroic.webp',
    legend: '/mut_icons/icon_legendary.webp',
    legends: '/mut_icons/icon_legendary.webp',
    legendary: '/mut_icons/icon_legendary.webp',
    gacha: '/mut_icons/icon_gacha.webp',
    reactor: '/mut_icons/icon_gacha.webp',
    'реактор': '/mut_icons/icon_gacha.webp'
  };
  const typeIcon = (t?: string | null) => TYPE_ICON[String(t ?? '').toLowerCase()] ?? null;

  // Genes
  const GENE_ICON: Record<string, string> = {
    a: '/genes/gene_a.webp',
    b: '/genes/gene_b.webp',
    c: '/genes/gene_c.webp',
    d: '/genes/gene_d.webp',
    e: '/genes/gene_e.webp',
    f: '/genes/gene_f.webp',
    neutro: '/genes/gene_all.webp'
  };
  const normalizeGene = (code?: string | null) => {
    if (!code) return null;
    const k = String(code).trim().toLowerCase();
    if (k === 'neutral' || k === 'none' || k === 'all') return 'neutro';
    return k;
  };
  const geneIcon = (code?: string | null) => {
    const k = normalizeGene(code);
    return k ? (GENE_ICON[k] ?? null) : null;
  };

  // Ability icons
  const ABILITY_ICON: Record<string, string> = {
    weaken: '/ability/ability_weaken.webp',
    curse: '/ability/ability_weaken.webp',
    strengthen: '/ability/ability_strengthen.webp',
    buff: '/ability/ability_strengthen.webp',
    slash: '/ability/ability_slash.webp',
    wound: '/ability/ability_slash.webp',
    bleed: '/ability/ability_slash.webp',
    shield: '/ability/ability_shield.webp',
    protect: '/ability/ability_shield.webp',
    retaliate: '/ability/ability_retaliate.webp',
    counter: '/ability/ability_retaliate.webp',
    regenerate: '/ability/ability_regenerate.webp',
    lifesteal: '/ability/ability_regenerate.webp',
    life_drain: '/ability/ability_regenerate.webp',
    drain: '/ability/ability_regenerate.webp',
    regen: '/ability/ability_regenerate.webp'
  };
  const ABILITY_RU_INV: Record<string, string> = {};
  for (const k in (ABILITY_RU as any)) {
    const v = (ABILITY_RU as any)[k];
    if (typeof v === 'string') ABILITY_RU_INV[v.toLowerCase()] = k.toLowerCase();
  }
  const abilityIcon = (name?: string | null): string | null => {
    if (!name) return null;
    const raw = String(name).trim().toLowerCase();
    if (ABILITY_ICON[raw]) return ABILITY_ICON[raw];
    const ruToCode = ABILITY_RU_INV[raw];
    if (ruToCode && ABILITY_ICON[ruToCode]) return ABILITY_ICON[ruToCode];
    const alias: Record<string, string> = {
      'проклятие': 'weaken',
      'усиление': 'strengthen',
      'рана': 'slash',
      'кровотечение': 'slash',
      'щит': 'shield',
      'отражение': 'retaliate',
      'вытягивание жизни': 'regenerate',
      'регенерация': 'regenerate'
    };
    const a = alias[raw];
    return a ? (ABILITY_ICON[a] ?? null) : null;
  };

  // Names
  const attackName = (m: any, which: 1 | 2): string => {
    const local = which === 1 ? m?.name_attack1 : m?.name_attack2;
    if (local) return String(local);
    return which === 1 ? 'Атака 1' : 'Атака 2';
  };
  const abilityLabel = (name?: string) => {
    const raw = String(name ?? '');
    return ABILITY_RU?.[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Base fields — reactive to skin selection
  let baseStats = $derived(displayMutant?.base_stats ?? {});

  // Для скинов: hp/atk1/atk2 из skins.json, остальное (speed, silver и т.д.) из mutants.json
  // Скины уже содержат финальные значения на нужном уровне, не нужно применять level scaling
  function getSkinStats(skin: any, mutantBaseStats: any, level: number) {
    const lvl = level === 1 ? 'lvl1' : 'lvl30';
    const skinStats = skin?.base_stats?.[lvl] ?? {};
    const mutantStats = mutantBaseStats?.[lvl] ?? {};
    const abilities = displayMutant?.abilities ?? [];
    const abilityPct = level < 25
      ? (abilities[0]?.pct ?? 0)
      : (abilities[abilities.length > 1 ? 1 : 0]?.pct ?? 0);
    return {
      hp: skinStats.hp ?? 0,
      atk1: skinStats.atk1 ?? 0,
      atk2: skinStats.atk2 ?? 0,
      ability: Math.round((skinStats.atk1 ?? 0) * Math.abs(abilityPct) / 100),
      speed: mutantStats.speed ?? 0,
      silver: mutantStats.silver ?? 0,
    };
  }
  let genes = $derived(Array.isArray(displayMutant?.genes) ? displayMutant.genes[0] : '');

  let displayType = $derived(displayMutant?.type);

  // Reactive stats — recalculated when displayMutant or displayMultiplier change
  // For skins: values are already final in skins.json, no scaling needed
  let statsLvl1 = $derived(selectedSkin
    ? getSkinStats(selectedSkin, mutant?.base_stats, 1)
    : calculateFinalStats(baseStats, 1, displayMultiplier));
  let statsLvl30 = $derived(selectedSkin
    ? getSkinStats(selectedSkin, mutant?.base_stats, 30)
    : calculateFinalStats(baseStats, 30, displayMultiplier));
  let speedDisplay = $derived(Math.round(statsLvl1.speed * 100) / 100);
  let bankLvl1 = $derived(Math.round(statsLvl1.silver));

  const getAbilityValue = (level: number, abilityIndex: number, s1: any, s30: any): number => {
    const abilities = displayMutant?.abilities ?? [];
    if (abilityIndex < abilities.length && abilities[abilityIndex]) {
      const ability = abilities[abilityIndex];
      const isRetaliate = ability.name?.toLowerCase().includes('retaliate') ?? false;
      const abilityPct = ability.pct ?? 0;
      if (level < 25) {
        const atk = (isRetaliate || abilityIndex === 0) ? s1.atk1 : s1.atk2;
        return Math.round(atk * (abilityPct / 100));
      } else {
        const atk = (isRetaliate || abilityIndex === 0) ? s30.atk1 : s30.atk2;
        return Math.round(atk * (abilityPct / 100));
      }
    }
    const stats = level < 25 ? s1 : s30;
    return abilityIndex === 0 ? stats.ability : 0;
  };

  // Texture — specimen (head) only
  const imgSrc = (m: any, starKey: string) => {
    const starInfo = m?.stars?.[starKey];
    if (starInfo?.images) {
      const list = starInfo.images;
      const specimen = list.find((p: string) => p.includes('specimen'));
      if (specimen) return specimen.startsWith('/') ? specimen : `/${specimen}`;
      const pick = list[0];
      if (pick) return pick.startsWith('/') ? pick : `/${pick}`;
    }
    const list: string[] = m?.image ?? [];
    // Prefer semi-full specimen path for skins
    const semiFull = list.find((p) => p.includes('semi-full'));
    if (semiFull) return semiFull.startsWith('/') ? semiFull : `/${semiFull}`;
    const specimen = list.find((p) => p.includes('specimen'));
    if (specimen) return specimen.startsWith('/') ? specimen : `/${specimen}`;
    const pick = list[0];
    if (!pick) return '/placeholder-mutant.webp';
    return pick.startsWith('/') ? pick : `/${pick}`;
  };

  // Цепочка кандидатов для главной картинки, от лучшего к запасному:
  //   full со звездой -> full без звезды -> голова.
  // Второй шаг обязателен: у мутантов, существующих в одной форме (GACHA),
  // отрендерен только FULL_<code>.png без суффикса звезды.
  const heroCandidates = (m: any, starKey: string): string[] => {
    const abs = (p: string) => (p.startsWith('/') ? p : `/${p}`);
    const out: string[] = [];
    const skinFull = (m?.image ?? []).find((p: string) => p.includes('/full/'));
    if (skinFull) {
      out.push(abs(skinFull));
    } else {
      const code = String(m?.id ?? '')
        .replace(/^specimen[_-]/i, '')
        .replace(/_+(?:normal|bronze|silver|gold|plat.*)$/i, '')
        .toLowerCase();
      if (code) {
        const star = String(starKey || 'normal').toLowerCase();
        if (star && star !== 'normal') out.push(`/textures_by_mutant/${code}/FULL_${code}_${star}.png`);
        out.push(`/textures_by_mutant/${code}/FULL_${code}.png`);
      }
    }
    out.push(imgSrc(m, starKey));
    return out;
  };

  // formatting
  function fmt(n: any): string {
    if (n === undefined || n === null || n === '' || Number.isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('ru-RU');
  }
  function fmtNoSign(v: any): string {
    if (v === undefined || v === null || v === '' || Number.isNaN(Number(v))) return '—';
    const num = Number(v);
    if (Number.isFinite(num)) return Math.abs(num).toLocaleString('ru-RU');
    return String(v).replace(/^-+/, '');
  }

  // rows
  type Row = {
    atkName: string;
    dmg: any;
    abCode: string | null;
    abName: string;
    value: any;
    pct: any;
    gene?: string | null;
    isAoe?: boolean;
  };

  function getRows(level: number, s1: any, s30: any) {
    const s = level < 25 ? s1 : s30;
    const atk1 = s.atk1;
    const atk2 = s.atk2;

    const baseLvl = level === 1 ? baseStats.lvl1 : baseStats.lvl30;
    const baseLvl30 = baseStats.lvl30;

    const gene1 =
      baseLvl30?.atk1_gene ?? baseLvl?.atk1_gene ??
      (Array.isArray(genes) && genes[0] ? String(genes[0]).toLowerCase() : 'neutro');

    const gene2 =
      baseLvl30?.atk2_gene ?? baseLvl?.atk2_gene ?? gene1;

    const aoe1 = baseLvl30?.atk1_AOE ?? baseLvl?.atk1_AOE ?? false;
    const aoe2 = baseLvl30?.atk2_AOE ?? baseLvl?.atk2_AOE ?? false;

    const list = (Array.isArray(displayMutant?.abilities) ? displayMutant.abilities : []) as any[];
    const rows: Row[] = [];

    const bothRetaliate = list.length >= 2 &&
      list[0]?.name?.toLowerCase().includes('retaliate') &&
      list[1]?.name?.toLowerCase().includes('retaliate');

    let ab1, abilityIndex1;
    if (bothRetaliate) {
      ab1 = level < 25 ? list[0] : list[1];
      abilityIndex1 = level < 25 ? 0 : 1;
    } else {
      ab1 = list[0];
      abilityIndex1 = 0;
    }

    if (ab1) {
      const value1 = getAbilityValue(level, abilityIndex1, s1, s30);
      rows.push({
        atkName: attackName(displayMutant, 1),
        dmg: atk1,
        abCode: ab1.name || null,
        abName: ab1.name ? abilityLabel(ab1.name) : '—',
        value: value1,
        pct: ab1.pct,
        gene: gene1,
        isAoe: aoe1
      });
    }

    const ab2 = bothRetaliate ? null : list[1];
    rows.push({
      atkName: attackName(displayMutant, 2),
      dmg: atk2,
      abCode: ab2?.name || null,
      abName: ab2?.name ? abilityLabel(ab2.name) : '—',
      value: ab2 ? getAbilityValue(level, 1, s1, s30) : 0,
      pct: ab2?.pct ?? 0,
      gene: gene2,
      isAoe: aoe2
    });

    return rows;
  }

  let rowsLvl1 = $derived(getRows(1, statsLvl1, statsLvl30));
  let rowsLvl30 = $derived(getRows(30, statsLvl1, statsLvl30));

  // Misc
  let incubTime = $derived(
    displayMutant?.incub_time ??
    displayMutant?.incubation ??
    displayMutant?.incubation_time ??
    displayMutant?.incubationTime ??
    displayMutant?.incubation_hours ??
    displayMutant?.hatch_time ??
    null
  );

  // Orbing
  const getOrbingImages = (m: any) => {
    if (!m) return null;
    const id = String(m.id || '');
    if (orbingMap[id]) return orbingMap[id];
    const entry = Object.entries(orbingMap).find(([k]) => k.toLowerCase() === id.toLowerCase());
    if (entry) return entry[1];
    const bId = baseId(id);
    const entryBase = Object.entries(orbingMap).find(([k]) => k.toLowerCase() === bId.toLowerCase());
    if (entryBase) return entryBase[1];
    return null;
  };

  let orbingImages = $derived(getOrbingImages(displayMutant));

  // ===== a11y: focus trap =====
  let modalRef: HTMLElement = $state() as HTMLElement;
  let closeBtn: HTMLButtonElement = $state() as HTMLButtonElement;

  function focusFirst() {
    if (!modalRef) return;
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    const list = Array.from(modalRef.querySelectorAll<HTMLElement>(selectors))
      .filter((el) => el.offsetParent !== null);
    (list[0] || closeBtn)?.focus();
  }

  function onKeydownTrap(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    const items = Array.from(modalRef.querySelectorAll<HTMLElement>(selectors))
      .filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    }
  }

  // ESC
  let escHandler: (e: KeyboardEvent) => void;
  onMount(() => {
    escHandler = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', escHandler);
  });
  onDestroy(() => window.removeEventListener('keydown', escHandler));

  $effect(() => {
    if (open) {
      (async () => {
        await tick();
        try { modalRef?.scrollTo({ top: 0, behavior: 'auto' }); } catch {}
        focusFirst();
      })();
    }
  });
</script>

{#if open}
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center p-2 md:p-3 overflow-y-auto overscroll-contain"
  onclick={(e) => { if (e.target === e.currentTarget) close(); }}
  aria-hidden="false"
>
  <div
    bind:this={modalRef}
    role="dialog"
    aria-modal="true"
    aria-labelledby="mutant-title"
    onkeydown={onKeydownTrap}
    tabindex="-1"
    class="modal-2k relative w-full max-w-5xl grid md:grid-cols-[minmax(0,38%)_minmax(0,62%)] gap-2 md:gap-4 bg-slate-800/70 rounded-2xl max-h-[92svh] overflow-y-auto ring-1 ring-white/10"
  >
    <!-- Mobile close button -->
    <button
      class="mobile-close-btn"
      onclick={close}
      aria-label="Закрыть"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <!-- Left -->
    <div class="bg-gradient-to-b from-slate-900/80 to-slate-800/70 rounded-xl p-2 md:p-3 flex flex-col items-center ring-1 ring-white/10 overflow-hidden">
      <!-- Star switcher -->
      {#if availableStars.length > 1 && !STAR_SWITCHER_BLOCKED.has(mutant?.id)}
        <div class="flex gap-2 mb-2">
          {#each availableStars as s}
            <button
              class="star-switch-btn {selectedStar === s && !selectedSkin ? 'active' : ''}"
              onclick={() => { selectedStar = s; selectedSkin = null; }}
              title={STAR_LABEL[s] ?? s}
            >
              <img src={textureUrl(STAR_ICONS[s] ?? '/stars/no_stars.webp')} alt={s} class="w-6 h-6 object-contain" />
            </button>
          {/each}
        </div>
      {/if}
      {#if skins.length > 0}
        <div class="flex gap-1.5 mb-2 flex-wrap justify-center">
          {#each skins as s, i}
            <button
              class="skin-switch-btn {selectedSkin === s ? 'active' : ''}"
              onclick={() => { selectedSkin = (selectedSkin === s ? null : s); }}
              title={s.skin}
            >
              {#if skinIcon(s.skin)}
                <img src={textureUrl(skinIcon(s.skin))} alt="" class="w-9 h-9 object-contain" loading="lazy" decoding="async" />
              {:else}
                <img src={textureUrl(imgSrc(s, s.star || 'normal'))} alt="" class="w-9 h-9 object-contain" loading="lazy" decoding="async" />
              {/if}
              <span class="text-[9px] leading-tight">{s.skin}</span>
            </button>
          {/each}
        </div>
      {/if}
      <div class="flex-1 flex items-center justify-center w-full">
          <img
            alt={displayMutant?.name}
            src={textureUrl(heroSrcs[Math.min(heroIdx, heroSrcs.length - 1)])}
            onerror={() => {
              // Двигаемся по цепочке: full со звездой -> full без звезды -> голова.
              if (heroIdx < heroSrcs.length - 1) heroIdx += 1
            }}
            oncontextmenu={(e) => e.preventDefault()}
            draggable="false"
            class="mutant-hero-img max-w-full max-h-[55vh] w-auto h-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)] image-rendering-auto"
            loading="lazy"
            decoding="async"
          />
      </div>
    </div>

    <!-- Right -->
    <div class="space-y-2 md:space-y-3 p-2 md:p-3 min-w-0">
      <!-- Header -->
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h2 id="mutant-title" class="text-lg md:text-xl font-bold tracking-wide break-words">{mutant?.name}{selectedSkin ? ` — ${selectedSkin.skin}` : ''}</h2>
          <div class="mt-0.5 text-xs md:text-sm text-slate-300 flex items-center gap-2 flex-wrap">
            {#if typeIcon(displayType)}
              <span class="inline-flex items-center gap-1 break-words">
                <img class="type-icon opacity-90" src={textureUrl(typeIcon(displayType))} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                {TYPE_RU[displayType] ?? displayType}
              </span>
            {:else}
              <span class="break-words">{TYPE_RU[displayType] ?? displayType}</span>
            {/if}
            {#if genes}
              <span class="opacity-70">•</span>{geneLabel(genes)}
            {/if}
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          {#if mutant?.tier}
            <span class="px-2 py-1 rounded-full text-[11px] bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-500/40">Тир {mutant.tier}</span>
          {/if}
          <span class={`px-2 py-1 rounded-full text-[10px] ring-1 ${STAR_COLOR[shownStar]}`}>{STAR_LABEL[shownStar] ?? shownStar}</span>
        </div>
      </div>

      <!-- Lvl 1 -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 px-2 py-1.5 overflow-hidden">
        <div class="text-xs text-slate-300 mb-1.5">Статы на 1 уровне</div>
        <dl class="grid grid-cols-2 gap-y-[2px] text-sm mb-1">
          <dt class="mut-dt"><span class="row-icon"><img class="stat-icon" src={textureUrl("/etc/icon_hp.webp")} alt="" aria-hidden="true" loading="lazy" decoding="async" />HP</span></dt><dd class="mut-dd whitespace-nowrap pl-1">{fmt(statsLvl1.hp)}</dd>
          <dt class="mut-dt"><span class="row-icon"><img class="stat-icon" src={textureUrl("/etc/icon_speed.webp")} alt="" aria-hidden="true" loading="lazy" decoding="async" />Скорость</span></dt><dd class="mut-dd whitespace-nowrap pl-1">{fmt(speedDisplay)}</dd>
        </dl>

        <div class="mt-1 grid grid-cols-[26px_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-[2px] text-sm min-w-0">
          {#each rowsLvl1 as r}
            <div class="contents group">
              <div class="flex items-center">
                {#if geneIcon(r.gene)}
                  <span class="gene-ico">
                    <img src={textureUrl(geneIcon(r.gene))} alt="" aria-hidden="true" class="w-full h-full" loading="lazy" decoding="async" />
                    {#if r.isAoe}
                      <img src={textureUrl("/genes/atk_multiple.webp")} alt="" aria-hidden="true" class="gene-aoe" loading="lazy" decoding="async" />
                    {/if}
                  </span>
                {/if}
              </div>
              <div class="mut-dt break-words">{r.atkName}</div>
              <div class="mut-dd whitespace-nowrap pl-1">{fmt(r.dmg)}</div>
              <div class="mut-dt break-words flex items-center gap-1.5">
                {#if abilityIcon(r.abCode) || abilityIcon(r.abName)}
                  <img class="ability-icon align-middle" src={textureUrl(abilityIcon(r.abCode) || abilityIcon(r.abName))} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                {/if}
                {r.abName}
              </div>
              <div class="mut-dd text-right min-w-0">
                <div class="break-words">{fmtNoSign(r.value)}</div>
              </div>
            </div>
          {/each}
          {#if !rowsLvl1.length}
            <div class="col-span-5 text-sm text-slate-300">—</div>
          {/if}
        </div>
      </div>

      <!-- Lvl 30 -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 px-2 py-1.5 overflow-hidden">
        <div class="text-xs text-slate-300 mb-1.5">Статы на 30 уровне</div>
        <dl class="grid grid-cols-2 gap-y-[2px] text-sm mb-1">
          <dt class="mut-dt"><span class="row-icon"><img class="stat-icon" src={textureUrl("/etc/icon_hp.webp")} alt="" aria-hidden="true" loading="lazy" decoding="async" />HP</span></dt><dd class="mut-dd whitespace-nowrap pl-1">{fmt(statsLvl30.hp)}</dd>
          <dt class="mut-dt"><span class="row-icon"><img class="stat-icon" src={textureUrl("/etc/icon_speed.webp")} alt="" aria-hidden="true" loading="lazy" decoding="async" />Скорость</span></dt><dd class="mut-dd whitespace-nowrap pl-1">{fmt(speedDisplay)}</dd>
        </dl>

        <div class="mt-1 grid grid-cols-[26px_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-[2px] text-sm min-w-0">
          {#each rowsLvl30 as r}
            <div class="contents group">
              <div class="flex items-center">
                {#if geneIcon(r.gene)}
                  <span class="gene-ico">
                    <img src={textureUrl(geneIcon(r.gene))} alt="" aria-hidden="true" class="w-full h-full" loading="lazy" decoding="async" />
                    {#if r.isAoe}
                      <img src={textureUrl("/genes/atk_multiple.webp")} alt="" aria-hidden="true" class="gene-aoe" loading="lazy" decoding="async" />
                    {/if}
                  </span>
                {/if}
              </div>
              <div class="mut-dt break-words">{r.atkName}</div>
              <div class="mut-dd whitespace-nowrap pl-1">{fmt(r.dmg)}</div>
              <div class="mut-dt break-words flex items-center gap-1.5">
                {#if abilityIcon(r.abCode) || abilityIcon(r.abName)}
                  <img class="ability-icon align-middle" src={textureUrl(abilityIcon(r.abCode) || abilityIcon(r.abName))} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                {/if}
                {r.abName}
              </div>
              <div class="mut-dd text-right min-w-0">
                <div class="break-words">{fmtNoSign(r.value)}</div>
              </div>
            </div>
          {/each}
          {#if !rowsLvl30.length}
            <div class="col-span-5 text-sm text-slate-300">—</div>
          {/if}
        </div>
      </div>

      <!-- Bingo -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-2 overflow-hidden">
        <div class="text-xs text-slate-300 mb-1"><span class="row-icon"><img class="stat-icon" src={textureUrl("/etc/icon_bingo.webp")} alt="" aria-hidden="true" loading="lazy" decoding="async" />Бинго</span></div>
        {#if displayBingo.length}
          <div class="flex flex-wrap gap-2">
              {#each displayBingo as b}
              <span class="text-[11px] px-2 py-1 rounded-full bg-indigo-500/15 ring-1 ring-indigo-500/40 text-indigo-100 break-words">{bingoLabel(b)}</span>
            {/each}
          </div>
        {:else}
          <div class="text-sm text-slate-300">—</div>
        {/if}
      </div>

      <!-- Misc -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-2 overflow-hidden">
        <div class="text-xs text-slate-300 mb-1">Прочее</div>
        <div class="text-sm text-slate-200 space-y-1">
          <div class="flex items-center gap-2 leading-tight">
            <span class="row-icon"><img class="stat-icon" src={textureUrl("/cash/softcurrency.webp")} alt="" aria-hidden="true" loading="lazy" decoding="async" />Серебро (лвл 1):</span>
            <span class="text-white">{fmt(bankLvl1)}</span>
          </div>
          <div class="flex items-center gap-2 leading-tight">
            <span class="row-icon"><img class="stat-icon" src={textureUrl("/etc/icon_timer.webp")} alt="" aria-hidden="true" loading="lazy" decoding="async" />Инкубация:</span>
            <span class="text-white">{incubTime ?? '—'}</span>{#if incubTime != null}<span class="opacity-80"> мин.</span>{/if}
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-2 overflow-hidden">
        <div class="text-xs text-slate-300 mb-1">Описание</div>
        <div class="text-sm text-slate-300 leading-relaxed break-words">
          { (mutant?.name_lore ?? '').trim() || '—' }
        </div>
      </div>

      <!-- Spheres -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-2 overflow-hidden">
        <div class="text-xs text-slate-300 mb-2">Сферовка</div>
        {#if orbingImages && orbingImages.rows}
          <div class="flex flex-col items-center gap-3 py-2">
            {#each orbingImages.rows as row}
              <div class="flex items-center justify-center gap-3">
                {#each row as orbFile}
                  <div class="w-12 h-12 md:w-16 md:h-16 flex-shrink-0 relative group">
                    <img
                      src={textureUrl(orbFile.startsWith('special/') ? '/orbs/special/orb_slot_spe.webp' : '/orbs/basic/orb_slot.webp')}
                      alt=""
                      class="absolute inset-0 w-full h-full opacity-40"
                    />
                    <img
                      src={textureUrl(`/orbs/${orbFile}`)}
                      alt="Orb"
                      class="relative z-10 w-full h-full drop-shadow-md transition-transform group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                {/each}
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-sm text-slate-300 italic flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse"></span>
            Сферовки скоро появятся...
          </div>
        {/if}
      </div>

      <!-- Close -->
      <div class="mt-0 flex items-center justify-end">
        <button
          bind:this={closeBtn}
          class="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/50"
          onclick={close}
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
</div>
{/if}

<style>
  :root {
    font-size: 16px;
  }

  .stat-icon { width: 24px; height: 24px; display:inline-block; }
  .type-icon { width: 26px; height: 26px; display:inline-block; }
  .ability-icon { width: 24px; height: 24px; display:inline-block; vertical-align: middle; }
  .row-icon { display: inline-flex; align-items: center; gap: .45rem; }
  .mut-dt { color: rgba(255,255,255,.6); }
  .mut-dd { color: rgba(255,255,255,.9); }
  .break-words { overflow-wrap: break-word; word-break: break-word; }

  .gene-ico {
    position: relative;
    width: 26px;
    height: 26px;
    display: inline-block;
  }

  .gene-aoe {
    position: absolute;
    right: -6px;
    top: 0;
    bottom: 0;
    margin: auto 0;
    height: 100%;
    width: auto;
    pointer-events: none;
    filter: drop-shadow(0 1px 1px rgba(0,0,0,.55));
    opacity: .88;
    transition: opacity .12s linear;
  }
  .group:hover .gene-aoe { opacity: .96; }

  /* Star switcher */
  .star-switch-btn {
    padding: 4px;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    cursor: pointer;
    opacity: 0.5;
    transition: all 0.2s;
  }
  .star-switch-btn:hover { opacity: 0.8; background: rgba(255,255,255,0.1); }
  .star-switch-btn.active {
    opacity: 1;
    background: rgba(6,182,212,0.2);
    border-color: rgba(6,182,212,0.5);
  }

  /* Skin switcher */
  .skin-switch-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    cursor: pointer;
    opacity: 0.5;
    transition: all 0.2s;
    color: rgba(255,255,255,0.6);
  }
  .skin-switch-btn:hover { opacity: 0.8; background: rgba(255,255,255,0.1); }
  .skin-switch-btn.active {
    opacity: 1;
    background: rgba(6,182,212,0.2);
    border-color: rgba(6,182,212,0.5);
    color: #fff;
  }

  @media (max-width: 1200px) {
    :root {
      font-size: 16px;
    }

    .stat-icon { width: 18px; height: 18px; }
    .type-icon { width: 20px; height: 20px; }
    .ability-icon { width: 18px; height: 18px; }
    .gene-ico { width: 20px; height: 20px; }
    .gene-aoe { right: -3px; }
  }

  @media (max-width: 640px) {
    .stat-icon { width: 16px; height: 16px; }
    .type-icon { width: 18px; height: 18px; }
    .ability-icon { width: 16px; height: 16px; }
    .gene-ico { width: 18px; height: 18px; }
    .mut-dt, .mut-dd { font-size: 11px; }
  }

  @media (max-width: 400px) {
    .stat-icon { width: 14px; height: 14px; }
    .type-icon { width: 16px; height: 16px; }
    .ability-icon { width: 14px; height: 14px; }
    .gene-ico { width: 16px; height: 16px; }
    .mut-dt, .mut-dd { font-size: 10px; }
  }

  .mobile-close-btn {
    display: none;
  }
  @media (max-width: 768px) {
    .mobile-close-btn {
      display: flex;
      position: sticky;
      top: 0;
      float: right;
      z-index: 10;
      width: 28px;
      height: 28px;
      align-items: center;
      justify-content: center;
      border-radius: 7px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(15,23,42,0.85);
      backdrop-filter: blur(8px);
      color: #ef4444;
      cursor: pointer;
      margin: 4px 4px 0 0;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }
    .mobile-close-btn:active {
      background: rgba(99,102,241,0.3);
      color: #fff;
      transform: scale(0.92);
    }
  }
</style>
