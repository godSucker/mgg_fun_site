<script>
  // --- ИМПОРТЫ ДАННЫХ ---
  import mutantsRaw from '@/data/mutants/mutants.json';
  import orbsRaw from '@/data/materials/orbs.json';
  import { ABILITY_RU, TYPE_RU } from '@/lib/mutant-dicts';
  import { normalizeSearch } from '@/lib/search-normalize';
  import { calculateFinalStats } from '@/lib/stats/unified-calculator';
  import { sortMutantsByGene } from '@/lib/mutant-sort';
  import { applySpeedSphere } from '@/lib/stats/speed-sphere-table';

  // --- БИБЛИОТЕКА ДЛЯ СКРИНШОТОВ ---
  import domtoimage from 'dom-to-image-more';

  // --- УТИЛИТЫ И КОНСТАНТЫ ---
  const GENE_NAME = {
    A: 'Кибер',
    B: 'Зверь',
    C: 'Галактик',
    D: 'Зомби',
    E: 'Мифик',
    F: 'Рубака',
  };
  const GENE_ICON = {
    '': '/genes/gene_all.webp',
    A: '/genes/gene_a.webp',
    B: '/genes/gene_b.webp',
    C: '/genes/gene_c.webp',
    D: '/genes/gene_d.webp',
    E: '/genes/gene_e.webp',
    F: '/genes/gene_f.webp',
  };
  const ATTACK_GENE_ICON = {
    a: '/genes/gene_a.webp',
    b: '/genes/gene_b.webp',
    c: '/genes/gene_c.webp',
    d: '/genes/gene_d.webp',
    e: '/genes/gene_e.webp',
    f: '/genes/gene_f.webp',
    neutro: '/genes/gene_all.webp',
    neutral: '/genes/gene_all.webp',
    none: '/genes/gene_all.webp',
    all: '/genes/gene_all.webp',
  };
  const STAR_KEYS = ['normal', 'bronze', 'silver', 'gold', 'platinum'];
  const STAR_ICON = {
    0: '/stars/no_stars.webp',
    1: '/stars/star_bronze.webp',
    2: '/stars/star_silver.webp',
    3: '/stars/star_gold.webp',
    4: '/stars/star_platinum.webp'
  };
  const STAR_IMAGE_KEYWORDS = {
    normal: ['_normal', 'normal'],
    bronze: ['_bronze', 'bronze'],
    silver: ['_silver', 'silver'],
    gold: ['_gold', 'gold'],
    platinum: ['_platinum', '_plat', 'platinum', 'plat']
  };
  const STAT_ICON = {
    hp: '/etc/icon_hp.webp',
    atk: '/etc/icon_atk.webp',
    speed: '/etc/icon_speed.webp',
  };
  const TYPE_ICON = {
    default: '/mut_icons/icon_special.webp',
    special: '/mut_icons/icon_special.webp',
    heroic: '/mut_icons/icon_heroic.webp',
    legend: '/mut_icons/icon_legendary.webp',
    legendary: '/mut_icons/icon_legendary.webp',
    gacha: '/mut_icons/icon_gacha.webp',
    pvp: '/mut_icons/icon_pvp.webp',
    seasonal: '/mut_icons/icon_seasonal.webp',
    recipe: '/mut_icons/icon_recipe.webp',
    videogame: '/mut_icons/icon_videogame.webp',
    video_game: '/mut_icons/icon_videogame.webp',
    morphology: '/mut_icons/icon_morphology.webp',
    zodiac: '/mut_icons/icon_zodiac.webp',
    limited: '/mut_icons/limited.webp',
    community: '/mut_icons/icon_special.webp',
  };

  const SPECIAL_SLOT_COUNT = 1;

  const byNameAsc  = (a, b) => a.name.localeCompare(b.name, 'ru');
  const byNameDesc = (a, b) => b.name.localeCompare(a.name, 'ru');
  const byGene     = sortMutantsByGene;

  // --- ЛОГИКА ОБРАБОТКИ ДАННЫХ ---
  function normalizeMutants(raw) {
    return raw.map((m) => {
      const bId = baseIdOf(m);
      const genesRaw = Array.isArray(m.genes) ? m.genes : [m.genes];
      const genes = genesRaw
        .filter(Boolean)
        .flatMap((g) => String(g || '').toUpperCase().split(''))
        .filter(Boolean);
      const geneKey = genes.join('');
      // Use stars.normal images first, fallback to old image field
      const starValues = Object.values(m.stars ?? {});
      const defaultStarImgs = m.stars?.normal?.images ?? (starValues[0] ? starValues[0].images : undefined);
      const images = normalizeImages(m.image?.length ? m.image : defaultStarImgs);
      const baseStats = m.base_stats || {};
      const lvl1 = baseStats.lvl1 || {};
      const lvl30 = baseStats.lvl30 || {};
      const hpBase = numberOr(baseStats.hp_base, numberOr(lvl1.hp, 0));
      const atk1Base = numberOr(baseStats.atk1_base, numberOr(lvl1.atk1, 0));
      const atk1pBase = numberOr(baseStats.atk1p_base, numberOr(lvl30.atk1, atk1Base));
      const atk2Base = numberOr(baseStats.atk2_base, numberOr(lvl1.atk2, 0));
      const atk2pBase = numberOr(baseStats.atk2p_base, numberOr(lvl30.atk2, atk2Base));
      const speed = numberOr(baseStats.speed_base, numberOr(lvl30.spd, numberOr(lvl1.spd, m.speed)));
      const bankBase = numberOr(baseStats.bank_base, 0);
      const abilityPct1 = numberOr(baseStats.abilityPct1, 0);
      const abilityPct2 = numberOr(baseStats.abilityPct2, 0);

      const typeRaw = tag(m, 'type') ?? m.type ?? '';
      const tierRaw = tag(m, 'tier') ?? m.tier ?? '';
      const typeKey = String(typeRaw || '').trim();
      const typeKind = typeKey.toLowerCase();
      const typeLabel = readableType(typeRaw);
      const tierLabel = readableTier(tierRaw);
      const basicSlotCount = slotsForType(typeKind);
      
      // Build available stars from m.stars object
      const availableStars = new Set();
      const mStars = m.stars ?? {};
      if (mStars.normal) availableStars.add(0);
      if (mStars.bronze) availableStars.add(1);
      if (mStars.silver) availableStars.add(2);
      if (mStars.gold) availableStars.add(3);
      if (mStars.platinum) availableStars.add(4);

      const starMultipliers = {
        0: 1.0,
        1: 1.1,
        2: 1.3,
        3: 1.75,
        4: 2.0,
      };
      return {
        id: bId,
        baseId: bId,
        name: m.name,
        type: typeRaw,
        typeKey,
        typeLabel,
        tier: tierRaw,
        tierLabel,
        genes,
        geneKey,
        images,
        hpBase,
        atk1Base,
        atk1PlusBase: atk1pBase,
        atk2Base,
        atk2PlusBase: atk2pBase,
        speed,
        bankBase,
        abilityPct1,
        abilityPct2,
        abilities: normalizeAbilities(m),
        starMultipliers,
        availableStars,
        basicSlotCount,
        specialSlotCount: SPECIAL_SLOT_COUNT,
        attackMeta: buildAttackMeta(m),
        _rawStars: m.stars ?? {},
      };
    });
  }


  function slotsForType(type){
    const key = String(type || '').trim().toLowerCase();
    if (key === 'default') return 1;
    if (key === 'heroic') return 3;
    return 2;
  }
  function baseIdOf(m){
    const raw = String(m?.id ?? m?.slug ?? m?.specimen ?? m?.name ?? '').trim();
    return raw
      .replace(/_(bronze|silver|gold|platinum)$/i, '')
      .replace(/_plat$/i, '');
  }
  function readableType(raw){
    const val = String(raw || '').trim();
    if (!val) return '—';
    return TYPE_RU[val] || niceLabel(val);
  }
  function readableTier(raw){
    const val = String(raw || '').trim();
    if (!val) return '—';
    return niceLabel(val);
  }
  function normalizeImages(img){
    const arr = Array.isArray(img) ? img : [img];
    return arr
      .map((p) => {
        const s = String(p || '').trim();
        if (!s) return '';
        const clean = s.replace(/^\/+/, '');
        return `/${clean}`;
      })
      .filter(Boolean);
  }
  function numberOr(val, fallback){
    const num = Number(val);
    return Number.isFinite(num) ? num : (fallback ?? 0);
  }
  function tag(m, key) {
    if (m.tags && Array.isArray(m.tags)) {
      const t = m.tags.find(t => t.key === key);
      return t?.value ?? null;
    }
    return m[key] ?? null;
  }

  function buildAttackMeta(mutant){
    const base = mutant?.base_stats ?? {};
    const lvl1 = base?.lvl1 ?? {};
    const lvl30 = base?.lvl30 ?? {};
    const meta = {};
    for (const idx of [1, 2]) {
      const geneRaw = firstDefined(
        mutant?.[`atk${idx}_gene`], // Check directly on the mutant object first
        base?.[`atk${idx}_gene`],
        lvl30?.[`atk${idx}_gene`],
        lvl1?.[`atk${idx}_gene`]
      );
      const aoeRaw = firstDefined(
        base?.[`atk${idx}_AOE`],
        lvl30?.[`atk${idx}_AOE`],
        lvl1?.[`atk${idx}_AOE`]
      );
      const nameRaw = firstDefined(
        mutant?.[`name_attack${idx}`],
        base?.[`atk${idx}_name`],
        lvl30?.[`atk${idx}_name`],
        lvl1?.[`atk${idx}_name`]
      );
      const gene = normalizeAttackGene(geneRaw);
      meta[idx] = {
        gene,
        geneIcon: attackGeneIconPath(gene),
        isAoe: toBoolean(aoeRaw),
        label: niceAttackLabel(idx, nameRaw),
      };
    }
    return meta;
  }

  function firstDefined(...values){
    for (const val of values) {
      if (val === undefined || val === null) continue;
      if (typeof val === 'string' && val.trim() === '') continue;
      return val;
    }
    return null;
  }

  function normalizeAttackGene(raw){
    const val = String(raw ?? '').trim();
    if (!val) return '';
    const lower = val.toLowerCase();
    if (lower === 'neutral' || lower === 'none' || lower === 'all') return 'neutro';
    return lower;
  }

  function attackGeneIconPath(code){
    const key = normalizeAttackGene(code);
    if (!key) return '';
    return ATTACK_GENE_ICON[key] || '';
  }

  function niceAttackLabel(index, rawName){
    const label = String(rawName ?? '').trim();
    if (label) return label;
    return `Атака ${index}`;
  }

  function toBoolean(value){
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (!lower) return false;
      if (['false', 'no', '0'].includes(lower)) return false;
      return true;
    }
    return Boolean(value);
  }
  function abilitySource(m){
    const raw = m?.abilities ?? tag(m, 'abilities') ?? [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return raw.split(/[;,]/);
    return [];
  }

  function normalizeAbilities(m){
    return abilitySource(m)
      .map((entry) => normalizeAbilityEntry(entry))
      .filter(Boolean);
  }

  function normalizeAbilityEntry(entry){
    if (!entry) return null;
    if (typeof entry === 'string') {
      const code = cleanAbilityCode(entry);
      if (!code) return null;
      return {
        code,
        label: abilityLabel(code),
        baseCode: abilityBaseCode(code),
        tier: abilityUpgradeTier(code),
        pct: null,
        hasAtk1: true,
        hasAtk2: true,
        raw: null,
      };
    }
    if (typeof entry === 'object') {
      const code = cleanAbilityCode(entry.name ?? entry.id ?? entry.code ?? '');
      if (!code) return null;
      const pct = toNumber(entry.pct ?? entry.percent ?? entry.percentage ?? entry.value);
      let hasAtk1 = abilityAppliesTo(entry, 'atk1');
      let hasAtk2 = abilityAppliesTo(entry, 'atk2');
      if (code.includes('retaliate')) {
        hasAtk2 = false;
      }
      return {
        code,
        label: abilityLabel(code),
        baseCode: abilityBaseCode(code),
        tier: abilityUpgradeTier(code),
        pct,
        hasAtk1,
        hasAtk2,
        raw: entry,
      };
    }
    return null;
  }

  function abilityUpgradeTier(code){
    const lower = String(code || '').toLowerCase();
    if (!lower) return 0;
    if (lower.endsWith('_plus_plus')) return 2;
    if (lower.endsWith('_plus')) return 1;
    return 0;
  }

  function abilityBaseCode(code){
    return String(code || '')
      .toLowerCase()
      .replace(/_plus_plus$/i, '')
      .replace(/_plus$/i, '');
  }

  function cleanAbilityCode(raw){
    const name = String(raw || '').trim();
    if (!name) return '';
    const match = name.match(/^([a-zA-Z0-9_]+)/);
    return (match ? match[1] : name).toLowerCase();
  }

  function abilityLabel(code){
    if (!code) return '—';
    const ru = ABILITY_RU[code] || ABILITY_RU[code.toLowerCase()] || niceLabel(code);
    const lower = code.toLowerCase();
    if (lower.endsWith('_plus_plus')) return `${ru} ++`;
    if (lower.endsWith('_plus')) return `${ru} +`;
    return ru;
  }

  function abilityBaseKey(raw){
    const base = String(raw || '')
      .trim()
      .toLowerCase()
      .split('#')[0];
    if (!base) return '';
    return abilityBaseCode(base);
  }

  function abilityCodeFromOrbId(id){
    const normalized = String(id || '')
      .trim()
      .toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('regenerate')) return 'ability_regen';
    if (normalized.includes('retaliate')) return 'ability_retaliate';
    if (normalized.includes('shield')) return 'ability_shield';
    if (normalized.includes('slash')) return 'ability_slash';
    if (normalized.includes('strengthen')) return 'ability_strengthen';
    if (normalized.includes('weaken')) return 'ability_weaken';
    return '';
  }

  function abilityAppliesTo(entry, key){
    const lowerKey = String(key || '').toLowerCase();
    if (lowerKey === 'atk1') {
      return hasAbilityValue(entry, 'value_atk1') || hasAbilityValue(entry, 'atk1');
    }
    if (lowerKey === 'atk2') {
      return hasAbilityValue(entry, 'value_atk2') || hasAbilityValue(entry, 'atk2');
    }
    return true;
  }

  function hasAbilityValue(entry, prefix){
    if (!entry || typeof entry !== 'object') return false;
    const keys = Object.keys(entry);
    return keys.some((k) => k.toLowerCase().startsWith(String(prefix).toLowerCase()) && entry[k] != null && entry[k] !== '');
  }

  function toNumber(value){
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function niceLabel(value){
    const s = String(value || '').trim();
    if (!s) return '—';
    return s
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Списки сфер
  const ORBS = buildOrbCatalog(orbsRaw);

  function buildOrbCatalog(raw){
    const list = Array.isArray(raw) ? raw : [];
    const basic = [];
    const special = [];
    for (const orb of list) {
      if (isTemporaryOrb(orb)) continue;
      
      const id = String(orb.id || '').trim();
      // Убираем сферы 0-2 лвл (обычные и особые)
      // Обычные: orb_basic_attack (0), _01 (1), _02 (2)
      // Особые: orb_special_... (0), _01 (1), _02 (2)
      if (id.endsWith('attack') || id.endsWith('attack_01') || id.endsWith('attack_02') ||
          id.endsWith('life') || id.endsWith('life_01') || id.endsWith('life_02') ||
          id.endsWith('speed') || id.endsWith('speed_01') || id.endsWith('speed_02') ||
          id.includes('critical') || // По задаче убираем все 0-2, критические обычно тоже имеют уровни, но в коде выше они не типизированы явно под расчет статов, но уберем их тоже если они попадают под паттерн.
          id.includes('regenerate') || id.includes('retaliate') || id.includes('shield') ||
          id.includes('slash') || id.includes('strengthen') || id.includes('weaken')) {
        
        // Проверяем уровень по суффиксу
        if (!id.includes('_03') && !id.includes('_04') && !id.includes('_05') && !id.includes('_06') && !id.includes('_07')) {
           // Если это сфера уровня 0 (без суффикса), 1 (_01) или 2 (_02), пропускаем
           if (id.match(/(_01|_02)$/) || !id.match(/_\d+$/)) continue;
        }
      }

      const item = enrichOrb(orb);
      if (!item) continue;
      if (item.category === 'special') special.push(item);
      else basic.push(item);
    }
    return { basic, special };
  }

  function isTemporaryOrb(orb){
    const id = String(orb?.id || '').toLowerCase();
    if (!id) return false;
    return id.includes('ephemeral') || id.includes('temporary');
  }

  function enrichOrb(orb){
    if (!orb) return null;
    const id = String(orb.id || '').trim();
    if (!id) return null;
    const category = id.startsWith('orb_special') ? 'special' : 'basic';
    const percent = Number(orb.percent ?? orb.pct ?? orb.percentage ?? 0);
    const specialAbility = specialAbilityFromOrb(id, percent);
    const effects = orbEffectsFromId(id, percent, specialAbility);
    return {
      ...orb,
      ...effects,
      percent,
      category,
      icon: `/orbs/${category}/${id}.webp`,
      type: category,
      specialAbility,
    };
  }

  function orbEffectsFromId(id, percent, specialAbility = null){
    const pct = Number.isFinite(percent) ? percent : 0;
    const abs = Math.abs(pct);
    const key = id.toLowerCase();
    if (key.includes('attack')) return { atkPct: pct };
    if (key.includes('health') || key.includes('_hp') || key.includes('life')) return { hpPct: pct };
    if (key.includes('speed')) return { speedPct: pct };
    if (!specialAbility) {
      const abilityCode = abilityCodeFromOrbId(id);
      if (abilityCode) {
        const baseCode = abilityBaseCode(abilityCode);
        return {
          abilityPct: abs,
          abilityCode,
          abilityBaseCode: baseCode,
          abilityLabel: abilityLabel(abilityCode),
        };
      }
    }
    return {};
  }

  function specialAbilityFromOrb(id, percent){
    const match = String(id || '')
      .toLowerCase()
      .match(/^orb_special_add([a-z_]+)/);
    if (!match) return null;
    const abilityKey = match[1];
    const code = specialAbilityCode(abilityKey);
    if (!code) return null;
    const pct = toNumber(percent);
    if (!Number.isFinite(pct)) return null;
    const base = abilityBaseCode(code);
    const label = abilityLabel(code);
    const hasAtk1 = true;
    const hasAtk2 = !base.includes('retaliate');
    return {
      code,
      label,
      baseCode: base,
      tier: 0,
      pct,
      hasAtk1,
      hasAtk2,
      raw: { source: 'special-orb', id },
    };
  }

  function specialAbilityCode(key){
    const normalized = String(key || '')
      .trim()
      .toLowerCase();
    if (!normalized) return '';
    if (normalized.startsWith('regenerate')) return 'ability_regen';
    if (normalized.startsWith('retaliate')) return 'ability_retaliate';
    if (normalized.startsWith('shield')) return 'ability_shield';
    if (normalized.startsWith('slash')) return 'ability_slash';
    if (normalized.startsWith('strengthen')) return 'ability_strengthen';
    if (normalized.startsWith('weaken')) return 'ability_weaken';
    return '';
  }

  // Приводим мутантов
  const ALL_MUTANTS = normalizeMutants(mutantsRaw);

  // --- РЕАКТИВНОЕ СОСТОЯНИЕ UI ---
  let query = '';                      // строка поиска
  let geneFilter = '';                 // '' = все, 'A'..'F' = конкретный ген (single select!)
  let gene2Filter = '';                // '' = все, 'A'..'F' = конкретный, 'neutral' = одногенный
  let sortMode = 'gene';               // nameAsc | nameDesc | gene
  let selected = ALL_MUTANTS[0];       // текущий мутант
  let level = 30;                      // уровень из инпута
  let stars = 0;                       // 0..4
  // выбранные сферы: массив из N базовых и 1 спец
  let basicSlots = [];                 // длина = selected.basicSlotCount
  let specialSlot = null;
  let orbModifiers = { hpPct: 0, atk1Pct: 0, atk2Pct: 0, speedPct: 0, abilityBonus: {} };
  let abilityRows = [];
  let attackRows = [];
  let typeIconCurrent = '';
  let allowedAbilityBases = new Set();
  let basicOrbOptions = ORBS.basic;

  // Состояние интерфейса
  let showCatalog = true; // Показывать ли поиск/каталог слева
  let isCopying = false;  // Состояние "Копируется..."
  let dropdownHost = null;
  let openDropdown = null; // 'basic-i' | 'special' | null
  let lastMutantId = null; // Для отслеживания смены мутанта

  // --- РАСЧЕТЫ ---
  // фильтрация + сортировка + поиск
  // Auto-reset gene2Filter when geneFilter is cleared
  $: if (!geneFilter) gene2Filter = '';

  $: filtered = ALL_MUTANTS
      .filter(m => {
        // If geneFilter is empty (meaning "ALL"), show all mutants that match the search
        if (!geneFilter) {
          if (query.trim()) {
            const normalizedQuery = normalizeSearch(query);
            const normalizedName = normalizeSearch(m.name);
            if (!normalizedName.includes(normalizedQuery)) return false;
          }
          return true;
        }
        
        // If geneFilter is set, apply gene filtering
        const firstGene = m.genes[0];
        if (firstGene !== geneFilter) return false;
        
        // If gene2Filter is empty (meaning "ALL"), show all mutants with the selected primary gene
        if (!gene2Filter) {
          if (query.trim()) {
            const normalizedQuery = normalizeSearch(query);
            const normalizedName = normalizeSearch(m.name);
            if (!normalizedName.includes(normalizedQuery)) return false;
          }
          return true;
        }
        
        // Apply secondary gene filter
        if (gene2Filter === 'neutral') {
          // Show only single-gene mutants (exactly one gene)
          if (m.genes.length !== 1) return false;
        } else {
          // Show only exact gene pairs
          if (m.genes.length < 2 || m.genes[1] !== gene2Filter) return false;
        }
        
        // Apply search filter
        if (query.trim()) {
          const normalizedQuery = normalizeSearch(query);
          const normalizedName = normalizeSearch(m.name);
          if (!normalizedName.includes(normalizedQuery)) return false;
        }
        return true;
      })
      .sort(byGene); // Always use genetic sorting

  // смена выбранного мутанта — сбрасываем слоты по его типу и выбираем макс. звезду
  $: if (selected && selected.id !== lastMutantId) {
    const count = Number.isFinite(selected.basicSlotCount) ? selected.basicSlotCount : 3;
    basicSlots = Array(count).fill(null);
    specialSlot = null;
    // Auto-select max available star ONLY when mutant changes
    const availableArray = Array.from(selected.availableStars);
    if (availableArray.length > 0) {
      stars = Math.max(...availableArray);
      lastMutantId = selected.id;
    }
  }

  $: allowedAbilityBases = buildAllowedAbilityBases(selected, specialSlot);
  $: basicOrbOptions = filterBasicOrbs(ORBS.basic, allowedAbilityBases);
  $: if (Array.isArray(basicSlots)) {
    const sanitized = basicSlots.map((orb) => allowOrbForAbilities(orb, allowedAbilityBases) ? orb : null);
    if (!arraysEqual(sanitized, basicSlots)) {
      basicSlots = sanitized;
    }
  }

  function figureImage(m, stars){
    if (!m) return '';
    return starTexture(m, stars) || portraitImage(m);
  }

  function portraitImage(m){
    if (!m) return '';
    return findImageByKeywords(m.images, ['specimen', 'icon', 'portrait', 'head']);
  }

  function listThumbnail(m){
    return portraitImage(m) || firstTexture(m.images);
  }

  function starTexture(m, stars){
    if (!m) return '';
    const key = STAR_KEYS[stars] ?? 'normal';
    // Use stars object from unified data
    const starData = m._rawStars?.[key];
    if (starData?.images?.length) {
      const imgs = normalizeImages(starData.images);
      const pick = findImageByKeywords(imgs, ['textures_by_mutant/']) || imgs[0];
      if (pick) return pick;
    }
    if (key === 'normal') {
      return baseTexture(m);
    }
    const keywords = STAR_IMAGE_KEYWORDS[key] || [key];
    return (
      findImageByKeywords(m.images, keywords)
      || baseTexture(m)
    );
  }

  function baseTexture(m){
    if (!m) return '';
    return (
      findImageByKeywords(m.images, STAR_IMAGE_KEYWORDS.normal)
      || findImageByKeywords(m.images, ['normal', 'default', 'full'])
      || firstTexture(m.images)
    );
  }

  function firstTexture(list, keyword = null){
    const arr = Array.isArray(list) ? list : [];
    if (!arr.length) return '';
    if (keyword) {
      const keywords = Array.isArray(keyword) ? keyword : [keyword];
      for (const key of keywords) {
        const lower = String(key || '').toLowerCase();
        const match = arr.find((p) => p && p.toLowerCase().includes(lower));
        if (match) return match;
      }
    }
    return arr[0];
  }

  function findImageByKeywords(list, keywords){
    const arr = Array.isArray(list) ? list : [];
    const keys = Array.isArray(keywords) ? keywords : [];
    for (const key of keys) {
      const lower = String(key || '').toLowerCase();
      const found = arr.find((p) => p && p.toLowerCase().includes(lower));
      if (found) return found;
    }
    return '';
  }

  function typeIconPath(typeKey){
    const raw = String(typeKey || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (TYPE_ICON[lower]) return TYPE_ICON[lower];
    const prefixed = `/mut_icons/icon_${lower}.webp`;
    return prefixed;
  }

  function abilityIconPath(code){
    const raw = String(code || '').trim().toLowerCase();
    if (!raw) return '';
    const stripped = raw
      .replace(/_plus_plus$/i, '')
      .replace(/_plus$/i, '');
    if (stripped === 'ability_regen') {
      return '/ability/ability_regenerate.webp';
    }
    return `/ability/${stripped}.webp`;
  }

  // Применение модификаторов сфер (проценты)
  function calcOrbModifiers(basic, special) {
    const mods = { hpPct: 0, atk1Pct: 0, atk2Pct: 0, speedPct: 0, abilityBonus: {} };
    const basicList = Array.isArray(basic) ? basic.filter(Boolean) : [];
    const all = special ? [...basicList, special] : [...basicList];
    for (const orb of all) {
      if (!orb) continue;
      const hp = toNumber(orb.hpPct ?? orb.hp_percent ?? orb.hp ?? orb.healthPct ?? orb.health);
      if (hp) mods.hpPct += hp;

      const atkCommon = toNumber(orb.atkPct ?? orb.attackPct ?? orb.atk ?? orb.attack);
      if (atkCommon) {
        mods.atk1Pct += atkCommon;
        mods.atk2Pct += atkCommon;
      }

      const atk1 = toNumber(orb.atk1Pct ?? orb.attack1Pct ?? orb.attack_1);
      if (atk1) mods.atk1Pct += atk1;

      const atk2 = toNumber(orb.atk2Pct ?? orb.attack2Pct ?? orb.attack_2);
      if (atk2) mods.atk2Pct += atk2;

      const speed = toNumber(orb.speedPct ?? orb.spdPct ?? orb.speed ?? orb.spd);
      if (speed) mods.speedPct += speed;

      const ability = toNumber(orb.abilityPct ?? orb.ability ?? orb.skillPct ?? orb.skills);
      if (ability) {
        const abilityBase = abilityBaseKey(orb.abilityBaseCode || orb.abilityCode);
        if (abilityBase) {
          mods.abilityBonus[abilityBase] = (mods.abilityBonus[abilityBase] || 0) + ability;
        } else {
          mods.abilityBonus.__all = (mods.abilityBonus.__all || 0) + ability;
        }
      }
    }
    return mods;
  }

  function starMulOf(m, s){
    return m?.starMultipliers?.[s] ?? 1.0;
  }

  function calcStats(m, lvl, s, mods){
    // Use unified smart stats calculator with debug
    const starMul = starMulOf(m, s);
    const baseStats = {
      hp_base: m.hpBase,
      atk1_base: m.atk1Base,
      atk1p_base: m.atk1PlusBase,
      atk2_base: m.atk2Base,
      atk2p_base: m.atk2PlusBase,
      speed_base: m.speed,
      bank_base: m.bankBase,
      abilityPct1: m.abilityPct1,
      abilityPct2: m.abilityPct2,
    };
    const result = calculateFinalStats(baseStats, lvl, starMul);

    // Apply orb modifiers if present
    let finalStats = { ...result };
    if (mods) {
      if (mods.hpPct) finalStats.hp = Math.round(result.hp * (1 + mods.hpPct / 100));
      if (mods.atk1Pct) finalStats.atk1 = Math.round(result.atk1 * (1 + mods.atk1Pct / 100));
      if (mods.atk2Pct) finalStats.atk2 = Math.round(result.atk2 * (1 + mods.atk2Pct / 100));
      if (mods.speedPct) finalStats.speed = applySpeedSphere(result.speed, mods.speedPct);
    }

    return {
      hp: finalStats.hp,
      atk1: finalStats.atk1,
      atk2: finalStats.atk2,
      speed: finalStats.speed,
      bank: finalStats.silver,
    };
  }

  $: orbModifiers = calcOrbModifiers(basicSlots, specialSlot);
  $: stats = selected ? calcStats(selected, level, stars, orbModifiers) : {hp:0, atk1:0, atk2:0, speed:0, bank: 0};
  $: abilityRows = selected ? calcAbilityRows(selected, stats, orbModifiers, level, specialSlot) : [];
  $: attackRows = buildAttackRows(selected, stats, abilityRows);
  $: typeIconCurrent = selected ? typeIconPath(selected.typeKey || selected.type) : '';

  function buildAttackRows(mutant, statLine, abilityList){
    if (!mutant) return [];
    const rows = [1, 2].map((idx) => {
      const meta = mutant?.attackMeta?.[idx] ?? {};
      const damage = Number(statLine?.[`atk${idx}`] ?? 0);
      const effects = [];
      if (Array.isArray(abilityList)) {
        abilityList.forEach((ability) => {
          if (!ability) return;
          const hit = Array.isArray(ability.values)
            ? ability.values.find((val) => val?.attack === idx)
            : null;
          if (!hit) return;
          effects.push({
            label: ability.label,
            percent: ability.percent,
            value: hit.value,
            icon: ability.icon || '',
          });
        });
      }
      const geneIcon = meta.geneIcon || '';
      const isAoe = Boolean(meta.isAoe);
      const label = meta.label || `Атака ${idx}`;
      return {
        attack: idx,
        label,
        geneIcon,
        isAoe,
        damage,
        effects,
      };
    });
    return rows.filter((row) => row.label || row.damage || row.effects.length);
  }

  function calcAbilityRows(mutant, statLine, mods, lvl, specialOrb){
    const baseList = Array.isArray(mutant?.abilities) ? mutant.abilities : [];
    const combined = [...baseList];
    const orbAbility = specialOrbAbilityEntry(specialOrb);
    if (orbAbility) combined.push(orbAbility);
    if (!combined.length) return [];
    const level = Number(lvl) || 1;
    const result = [];
    const abilityBoosts = mods?.abilityBonus ?? {};
    const atkValues = {
      1: statLine?.atk1 ?? 0,
      2: statLine?.atk2 ?? 0,
    };
    const grouped = new Map();
    for (const ability of combined) {
      if (!ability) continue;
      const base = ability.baseCode || ability.code;
      if (!grouped.has(base)) grouped.set(base, []);
      grouped.get(base).push(ability);
    }

    for (const [, entries] of grouped) {
      if (!entries.length) continue;
      const sorted = [...entries].sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));
      // Formula override for Wiki-sync data
      const ability = level >= 25 ? sorted[sorted.length - 1] : sorted[0];
      
      let basePct = 0;
      if (ability.raw?.source === 'special-orb') {
        basePct = toNumber(ability.pct);
      } else {
        basePct = level < 25 ? (mutant.abilityPct1 || 0) : (mutant.abilityPct2 || 0);
      }

      if (!Number.isFinite(basePct)) continue;
      const baseKey = abilityBaseKey(ability.baseCode || ability.code);
      const abilityBoost = Math.abs(abilityBoosts[baseKey] ?? abilityBoosts.__all ?? 0);
      const signedPct = basePct >= 0
        ? basePct + abilityBoost
        : -(Math.abs(basePct) + abilityBoost);

      const values = [];
      const isRetaliate = ability.code.toLowerCase().includes('retaliate');

      if (ability.hasAtk1) {
        const meta = mutant?.attackMeta?.[1] ?? {};
        const value = Math.floor(Math.abs((atkValues[1] || 0) * signedPct / 100));
        values.push({
          attack: 1,
          value,
          label: meta.label ?? `Атака 1`,
          geneIcon: meta.geneIcon || '',
          isAoe: Boolean(meta.isAoe),
          attackPower: Math.floor(Math.abs(atkValues[1] || 0)),
        });
      }
      if (ability.hasAtk2) {
        const meta = mutant?.attackMeta?.[2] ?? {};
        const value = isRetaliate ? 0 : Math.floor(Math.abs((atkValues[2] || 0) * signedPct / 100));
        if (value || ability.hasAtk1 === false || !values.length || isRetaliate) {
          values.push({
            attack: 2,
            value,
            label: meta.label ?? `Атака 2`,
            geneIcon: meta.geneIcon || '',
            isAoe: Boolean(meta.isAoe),
            attackPower: Math.floor(Math.abs(atkValues[2] || 0)),
          });
        }
      }

      if (!values.length) continue;
      result.push({
        code: ability.code,
        label: ability.label,
        values,
        icon: abilityIconPath(ability.code),
        percent: Math.abs(signedPct),
      });
    }
    return result;
  }

  function specialOrbAbilityEntry(orb){
    if (!orb || !orb.specialAbility) return null;
    const ability = orb.specialAbility;
    return {
      ...ability,
      code: ability.code,
      label: ability.label,
      baseCode: ability.baseCode,
      tier: ability.tier ?? 0,
      pct: ability.pct,
      hasAtk1: ability.hasAtk1 !== false,
      hasAtk2: ability.hasAtk2 !== false,
      raw: ability.raw ?? { source: 'special-orb', id: orb.id },
    };
  }

  function buildAllowedAbilityBases(mutant, specialOrb){
    const set = new Set();
    const baseList = Array.isArray(mutant?.abilities) ? mutant.abilities : [];
    for (const ability of baseList) {
      const base = abilityBaseKey(ability?.baseCode || ability?.code);
      if (base) set.add(base);
    }
    const extra = specialOrb?.specialAbility;
    if (extra) {
      const base = abilityBaseKey(extra.baseCode || extra.code);
      if (base) set.add(base);
    }
    return set;
  }

  function allowOrbForAbilities(orb, allowed){
    if (!orb) return true;
    const base = abilityBaseKey(orb.abilityBaseCode || orb.abilityCode);
    if (!base) return true;
    if (!(allowed instanceof Set) || !allowed.size) return false;
    return allowed.has(base);
  }

  function filterBasicOrbs(list, allowed){
    const arr = Array.isArray(list) ? list : [];
    return arr.filter((orb) => allowOrbForAbilities(orb, allowed));
  }

  function arraysEqual(a, b){
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function formatSpeed(value){
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const hasFraction = Math.round(abs * 100) !== Math.round(abs) * 100;
    return Number(value).toLocaleString('ru-RU', {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    });
  }

  // --- ХЭНДЛЕРЫ UI ---
  function toggleGene(letter){
    if (letter === 'all') {
      geneFilter = '';
      gene2Filter = '';
    } else {
      geneFilter = geneFilter === letter ? '' : letter;
    }
  }
  function toggleGene2(g){
    if (g === 'all') {
      gene2Filter = '';
    } else {
      gene2Filter = gene2Filter === g ? '' : g;
    }
  }
  function selectMutant(m){
    selected = m;
  }
  function pickBasic(slotIndex, orb){
    const choice = allowOrbForAbilities(orb, allowedAbilityBases) ? orb : null;
    basicSlots = basicSlots.map((v,i)=> i===slotIndex ? choice : v);
    openDropdown = null;
  }
  function pickSpecial(orb){
    specialSlot = orb;
    openDropdown = null;
  }
  function clearSlot(kind, i=null){
    if (kind==='basic') basicSlots = basicSlots.map((v,idx)=> idx===i ? null : v);
    else specialSlot = null;
  }

  // Закрытие открытых выпадашек по клику вне
  function windowClick(e){
    if (!openDropdown) return;
    if (!dropdownHost) return;
    if (!dropdownHost.contains(e.target)) openDropdown = null;
  }

  // --- NEW CODE: Логика скрытия каталога и скриншота ---

  function toggleCatalog() {
    showCatalog = !showCatalog;
  }
  
  // Show notification when screenshot is saved
  function showNotification(message) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification-toast');
    existingNotifications.forEach(el => el.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#22c55e', // green-500
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      zIndex: '9999',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      fontWeight: '600',
      fontSize: '14px',
      maxWidth: '300px',
      wordWrap: 'break-word',
      animation: 'slideInRight 0.3s ease-out'
    });
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 500);
      }
    }, 3000);
  }

    // --- ФУНКЦИЯ СКРИНШОТА (MOBILE + DESKTOP) ---
  async function shareScreenshot() {
    if (!selected || isCopying) return;
    const panelEl = document.querySelector('.panel');
    if (!panelEl) return;

    isCopying = true;

    try {
      // Определяем тип устройства по ширине окна
      const isMobile = window.innerWidth < 768;

      // Конфигурация размеров для мобильных и десктопов
      const config = isMobile ? {
        // МОБИЛЬНЫЕ: компактные размеры для предотвращения переполнения
        sandboxWidth: 420,
        mutantTexture: '200px',
        mutantFigureHeight: '240px',
        mutantFigureAfterWidth: '240px',
        mutantFigureAfterHeight: '65px',
        mutantFigureAfterBottom: '-28px',
        heroGene: '40px',
        attackGeneContainer: '42px',
        attackGeneIcon: '28px',
        attackAoe: '36px',
        slotBtn: '56px',
        orb: '56px',
        star: '28px',
        mutIcon: '36px',
        shadowScale: 0.85,
      } : {
        // ДЕСКТОП: большие размеры для чёткости
        sandboxWidth: 700,
        mutantTexture: '340px',
        mutantFigureHeight: '380px',
        mutantFigureAfterWidth: '380px',
        mutantFigureAfterHeight: '110px',
        mutantFigureAfterBottom: '-45px',
        heroGene: '56px',
        attackGeneContainer: '52px',
        attackGeneIcon: '44px',
        attackAoe: '64px',
        slotBtn: '68px',
        orb: '68px',
        star: '32px',
        mutIcon: '44px',
        shadowScale: 1.0,
      };

      // 1. Песочница
      const sandbox = document.createElement('div');
      sandbox.style.width = `${config.sandboxWidth}px`;
      sandbox.style.height = 'auto';
      sandbox.style.position = 'fixed';
      sandbox.style.left = '-9999px';
      sandbox.style.top = '0';
      sandbox.style.zIndex = '-100';
      sandbox.style.background = '#2a313c';
      sandbox.style.borderRadius = '16px';
      // Убираем паддинг, чтобы обрезать ровно по краю
      sandbox.style.padding = '0';

      // 2. Клон
      const clone = panelEl.cloneNode(true);
      clone.style.width = '100%';
      clone.style.maxWidth = 'none';
      clone.style.margin = '0';
      clone.style.transform = 'none';

      // Сброс стилей контейнера
      clone.style.border = 'none';
      clone.style.outline = 'none';
      clone.style.boxShadow = 'none';
      // Убираем скругление у клона, скругление будет у песочницы
      clone.style.borderRadius = '0';

      // 3. Чистка кнопок
      clone.querySelectorAll('.tool-btn').forEach(b => b.remove());
      clone.querySelectorAll('.header-tools-row').forEach(r => r.remove());

      // 4. Фикс инпута
      const input = clone.querySelector('input.lvl');
      if (input) {
        const val = input.value;
        const span = document.createElement('div');
        span.className = 'lvl-static';
        span.innerText = val;
        if (input.parentNode) input.parentNode.replaceChild(span, input);
      }

      // 5. Центровка
      const title = clone.querySelector('.title');
      if (title) {
        title.style.textAlign = 'center';
        title.style.width = '100%';
        title.style.margin = '0 0 15px 0';
        title.style.flex = 'none';
        title.style.maxWidth = 'none';
      }

      // 6. Anti-squash + масштабирование для мобильных/десктопов
      const freezeStyles = (selector, width, height) => {
        clone.querySelectorAll(selector).forEach(el => {
          el.style.width = width;
          el.style.height = height;
          el.style.minWidth = width;
          el.style.minHeight = height;
          el.style.maxWidth = width;
          el.style.maxHeight = height;
          el.style.flex = `0 0 ${width}`;
          el.style.objectFit = 'contain';
        });
      };
      freezeStyles('.slot-btn', config.slotBtn, config.slotBtn);
      freezeStyles('.orb', config.orb, config.orb);
      freezeStyles('.star', config.star, config.star);
      freezeStyles('.star img', config.star, config.star);
      freezeStyles('.mut-icon', config.mutIcon, config.mutIcon);
      // Мутант, гены, иконки атак - точные размеры
      freezeStyles('.mut-figure .texture', config.mutantTexture, config.mutantTexture);
      freezeStyles('.hero-genes img', config.heroGene, config.heroGene);
      freezeStyles('.attack-gene', config.attackGeneContainer, config.attackGeneContainer);
      freezeStyles('.attack-gene .gene-icon', config.attackGeneIcon, config.attackGeneIcon);
      freezeStyles('.attack-gene .attack-aoe', config.attackAoe, config.attackAoe);
      
      // Фиксация размера контейнера мутанта и тени
      clone.querySelectorAll('.mut-figure').forEach(el => {
        el.style.height = config.mutantFigureHeight;
        el.style.minHeight = config.mutantFigureHeight;
      });

      // Вертикальное смещение мутанта для мобильных — чтобы "стоял" на тени
      // Используем marginTop вместо transform, чтобы избежать конфликта с CSS
      if (isMobile) {
        const mutantTexture = clone.querySelector('.mut-figure .texture');
        if (mutantTexture) {
          mutantTexture.style.marginTop = '18px';
        }
      }

      // Добавляем стиль для увеличения тени (псевдоэлемент ::after)
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        .mut-figure::after {
          width: ${config.mutantFigureAfterWidth} !important;
          height: ${config.mutantFigureAfterHeight} !important;
          bottom: ${config.mutantFigureAfterBottom} !important;
        }
        /* Фикс для attack-side на мобильных - предотвращаем сжатие */
        .attack-side {
          min-width: ${isMobile ? '140px' : '180px'} !important;
        }
        /* Фикс для attack-info - разрешаем перенос текста */
        .attack-info {
          min-width: 0 !important;
          flex-shrink: 1 !important;
        }
        .attack-label {
          max-width: ${isMobile ? '120px' : '200px'};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `;
      clone.appendChild(styleEl);

      // 7. Зачистка внутренних рамок
      clone.querySelectorAll('*').forEach(el => {
        const whitelist = ['row', 'lvl-static', 'gene-chip', 'control', 'search', 'mut-row'];
        const shouldKeep = whitelist.some(cls => el.classList.contains(cls));
        if (!shouldKeep) {
          el.style.border = 'none';
          el.style.outline = 'none';
          el.style.boxShadow = 'none';
        }
      });

      // 8. Вотермарка
      const wm = document.createElement('div');
      wm.innerText = 'archivist-library.com';
      wm.style.border = 'none';
      Object.assign(wm.style, {
        display: 'block', textAlign: 'center', fontSize: '14px', color: '#637083',
        marginTop: '25px', paddingTop: '15px', paddingBottom: '20px', // Отступ снизу
        borderTop: '1px solid #3a475a',
        fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'sans-serif'
      });
      clone.appendChild(wm);

      sandbox.appendChild(clone);
      document.body.appendChild(sandbox);

      await new Promise(resolve => setTimeout(resolve, 150));

      // 9. ГЕНЕРАЦИЯ (Получаем Base64 URL)
      const dataUrl = await domtoimage.toPng(sandbox, {
        width: config.sandboxWidth,
        height: sandbox.offsetHeight,
        bgcolor: '#2a313c',
        style: { transform: 'scale(1)', transformOrigin: 'top left' },
        quality: 1.0
      });

      // --- 10. ОПЕРАЦИЯ "ОБРЕЗАНИЕ" (КОСТЫЛЬ) ---

      // Загружаем картинку в память
      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => img.onload = r);

      // Создаем канвас для обрезки
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Сколько пикселей срезать с каждой стороны
      const crop = 3;

      // Размер нового канваса меньше оригинала на (crop * 2)
      canvas.width = img.width - (crop * 2);
      canvas.height = img.height - (crop * 2);

      // Рисуем картинку со смещением влево и вверх (-2px, -2px)
      // Тем самым белая рамка остается за пределами холста
      ctx.drawImage(img, -crop, -crop);

      // Превращаем обрезанный канвас в Blob
      canvas.toBlob(async (blob) => {
        if (!blob) { isCopying = false; return; }

        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          showNotification('Скриншот сохранен в буфер обмена!');
          setTimeout(() => isCopying = false, 2000);
        } catch (clipboardErr) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${selected.name || 'mutant'}-stats.webp`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showNotification('Скриншот загружен!');
          isCopying = false;
        }

        document.body.removeChild(sandbox);
      }, 'image/png');

    } catch (error) {
      isCopying = false;
      const sb = document.querySelector('div[style*="fixed"][style*="-9999px"]');
      if(sb) sb.remove();
    }
  }
