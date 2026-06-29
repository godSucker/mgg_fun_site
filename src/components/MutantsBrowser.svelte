<script lang="ts">
  import MutantModal from './MutantModal.svelte';
  import { TYPE_RU, geneLabel, bingoLabel } from '@/lib/mutant-dicts';
  import { normalizeSearch } from '@/lib/search-normalize';
  import { sortMutantsByGene } from '@/lib/mutant-sort';
  import { textureUrl } from '@/lib/texture-cdn';

  const normalizeForSearch = normalizeSearch;

  let { items = [], skins = [], bingos = [], title = '', bingoIndex = [], star = '' } = $props();

  const _cache = new Map<string, any[]>();
  function memo<T>(key: string, calc: () => T): T {
    if (_cache.has(key)) return _cache.get(key) as T;
    const v = calc();
    _cache.set(key, v as any);
    return v;
  }

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
      const isNormal = !/_+(?:bronze|silver|gold|platinum|plat)\b/.test(id);
      if (!map.has(key) || isNormal) {
        map.set(key, item);
      }
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

  let baseMap: BaseMap = $derived(buildBaseMap(items ?? []));

  let preparedMutants: any[] = $state([]);
  let preparedSkins: any[] = $state([]);

  $effect(() => {
    preparedMutants = (items || []).map(enrichItem);
    _cache.clear();
  });

  let normalizedSkins = $derived((Array.isArray(skins) ? skins : []).map((skin, index) => mapSkin(skin, baseMap, index)));

  $effect(() => {
    preparedSkins = (normalizedSkins || []).map(enrichItem);
    _cache.clear();
  });

  type Mode = 'mutants' | 'skins';
  let mode: Mode = $state('mutants');
  type ViewMode = 'full' | 'heads';
  let viewMode: ViewMode = $state('heads');

  let query = $state('');
  let gene1Sel = $state('');
  let gene2Sel = $state('');

  $effect(() => {
    if (!gene1Sel) gene2Sel = '';
  });

  let typeOptions = $derived(uniq(items.map(it => it?.type).filter(Boolean))
      .sort((a:any,b:any) => String(TYPE_RU?.[a] ?? a).localeCompare(String(TYPE_RU?.[b] ?? b), 'ru')));
  let typeSel = $state('');

  function collectBingoKeys(it:any): string[] {
    const b = it?.bingo;
    if (!b) return [];
    if (Array.isArray(b)) return b.map((x:any) => typeof x === 'string' ? x : (x?.key ?? '')).filter(Boolean);
    if (typeof b === 'object') return Object.keys(b);
    return [];
  }
  function flatten<T>(arr: T[][]): T[] { const out:T[]=[]; for (let i=0;i<arr.length;i++) out.push(...arr[i]); return out; }
  let bingoOptions = $derived((bingoIndex?.length
      ? [...bingoIndex]
      : uniq(flatten(items.map(collectBingoKeys)))
    ).sort((a,b) => {
      const la = String(bingoLabel?.(a) ?? a);
      const lb = String(bingoLabel?.(b) ?? b);
      const aIsResearch = /^Исследование\s/.test(la);
      const bIsResearch = /^Исследование\s/.test(lb);
      if (aIsResearch && !bIsResearch) return -1;
      if (!aIsResearch && bIsResearch) return 1;
      const na = la.replace(/\d+/g, m => m.padStart(6, '0'));
      const nb = lb.replace(/\d+/g, m => m.padStart(6, '0'));
      return na.localeCompare(nb, 'ru');
    }));
  let bingoSel = $state('');

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

  const starSelMutants: StarKey = 'normal';
  let starSelSkins: SkinStarKey = $state('any');

  function switchTo(next: Mode) {
    mode = next;
    if (mode === 'skins') {
      if (!['any','normal','bronze','silver','gold','platinum'].includes(starSelSkins)) starSelSkins = 'any';
    }
  }

  const geneList = [
    { key: '',  label: 'Ген 1: ВСЕ',             icon: '/genes/gene_all.webp' },
    { key: 'A', label: geneLabel?.('A') ?? 'A', icon: '/genes/gene_a.webp' },
    { key: 'B', label: geneLabel?.('B') ?? 'B', icon: '/genes/gene_b.webp' },
    { key: 'C', label: geneLabel?.('C') ?? 'C', icon: '/genes/gene_c.webp' },
    { key: 'D', label: geneLabel?.('D') ?? 'D', icon: '/genes/gene_d.webp' },
    { key: 'E', label: geneLabel?.('E') ?? 'E', icon: '/genes/gene_e.webp' },
    { key: 'F', label: geneLabel?.('F') ?? 'F', icon: '/genes/gene_f.webp' },
  ];
  const geneList2 = [
    { key: '', label:  'Ген 2: ВСЕ',             icon: '/genes/gene_all.webp' },
    { key: 'neutral', label: 'Нейтральный',      icon: '/genes/gene_all.webp' },
    { key: 'A', label: geneLabel?.('A') ?? 'A', icon: '/genes/gene_a.webp' },
    { key: 'B', label: geneLabel?.('B') ?? 'B', icon: '/genes/gene_b.webp' },
    { key: 'C', label: geneLabel?.('C') ?? 'C', icon: '/genes/gene_c.webp' },
    { key: 'D', label: geneLabel?.('D') ?? 'D', icon: '/genes/gene_d.webp' },
    { key: 'E', label: geneLabel?.('E') ?? 'E', icon: '/genes/gene_e.webp' },
    { key: 'F', label: geneLabel?.('F') ?? 'F', icon: '/genes/gene_f.webp' },
  ];
  const geneButtonClass = (selected: boolean, disabled: boolean = false) =>
    'p-1 rounded-lg ring-1 ' + (disabled ? 'bg-slate-900 ring-white/5 opacity-30 cursor-not-allowed' : selected ? 'bg-cyan-700 ring-cyan-400' : 'bg-slate-800 ring-white/10');

  const geneChipClass = (selected: boolean, disabled: boolean = false) =>
    'h-9 px-3 rounded-lg ring-1 flex items-center justify-center ' +
    (disabled ? 'bg-slate-900 ring-white/5 opacity-30 cursor-not-allowed' :
     selected ? 'bg-cyan-700 ring-cyan-400 text-white' :
     'bg-slate-800 ring-white/10 text-slate-200');

  const normalizeGene = (s:string) => (s ?? '').toUpperCase();
  const starOf = (it:any) => String(it?.star ?? 'normal').toLowerCase();
  function readGeneCode(it:any): string {
    if (Array.isArray(it?.genes)) {
      return it.genes.filter(Boolean).map((g: any) => String(g).toUpperCase()).join('');
    }
    if (typeof it?.gene === 'string') return it.gene;
    if (typeof it?.gene_code === 'string') return it.gene_code;
    return '';
  }
  const geneOrder = new Map<string, number>([
    ['A', 0], ['B', 1], ['C', 2], ['D', 3], ['E', 4], ['F', 5],
  ]);

  function enrichItem(it: any) {
    const searchName = normalizeForSearch(String(it?.name ?? ''));
    const rawCode = readGeneCode(it);
    const code = normalizeGene(rawCode);
    const first = code?.[0] ?? '';
    const rank = first ? geneOrder.get(first) ?? 99 : 199;

    const secondaryWeight = code.length <= 1 ? 0 : (geneOrder.get(code[1]) ?? 99) + 1;

    const typeKey = String(it?.type ?? '').toLowerCase();

    const starKey = starOf(it);
    const bingoKeys = new Set(collectBingoKeys(it).map(String));
    return {
      ...it,
      _meta: { searchName, code, rank, secondaryWeight, typeKey, starKey, bingoKeys, id: String(it?.id ?? '') }
    };
  }

  function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }

  function getCacheKey(q: string, gene: string, type: string, bingo: string, star: string): string {
    return `${q}|${gene}|${type}|${bingo}|${star}`;
  }

  let filteredMutants = $derived(memo(getCacheKey(query, `${gene1Sel},${gene2Sel}`, typeSel, bingoSel, starSelMutants), () => {
    return (() => {
    const q = query ? query.trim().toLowerCase() : null;
    const normalizedQ = q ? normalizeForSearch(q) : null;
    const sBingo = bingoSel ? String(bingoSel) : null;
    const sType = typeSel ? String(typeSel).toLowerCase() : null;

    const isSearching = !!normalizedQ;

    const bingoData = sBingo ? bingos.find((b: any) => b.id === sBingo) : null;
    const isReactorSel = sBingo === 'reactor' || (sType === 'reactor' || sType === 'gacha');

    const res = [];
    for (const it of preparedMutants) {
      const m = it._meta;

      if (normalizedQ && !m.searchName.includes(normalizedQ)) continue;

      if (!isSearching) {
        if (gene1Sel) {
          const firstGene = m.code?.[0];
          if (firstGene !== gene1Sel.toUpperCase()) continue;
          if (gene2Sel) {
            if (gene2Sel === 'neutral') {
              if (m.code.length !== 1) continue;
            } else {
              if (m.code.length < 2 || m.code[1] !== gene2Sel.toUpperCase()) continue;
            }
          }
        }

        if (sType) {
          if (m.typeKey !== sType) continue;
        }

        if (sBingo) {
          if (!m.bingoKeys.has(sBingo)) continue;
        }
      }

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

      res.push(fSkin ? { ...it, forceSkin: fSkin } : it);
    }

    if (sBingo) {
        let autoStar = '';
        if (sBingo === 'reactor') autoStar = 'platinum';
        else if (sBingo.includes('bronze') || sBingo.includes('research_1')) autoStar = 'bronze';
        else if (sBingo.includes('silver') || sBingo.includes('research_2')) autoStar = 'silver';
        else if (sBingo.includes('gold') || sBingo.includes('research_3')) autoStar = 'gold';
        else if (sBingo.includes('platinum') || sBingo.includes('plat') || sBingo.includes('research_4')) autoStar = 'platinum';

        if (autoStar) {
            return res.map(it => ({ ...it, _displayStar: autoStar })).sort(sortMutantsByGene);
        }
    }

    return res.sort((a, b) => {
      const rankA = a._meta?.rank ?? 199;
      const rankB = b._meta?.rank ?? 199;
      if (rankA !== rankB) return rankA - rankB;

      const weight2A = a._meta?.secondaryWeight ?? 0;
      const weight2B = b._meta?.secondaryWeight ?? 0;
      if (weight2A !== weight2B) return weight2A - weight2B;

      return (a._meta?.id || '').localeCompare(b._meta?.id || '');
    });
    })();
  }));

  let filteredSkins = $derived(memo(getCacheKey(query, `${gene1Sel},${gene2Sel}`, typeSel, '', starSelSkins), () => {
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
      if (gene1Sel) {
        const firstGene = m.code?.[0];
        if (firstGene !== gene1Sel.toUpperCase()) continue;
        if (gene2Sel) {
          if (gene2Sel === 'neutral') {
            if (m.code.length !== 1) continue;
          } else {
            if (m.code.length < 2 || m.code[1] !== gene2Sel.toUpperCase()) continue;
          }
        }
      }
      if (checkStars && m.starKey !== targetStar) continue;
      res.push(it);
    }
    return res.sort((a, b) => {
      const rankA = a._meta?.rank ?? 199;
      const rankB = b._meta?.rank ?? 199;
      if (rankA !== rankB) return rankA - rankB;

      const weight2A = a._meta?.secondaryWeight ?? 0;
      const weight2B = b._meta?.secondaryWeight ?? 0;
      if (weight2A !== weight2B) return weight2A - weight2B;

      return (a._meta?.id || '').localeCompare(b._meta?.id || '');
    });
    })();
  }));

  let pageSize = $derived(viewMode === 'heads' ? 60 : 20);
  let currentPage = $state(1);

  $effect(() => {
    mode; query; gene1Sel; gene2Sel; typeSel; bingoSel; starSelMutants; starSelSkins; viewMode;
    currentPage = 1;
  });

  let endIndex = $derived(pageSize * currentPage);
  let shownMutants = $derived(filteredMutants.slice(0, endIndex));
  let shownSkins = $derived(filteredSkins.slice(0, endIndex));

  function pickTexture(it:any, headsMode: boolean = false): string {
    const bid = baseId(it.id);

    if (it?.forceSkin) {
        const skinTag = String(it.forceSkin).toLowerCase();

        if (skins && skins.length > 0) {
           const skinEntry = skins.find((s: any) => {
             const sId = baseId(s.id);
             const sSkin = String(s.skin ?? '').toLowerCase();
             return sId === bid && (sSkin.includes(skinTag) || skinTag.includes(sSkin));
           });

           if (skinEntry && skinEntry.image) {
             const skinImages = Array.isArray(skinEntry.image) ? skinEntry.image : [skinEntry.image];
             const fullChar = skinImages.find((p: any) => String(p).includes('full-char'));
             if (fullChar) return fullChar;
             const semiFull = skinImages.find((p: any) => String(p).includes('semi-full'));
             if (semiFull) return semiFull;
             return skinImages[0];
           }
        }
    }

    if (it?.stars) {
        const displayStar = it._displayStar || starSelMutants;
        const starKeys = Object.keys(it.stars);
        const starData = it.stars[displayStar] || it.stars[starKeys[0]];
        if (starData?.images?.length) {
            const imgs = starData.images;
            if (headsMode) {
                const specimen = imgs.find((p: string) => p.includes('specimen'));
                if (specimen) return toThumbPath(specimen);
            }
            const specimen = imgs.find((p: string) => p.includes('specimen'));
            if (specimen) return specimen;
            const fullTexture = imgs.find((p: string) => p.includes('textures_by_mutant/') && !p.includes('specimen') && !p.includes('larva'));
            if (fullTexture) return fullTexture;
            return imgs[0];
        }
    }

    const list = Array.isArray(it?.image) ? it.image : (it?.image ? [it.image] : []);
    const starVal = String(it?.star ?? 'normal').toLowerCase();

    let pick = list.find((p: string) => {
        const path = p.toLowerCase();
        if (starVal === 'normal') return path.includes('normal') || (!path.includes('bronze') && !path.includes('silver') && !path.includes('gold') && !path.includes('platinum') && !path.includes('plat'));
        if (starVal === 'platinum') return path.includes('platinum') || path.includes('plat');
        return path.includes(starVal);
    });

    if (!pick) {
        pick = list.find((p:string) => p.includes('specimen'));
        if (!pick) {
            pick = list.find((p:string) => p.includes('textures_by_mutant/') && !p.includes('specimen') && !p.includes('larva'));
        }
        if (!pick) {
            pick = list[0];
        }
    }
    if (headsMode && pick && pick.includes('specimen_')) {
        return toThumbPath(pick);
    }
    return pick ?? 'placeholder-mutant.webp';
  }

  function toThumbPath(p: string): string {
    return p.replace('/textures_by_mutant/', '/textures_by_mutant/').replace('specimen_', 'thumb_specimen_');
  }
  function rarityType(item:any){
    if (isSkin(item)) return (item?.star ?? 'normal').toLowerCase();
    return item?._displayStar || starSelMutants;
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
    return `mut:${it?.id ?? index}`;
  };

  let openItem:any = $state(null);
  const openModal  = (it:any) => { openItem = it; };
  const closeModal = () => { openItem = null; };
