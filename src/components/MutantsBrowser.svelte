<script lang="ts">
  import MutantModal from './MutantModal.svelte';
  import { TYPE_RU, geneLabel, bingoLabel } from '@/lib/mutant-dicts';

  // Нормализация текста для поиска: приводит к нижнему регистру и удаляет спецсимволы
  function normalizeForSearch(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\u0400-\u04FF]/g, ''); // Оставляем только буквы/цифры и кириллицу
  }

  // Пропсы
  export let items: any[] = [];     // normal + bronze + silver + gold + platinum
  export let skins: any[] = [];     // skins.json -> specimens[]
  export let bingos: any[] = [];    // bingos.json
  export let title = '';
  export let bingoIndex: string[] = [];
  
  // Мемо-кэш для фильтрации/сортировки
  const _cache = new Map<string, any[]>();
  function memo<T>(key: string, calc: () => T): T {
    if (_cache.has(key)) return _cache.get(key) as T;
    const v = calc();
    _cache.set(key, v as any);
    return v;
  }


  // =========================
  // НОРМАЛИЗАЦИЯ ДАННЫХ
  // =========================
  const baseId = (id: any) =>
    String(id ?? '')
      .toLowerCase()
      .replace(/_+(?:normal|bronze|silver|gold|platinum|plat).*$/i, '');

  type BaseMap = Map<string, any>;
  function buildBaseMap(list: any[]): BaseMap {
    const map: BaseMap = new Map();
    for (const item of Array.isArray(list) ? list : []) {
      const key = baseId(item?.id);
      if (!key) continue;
      const id = String(item?.id ?? '').toLowerCase();
      // Для базовой карты предпочитаем normal версию, но сохраняем все версии по id для быстрого доступа
      const isNormal = !/_+(?:bronze|silver|gold|platinum|plat)\b/.test(id);
      if (!map.has(key) || isNormal) {
        map.set(key, item);
      }
    }
    return map;
  }

  // Создаем карту всех мутантов по связке (baseId + star) для быстрой подмены версий
  function buildStarMap(list: any[]) {
    const map = new Map<string, any>();
    for (const item of list) {
        const bid = baseId(item.id);
        const star = String(item.star ?? 'normal').toLowerCase();
        map.set(`${bid}:${star}`, item);
    }
    return map;
  }

  function hasBingo(val: any): boolean {
    if (!val) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return false;
  }

  function mergeBaseStats(baseStats: any, override: any) {
    if (!baseStats && !override) return undefined;
    const result = { ...(baseStats ?? {}) };
    if (baseStats?.lvl1 || override?.lvl1) {
      result.lvl1 = { ...(baseStats?.lvl1 ?? {}), ...(override?.lvl1 ?? {}) };
    }
    if (baseStats?.lvl30 || override?.lvl30) {
      result.lvl30 = { ...(baseStats?.lvl30 ?? {}), ...(override?.lvl30 ?? {}) };
    }
    for (const key of Object.keys(override ?? {})) {
      if (key === 'lvl1' || key === 'lvl30') continue;
      result[key] = override[key];
    }
    return result;
  }

  function pickImage(preferred: any, fallback: any) {
    if (Array.isArray(preferred)) return preferred.slice();
    if (preferred != null) return preferred;
    if (Array.isArray(fallback)) return fallback.slice();
    return fallback ?? [];
  }

  function mapSkin(s: any, lookup: BaseMap, index: number) {

    const key = baseId(s?.id);
    const base = key ? lookup.get(key) : undefined;

    const merged: any = {
      ...(base ?? {}),
      ...(s ?? {}),
      id: s?.id ?? base?.id,
      name: s?.name ?? base?.name,
      genes: Array.isArray(s?.genes) && s.genes.length ? s.genes : base?.genes,
      base_stats: mergeBaseStats(base?.base_stats, s?.base_stats),
      image: pickImage(s?.image, base?.image),
      type: s?.type ?? base?.type ?? 'default',
      star: !s?.star || s.star === 'none' ? 'normal' : String(s.star).toLowerCase(),
      bingo: hasBingo(s?.bingo) ? s.bingo : base?.bingo,
      abilities: Array.isArray(s?.abilities) && s.abilities.length ? s.abilities : base?.abilities,
      name_attack1: s?.name_attack1 ?? base?.name_attack1,
      name_attack2: s?.name_attack2 ?? base?.name_attack2,
      name_lore: s?.name_lore ?? base?.name_lore,
      incub_time:
        s?.incub_time ??
        s?.incubation ??
        s?.incubation_time ??
        s?.incubationTime ??
        s?.incubation_hours ??
        s?.hatch_time ??
        base?.incub_time ??
        base?.incubation ??
        base?.incubation_time ??
        base?.incubationTime ??
        base?.incubation_hours ??
        base?.hatch_time,
      chance: s?.chance ?? s?.chance_percent ?? base?.chance ?? base?.chance_percent,
      tier: s?.tier ?? base?.tier,
      skin: s?.skin ?? base?.skin ?? true,
      __source: 'skin' as const,
      __skinIndex: index,
      __skinKey: `${key || 'skin'}::${String(s?.skin ?? '')}::${index}`,
    };

    return merged;
  }

  let baseMap: BaseMap = new Map();
  $: baseMap = buildBaseMap(items ?? []);

  let starMap: Map<string, any> = new Map();
  $: starMap = buildStarMap(items ?? []);

  // Кэшируем enriched данные - пересчитываем только при изменении items/skins
  let preparedMutants: any[] = [];
  let preparedSkins: any[] = [];

  $: {
    // При изменении items пересоздаем preparedMutants
    preparedMutants = (items || []).map(enrichItem);
    _cache.clear(); // Очищаем кэш фильтрации
  }

  $: normalizedSkins = (Array.isArray(skins) ? skins : []).map((skin, index) => mapSkin(skin, baseMap, index));

  $: {
    // При изменении normalizedSkins пересоздаем preparedSkins
    preparedSkins = (normalizedSkins || []).map(enrichItem);
    _cache.clear(); // Очищаем кэш фильтрации
  }

  // ===========
  // КОНТРОЛЫ UI
  // ===========
  type Mode = 'mutants' | 'skins';
  let mode: Mode = 'mutants';

  let query = '';
  let gene1Sel = '';
  let gene2Sel = '';
  $: geneSel = [gene1Sel, gene2Sel].filter(Boolean).sort().join('');

  $: typeOptions = uniq(items.map(it => it?.type).filter(Boolean))
      .sort((a:any,b:any) => String(TYPE_RU?.[a] ?? a).localeCompare(String(TYPE_RU?.[b] ?? b), 'ru'));
  let typeSel = '';

  function collectBingoKeys(it:any): string[] {
    const b = it?.bingo;
    if (!b) return [];
    if (Array.isArray(b)) return b.map((x:any) => typeof x === 'string' ? x : (x?.key ?? '')).filter(Boolean);
    if (typeof b === 'object') return Object.keys(b);
    return [];
  }
  function flatten<T>(arr: T[][]): T[] { const out:T[]=[]; for (let i=0;i<arr.length;i++) out.push(...arr[i]); return out; }
  $: bingoOptions = (bingoIndex?.length
      ? [...bingoIndex]
      : uniq(flatten(items.map(collectBingoKeys)))
    ).sort((a,b) => String(bingoLabel?.(a) ?? a).localeCompare(String(bingoLabel?.(b) ?? b), 'ru'));
  let bingoSel = '';

  type StarKey = 'normal'|'bronze'|'silver'|'gold'|'platinum';
  type SkinStarKey = 'any'|'normal'|'bronze'|'silver'|'gold'|'platinum';

  const STAR_MUTANTS: {key: StarKey; icon: string; label: string}[] = [
    { key: 'normal',   icon: '/stars/no_stars.webp',      label: 'Обычные' },
    { key: 'bronze',   icon: '/stars/star_bronze.webp',   label: 'Бронза' },
    { key: 'silver',   icon: '/stars/star_silver.webp',   label: 'Серебро' },
    { key: 'gold',     icon: '/stars/star_gold.webp',     label: 'Золото' },
    { key: 'platinum', icon: '/stars/star_platinum.webp', label: 'Платина' },
  ];
  const STAR_SKINS: {key: SkinStarKey; icon?: string; label: string}[] = [
    { key: 'any',      label: 'Все' },
    { key: 'normal',   icon: '/stars/no_stars.webp',      label: 'Обычные' },
    { key: 'bronze',   icon: '/stars/star_bronze.webp',   label: 'Бронза' },
    { key: 'silver',   icon: '/stars/star_silver.webp',   label: 'Серебро' },
    { key: 'gold',     icon: '/stars/star_gold.webp',     label: 'Золото' },
    { key: 'platinum', icon: '/stars/star_platinum.webp', label: 'Платина' },
  ];

  let starSelMutants: StarKey = 'normal';
  let starSelSkins: SkinStarKey = 'any';

  function switchTo(next: Mode) {
    mode = next;
    if (mode === 'mutants') {
      if (!['normal','bronze','silver','gold','platinum'].includes(starSelMutants)) starSelMutants = 'normal';
    } else {
      if (!['any','normal','bronze','silver','gold','platinum'].includes(starSelSkins)) starSelSkins = 'any';
    }
  }

  const geneList = [
    { key: '',  label: 'Все',                   icon: '/genes/icon_gene_all.webp' },
    { key: 'A', label: geneLabel?.('A') ?? 'A', icon: '/genes/icon_gene_a.webp' },
    { key: 'B', label: geneLabel?.('B') ?? 'B', icon: '/genes/icon_gene_b.webp' },
    { key: 'C', label: geneLabel?.('C') ?? 'C', icon: '/genes/icon_gene_c.webp' },
    { key: 'D', label: geneLabel?.('D') ?? 'D', icon: '/genes/icon_gene_d.webp' },
    { key: 'E', label: geneLabel?.('E') ?? 'E', icon: '/genes/icon_gene_e.webp' },
    { key: 'F', label: geneLabel?.('F') ?? 'F', icon: '/genes/icon_gene_f.webp' },
  ];
  const geneButtonClass = (selected: boolean) =>
    'p-1 rounded-lg ring-1 ' + (selected ? 'bg-cyan-700 ring-cyan-400' : 'bg-slate-800 ring-white/10');

  // =================
  // ПОМОЩНИКИ ФИЛЬТРОВ
  // =================
  const normalizeGene = (s:string) => (s ?? '').toUpperCase().split('').sort().join('');
  const starOf = (it:any) => String(it?.star ?? 'normal').toLowerCase();
  function readGeneCode(it:any): string {
    if (Array.isArray(it?.genes) && typeof it.genes[0] === 'string') return it.genes[0];
    if (typeof it?.gene === 'string') return it.gene;
    if (typeof it?.gene_code === 'string') return it.gene_code;
    return '';
  }
  const geneOrder = new Map<string, number>([
    ['A', 0], ['B', 1], ['C', 2], ['D', 3], ['E', 4], ['F', 5],
  ]);

  function compareByGeneFast(a: any, b: any) {
    const ma = a._meta;
    const mb = b._meta;
    if (ma.rank !== mb.rank) return ma.rank - mb.rank;
    if (ma.code !== mb.code) return ma.code.localeCompare(mb.code, 'ru');
    return 0;
  }

  function enrichItem(it: any) {
    const searchName = normalizeForSearch(String(it?.name ?? ''));
    const rawCode = readGeneCode(it);
    const code = normalizeGene(rawCode);
    const first = code?.[0] ?? '';
    const rank = first ? geneOrder.get(first) ?? 99 : 199;

    // Регистронезависимый тип
    const typeKey = String(it?.type ?? '').toLowerCase();

    const starKey = starOf(it);
    const bingoKeys = new Set(collectBingoKeys(it).map(String));
    return {
      ...it,
      _meta: { searchName, code, rank, typeKey, starKey, bingoKeys, id: String(it?.id ?? '') }
    };
  }

  function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }

  // Генерирует ключ кэша на основе параметров фильтрации
  function getCacheKey(q: string, gene: string, type: string, bingo: string, star: string): string {
    return `${q}|${gene}|${type}|${bingo}|${star}`;
  }

  // МЕГА-БЫСТРАЯ ФИЛЬТРАЦИЯ С КЭШИРОВАНИЕМ
  $: filteredMutants = memo(getCacheKey(query, geneSel, typeSel, bingoSel, starSelMutants), () => {
    return (() => {
    const q = query ? query.trim().toLowerCase() : null;
    const normalizedQ = q ? normalizeForSearch(q) : null;
    const sBingo = bingoSel ? String(bingoSel) : null;
    const sType = typeSel ? String(typeSel).toLowerCase() : null;

    // Если есть поисковый запрос, игнорируем фильтры звезд/атрибутов
    const isSearching = !!normalizedQ;
    const checkStars = !isSearching && starSelMutants !== 'normal';

    const bingoData = sBingo ? bingos.find((b: any) => b.id === sBingo) : null;
    const isReactorSel = sBingo === 'reactor' || (sType === 'reactor' || sType === 'gacha');
    const sTypeIsReactor = sType === 'reactor' || sType === 'gacha';

    // Объединяем map + filter в один проход для оптимизации
    const res = [];
    for (const it of preparedMutants) {
      const m = it._meta;

      // Фильтр поиска
      if (normalizedQ && !m.searchName.includes(normalizedQ)) continue;

      // Если ищем по имени, пропускаем остальные фильтры
      if (!isSearching) {
        // Фильтр генов
        if (geneSel && m.code !== geneSel) continue;

        // Поиск по типу (с учетом синонимов для Реактора)
        if (sType) {
          if (sTypeIsReactor) {
            const hasReactorBingo = m.bingoKeys.has('reactor');
            const isGachaType = m.typeKey === 'reactor' || m.typeKey === 'gacha';
            if (!hasReactorBingo && !isGachaType) continue;
          } else {
            if (m.typeKey !== sType) continue;
          }
        }

        // Фильтр бинго и звезд
        if (sBingo) {
          if (sBingo === 'reactor') {
            const hasReactorBingo = m.bingoKeys.has('reactor');
            const isGachaType = m.typeKey === 'gacha';
            if (!hasReactorBingo && !isGachaType) continue;
          } else {
            if (!m.bingoKeys.has(sBingo)) continue;
          }
        } else if (sTypeIsReactor) {
          const hasReactorBingo = m.bingoKeys.has('reactor');
          const isGachaType = m.typeKey === 'gacha';
          if (!hasReactorBingo && !isGachaType) continue;
        } else {
          if (checkStars) {
            if (m.starKey !== starSelMutants) continue;
          } else {
            if (m.starKey !== 'normal') continue;
          }
        }
      }

      // Определяем принудительный скин
      let fSkin = null;
      if (bingoData) {
        const entry = bingoData.mutants.find((bm: any) => bm.specimenId.toLowerCase() === m.id.toLowerCase());
        if (entry && entry.skin && entry.skin !== '_any') {
          fSkin = entry.skin;
        }
      }

      if (!fSkin && isReactorSel) {
        const hasReactorBingo = m.bingoKeys.has('reactor');
        const isGachaType = m.typeKey === 'reactor' || m.typeKey === 'gacha';
        if (hasReactorBingo || isGachaType) {
          fSkin = 'gachaboss';
        }
      }

      res.push({ ...it, forceSkin: fSkin });
    }

    // --- МАГИЯ ПОДМЕНЫ ВЕРСИЙ ДЛЯ БИНГО ---
    // Если выбрано звездное Бинго, подменяем мутанта на его звездную версию из starMap
    if (sBingo) {
        let autoStar = '';
        if (sBingo === 'reactor') autoStar = 'platinum';
        else if (sBingo.includes('bronze') || sBingo.includes('research_1')) autoStar = 'bronze';
        else if (sBingo.includes('silver') || sBingo.includes('research_2')) autoStar = 'silver';
        else if (sBingo.includes('gold') || sBingo.includes('research_3')) autoStar = 'gold';
        else if (sBingo.includes('platinum') || sBingo.includes('plat') || sBingo.includes('research_4')) autoStar = 'platinum';

        if (autoStar) {
            return res.map(it => {
                const bid = baseId(it.id);
                const version = starMap.get(`${bid}:${autoStar}`);
                if (version) {
                  const enriched = enrichItem(version);
                  if (it.forceSkin) enriched.forceSkin = it.forceSkin;
                  return enriched;
                }
                return it;
            }).sort(compareByGeneFast);
        }
    }

    return res.sort(compareByGeneFast);
    })();
  });

  // МЕГА-БЫСТРАЯ ФИЛЬТРАЦИЯ СКИНОВ С КЭШИРОВАНИЕМ
  $: filteredSkins = memo(getCacheKey(query, geneSel, typeSel, '', starSelSkins), () => {
    return (() => {
    const q = query ? query.trim().toLowerCase() : null;
    const normalizedQ = q ? normalizeForSearch(q) : null;
    const isSearching = !!normalizedQ;
    const checkStars = !isSearching && starSelSkins !== 'any';
    const targetStar = starSelSkins === 'normal' ? 'normal' : starSelSkins;

    const res = [];
    for (const it of preparedSkins) {
      const m = it._meta;
      if (normalizedQ && !m.searchName.includes(normalizedQ)) continue;
      if (isSearching) {
        res.push(it);
        continue;
      }
      if (geneSel && m.code !== geneSel) continue;
      if (checkStars && m.starKey !== targetStar) continue;
      res.push(it);
    }
    return res.sort(compareByGeneFast);
    })();
  });

  let pageSize = 20;
  let currentPage = 1;
  $: {
    mode; query; geneSel; typeSel; bingoSel; starSelMutants; starSelSkins;
    currentPage = 1;
  }
  $: endIndex = pageSize * currentPage;
  $: shownMutants = filteredMutants.slice(0, endIndex);
  $: shownSkins = filteredSkins.slice(0, endIndex);

  function pickTexture(it:any): string {
    const star = String(it?.star ?? 'normal').toLowerCase();
    const bid = baseId(it.id);

    // Если есть принудительный скин
    if (it?.forceSkin) {
        const skinTag = String(it.forceSkin).toLowerCase();
        
        // Ищем в глобальном списке скинов (skins.json)
        if (skins && skins.length > 0) {
           const skinEntry = skins.find((s: any) => {
             const sId = baseId(s.id);
             const sSkin = String(s.skin ?? '').toLowerCase();
             return sId === bid && (sSkin.includes(skinTag) || skinTag.includes(sSkin));
           });
           
           if (skinEntry && skinEntry.image) {
             const skinImages = Array.isArray(skinEntry.image) ? skinEntry.image : [skinEntry.image];
             // Предпочитаем full-char
             const fullChar = skinImages.find((p: any) => String(p).includes('full-char'));
             if (fullChar) return fullChar;
             const semiFull = skinImages.find((p: any) => String(p).includes('semi-full'));
             if (semiFull) return semiFull;
             return skinImages[0];
           }
        }
    }

    const list = Array.isArray(it?.image) ? it.image : (it?.image ? [it.image] : []);

    // Ищем текстуру под звезду
    let pick = list.find((p: string) => {
        const path = p.toLowerCase();
        if (star === 'normal') return path.includes('normal') || (!path.includes('bronze') && !path.includes('silver') && !path.includes('gold') && !path.includes('platinum') && !path.includes('plat'));
        if (star === 'platinum') return path.includes('platinum') || path.includes('plat');
        return path.includes(star);
    });

    if (!pick) {
        pick = list.find((p:string) => p.includes('textures_by_mutant/') && !p.includes('specimen') && !p.includes('larva'))
               || list[0];
    }
    return pick ?? 'placeholder-mutant.webp';
  }
  function rarityType(item:any){
    return (item?.star ?? 'normal').toLowerCase();
  }
  
  const isSkin = (it:any) =>
    it?.__source === 'skin' || typeof it?.skin !== 'undefined';
    
  const keyOf = (it:any, index?: number) => {
    if (isSkin(it)) {
      if (typeof it?.__skinKey === 'string') return `skin:${it.__skinKey}`;
      const key = baseId(it?.id);
      const variant = it?.skin ?? index ?? '';
      return `skin:${key}:${variant}:${index ?? 0}`;
    }
    return `mut:${it?.id ?? index}:${it?.star ?? 'n'}`;
  };

  let openItem:any = null;
  const openModal  = (it:any) => { openItem = it; };
  const closeModal = () => { openItem = null; };
