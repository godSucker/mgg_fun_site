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
  function mapSkin(s: any) {
    return {
      id: s?.id,
      name: s?.name,
      genes: s?.genes,
      base_stats: s?.base_stats,
      image: s?.image,
      type: s?.type ?? 'default',
      star: !s?.star || s.star === 'none' ? 'normal' : String(s.star).toLowerCase(),
      bingo: Array.isArray(s?.bingo) || typeof s?.bingo === 'object' ? s.bingo : [],
      skin: s?.skin ?? true,
      __source: 'skin' as const
    };
  }
  $: normalizedSkins = (Array.isArray(skins) ? skins : []).map(mapSkin);

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
    { key: 'normal',   label: 'No stars' },
    { key: 'bronze',   label: 'Bronze' },
    { key: 'silver',   label: 'Silver' },
    { key: 'gold',     label: 'Gold' },
    { key: 'platinum', label: 'Platinum' },
  ];

  // По умолчанию: мутанты = только обычные; скины = любые
  let starSelMutants: StarKey = 'normal';
  let starSelSkins: SkinStarKey = 'any';

  // Переход режимов: подстраиваем дефолты
  function switchTo(next: Mode) {
    mode = next;
    if (mode === 'mutants') {
      // ничего не трогаем — остаётся последний выбор мутантов
      if (!['normal','bronze','silver','gold','platinum'].includes(starSelMutants)) starSelMutants = 'normal';
    } else {
      // в SKINS по умолчанию показываем все
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
  const isSkin = (it:any) =>
    it?.__source === 'skin' || typeof it?.skin !== 'undefined';
  const keyOf  = (it:any) => (isSkin(it) ? `skin:${it.id}` : `mut:${it.id}`);

  // ===========
  // ФИЛЬТРАЦИЯ
  // ===========
  // Мутанты
  $: filteredMutants = memo(
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
      .sort((a:any,b:any) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'ru'))
  );

  // Скины
  $: filteredSkins = memo(
    JSON.stringify({star: starSelSkins, n: normalizedSkins?.length ?? 0}),
    () => normalizedSkins
      .filter(it => {
        const k = starSelSkins;
        if (k === 'any') return true;
        return k === 'normal' ? starOf(it) === 'normal' : starOf(it) === k;
      })
      .slice()
      .sort((a:any,b:any) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'ru'))
  );

  // ===== Пагинация «Показать ещё» =====
  let pageSize = 60;
  let currentPage = 1;
  // Сброс страницы при изменении условий
  $: resetKey = JSON.stringify({ mode, query, geneSel, typeSel, bingoSel, starSelMutants, starSelSkins, lenM: items?.length ?? 0, lenS: normalizedSkins?.length ?? 0 });
  $: if (resetKey) { currentPage = 1; }

  $: endIndex = pageSize * currentPage;
  $: shownMutants = filteredMutants.slice(0, endIndex);
  $: shownSkins = filteredSkins.slice(0, endIndex);

  // =========
  // ПРОЧЕЕ
  // =========
  function pickTexture(it:any): string {
    const list = Array.isArray(it?.image) ? it.image : (it?.image ? [it.image] : []);
    const pick =
      list.find((p:string) => p.includes('textures_by_mutant/') && !p.includes('specimen') && !p.includes('larva')) ||
      list[0];
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

<div class="mx-auto max-w-[1400px] px-4 py-6">
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
      class={'w-full px-4 py-3 rounded-lg ring-1 transition outline-none '
        + (mode==='mutants'
            ? 'bg-slate-900 text-slate-100 placeholder-slate-400 ring-white/10 focus:ring-2 focus:ring-cyan-400'
            : 'bg-slate-800/60 text-slate-400 placeholder-slate-500 ring-white/10/30 pointer-events-none')}
      placeholder={mode==='mutants' ? 'Введите имя мутанта…' : 'Поиск отключён для SKINS'}
      bind:value={query}
      disabled={mode!=='mutants'}
    />
  </div>

  <!-- Гены: две строки (только для MUTANTS; в SKINS заблокировано и приглушено) -->
  <div class="mb-2 flex flex-col gap-2">
    <div class="flex flex-wrap gap-2">
      {#each geneList as g}
        <button type="button"
          class={'p-1 rounded-lg ring-1 '
            + (mode==='mutants'
                ? (gene1Sel===g.key ? 'bg-cyan-700 ring-cyan-400' : 'bg-slate-800 ring-white/10')
                : 'bg-slate-800/60 ring-white/10/30 pointer-events-none')}
          on:click={() => { if(mode==='mutants'){ gene1Sel = (g.key==='' ? '' : (gene1Sel===g.key ? '' : g.key)); } }}
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
          class={'p-1 rounded-lg ring-1 '
            + (mode==='mutants'
                ? (gene2Sel===g.key ? 'bg-cyan-700 ring-cyan-400' : 'bg-slate-800 ring-white/10')
                : 'bg-slate-800/60 ring-white/10/30 pointer-events-none')}
          on:click={() => { if(mode==='mutants'){ gene2Sel = (g.key==='' ? '' : (gene2Sel===g.key ? '' : g.key)); } }}
          title={g.label}
          aria-pressed={gene2Sel===g.key}
        >
          <img src={g.icon} alt={g.label} class="h-8 w-8 object-contain" />
        </button>
      {/each}
    </div>
  </div>

  <!-- Редкость (иконки) -->
  <div class="mb-4">
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
              : 'bg-slate-800/60 text-slate-400 ring-white/10/30 pointer-events-none')}
        bind:value={typeSel}
        disabled={mode!=='mutants'}
      >
        <option value=''>Любой</option>
        {#each typeOptions as t}
          <option value={t}>{TYPE_RU?.[t] ?? t}</option>
        {/each}
      </select>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs text-slate-300">Бинго</span>
      <select
        class={'px-3 py-2 rounded-lg ring-1 '
          + (mode==='mutants'
              ? 'bg-slate-900 text-slate-100 ring-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400'
              : 'bg-slate-800/60 text-slate-400 ring-white/10/30 pointer-events-none')}
        bind:value={bingoSel}
        disabled={mode!=='mutants'}
      >
        <option value=''>Любое</option>
        {#each bingoOptions as b}
          <option value={b}>{bingoLabel?.(b) ?? b}</option>
        {/each}
      </select>
    </label>
  </div>

  <!-- Сетка карточек -->
  <div class="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7" style="content-visibility:auto; contain-intrinsic-size: 1200px;">
    {#if mode === 'mutants'}
      {#each shownMutants as it (keyOf(it))}
        <div role="button" tabindex="0" class="cursor-pointer" on:click={() => openModal(it)}>
          <div class="relative rounded-xl overflow-hidden bg-slate-800 ring-1 ring-white/10" style="content-visibility:auto; contain-intrinsic-size: 260px 340px;">
            <img class="w-full h-48 object-contain bg-slate-900" src={'/' + pickTexture(it)} alt={it.name} loading="lazy" decoding="async" fetchpriority="low" width="512" height="512" />
            <div class="px-3 pt-2 pb-3">
              <div class="text-slate-100 font-semibold text-sm truncate">{it.name}</div>
            </div>
          </div>
        </div>
      {/each}
    {:else}
      {#each shownSkins as it (keyOf(it))}
        <div role="button" tabindex="0" class="cursor-pointer" on:click={() => openModal(it)}>
          <div class="relative rounded-xl overflow-hidden bg-slate-800 ring-1 ring-white/10" style="content-visibility:auto; contain-intrinsic-size: 260px 340px;">
            <img class="w-full h-48 object-contain bg-slate-900" src={'/' + pickTexture(it)} alt={it.name} loading="lazy" decoding="async" fetchpriority="low" width="512" height="512" />
            <div class="px-3 pt-2 pb-3">
              <div class="text-slate-100 font-semibold text-sm truncate">{it.name}</div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

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