</script>

<div class="mx-auto max-w-[1400px] px-4 py-6 page-2k">
  {#if title}
    <h1 class="text-2xl md:text-3xl font-bold text-slate-100 mb-4">{title}</h1>
  {/if}

  <!-- Переключатель режимов -->
  <div class="mb-4 flex flex-wrap gap-2 items-center">
    <button type="button"
      class={'px-3 rounded-lg ring-1 h-8 text-[11px] uppercase tracking-wider '
        + (mode==='mutants' ? 'bg-cyan-700 ring-cyan-400 text-white' : 'bg-slate-800 ring-white/10 text-slate-200')}
      onclick={() => switchTo('mutants')}
      aria-pressed={mode==='mutants'}
    >
      MUTANTS
    </button>
    <button type="button"
      class={'px-3 rounded-lg ring-1 h-8 text-[11px] uppercase tracking-wider '
        + (mode==='skins' ? 'bg-cyan-700 ring-cyan-400 text-white' : 'bg-slate-800 ring-white/10 text-slate-200')}
      onclick={() => switchTo('skins')}
      aria-pressed={mode==='skins'}
    >
      SKINS
    </button>

    <!-- FULL/HEADS toggle — temporarily hidden -->
    <!--
    <span class="w-px h-6 bg-white/10 mx-1"></span>
    <button type="button"
      class={'px-3 rounded-lg ring-1 h-8 text-[11px] uppercase tracking-wider '
        + (viewMode==='full' ? 'bg-cyan-700 ring-cyan-400 text-white' : 'bg-slate-800 ring-white/10 text-slate-200')}
      onclick={() => viewMode = 'full'}
      aria-pressed={viewMode==='full'}
      title="Полные карточки"
    >
      FULL
    </button>
    <button type="button"
      class={'px-3 rounded-lg ring-1 h-8 text-[11px] uppercase tracking-wider '
        + (viewMode==='heads' ? 'bg-cyan-700 ring-cyan-400 text-white' : 'bg-slate-800 ring-white/10 text-slate-200')}
      onclick={() => viewMode = 'heads'}
      aria-pressed={viewMode==='heads'}
      title="Режим голов"
    >
      HEADS
    </button>
    -->
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
      <!-- Gene 1 Row -->
      <div class="flex flex-wrap gap-2">
        {#each geneList as g}
          {#if g.key === ''}
            <button type="button"
              class={geneChipClass(gene1Sel===g.key)}
              onclick={() => { gene1Sel = ''; gene2Sel = ''; }}
              title={g.label}
              aria-pressed={gene1Sel===g.key}
            >
              <span class="text-xs">{g.label}</span>
            </button>
          {:else}
            <button type="button"
              class={geneButtonClass(gene1Sel===g.key)}
              onclick={() => { gene1Sel = (gene1Sel===g.key ? '' : g.key); }}
              title={g.label}
              aria-pressed={gene1Sel===g.key}
            >
              <img src={g.icon} alt={g.label} class="h-8 w-8 object-contain" />
            </button>
          {/if}
        {/each}
      </div>
      <!-- Gene 2 Row -->
      <div class="flex flex-wrap gap-2">
        {#each geneList2 as g}
          {#if g.key === ''}
            <button type="button"
              class={geneChipClass(gene2Sel===g.key && gene1Sel, !gene1Sel)}
              onclick={() => { if (gene1Sel) gene2Sel = ''; }}
              title={g.label}
              aria-pressed={gene2Sel===g.key}
              disabled={!gene1Sel}
            >
              <span class="text-xs">{g.label}</span>
            </button>
          {:else if g.key === 'neutral'}
            <button type="button"
              class={geneButtonClass(gene2Sel===g.key, !gene1Sel)}
              onclick={() => { if (gene1Sel) gene2Sel = (gene2Sel===g.key ? '' : g.key); }}
              title={g.label}
              aria-pressed={gene2Sel===g.key}
              disabled={!gene1Sel}
            >
              <img src={g.icon} alt={g.label} class="h-8 w-8 object-contain" />
            </button>
          {:else}
            <button type="button"
              class={geneButtonClass(gene2Sel===g.key, !gene1Sel)}
              onclick={() => { if (gene1Sel) gene2Sel = (gene2Sel===g.key ? '' : g.key); }}
              title={g.label}
              aria-pressed={gene2Sel===g.key}
              disabled={!gene1Sel}
            >
              <img src={g.icon} alt={g.label} class="h-8 w-8 object-contain" />
            </button>
          {/if}
        {/each}
      </div>
    </div>
  </div>

  <!-- Редкость (иконки) — только для скинов -->
  {#if mode === 'skins'}
    <div class="mb-4 rounded-xl bg-slate-900/60 ring-1 ring-white/10 p-2 shadow-sm md:shadow">
      <div class="flex flex-wrap gap-2">
        {#each STAR_SKINS as s}
          <button type="button"
            class={'px-2 h-8 rounded-lg ring-1 flex items-center gap-2 '
              + (starSelSkins===s.key ? 'bg-cyan-700 ring-cyan-400 text-white' : 'bg-slate-800 ring-white/10 text-slate-200')}
            onclick={() => (starSelSkins = s.key)}
            aria-pressed={starSelSkins===s.key}
          >
            {#if s.icon}<img src={s.icon} alt={s.label} class="h-5 w-5 object-contain" />{/if}
            <span class="text-xs">{s.label}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

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
  <div class={viewMode === 'heads'
    ? 'grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10'
    : 'grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'}
  >
    {#if mode === 'mutants'}
      {#each shownMutants as it, i (keyOf(it, i))}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div role="button" tabindex="0" class="cursor-pointer" onclick={() => openModal(it)} onkeydown={(e) => e.key === 'Enter' && openModal(it)}>
          {#if viewMode === 'heads'}
            <div class="heads-card">
              <img class="heads-img specimen" src={textureUrl(pickTexture(it, true))} alt={it.name} loading="lazy" decoding="async" width="128" height="128" />
              <div class="heads-name">{it.name}</div>
            </div>
          {:else}
            <div class="relative rounded-xl overflow-hidden bg-slate-800 ring-1 ring-white/10">
              <img class="w-full object-contain bg-slate-900" style="height: 195px;" src={textureUrl(pickTexture(it))} alt={it.name} loading="lazy" decoding="async" width="512" height="512" />
              <div class="px-3 pt-2 pb-3">
                <div class="text-slate-100 font-semibold text-sm truncate">{it.name}</div>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      {#each shownSkins as it, i (keyOf(it, i))}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div role="button" tabindex="0" class="cursor-pointer" onclick={() => openModal(it)} onkeydown={(e) => e.key === 'Enter' && openModal(it)}>
          {#if viewMode === 'heads'}
            <div class="heads-card">
              <img class="heads-img specimen" src={textureUrl(pickTexture(it, true))} alt={it.name} loading="lazy" decoding="async" width="128" height="128" />
              <div class="heads-name">{it.name}</div>
            </div>
          {:else}
            <div class="relative rounded-xl overflow-hidden bg-slate-800 ring-1 ring-white/10">
              <img class="w-full object-contain bg-slate-900" style="height: 195px;" src={textureUrl(pickTexture(it))} alt={it.name} loading="lazy" decoding="async" width="512" height="512" />
              <div class="px-3 pt-2 pb-3">
                <div class="text-slate-100 font-semibold text-sm truncate">{it.name}</div>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Показать ещё -->
  {#if mode === 'mutants'}
    {#if shownMutants.length < filteredMutants.length}
      <div class="mt-3 flex justify-center">
        <button class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 ring-1 ring-white/10 text-white"
                onclick={() => { currentPage = currentPage + 1; }}>
          Показать ещё
        </button>
      </div>
    {/if}
  {:else}
    {#if shownSkins.length < filteredSkins.length}
      <div class="mt-3 flex justify-center">
        <button class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 ring-1 ring-white/10 text-white"
                onclick={() => { currentPage = currentPage + 1; }}>
          Показать ещё
        </button>
      </div>
    {/if}
  {/if}

  {#if openItem}
    <MutantModal open={true} mutant={openItem} star={rarityType(openItem)} onclose={closeModal} />
  {/if}
</div>

<style>
  /* Апскейл на ≥2K */
  @media (min-width: 1921px){ .page-2k { font-size: 1.0625rem; } }
  @media (min-width: 1921px){
    .page-2k :global(img[style*="height: 195px"]) { height: 244px !important; }
    .heads-name { padding: 3px 5px; font-size: 13px; }
  }

  /* Heads mode */
  .heads-card {
    position: relative;
    border-radius: 10px;
    overflow: hidden;
    background: #1e293b;
    ring: 1px solid rgba(255,255,255,0.06);
    aspect-ratio: 1;
  }
  .heads-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    transform: scale(1.6);
    transform-origin: top center;
  }
  .heads-img.specimen {
    transform: none;
    object-fit: contain;
  }
  .heads-name {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 2px 4px;
    background: linear-gradient(transparent, rgba(0,0,0,0.85));
    color: #e2e8f0;
    font-size: 10px;
    font-weight: 600;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
