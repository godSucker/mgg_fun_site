<script lang="ts">
  import MutantModal from './MutantModal.svelte';
  import { TYPE_RU, geneLabel, bingoLabel } from '@/lib/mutant-dicts';

  // Пропсы
  export let items: any[] = [];     // normal + bronze + silver + gold + platinum
  export let skins: any[] = [];     // skins.json -> specimens[]
  export let title = '';
  export let bingoIndex: string[] = [];
  // Мемо-кэш для фильтрации/сортировки (не влияет на UI)
  const _cache = new Map<string, any[]>();
  function memo<T>(key: string, calc: () => T): T {
    if (_cache.has(key)) return _cache.get(key) as T;
    const v = calc();
    _cache.set(key, v as any);
    return v;
  }


  // =========================
  // НОРМАЛИЗАЦИЯ ДАННЫХ SKINS
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

  let baseMap: BaseMap = new Map();
  $: baseMap = buildBaseMap(items ?? []);

  $: normalizedSkins = (Array.isArray(skins) ? skins : []).map((skin, index) => mapSkin(skin, baseMap, index));

  // ===========
  // КОНТРОЛЫ UI
  // ===========
  // Режимы отображения
  type Mode = 'mutants' | 'skins';
  let mode: Mode = 'mutants';

  // Поиск/фильтры МУТАНТОВ
  let query = '';
  let gene1Sel = '';
  let gene2Sel = '';
  $: geneSel = [gene1Sel, gene2Sel].filter(Boolean).sort().join(''); // 'AB' | 'A' | ''

  // Типы/бинго считаем по items (мустантам)
  function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }
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

  // ЗВЁЗДЫ (раздельные состояния для разных режимов)
  type StarKey = 'normal'|'bronze'|'silver'|'gold'|'platinum';
  type SkinStarKey = 'any'|'normal'|'bronze'|'silver'|'gold'|'platinum';

  const STAR_MUTANTS: {key: StarKey; icon: string; label: string}[] = [
    { key: 'normal',   icon: '/stars/no_stars.png',      label: 'Обычные' },
    { key: 'bronze',   icon: '/stars/star_bronze.png',   label: 'Бронза' },
    { key: 'silver',   icon: '/stars/star_silver.png',   label: 'Серебро' },
    { key: 'gold',     icon: '/stars/star_gold.png',     label: 'Золото' },
    { key: 'platinum', icon: '/stars/star_platinum.png', label: 'Платина' },
  ];
  const STAR_SKINS: {key: SkinStarKey; icon?: string; label: string}[] = [
    { key: 'any',      label: 'Any' },
    { key: 'normal',   icon: '/stars/no_stars.png',      label: 'Обычные' },
    { key: 'bronze',   icon: '/stars/star_bronze.png',   label: 'Бронза' },
    { key: 'silver',   icon: '/stars/star_silver.png',   label: 'Серебро' },
    { key: 'gold',     icon: '/stars/star_gold.png',     label: 'Золото' },
    { key: 'platinum', icon: '/stars/star_platinum.png', label: 'Платина' },
  ];

  // По умолчанию: мутанты = только обычные; скины = любые
  let starSelMutants: StarKey = 'normal';
  let starSelSkins: SkinStarKey = 'any';

  // Переход режимов: подстраиваем дефолты
  function switchTo(next: Mode) {
    mode = next;
    if (mode === 'mutants') {
      if (!['normal','bronze','silver','gold','platinum'].includes(starSelMutants)) starSelMutants = 'normal';
    } else {
      if (!['any','normal','bronze','silver','gold','platinum'].includes(starSelSkins)) starSelSkins = 'any';
    }
  }

  // Гены — иконки (public/genes)
  const geneList = [
    { key: '',  label: 'Все',                   icon: '/genes/icon_gene_all.png' },
    { key: 'A', label: geneLabel?.('A') ?? 'A', icon: '/genes/icon_gene_a.png' },
    { key: 'B', label: geneLabel?.('B') ?? 'B', icon: '/genes/icon_gene_b.png' },
    { key: 'C', label: geneLabel?.('C') ?? 'C', icon: '/genes/icon_gene_c.png' },
    { key: 'D', label: geneLabel?.('D') ?? 'D', icon: '/genes/icon_gene_d.png' },
    { key: 'E', label: geneLabel?.('E') ?? 'E', icon: '/genes/icon_gene_e.png' },
    { key: 'F', label: geneLabel?.('F') ?? 'F', icon: '/genes/icon_gene_f.png' },
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
    ['A', 0],
    ['B', 1],
    ['C', 2],
    ['D', 3],
    ['E', 4],
    ['F', 5],
  ]);
  function geneSortTuple(it: any) {
    const code = normalizeGene(readGeneCode(it));
    const first = code?.[0] ?? '';
    const rank = first ? geneOrder.get(first) ?? 99 : 199;
    return { rank, code, name: String(it?.name ?? '') };
  }
  function compareByGene(a: any, b: any) {
    const ga = geneSortTuple(a);
    const gb = geneSortTuple(b);
    if (ga.rank !== gb.rank) return ga.rank - gb.rank;
    if (ga.code !== gb.code) return ga.code.localeCompare(gb.code, 'ru');
    return ga.name.localeCompare(gb.name, 'ru');
  }
  const isSkin = (it:any) =>
    it?.__source === 'skin' || typeof it?.skin !== 'undefined';
  const keyOf  = (it:any, index?: number) => {
    if (isSkin(it)) {
      if (typeof it?.__skinKey === 'string') return `skin:${it.__skinKey}`;
      const key = baseId(it?.id);
      const variant = it?.skin ?? index ?? '';
      return `skin:${key}:${variant}:${index ?? 0}`;
    }
    return `mut:${it?.id ?? index}`;
  };

  // ==========
  // WORKER и быстрый пересчёт (сокращено для контекста ответа)
  // ==========
  let useWorker = false; // твой текущий флаг
  let worker: Worker | null = null;
  let computeVersion = 0;
  let inFlight = false;
  let queued = false;

  let _workerTotal = 0;
  let filteredMutantsWorkerSlice: any[] = [];

  // (инициализация воркера/сообщения пропущу — оставляю как в твоём файле)
  // ...

  // ===========
  // ФИЛЬТРАЦИЯ
  // ===========
  $: filteredMutants = useWorker
    ? new Array(_workerTotal)
    : memo(
        JSON.stringify({q: query, t: typeSel, g: geneSel, b: bingoSel, star: starSelMutants, n: items?.length ?? 0}),
        () => items
          .filter(it => !query || String(it?.name ?? '').toLowerCase().includes(query.toLowerCase()))
          .filter(it => !typeSel || String(it?.type ?? '') === typeSel)
          .filter(it => {
            if (!bingoSel) return true;
            const keys = new Set(collectBingoKeys(it).map(String));
            return keys.has(String(bingoSel));
          })
          .filter(it => !geneSel || normalizeGene(readGeneCode(it)) === geneSel)
          .filter(it => {
            const k = starSelMutants;
            return k === 'normal' ? starOf(it) === 'normal' : starOf(it) === k;
          })
          .slice()
          .sort(compareByGene)
      );

  $: filteredSkins = memo(
    JSON.stringify({q: query, gene: geneSel, star: starSelSkins, n: normalizedSkins?.length ?? 0}),
    () => normalizedSkins
      .filter(it => !query || String(it?.name ?? '').toLowerCase().includes(query.toLowerCase()))
      .filter(it => !geneSel || normalizeGene(readGeneCode(it)) === geneSel)
      .filter(it => {
        const k = starSelSkins;
        if (k === 'any') return true;
        return k === 'normal' ? starOf(it) === 'normal' : starOf(it) === k;
      })
      .slice()
      .sort(compareByGene)
  );

  // ===== Пагинация «Показать ещё» =====
  let pageSize = 60;
  let currentPage = 1;
  $: resetKey = JSON.stringify({ mode, query, geneSel, typeSel, bingoSel, starSelMutants, lenM: items?.length ?? 0, lenS: normalizedSkins?.length ?? 0 });
  $: if (resetKey) { currentPage = 1; }
  $: endIndex = pageSize * currentPage;
  $: shownMutants = useWorker ? filteredMutantsWorkerSlice : filteredMutants.slice(0, endIndex);
  $: shownSkins = filteredSkins.slice(0, endIndex);

  // =========
  // ПРОЧЕЕ
  // =========
  function pickTexture(it:any): string {
    const list = Array.isArray(it?.image) ? it.image : (it?.image ? [it.image] : []);
    const pick =
      list.find((p:string) => p.includes('textures_by_mutant/') && !p.includes('specimen') && !p.includes('larva'))
      || list[0];
    return pick ?? 'placeholder-mutant.png';
  }
  function rarityType(item:any){
    const s = (item?.star ?? 'normal').toLowerCase();
    return ['bronze','silver','gold','platinum'].includes(s) ? s : 'normal';
  }
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
            <img class="w-full h-48 object-contain bg-slate-900" src={'/' + pickTexture(it)} alt={it.name} loading="lazy" decoding="async" fetchpriority={i < 12 ? 'high' : 'low'} width="512" height="512" />
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
            <img class="w-full h-48 object-contain bg-slate-900" src={'/' + pickTexture(it)} alt={it.name} loading="lazy" decoding="async" fetchpriority={i < 12 ? 'high' : 'low'} width="512" height="512" />
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
