<script>
  // ДАННЫЕ
  import mutantsRaw from '@/data/mutants/normal.json';
  import bronzeRaw from '@/data/mutants/bronze.json';
  import silverRaw from '@/data/mutants/silver.json';
  import goldRaw from '@/data/mutants/gold.json';
  import platinumRaw from '@/data/mutants/platinum.json';
  import orbsRaw from '@/data/materials/orbs.json';
  import { ABILITY_RU, TYPE_RU } from '@/lib/mutant-dicts';

  // --- УТИЛИТЫ И КОНСТАНТЫ ---
  const GENE_NAME = {
    A: 'Кибер',     // yellow
    B: 'Зверь',     // brown
    C: 'Галактик',  // blue
    D: 'Зомби',     // green
    E: 'Мифик',     // purple
    F: 'Рубака',    // red
  };
  const GENE_ICON = {
    '': '/genes/icon_gene_all.png',
    A: '/genes/icon_gene_a.png',
    B: '/genes/icon_gene_b.png',
    C: '/genes/icon_gene_c.png',
    D: '/genes/icon_gene_d.png',
    E: '/genes/icon_gene_e.png',
    F: '/genes/icon_gene_f.png',
  };
  const ATTACK_GENE_ICON = {
    a: '/genes/gene_a.png',
    b: '/genes/gene_b.png',
    c: '/genes/gene_c.png',
    d: '/genes/gene_d.png',
    e: '/genes/gene_e.png',
    f: '/genes/gene_f.png',
    neutro: '/genes/gene_all.png',
    neutral: '/genes/gene_all.png',
    none: '/genes/gene_all.png',
    all: '/genes/gene_all.png',
  };
  const STAR_KEYS = ['normal', 'bronze', 'silver', 'gold', 'platinum'];
  const STAR_ICON = {
    0: '/stars/no_stars.png',
    1: '/stars/star_bronze.png',
    2: '/stars/star_silver.png',
    3: '/stars/star_gold.png',
    4: '/stars/star_platinum.png'
  };
  const STAR_IMAGE_KEYWORDS = {
    normal: ['_normal', 'normal'],
    bronze: ['_bronze', 'bronze'],
    silver: ['_silver', 'silver'],
    gold: ['_gold', 'gold'],
    platinum: ['_platinum', '_plat', 'platinum', 'plat']
  };

  const STAT_ICON = {
    hp: '/etc/icon_hp.png',
    atk: '/etc/icon_atk.png',
    speed: '/etc/icon_speed.png',
  };

  const TYPE_ICON = {
    default: '/mut_icons/icon_special.png',
    special: '/mut_icons/icon_special.png',
    heroic: '/mut_icons/icon_heroic.png',
    legend: '/mut_icons/icon_legendary.png',
    legendary: '/mut_icons/icon_legendary.png',
    gacha: '/mut_icons/icon_gacha.png',
    pvp: '/mut_icons/icon_pvp.png',
    seasonal: '/mut_icons/icon_seasonal.png',
    recipe: '/mut_icons/icon_recipe.png',
    videogame: '/mut_icons/icon_videogame.png',
    video_game: '/mut_icons/icon_videogame.png',
    morphology: '/mut_icons/icon_morphology.png',
    zodiac: '/mut_icons/icon_zodiac.png',
    limited: '/mut_icons/limited.png',
    community: '/mut_icons/icon_special.png',
  };
  const starAux = buildStarAuxiliary();

  const SPECIAL_SLOT_COUNT = 1;

  const byNameAsc  = (a, b) => a.name.localeCompare(b.name, 'ru');
  const byNameDesc = (a, b) => b.name.localeCompare(a.name, 'ru');
  const byGene     = (a, b) => (a.geneKey||'').localeCompare(b.geneKey||'');

  // Нормализуем мутантов из normal.json
  function normalizeMutants(raw) {
    return raw.map((m) => {
      const baseId = baseIdOf(m);
      const genesRaw = Array.isArray(m.genes) ? m.genes : [m.genes];
      const genes = genesRaw
        .filter(Boolean)
        .flatMap((g) => String(g || '').toUpperCase().split(''))
        .filter(Boolean);
      const geneKey = genes.join('');
      const images = normalizeImages(m.image);
      const baseStats = m.base_stats || {};
      const lvl1 = baseStats.lvl1 || {};
      const lvl30 = baseStats.lvl30 || {};
      const hpBase = numberOr(baseStats.hp_base, numberOr(lvl1.hp, 0));
      const atk1Base = numberOr(baseStats.atk1_base, numberOr(lvl1.atk1, 0));
      const atk1pBase = numberOr(baseStats.atk1p_base, numberOr(lvl30.atk1, atk1Base));
      const atk2Base = numberOr(baseStats.atk2_base, numberOr(lvl1.atk2, 0));
      const atk2pBase = numberOr(baseStats.atk2p_base, numberOr(lvl30.atk2, atk2Base));
      const speed = numberOr(baseStats.speed_base, numberOr(lvl30.spd, numberOr(lvl1.spd, m.speed)));
      const typeRaw = tag(m, 'type') ?? m.type ?? '';
      const tierRaw = tag(m, 'tier') ?? m.tier ?? '';
      const typeKey = String(typeRaw || '').trim();
      const typeKind = typeKey.toLowerCase();
      const typeLabel = readableType(typeRaw);
      const tierLabel = readableTier(tierRaw);
      const basicSlotCount = slotsForType(typeKind);
      const starMultipliers = {
        0: 1,
        1: starAux.bronze?.get(baseId)?.multiplier ?? 1,
        2: starAux.silver?.get(baseId)?.multiplier ?? 1,
        3: starAux.gold?.get(baseId)?.multiplier ?? 1,
        4: starAux.platinum?.get(baseId)?.multiplier ?? 1,
      };
      return {
        id: baseId,
        baseId,
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
        abilities: normalizeAbilities(m),
        starMultipliers,
        basicSlotCount,
        specialSlotCount: SPECIAL_SLOT_COUNT,
        attackMeta: buildAttackMeta(m),
      };
    });
  }
  function buildStarAuxiliary(){
    const datasets = {
      bronze: bronzeRaw,
      silver: silverRaw,
      gold: goldRaw,
      platinum: platinumRaw,
    };
    const result = {};
    for (const [key, list] of Object.entries(datasets)) {
      const map = new Map();
      (Array.isArray(list) ? list : []).forEach((entry) => {
        const baseId = baseIdOf(entry);
        if (!baseId) return;
        map.set(baseId, {
          multiplier: numberOr(entry?.multiplier ?? entry?.star_multiplier, 1),
          images: normalizeImages(entry?.image),
        });
      });
      result[key] = map;
    }
    return result;
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
    // поддержка формата с m.tags: [{key,value}] или m[key]
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
    const effects = orbEffectsFromId(id, percent);
    return {
      ...orb,
      ...effects,
      percent,
      category,
      icon: `/orbs/${category}/${id}.png`,
      type: category,
    };
  }

  function orbEffectsFromId(id, percent){
    const pct = Number.isFinite(percent) ? percent : 0;
    const abs = Math.abs(pct);
    const key = id.toLowerCase();
    if (key.includes('attack')) return { atkPct: pct };
    if (key.includes('health') || key.includes('_hp') || key.includes('life')) return { hpPct: pct };
    if (key.includes('speed')) return { speedPct: pct };
    if (key.includes('regenerate') || key.includes('retaliate') || key.includes('shield') || key.includes('slash') || key.includes('strengthen') || key.includes('weaken')) {
      return { abilityPct: abs };
    }
    return {};
  }

  // Приводим мутантов
  const ALL_MUTANTS = normalizeMutants(mutantsRaw);

  // --- РЕАКТИВНОЕ СОСТОЯНИЕ UI ---
  let query = '';                      // строка поиска
  let geneFilter = new Set();          // активные фильтры генов (A..F)
  let sortMode = 'gene';               // nameAsc | nameDesc | gene
  let selected = ALL_MUTANTS[0];       // текущий мутант
  let level = 30;                      // уровень из инпута
  let stars = 0;                       // 0..4
  // выбранные сферы: массив из N базовых и 1 спец
  let basicSlots = [];                 // длина = selected.basicSlotCount
  let specialSlot = null;
  let orbModifiers = { hpPct: 0, atk1Pct: 0, atk2Pct: 0, speedPct: 0, abilityPct: 0 };
  let abilityRows = [];
  let typeIconCurrent = '';

  // контейнер дропдауна сфер (для клика вне)
  let dropdownHost = null;
  let openDropdown = null; // 'basic-i' | 'special' | null

  // --- РАСЧЕТЫ ---
  // фильтрация + сортировка + поиск
  $: filtered = ALL_MUTANTS
      .filter(m => {
        if (geneFilter.size) {
          // mutant имеет хотя бы один из выбранных генов
          if (!m.genes.some(g => geneFilter.has(g))) return false;
        }
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          if (!m.name.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort(sortMode==='nameAsc' ? byNameAsc
            : sortMode==='nameDesc' ? byNameDesc
            : byGene);

  // смена выбранного мутанта — сбрасываем слоты по его типу
  $: if (selected) {
    const count = Number.isFinite(selected.basicSlotCount) ? selected.basicSlotCount : 3;
    basicSlots = Array(count).fill(null);
    specialSlot = null;
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
    if (key === 'normal') {
      return baseTexture(m);
    }
    const keywords = STAR_IMAGE_KEYWORDS[key] || [key];
    const info = starAux[key]?.get(m.baseId);
    return (
      findImageByKeywords(info?.images, keywords)
      || findImageByKeywords(m.images, keywords)
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
    const prefixed = `/mut_icons/icon_${lower}.png`;
    return prefixed;
  }

  function abilityIconPath(code){
    const raw = String(code || '').trim().toLowerCase();
    if (!raw) return '';
    const stripped = raw
      .replace(/_plus_plus$/i, '')
      .replace(/_plus$/i, '');
    if (stripped === 'ability_regen') {
      return '/ability/ability_regenerate.png';
    }
    return `/ability/${stripped}.png`;
  }

  // Применение модификаторов сфер (проценты)
  function calcOrbModifiers(basic, special) {
    const mods = { hpPct: 0, atk1Pct: 0, atk2Pct: 0, speedPct: 0, abilityPct: 0 };
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
      if (ability) mods.abilityPct += ability;
    }
    return mods;
  }

  function starMulOf(m, s){
    return m?.starMultipliers?.[s] ?? 1.0;
  }

  function calcStats(m, lvl, s, mods){
    const mulStar = starMulOf(m, s);
    const mulLvl = (Number(lvl)/10 + 0.9);

    // БАЗА
    let hp  = (m.hpBase || 0) * mulLvl;
    let a1b = (Number(lvl) < 10 ? m.atk1Base : (m.atk1PlusBase || m.atk1Base));
    let a2b = (Number(lvl) < 15 ? m.atk2Base : (m.atk2PlusBase || m.atk2Base));
    let atk1 = (a1b || 0) * mulLvl;
    let atk2 = (a2b || 0) * mulLvl;

    // ЗВЕЗДНОСТЬ
    hp   *= mulStar;
    atk1 *= mulStar;
    atk2 *= mulStar;

    // СФЕРЫ (проценты)
    const hpPct = mods?.hpPct ?? 0;
    const atk1Pct = mods?.atk1Pct ?? 0;
    const atk2Pct = mods?.atk2Pct ?? 0;
    if (hpPct)   hp   *= (1 + hpPct/100);
    if (atk1Pct) atk1 *= (1 + atk1Pct/100);
    if (atk2Pct) atk2 *= (1 + atk2Pct/100);

    // ОКРУГЛЕНИЕ
    let speed = m.speed || 0;
    const speedPct = mods?.speedPct ?? 0;
    if (speedPct) speed = speed * (1 + speedPct/100);
    const speedRounded = Math.round(speed * 100) / 100;

    return {
      hp:   Math.round(hp),
      atk1: Math.round(atk1),
      atk2: Math.round(atk2),
      speed: speedRounded
    };
  }

  $: orbModifiers = calcOrbModifiers(basicSlots, specialSlot);
  $: stats = selected ? calcStats(selected, level, stars, orbModifiers) : {hp:0, atk1:0, atk2:0, speed:0};
  $: abilityRows = selected ? calcAbilityRows(selected, stats, orbModifiers, level) : [];
  $: typeIconCurrent = selected ? typeIconPath(selected.typeKey || selected.type) : '';

  function calcAbilityRows(mutant, statLine, mods, lvl){
    const list = Array.isArray(mutant?.abilities) ? mutant.abilities : [];
    if (!list.length) return [];
    const level = Number(lvl) || 1;
    const result = [];
    const abilityBoost = Math.abs(mods?.abilityPct ?? 0);
    const atkValues = {
      1: statLine?.atk1 ?? 0,
      2: statLine?.atk2 ?? 0,
    };
    const grouped = new Map();
    for (const ability of list) {
      if (!ability) continue;
      const base = ability.baseCode || ability.code;
      if (!grouped.has(base)) grouped.set(base, []);
      grouped.get(base).push(ability);
    }

    for (const [, entries] of grouped) {
      if (!entries.length) continue;
      const sorted = [...entries].sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));
      const ability = level >= 25 ? sorted[sorted.length - 1] : sorted[0];
      const basePctRaw = ability.pct ?? ability.raw?.pct ?? ability.raw?.percent ?? ability.raw?.percentage;
      const basePct = toNumber(basePctRaw);
      if (!Number.isFinite(basePct)) continue;
      const signedPct = basePct >= 0
        ? basePct + abilityBoost
        : -(Math.abs(basePct) + abilityBoost);

      const values = [];
      if (ability.hasAtk1) {
        const meta = mutant?.attackMeta?.[1] ?? {};
        const value = Math.round(Math.abs((atkValues[1] || 0) * signedPct / 100));
        values.push({
          attack: 1,
          value,
          label: meta.label ?? `Атака 1`,
          geneIcon: meta.geneIcon || '',
          isAoe: Boolean(meta.isAoe),
          attackPower: Math.round(Math.abs(atkValues[1] || 0)),
        });
      }
      if (ability.hasAtk2) {
        const meta = mutant?.attackMeta?.[2] ?? {};
        const value = Math.round(Math.abs((atkValues[2] || 0) * signedPct / 100));
        if (value || ability.hasAtk1 === false || !values.length) {
          values.push({
            attack: 2,
            value,
            label: meta.label ?? `Атака 2`,
            geneIcon: meta.geneIcon || '',
            isAoe: Boolean(meta.isAoe),
            attackPower: Math.round(Math.abs(atkValues[2] || 0)),
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
    if (geneFilter.has(letter)) geneFilter.delete(letter);
    else geneFilter.add(letter);
    // триггерим реактив
    geneFilter = new Set(geneFilter);
  }
  function selectMutant(m){
    selected = m;
  }
  function pickBasic(slotIndex, orb){
    basicSlots = basicSlots.map((v,i)=> i===slotIndex ? orb : v);
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
</script>

<!-- глобальный клик — безопасно для SSR -->
<svelte:window on:click={windowClick} />

<div class="stats-page">
  <!-- ЛЕВАЯ КОЛОНКА: КАТАЛОГ -->
  <aside class="catalog">
    <div class="filters-row">
      <!-- фильтры по генам -->
      {#each ['A','B','C','D','E','F'] as g}
        <button
          class:active={geneFilter.has(g)}
          class="gene-chip"
          on:click={() => toggleGene(g)}
          title={GENE_NAME[g]}>
          <img src={GENE_ICON[g] || GENE_ICON['']} alt={g} />
        </button>
      {/each}

      <!-- сортировки -->
      <div class="sort-switch">
        <button class:active={sortMode==='nameAsc'}  on:click={() => sortMode='nameAsc'}>Имя [А–Я]</button>
        <button class:active={sortMode==='nameDesc'} on:click={() => sortMode='nameDesc'}>Имя [Я–А]</button>
        <button class:active={sortMode==='gene'}     on:click={() => sortMode='gene'}>Ген</button>
      </div>
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

  <!-- ПРАВАЯ КОЛОНКА: КАРТОЧКА -->
  <section class="panel" >
    {#if selected}
      <header class="title">{selected.name}</header>

      <div class="hero-section">
        <div class="mut-figure">
          <img class="texture" src={figureImage(selected, stars)} alt={selected.name} />
        </div>

        <div class="abilities-block">
          <div class="block-head">
            <span class="block-title">Способности</span>
          </div>
          {#if abilityRows.length}
            <div class="abilities">
              {#each abilityRows as ab (ab.code + ab.label)}
                <div class="ability">
                  <div class="ability-values">
                    {#each ab.values as val (val.attack)}
                      <div class="ability-value">
                      <div class="attack-side">
                        <span class="attack-gene" class:empty={!val.geneIcon}>
                          {#if val.geneIcon}
                            <img class="gene-icon" src={val.geneIcon} alt="" aria-hidden="true" />
                          {/if}
                          {#if val.isAoe}
                            <img class="attack-aoe" src="/genes/atk_multiple.png" alt="АОЕ" />
                          {/if}
                        </span>
                        <div class="attack-info">
                          <span class="attack-label">{val.label}</span>
                          <span class="attack-damage">{val.attackPower?.toLocaleString('ru-RU') ?? '—'}</span>
                        </div>
                      </div>
                      <span class="ability-divider" aria-hidden="true"></span>
                      <div class="effect-side">
                        <div class="effect-head">
                          {#if ab.icon}
                            <img class="ability-icon" src={ab.icon} alt={ab.label} />
                          {/if}
                          <span class="effect-name">
                            {ab.label}
                            {#if ab.percent != null}
                              <span class="effect-percent">{ab.percent.toLocaleString('ru-RU')}%</span>
                            {/if}
                          </span>
                        </div>
                        <span class="effect-value">{val.value.toLocaleString('ru-RU')}</span>
                      </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="abilities">
              <div class="ability empty">—</div>
            </div>
          {/if}
        </div>
      </div>

      <!-- слоты сфер — единственные интерактивные -->
      <div class="slots" bind:this={dropdownHost}>
        <!-- базовые -->
        {#each basicSlots as orb, i}
          <div class="slot">
            <button class="slot-btn" on:click={() => openDropdown = openDropdown === `basic-${i}` ? null : `basic-${i}`}>
              <img class="slot-bg" src="/orbs/basic/orb_slot.png" alt="slot" />
              {#if orb}<img class="orb" src={orb.icon} alt={orb.id} />{/if}
            </button>
            {#if orb}
              <button class="x" title="убрать" on:click={() => clearSlot('basic', i)}>×</button>
            {/if}
            {#if openDropdown === `basic-${i}`}
              <div class="dropdown">
                {#each ORBS.basic as o}
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
            <img class="slot-bg" src="/orbs/special/orb_slot_spe.png" alt="special" />
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

      <!-- уровень + звёзды -->
      <div class="controls">
        <div class="control">
          <span class="control-label">Уровень:</span>
          <input class="lvl" type="number" min="1" max="300" bind:value={level} />
        </div>
        <div class="control">
          <span class="control-label">Звёздность:</span>
          <div class="stars">
            {#each [0,1,2,3,4] as s}
              <button
                class="star"
                class:selected={stars === s}
                on:click={() => stars = s}
                aria-pressed={stars === s}
                title={s===0?'Без звёзд': s===1?'Бронза': s===2?'Серебро': s===3?'Золото':'Платина'}>
                <img src={STAR_ICON[s]} alt="*" />
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- СТАТЫ -->
      <div class="stats">
        <div class="row">
          <span class="label">
            {#if typeIconCurrent}
              <img class="label-icon" src={typeIconCurrent} alt="Тип" />
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
        <div class="row">
          <span class="label">
            <img class="label-icon" src={STAT_ICON.speed} alt="Скорость" />
            Скорость
          </span>
          <b>{formatSpeed(stats.speed)}</b>
        </div>
      </div>

      
    {/if}
  </section>
</div>

<style>
  .stats-page{ display:grid; grid-template-columns: 320px minmax(0,660px); gap:18px; }
  .catalog{ background:#212832; border-radius:12px; padding:16px; display:flex; flex-direction:column; }
  .filters-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
  .gene-chip{ width:28px; height:28px; padding:2px; border-radius:6px; background:#2b3442; border:1px solid #364456; }
  .gene-chip.active{ outline:2px solid #90f36b; }
  .gene-chip img{ width:100%; height:100%; object-fit:contain; }
  .sort-switch{ margin-left:auto; display:flex; gap:6px; }
  .sort-switch button{ background:#2b3442; border:1px solid #3a475a; border-radius:8px; padding:6px 10px; font-size:12px; }
  .sort-switch .active{ background:#7a56ff; border-color:#7a56ff; color:white; }
  .search{ width:100%; margin:8px 0 12px; padding:8px 10px; border-radius:8px; border:1px solid #3a475a; background:#1b212a; color:#dfe7f3; }
  .list{ overflow:auto; max-height:70vh; display:flex; flex-direction:column; gap:6px; }
  .mut-row{ display:flex; align-items:center; gap:12px; background:#1b212a; border:1px solid #2e3948; border-radius:12px; padding:10px; width:100%; }
  .mut-row.active{ border-color:#90f36b; }
  .mut-icon{ width:44px; height:44px; border-radius:8px; background:#0f1319; object-fit:cover; }
  .mut-meta{ flex:1; display:flex; flex-direction:column; }
  .mut-meta .name{ font-size:13px; color:#e9eef6; }
  .mut-meta .genes{ display:flex; gap:4px; }
  .mut-meta .genes img{ width:20px; height:20px; }
  .rar{ font-size:11px; color:#aab6c8; }

  .panel{ background:#2a313c; border-radius:16px; padding:20px 22px; display:flex; flex-direction:column; gap:16px; }
  .title{ font-size:22px; font-weight:700; color:#e9eef6; text-align:center; }
  .hero-section{ display:grid; grid-template-columns: 250px minmax(0,1fr); gap:20px; align-items:stretch; }
  .hero-section > .abilities-block{ min-height:0; min-width:0; max-height:none; }
  .mut-figure{ position:relative; display:flex; justify-content:center; margin-bottom:0; padding:0 0 24px; }
  .mut-figure::after{ content:""; position:absolute; bottom:2px; left:50%; transform:translateX(-50%); width:272px; height:82px; background:radial-gradient(62% 72% at 50% 58%, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0) 82%); opacity:1; pointer-events:none; }
  .mut-figure .texture{ width:248px; height:248px; object-fit:contain; image-rendering:auto; transform:translateY(44px); }

  .slots{ display:flex; gap:18px; justify-content:center; margin:2px 0 0; position:relative; }
  .slot{ position:relative; }
  .slot-btn{ position:relative; width:84px; height:84px; border-radius:12px; background:transparent; border:none; padding:0; }
  .slot-bg{ width:100%; height:100%; object-fit:contain; }
  .orb{ position:absolute; inset:0; width:100%; height:100%; padding:7px; object-fit:contain; }
  .x{ position:absolute; right:-8px; top:-8px; width:22px; height:22px; border-radius:50%; border:none; background:#ff6464; color:white; font-size:14px; }
  .dropdown{ position:absolute; top:104px; left:0; width:250px; max-height:260px; overflow:auto; background:#1b212a; border:1px solid #3a475a; border-radius:12px; padding:8px; z-index:10; }
  .orb-row{ display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; border-radius:10px; background:#242b36; margin:6px 0; }
  .orb-row img{ width:36px; height:36px; object-fit:contain; }

  .controls{ display:flex; gap:14px; justify-content:center; margin:0 0 4px; flex-wrap:wrap; }
  .control{ display:flex; align-items:center; gap:6px; color:#aab6c8; font-size:12px; }
  .control .control-label{ white-space:nowrap; }
  .lvl{ width:68px; padding:6px 7px; border-radius:8px; border:1px solid #3a475a; background:#1b212a; color:#e9eef6; font-size:13px; }

  .stars{ display:flex; gap:6px; }
  .star{ width:32px; height:32px; border-radius:50%; background:transparent; border:none; padding:0; opacity:.45; transition:transform .15s ease, opacity .15s ease; }
  .star.selected{ opacity:1; transform:scale(1.06); filter:drop-shadow(0 0 8px rgba(255,255,255,0.45)); }
  .star img{ width:100%; height:100%; object-fit:contain; }
  .star:not(.selected) img{ filter:grayscale(1) brightness(0.6); }
  .star:focus-visible{ outline:2px solid #90f36b; outline-offset:2px; }

  .stats{ margin-top:0; display:flex; flex-direction:column; gap:8px; }
  .row{ display:flex; justify-content:space-between; align-items:center; background:#1b212a; border:1px solid #2e3948; border-radius:12px; padding:11px 13px; color:#dfe7f3; font-size:14px; }
  .row .label{ display:flex; align-items:center; gap:10px; color:#aab6c8; font-size:13px; }
  .row .label-icon{ width:22px; height:22px; object-fit:contain; }
  .abilities-block{ background:#1b212a; border:1px solid #2e3948; border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:14px; max-height:none; overflow:auto; }
  .block-head{ display:flex; align-items:center; justify-content:space-between; }
  .block-title{ font-size:16px; font-weight:600; color:#f0f6ff; }
  .abilities{ display:flex; flex-direction:column; gap:12px; width:100%; }
  .ability{ background:#2b3442; padding:14px; border-radius:12px; font-size:13px; display:flex; flex-direction:column; gap:12px; }
  .ability-values{ display:flex; flex-direction:column; gap:12px; color:#d4deeb; }
  .ability-value{ display:flex; align-items:center; gap:18px; background:rgba(15,19,25,0.35); padding:16px 18px; border-radius:12px; }
  .attack-side{ display:flex; align-items:center; gap:14px; flex:1 1 0; min-width:0; }
  .attack-gene{ position:relative; display:flex; align-items:center; justify-content:center; width:72px; height:72px; flex-shrink:0; }
  .attack-gene .gene-icon{ width:100%; height:100%; object-fit:contain; display:block; }
  .attack-gene .attack-aoe{ position:absolute; top:0; right:0; width:72px; height:72px; object-fit:contain; pointer-events:none; }
  .attack-gene.empty{ opacity:0; }
  .attack-info{ display:flex; flex-direction:column; gap:6px; min-width:0; }
  .attack-label{ font-weight:600; color:#f3f7ff; white-space:normal; overflow:hidden; text-overflow:ellipsis; font-size:14px; }
  .attack-damage{ font-size:18px; font-weight:700; color:#ffffff; }
  .ability-divider{ width:1px; align-self:stretch; background:rgba(255,255,255,0.08); }
  .effect-side{ display:flex; flex-direction:column; gap:10px; min-width:0; flex:1 1 0; }
  .effect-head{ display:flex; align-items:center; gap:10px; }
  .ability-icon{ width:32px; height:32px; object-fit:contain; }
  .effect-name{ display:flex; align-items:center; gap:6px; font-weight:600; color:#f0f6ff; }
  .effect-percent{ font-size:14px; color:#90f36b; font-weight:600; }
  .effect-value{ font-size:18px; color:#90f36b; font-weight:700; }
  .ability.empty{ align-items:center; justify-content:center; color:#94a2b9; }
</style>