</script>


<svelte:window on:click={windowClick} />

<div class="stats-page" class:single-col={!showCatalog}>

  <!-- ЛЕВАЯ КОЛОНКА: КАТАЛОГ (Скрывается по условию) -->
  {#if showCatalog}
    <aside class="catalog">
      <!-- Ген 1 -->
      <div class="filters-row">
        <button
          class="filter-chip {geneFilter === '' && gene2Filter === '' ? 'active' : ''}"
          on:click={() => toggleGene('all')}>
          <span>Ген 1: ВСЕ</span>
        </button>
        {#each ['A','B','C','D','E','F'] as g}
          <button
            class:active={geneFilter===g}
            class="gene-chip"
            on:click={() => toggleGene(g)}
            title={GENE_NAME[g]}>
            <img src={GENE_ICON[g] || GENE_ICON['']} alt={g} />
          </button>
        {/each}
      </div>

      <!-- Ген 2 -->
      <div class="filters-row gene2-row" class:disabled={!geneFilter}>
        <button
          class="filter-chip {gene2Filter === '' && geneFilter ? 'active' : ''}"
          disabled={!geneFilter}
          on:click={() => toggleGene2('all')}>
          <span>Ген 2: ВСЕ</span>
        </button>
        <button
          class="gene-chip"
          class:active={gene2Filter==='neutral'}
          disabled={!geneFilter}
          on:click={() => toggleGene2('neutral')}
          title="Нейтральный">
          <img src="/genes/gene_all.webp" alt="Нейтральный" />
        </button>
        {#each ['A','B','C','D','E','F'] as g}
          <button
            class="gene-chip"
            class:active={gene2Filter===g}
            disabled={!geneFilter}
            on:click={() => toggleGene2(g)}
            title={GENE_NAME[g]}>
            <img src={GENE_ICON[g] || GENE_ICON['']} alt={g} />
          </button>
        {/each}
      </div>

      <input
        class="search"
        type="text"
        placeholder="Введите имя мутанта"
        bind:value={query}
      />

      <div class="list">
        {#each filtered as m (m.id)}
          <button class="mut-row {selected?.id===m.id ? 'active' : ''}" on:click={() => selectMutant(m)}>
            <img class="mut-icon" src={listThumbnail(m) || ''} alt={m.name} />
            <div class="mut-meta">
              <div class="name">{m.name}</div>
              <div class="genes">
                {#each m.genes as g}
                  <img src={GENE_ICON[g] || GENE_ICON['']} alt={g} title={GENE_NAME[g]} />
                {/each}
              </div>
            </div>
            <div class="rar">{m.typeLabel}</div>
          </button>
        {/each}
      </div>
    </aside>
  {/if}

  <!-- ПРАВАЯ КОЛОНКА: КАРТОЧКА -->
  <section class="panel">
    {#if selected}
      <!-- Хедер панели с кнопками управления -->
      <div class="panel-header">
         <!-- Кнопка показа/скрытия каталога -->
         <div class="header-left">
            <button class="tool-btn" on:click={toggleCatalog} title={showCatalog ? "Скрыть поиск" : "Показать поиск"}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 {#if showCatalog}
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                 {:else}
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                 {/if}
               </svg>
            </button>
         </div>

         <header class="title">{selected.name}</header>
      </div>

      <!-- Кнопка скриншота перенесена под заголовок для исключения наложения -->
      <div class="header-tools-row">
        <button class="tool-btn share-btn" on:click={shareScreenshot} disabled={isCopying} title="Сохранить как картинку">
           {#if isCopying}
             <span>Сохраняем...</span>
           {:else}
             <span>Сделать скриншот</span>
           {/if}
        </button>
      </div>

      <div class="hero-section">
      <div class="hero-genes">
          {#each selected.genes as g}
            <img src={GENE_ICON[g] || GENE_ICON['']} alt={g} />
          {/each}
        </div>
        <div class="mut-figure">
          <img class="texture" src={figureImage(selected, stars)} alt={selected.name} />
        </div>

        <div class="hero-controls" bind:this={dropdownHost}>
          <div class="slots">
            <!-- базовые -->
            {#each basicSlots as orb, i}
              <div class="slot">
                <button class="slot-btn" on:click={() => openDropdown = openDropdown === `basic-${i}` ? null : `basic-${i}`}>
                  <img class="slot-bg" src="/orbs/basic/orb_slot.webp" alt="slot" />
                  {#if orb}<img class="orb" src={orb.icon} alt={orb.id} />{/if}
                </button>
                {#if orb}
                  <button class="x" title="убрать" on:click={() => clearSlot('basic', i)}>×</button>
                {/if}
                {#if openDropdown === `basic-${i}`}
                  <div class="dropdown">
                    {#each basicOrbOptions as o}
                      <button class="orb-row" on:click={() => pickBasic(i, o)}>
                        <img src={o.icon} alt={o.id} /> <span>{o.name || o.id}</span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}

            <!-- спец-слот -->
            <div class="slot">
              <button class="slot-btn" on:click={() => openDropdown = openDropdown === 'special' ? null : 'special'}>
                <img class="slot-bg" src="/orbs/special/orb_slot_spe.webp" alt="special" />
                {#if specialSlot}<img class="orb" src={specialSlot.icon} alt={specialSlot.id} />{/if}
              </button>
              {#if specialSlot}
                <button class="x" title="убрать" on:click={() => clearSlot('special')}>×</button>
              {/if}
              {#if openDropdown === 'special'}
                <div class="dropdown">
                  {#each ORBS.special as o}
                    <button class="orb-row" on:click={() => pickSpecial(o)}>
                      <img src={o.icon} alt={o.id} /> <span>{o.name || o.id}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <div class="controls">
              <div class="control">
              <span class="control-label">Уровень:</span>
              <input
                class="lvl"
                type="number"
                min="1"
                max="500"
                bind:value={level}
                on:keydown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); }}
                on:input={(e) => { if (e.target.value < 0) level = 0; }}
              />
            </div>
            <div class="control">
              <span class="control-label">Звёздность:</span>
              <div class="stars">
                {#each [0,1,2,3,4] as s}
                  <button
                    class="star"
                    class:selected={stars === s}
                    disabled={!selected.availableStars.has(s)}
                    on:click={() => stars = s}
                    aria-pressed={stars === s}
                    title={s===0?'Без звёзд': s===1?'Бронза': s===2?'Серебро': s===3?'Золото':'Платина'}>
                    <img src={STAR_ICON[s]} alt="*" />
                  </button>
                {/each}
              </div>
            </div>
          </div>
        </div>

        <div class="stats">
          <div class="row">
            <span class="label">
              {#if typeIconCurrent}
                <img class="label-icon type-icon" src={typeIconCurrent} alt="Тип" />
              {/if}
              Тип
            </span>
            <b>{selected.typeLabel || selected.type || '—'}</b>
          </div>
          <div class="row"><span class="label">Тир</span><b>{selected.tierLabel || selected.tier || '—'}</b></div>
          <div class="row">
            <span class="label">
              <img class="label-icon" src={STAT_ICON.hp} alt="HP" />
              HP
            </span>
            <b>{stats.hp.toLocaleString('ru-RU')}</b>
          </div>

          {#each attackRows as attack (attack.attack)}
            <div class="row attack-row">
              <div class="attack-side">
                <span class="attack-gene" class:empty={!attack.geneIcon}>
                  {#if attack.geneIcon}
                    <img class="gene-icon" src={attack.geneIcon} alt="" aria-hidden="true" />
                  {/if}
                  {#if attack.isAoe}
                    <img class="attack-aoe" src="/genes/atk_multiple.webp" alt="АОЕ" />
                  {/if}
                </span>
                <div class="attack-info">
                  <span class="attack-label">{attack.label}</span>
                  <span class="attack-damage">{attack.damage ? attack.damage.toLocaleString('ru-RU') : '—'}</span>
                </div>
              </div>
              <span class="ability-divider" class:empty={!attack.effects.length} aria-hidden="true"></span>
              <div class="effect-side">
                {#if attack.effects.length}
                  {#each attack.effects as effect, i (effect.label + effect.value + effect.percent + i)}
                    <div class="effect-row">
                      {#if effect.icon}
                        <img class="ability-icon" src={effect.icon} alt={effect.label} />
                      {/if}
                      <span class="effect-name">
                        {effect.label}
                        {#if effect.percent != null}
                          <span class="effect-percent">{effect.percent.toLocaleString('ru-RU')}%</span>
                        {/if}
                      </span>
                      <span class="effect-value">{effect.value.toLocaleString('ru-RU')}</span>
                    </div>
                  {/each}
                {:else}
                  <span class="effect-empty">—</span>
                {/if}
              </div>
            </div>
          {/each}

          <div class="row">
            <span class="label">
              <img class="label-icon" src={STAT_ICON.speed} alt="Скорость" />
              Скорость
            </span>
            <b>{formatSpeed(stats.speed)}</b>
          </div>
          <div class="row">
            <span class="label">
              <img class="label-icon" src="/cash/softcurrency.webp" alt="Серебро" />
              Серебро
            </span>
            <b>{stats.bank.toLocaleString('ru-RU')}</b>
          </div>
        </div>
      </div>

    {/if}
  </section>
</div>

<style>

/* --- ГЕНЫ НАД МУТАНТОМ --- */
  .hero-genes {
    display: flex;
    justify-content: center;
    gap: 4px;
    margin-bottom: -8px;
    z-index: 10;
    position: relative;
  }
  @media (min-width: 768px) {
    .hero-genes {
      gap: 6px;
      margin-bottom: -12px;
    }
  }

  .hero-genes img {
    width: 30px;
    height: 30px;
    object-fit: contain;
    filter: drop-shadow(0 4px 4px rgba(0,0,0,0.6));
    z-index: 10;
  }
  @media (min-width: 768px) {
    .hero-genes img {
      width: 36px;
      height: 36px;
    }
  }

  .stats-page{
    display:grid;
    grid-template-columns: 320px minmax(0,660px);
    gap:18px;
    font-family:"TT Supermolot Neue", ui-sans-serif, system-ui, -apple-system,
                "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans",
                "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    font-weight:700;
  }

  /* Если сайдбар скрыт - одна колонка по центру */
  .stats-page.single-col {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .stats-page.single-col .panel {
    width: 100%;
    max-width: 660px;
  }

  .catalog{ background:#212832; border-radius:12px; padding:16px; display:flex; flex-direction:column; }
  .filters-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
  .gene-chip{ width:28px; height:28px; padding:2px; border-radius:6px; background:#2b3442; border:1px solid #364456; cursor: pointer; }
  .gene-chip.active{ outline:2px solid #90f36b; }
  .gene-chip img{ width:100%; height:100%; object-fit:contain; }
  .filter-chip {
    height: 36px;
    padding: 0 0.8rem;
    border-radius: 8px;
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    cursor: pointer;
  }
  .filter-chip.active { background: #e2e8f0; color: #0f172a; border-color: #fff; transform: scale(1.05); }
  .gene2-row{ margin-bottom:8px; }
  .gene2-row.disabled{ opacity:0.3; pointer-events:none; }
  .gene2-label{ font-size:10px; color:#aab6c8; font-weight:700; }
  .sort-switch{ margin-left:auto; display:flex; gap:6px; }
  .sort-switch button{ background:#2b3442; border:1px solid #3a475a; border-radius:8px; padding:6px 10px; font-size:12px; cursor: pointer; color:#aab6c8; }
  .sort-switch .active{ background:#7a56ff; border-color:#7a56ff; color:white; }
  .search{ width:100%; margin:8px 0 12px; padding:8px 10px; border-radius:8px; border:1px solid #3a475a; background:#1b212a; color:#dfe7f3; }
  .list{ overflow:auto; max-height:70vh; display:flex; flex-direction:column; gap:6px; }
  .mut-row{ display:flex; align-items:center; gap:12px; background:#1b212a; border:1px solid #2e3948; border-radius:12px; padding:10px; width:100%; text-align: left; cursor: pointer; }
  .mut-row.active{ border-color:#90f36b; }
  .mut-icon{ width:44px; height:44px; border-radius:8px; background:#0f1319; object-fit:cover; flex-shrink: 0; }
  .mut-meta{ flex:1; display:flex; flex-direction:column; }
  .mut-meta .name{ font-size:13px; color:#e9eef6; }
  .mut-meta .genes{ display:flex; gap:4px; }
  .mut-meta .genes img{ width:20px; height:20px; }
  .rar{ font-size:11px; color:#aab6c8; }

  .panel{ background:#2a313c; border-radius:16px; padding:10px 12px; display:flex; flex-direction:column; gap:6px; position: relative; }
  @media (min-width: 768px) {
    .panel { padding: 20px 22px; gap: 12px; }
  }

  /* Заголовок панели с кнопками */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: center; /* Центрируем контент (заголовок) */
    position: relative;      /* Чтобы кнопки позиционировать абсолютно внутри */
    margin-bottom: 2px;
    min-height: 28px;
    padding: 0 24px; /* Добавляем отступы по краям, чтобы заголовок не налезал на кнопки */
    width: 100%;
  }
  @media (min-width: 768px) {
    .panel-header {
      margin-bottom: 6px;
      min-height: 36px;
      padding: 0 40px;
    }
  }

  .header-left {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
  }

  /* Новая строка для доп. кнопок (скриншот) */
  .header-tools-row {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-bottom: 6px;
  }
  @media (min-width: 768px) {
    .header-tools-row { margin-bottom: 12px; }
  }

  /* Имя: яркое белое, с подсветкой */
  .title{
    font-size:26px;
    font-weight:800;
    color:#ffffff;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.25);
    text-align:center;
    line-height: 1.2;
    margin: 0;
    z-index: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
    max-width: 480px; /* Ограничиваем ширину текста */
  }
  
  /* Responsive title for smaller screens */
  @media (max-width: 768px) {
    .title {
      max-width: 90vw; /* Limit title width on small screens */
      font-size: 22px; /* Smaller font on mobile */
    }
  }

  .tool-btn {
    background: transparent;
    border: none;
    color: #aab6c8;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: background 0.2s, color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tool-btn:hover {
    background: #3a475a;
    color: white;
  }
  .tool-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  /* --- НОВЫЙ СТИЛЬ ДЛЯ КНОПКИ СКРИНШОТА --- */
  .share-btn {
    background: rgba(59, 130, 246, 0.15); /* Синеватый фон */
    border: 1px solid rgba(59, 130, 246, 0.3); /* Рамка */
    color: #93c5fd; /* Светло-голубой текст */

    /* Размеры и текст */
    width: auto; /* Автоматическая ширина под текст */
    height: 32px;
    padding: 0 14px; /* Отступы по бокам */

    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all 0.2s ease;
  }

  .share-btn:hover {
    background: rgba(59, 130, 246, 0.3);
    color: #ffffff;
    border-color: rgba(59, 130, 246, 0.5);
    transform: translateY(-1px);
  }

  .share-btn:active {
    transform: translateY(0);
  }

  .hero-section{ display:flex; flex-direction:column; align-items:center; gap:6px; }
  @media (min-width: 768px) {
    .hero-section { gap: 8px; }
  }
  .mut-figure{ position:relative; display:flex; justify-content:center; margin-bottom:0; padding:0 0 12px; width:100%; }
  @media (min-width: 768px) {
    .mut-figure { padding: 0 0 16px; }
  }
  .mut-figure::after{ content:""; position:absolute; bottom:-32px; left:50%; transform:translateX(-50%); width:272px; height:82px; background:radial-gradient(62% 72% at 50% 58%, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0) 82%); opacity:1; pointer-events:none; }
  .mut-figure .texture{ width:220px; height:220px; object-fit:contain; image-rendering:auto; transform:translateY(36px); }

  .hero-controls{ width:100%; max-width:520px; margin:0 auto; display:flex; flex-direction:column; align-items:center; gap:6px; }
  @media (min-width: 768px) {
    .hero-controls { gap: 8px; }
  }

  /* СЛОТЫ: защита от сплющивания + фикс сфер */
  .slots{ display:flex; gap:10px; justify-content:center; margin:0 0 0; position:relative; flex-wrap:wrap; }
  @media (min-width: 768px) {
    .slots { gap: 12px; }
  }
  .slot{ position:relative; }
  .slot-btn{
    position:relative;
    width: 52px;
    height: 52px;
    min-width: 52px;
    min-height: 52px;
    flex-shrink: 0;

    border-radius:10px;
    background:transparent;
    border:none;
    padding:0;
    cursor: pointer;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @media (min-width: 768px) {
    .slot-btn {
      width: var(--orb-size-container-large);
      height: var(--orb-size-container-large);
      min-width: var(--orb-size-container-large);
      min-height: var(--orb-size-container-large);
      border-radius: 12px;
    }
  }
  .slot-bg{ width:100%; height:100%; object-fit:cover; display: block; }
  /* Сфера заполняет 98% слота, центрирована */
  .orb {
    position: absolute;
    inset: 1%;
    object-fit: contain;
    border-radius: 10px;
  }
  @media (min-width: 768px) {
    .orb {
      border-radius: 12px;
    }
  }

  .x{ position:absolute; right:-6px; top:-6px; width:18px; height:18px; border-radius:50%; border:none; background:#ff6464; color:white; font-size:12px; cursor: pointer; z-index: 2; }
  @media (min-width: 768px) {
    .x { right: -8px; top: -8px; width: 22px; height: 22px; font-size: 14px; }
  }

   /* --- ИСПРАВЛЕННОЕ МЕНЮ СФЕР (ПО ЦЕНТРУ) --- */
  .dropdown {
    position: fixed; /* Фиксируем относительно всего экрана */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%); /* Идеальная центровка */

    width: 320px;      /* Комфортная ширина */
    max-width: 90vw;   /* Отступ от краев на мобилках */
    max-height: 50vh;  /* Ограничение высоты */
    overflow-y: auto;  /* Скролл внутри, если сфер много */

    background: #212832; /* Чуть темнее фон для контраста */
    border: 1px solid #4b5975; /* Ярче граница */
    border-radius: 16px;
    padding: 12px;
    z-index: 9999; /* Чтобы точно было поверх всего */

    /* Сильная тень, чтобы затемнить фон под меню */
    box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.7), 0 10px 40px rgba(0,0,0, 0.8);
  }
  .orb-row{ display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; border-radius:10px; background:#242b36; margin:6px 0; border:none; color: #dfe7f3; cursor: pointer; text-align: left; }
  .orb-row:hover { background: #2e3948; }
  .orb-row img{ width:28px; height:28px; object-fit:contain; flex-shrink: 0; }
  @media (min-width: 768px) {
    .orb-row img { width: 36px; height: 36px; }
  }

  .controls{ display:flex; gap:6px; justify-content:center; margin:0; flex-wrap:wrap; }
  @media (min-width: 768px) {
    .controls { gap: 8px; }
  }
  .control{ display:flex; align-items:center; gap:6px; color:#aab6c8; font-size:12px; background:#1b212a; border:1px solid #2e3948; border-radius:10px; padding:6px 10px; }
  .control .control-label{ white-space:nowrap; }

  .lvl{ width:64px; padding:6px 7px; border-radius:8px; border:1px solid #3a475a; background:#10161f; color:#e9eef6; font-size:13px; }

  /* Стили для статического уровня на скриншоте */
  :global(.lvl-static) {
    width: 64px;
    padding: 6px 7px;
    background: #10161f;
    color: #e9eef6;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    border-radius: 8px;
    border: 1px solid #3a475a;
    display: inline-block;
  }

  /* ЗВЕЗДЫ: защита от сплющивания */
  .stars{ display:flex; gap:4px; }
  @media (min-width: 768px) {
    .stars { gap: 6px; }
  }
  .star{
    width:26px; height:26px;
    min-width: 26px;
    flex-shrink: 0;

    border-radius:50%; background:transparent; border:none; padding:0; opacity:.45; transition:transform .15s ease, opacity .15s ease; cursor: pointer;
  }
  @media (min-width: 768px) {
    .star {
      width: 32px;
      height: 32px;
      min-width: 32px;
    }
  }
  .star.selected{ opacity:1; transform:scale(1.06); filter:drop-shadow(0 0 8px rgba(255,255,255,0.45)); }
  .star:disabled{ cursor: not-allowed; display: none; }
  .star img{ width:100%; height:100%; object-fit:contain; display: block; }
  .star:not(.selected) img{ filter:grayscale(1) brightness(0.6); }

  /* --- СТАТЫ (УПЛОТНЕННЫЕ) --- */
  .stats{ margin-top:0; display:flex; flex-direction:column; gap:4px; width:100%; max-width:520px; margin-left:auto; margin-right:auto; }
  @media (min-width: 768px) {
    .stats { gap: 6px; }
  }

  .row{
    display:flex;
    justify-content:space-between;
    align-items:center;
    background:#1b212a;
    border:1px solid #2e3948;
    border-radius:12px;
    padding:4px 10px;
    color:#dfe7f3;
    font-size:13px;
    min-height:38px;
  }
  @media (min-width: 768px) {
    .row {
      padding: 6px 14px;
      min-height: 44px;
      font-size: 14px;
    }
  }

  .row b {
    font-size: 15px;       /* Единый размер */
    font-weight: 700;      /* Одинаковая жирность */
    color: #e9eef6;        /* Одинаковый цвет */
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums; /* Чтобы цифры стояли ровно */
  }

  .row .label{ display:flex; align-items:center; gap:6px; color:#aab6c8; font-size:13px; }
  @media (min-width: 768px) {
    .row .label { gap: 10px; }
  }
  .row .label-icon{ width:18px; height:18px; object-fit:contain; flex-shrink: 0; }
  @media (min-width: 768px) {
    .row .label-icon { width: 20px; height: 20px; }
  }
  .row .type-icon{ width:22px; height:22px; flex-shrink: 0; }
  @media (min-width: 768px) {
    .row .type-icon { width: 26px; height: 26px; }
  }

  /* --- ОБНОВЛЕННЫЙ ДИЗАЙН АТАКИ --- */
  .row.attack-row{
    align-items: stretch;
    gap: 6px;
    padding: 6px 10px;
  }
  @media (min-width: 768px) {
    .row.attack-row {
      gap: 10px;
      padding: 8px 14px;
    }
  }

  .attack-side {
    display: flex;
    align-items: center;
    gap: 6px; /* Уменьшил отступ между иконкой и текстом (было 10-12px) */
    flex: 1 1 0;
    min-width: 0;
  }
  @media (min-width: 768px) {
    .attack-side { gap: 8px; }
  }

 /* --- ФИКС АТАКИ (МАКСИМАЛЬНЫЙ РАЗМЕР) --- */
  .attack-gene {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
  }
  @media (min-width: 768px) {
    .attack-gene {
      width: 52px;
      height: 52px;
    }
  }

  /* Иконка гена - маленькая точка в центре */
  .attack-gene .gene-icon {
    width: 34px;
    height: 34px;
    object-fit: contain;
    display: block;
    position: relative;
    z-index: 2;
    filter: drop-shadow(0 0 2px rgba(0,0,0,0.8));
  }
  @media (min-width: 768px) {
    .attack-gene .gene-icon {
      width: 40px;
      height: 40px;
    }
  }

  /* Иконка АОЕ - ОГРОМНАЯ на весь слот */
  .attack-gene .attack-aoe {
    position: absolute;
    top: 45%;
    left: 75%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    object-fit: contain;
    pointer-events: none;
    z-index: 1;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
  }
  @media (min-width: 768px) {
    .attack-gene .attack-aoe {
      width: 52px;
      height: 52px;
    }
  }

  .attack-gene.empty { opacity: 0; }

  .attack-info {
    display: flex;
    flex-direction: row; /* Выстраиваем Имя и Урон в одну линию */
    justify-content: space-between; /* Имя слева, Урон справа (как на скриншоте) */
    align-items: center;
    width: 100%;
    gap: 8px;
    min-width: 0;
  }


  .attack-label {
    font-weight: 600;
    color: #aab6c8;
    font-size: 13px;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    text-align: left;
    flex: 1; /* Занимает все свободное место, толкая урон вправо */
  }

  .attack-damage {
    font-size: 15px;       /* Точно такой же размер */
    font-weight: 700;
    color: #e9eef6;        /* Точно такой же цвет */
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .ability-divider{ width:1px; align-self:stretch; background:rgba(255,255,255,0.08); flex-shrink: 0; }
  .ability-divider.empty{ display:none; }

  .effect-side{ display:flex; flex-direction:column; gap:4px; min-width:0; flex:1 1 0; align-items:stretch; }
  @media (min-width: 768px) {
    .effect-side { gap: 6px; }
  }
  .effect-row{ display:flex; align-items:center; gap:6px; background:rgba(15,19,25,0.35); padding:4px 8px; border-radius:10px; width:100%; }
  @media (min-width: 768px) {
    .effect-row { gap: 8px; padding: 6px 10px; }
  }

  .ability-icon{ width:24px; height:24px; object-fit:contain; flex-shrink: 0; }
  @media (min-width: 768px) {
    .ability-icon { width: 28px; height: 28px; }
  }

  .effect-name{ display:flex; align-items:center; gap:4px; font-weight:600; color:#f0f6ff; flex:1 1 auto; font-size: 13px; }
  @media (min-width: 768px) {
    .effect-name { gap: 6px; }
  }
  .effect-percent{ font-size:13px; color:#90f36b; font-weight:600; white-space: nowrap; }
  .effect-value{ font-size:16px; color:#90f36b; font-weight:700; white-space: nowrap; }
  .effect-empty{ color:#94a2b9; font-size:13px; text-align:center; }

  @media (max-width: 1200px) {
    .stats-page{ grid-template-columns: 300px minmax(0,1fr); }
    .stats-page.single-col { grid-template-columns: minmax(0,1fr); }
  }

  @media (max-width: 1024px) {
    .stats-page{ grid-template-columns: minmax(0,1fr); gap:16px; }
    .panel{ order:1; }
    .catalog{ order:2; }
    .list{ max-height:360px; }
  }

  @media (max-width: 768px) {
    .stats-page {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 8px;
      padding: 8px;
      justify-content: center; /* Center the content */
    }
    .stats-page.single-col {
      grid-template-columns: 1fr;
      justify-content: center; /* Center the content */
    }
    .panel {
      order: 1;
      padding: 8px 10px;
      margin: 0 auto; /* Center the panel */
      max-width: 95vw; /* Prevent from touching edges */
    }
    .catalog { order: 2; padding: 8px; }

    .row.attack-row { flex-direction: column; gap: 6px; padding: 8px; }
    .ability-divider { display: none !important; }
    .mut-figure .texture { width: 140px; height: 140px; transform: translateY(20px); }
    .mut-figure::after { width: 140px; bottom: -18px; height: 45px; }
    .mut-figure { padding: 0 0 10px; }
    
    /* Увеличиваем иконки для мобильных для лучшей видимости */
    .hero-genes img { width: 28px; height: 28px; }
    .hero-genes { gap: 6px; margin-bottom: -10px; }
    .slot-btn { width: 48px; height: 48px; min-width: 48px; min-height: 48px; }
    .star { width: 26px; height: 26px; min-width: 26px; }
    .attack-gene { width: 40px; height: 40px; }
    .attack-gene .gene-icon { width: 30px; height: 30px; }
    .attack-gene .attack-aoe { width: 40px; height: 40px; }
    .ability-icon { width: 22px; height: 22px; }
    .row .label-icon { width: 18px; height: 18px; }
    .row .type-icon { width: 22px; height: 22px; }
  }

  @media (max-width: 480px) {
    .stats-page {
      grid-template-columns: 1fr;
      gap: 6px;
      padding: 6px;
      justify-content: center; /* Center the content */
    }
    .stats-page.single-col {
      grid-template-columns: 1fr;
      justify-content: center; /* Center the content */
    }

    .mut-figure .texture { width: 120px; height: 120px; transform: translateY(16px); }

    /* Fix long name issue - make title responsive */
    .title {
      max-width: 90vw; /* Limit title width on small screens */
      font-size: 20px; /* Smaller font on mobile */
    }
    
    /* Увеличиваем иконки для очень маленьких экранов */
    .hero-genes img { width: 26px; height: 26px; }
    .hero-genes { gap: 5px; margin-bottom: -8px; }
    .slot-btn { width: 44px; height: 44px; min-width: 44px; min-height: 44px; }
    .star { width: 24px; height: 24px; min-width: 24px; }
    .attack-gene { width: 36px; height: 36px; }
    .attack-gene .gene-icon { width: 28px; height: 28px; }
    .attack-gene .attack-aoe { width: 36px; height: 36px; }
    .ability-icon { width: 20px; height: 20px; }
    .mut-figure { padding: 0 0 8px; }
  }
  
  /* Notification toast animations */
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  /* QHD upscaling */
  @media (min-width: 1921px) {
    .mut-icon { width: 55px; height: 55px; }
    .hero-genes img { width: 45px; height: 45px; }
    .hero-genes { gap: 8px; margin-bottom: -16px; }
    .star { width: 40px; height: 40px; min-width: 40px; }
    .slot-btn { width: 85px; height: 85px; min-width: 85px; min-height: 85px; }
    .slots { gap: 20px; }
    .mut-figure .texture { width: 310px; height: 310px; }
    .attack-gene { width: 65px; height: 65px; }
    .attack-gene .gene-icon { width: 50px; height: 50px; }
    .attack-gene .attack-aoe { width: 65px; height: 65px; }
    .ability-icon { width: 35px; height: 35px; }
    .row .label-icon { width: 25px; height: 25px; }
    .row .type-icon { width: 33px; height: 33px; }
    .orb-row img { width: var(--orb-size-img); height: var(--orb-size-img); }
    .dropdown { width: 400px; }
    .controls { gap: 15px; }
    .stars { gap: 8px; }
  }
</style>