</script>

<div class="mx-auto max-w-[1400px] px-4 py-6 page-2k">
  {#if title}
    <h1 class="text-2xl md:text-3xl font-bold text-slate-100 mb-4">{title}</h1>
  {/if}

  <!-- Переключатель режимов -->
  <div class="mb-4 flex flex-wrap gap-2">
    <button type="button"
      class={'px-3 rounded-lg ring-1 h-8 text-[11px] uppercase tracking-wider '
        + (mode==='mutants' ? 'bg-cyan-700 ring-cyan-400 text-white' : 'bg-slate-800 ring-white/10 text-slate-200')}
      on:click={() => switchTo('mutants')}
      aria-pressed={mode==='mutants'}
    >
      MUTANTS
    </button>
    <button type="button"
      class={'px-3 rounded-lg ring-1 h-8 text-[11px] uppercase tracking-wider '
        + (mode==='skins' ? 'bg-cyan-700 ring-cyan-400 text-white' : 'bg-slate-800 ring-white/10 text-slate-200')}
      on:click={() => switchTo('skins')}
      aria-pressed={mode==='skins'}
    >
      SKINS
    </button>
  </div>

  <!-- Поиск -->
  <div class="mb-3">
    <input
      class="w-full px-4 py-3 rounded-lg ring-1 transition outline-none bg-slate-900 text-slate-100 placeholder-slate-400 ring-white/10 focus:ring-2 focus:ring-cyan-400"
      placeholder="Введите имя мутанта…"
      bind:value={query}
    />
  </div>

  <!-- Гены: две строки -->
  <div class="mb-2 rounded-xl bg-slate-900/60 ring-1 ring-white/10 p-2 shadow-sm md:shadow">
    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap gap-2">
        {#each geneList as g}
          <button type="button"
            class={geneButtonClass(gene1Sel===g.key)}
            on:click={() => { gene1Sel = (g.key==='' ? '' : (gene1Sel===g.key ? '' : g.key)); }}
            title={g.label}
            aria-pressed={gene1Sel===g.key}
          >
            <img src={g.icon} alt={g.label} class="h-8 w-8 object-contain" />
          </button>
        {/each}
      </div>
      <div class="flex flex-wrap gap-2">
        {#each geneList as g}
          <button type="button"
            class={geneButtonClass(gene2Sel===g.key)}
            on:click={() => { gene2Sel = (g.key==='' ? '' : (gene2Sel===g.key ? '' : g.key)); }}
            title={g.label}
            aria-pressed={gene2Sel===g.key}
          >
            <img src={g.icon} alt={g.label} class="h-8 w-8 object-contain" />
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Редкость (иконки) -->
  <div class="mb-4 rounded-xl bg-slate-900/60 ring-1 ring-white/10 p-2 shadow-sm md:shadow">
    {#if mode === 'mutants'}
      <div class="flex flex-wrap gap-2">
        {#each STAR_MUTANTS as s}
          <button type="button"
            class={'px-2 h-8 rounded-lg ring-1 flex items-center gap-2 '
              + (starSelMutants===s.key ? 'bg-cyan-700 ring-cyan-400 text-white' : 'bg-slate-800 ring-white/10 text-slate-200')}
            on:click={() => (starSelMutants = s.key)}
            aria-pressed={starSelMutants===s.key}
          >
            <img src={s.icon} alt={s.label} class="h-5 w-5 object-contain" />
            <span class="text-xs">{s.label}</span>
          </button>
        {/each}
      </div>
    {:else}
      <div class="flex flex-wrap gap-2">
        {#each STAR_SKINS as s}
          <button type="button"
            class={'px-2 h-8 rounded-lg ring-1 flex items-center gap-2 '
              + (starSelSkins===s.key ? 'bg-cyan-700 ring-cyan-400 text-white' : 'bg-slate-800 ring-white/10 text-slate-200')}
            on:click={() => (starSelSkins = s.key)}
            aria-pressed={starSelSkins===s.key}
          >
            {#if s.icon}<img src={s.icon} alt={s.label} class="h-5 w-5 object-contain" />{/if}
            <span class="text-xs">{s.label}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Тип/Бинго (селекты) -->
  <div class="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
    <label class="flex flex-col gap-1">
      <span class="text-xs text-slate-300">Тип</span>
      <select
        class={'px-3 py-2 rounded-lg ring-1 '
          + (mode==='mutants'
              ? 'bg-slate-900 text-slate-100 ring-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400'
              : 'bg-slate-800/60 text-slate-500 ring-white/10/30 pointer-events-none')}
        bind:value={typeSel}
        disabled={mode!=='mutants'}
      >
        <option value=''>Любой</option>
        {#each typeOptions as t}<option value={t}>{TYPE_RU?.[t] ?? t}</option>{/each}
      </select>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs text-slate-300">Бинго</span>
      <select
        class={'px-3 py-2 rounded-lg ring-1 '
          + (mode==='mutants'
              ? 'bg-slate-900 text-slate-100 ring-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400'
              : 'bg-slate-800/60 text-slate-500 ring-white/10/30 pointer-events-none')}
        bind:value={bingoSel}
        disabled={mode!=='mutants'}
      >
        <option value=''>Любое</option>
        {#each bingoOptions as b}<option value={b}>{bingoLabel?.(b) ?? b}</option>{/each}
      </select>
    </label>
  </div>

  <!-- Сетка карточек -->
  <div class="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 [content-visibility:auto]" style="contain-intrinsic-size: 1200px;">
    {#if mode === 'mutants'}
      {#each shownMutants as it, i (keyOf(it, i))}
        <div role="button" tabindex="0" class="cursor-pointer" on:click={() => openModal(it)}>
          <div class="relative rounded-xl overflow-hidden bg-slate-800 ring-1 ring-white/10" style="content-visibility:auto; contain-intrinsic-size: 260px 340px;">
            <img class="w-full object-contain bg-slate-900" style="height: 195px;" src={'/' + pickTexture(it)} alt={it.name} loading="lazy" decoding="async" width="512" height="512" />
            <div class="px-3 pt-2 pb-3">
              <div class="text-slate-100 font-semibold text-sm truncate">{it.name}</div>
            </div>
          </div>
        </div>
      {/each}
    {:else}
      {#each shownSkins as it, i (keyOf(it, i))}
        <div role="button" tabindex="0" class="cursor-pointer" on:click={() => openModal(it)}>
          <div class="relative rounded-xl overflow-hidden bg-slate-800 ring-1 ring-white/10" style="content-visibility:auto; contain-intrinsic-size: 260px 340px;">
            <img class="w-full object-contain bg-slate-900" style="height: 195px;" src={'/' + pickTexture(it)} alt={it.name} loading="lazy" decoding="async" width="512" height="512" />
            <div class="px-3 pt-2 pb-3">
              <div class="text-slate-100 font-semibold text-sm truncate">{it.name}</div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Показать ещё -->
  {#if mode === 'mutants'}
    {#if shownMutants.length < filteredMutants.length}
      <div class="mt-3 flex justify-center">
        <button class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 ring-1 ring-white/10 text-white"
                on:click={() => { currentPage = currentPage + 1; }}>
          Показать ещё
        </button>
      </div>
    {/if}
  {:else}
    {#if shownSkins.length < filteredSkins.length}
      <div class="mt-3 flex justify-center">
        <button class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 ring-1 ring-white/10 text-white"
                on:click={() => { currentPage = currentPage + 1; }}>
          Показать ещё
        </button>
      </div>
    {/if}
  {/if}

  {#if openItem}
    <MutantModal open={true} mutant={openItem} star={rarityType(openItem)} on:close={closeModal} />
  {/if}
</div>

<style>
  /* Апскейл на ≥2K */
  @media (min-width: 2048px){ .page-2k { font-size: 1.0625rem; } }
</style>
