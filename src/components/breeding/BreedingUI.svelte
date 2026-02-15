<script lang="ts">
  import { secretCombos } from '@/lib/secretCombos';
  import mutantsAll from '@/data/mutants/mutants.json';
  import { calculateBreeding, findParentsFor } from '@/lib/breeding/breeding';
  import type { Mutant, BreedingResult, ParentPair } from '@/lib/breeding/breeding';
  import { fly, fade, slide } from 'svelte/transition';
  import { normalizeSearch } from '@/lib/search-normalize';
  import { sortMutantsByGene } from '@/lib/mutant-sort';

  // --- DATA ---
  const allMutants: Mutant[] = (mutantsAll as any[]).map((m: any) => ({
    id: String(m.id),
    name: m.name,
    genes: m.genes,
    odds: Number(m.odds) || 0,
    type: m.type || 'default',
    star: 'normal',
    incub_time: Number(m.incub_time) || 0,
    image: (() => { const s = m.stars; if (s) { const k = Object.keys(s); if (k.length) return s[k[0]]?.images ?? []; } return m.image ?? []; })()
  }));

  const normalize = normalizeSearch;
  const secretNames = new Set(secretCombos.map(s => normalize(s.childName)));

  // --- HELPERS ---
  const getName = (m: Mutant) => m.name || m.id;

  function getImageSrc(m: Mutant): string {
    const img = m.image;
    const path = Array.isArray(img) ? (img[0] ?? img[1]) : img;
    if (!path) return '/preview.jpg';
    return path.startsWith('/') ? path : '/' + path;
  }

  function getGeneIcon(geneChar: string): string {
    const char = geneChar.toLowerCase().charAt(0);
    if (['a', 'b', 'c', 'd', 'e', 'f'].includes(char)) {
        return `/genes/gene_${char}.webp`;
    }
    return '/genes/gene_all.webp';
  }

  function getTypeIcon(m: Mutant): string {
    const t = (m.type ?? '').toLowerCase();
    if (t === 'legend') return '/mut_icons/icon_legendary.webp';
    if (t === 'recipe') return '/mut_icons/icon_recipe.webp';
    if (t === 'community') return '/mut_icons/icon_special.webp';
    if (!t || t === 'default') return '/mut_icons/icon_morphology.webp';
    return `/mut_icons/icon_${t}.webp`;
  }

  function formatTime(val: number | undefined) {
    const m = Number(val);
    if (!m || m <= 0) return '-';
    if (m < 60) return `${m}м`;
    const h = Math.floor(m / 60);
    const min = m % 60;
    return min > 0 ? `${h}ч ${min}м` : `${h}ч`;
  }

  // --- SORTING (using unified sort) ---

  // --- STATE ---
  let mode: 'calc' | 'reverse' = 'calc';
  let mobileTab: 'lab' | 'list' = 'lab';

  let p1: Mutant | null = null;
  let p2: Mutant | null = null;
  let target: Mutant | null = null;
  let search = '';
  let filterGene = 'all';
  let filterGene2 = 'all'; // Added second gene filter

  // Вспомогательная функция для получения массива генов
  const getGenesArray = (m: Mutant) => {
      const gStr = Array.isArray(m.genes) ? m.genes.join('') : m.genes;
      return (gStr || '').toUpperCase().split('');
  };

  // Получить все гены для отображения (показываем все, включая дубликаты)
  const getAllGenes = (m: Mutant): string[] => {
      const genes = getGenesArray(m);
      // Для Single (A) - показываем один раз
      // Для Mono (AA) - показываем ОБА (AA)
      // Для Hybrid (AB) - показываем оба (AB)
      if (genes.length === 1) return [genes[0]];
      return genes; // Возвращаем все гены, включая дубликаты
  };

  // Auto-reset Gene2 when Gene1 is "all"
  $: if (filterGene === 'all') filterGene2 = 'all';

  $: filteredList = allMutants.filter(m => {
    if (filterGene === 'recipe') return secretNames.has(normalize(getName(m)));

    const normalizedSearch = normalizeSearch(search);
    const nameMatch = !normalizedSearch || normalizeSearch(getName(m)).includes(normalizedSearch);

    const mGenes = getGenesArray(m);

    if (filterGene === 'all') return nameMatch;

    const hasPrimaryGene = mGenes[0] === filterGene.toUpperCase();

    if (filterGene2 === 'all') return hasPrimaryGene && nameMatch;

    if (filterGene2 === 'neutral') {
      return mGenes.length === 1 && mGenes[0] === filterGene.toUpperCase() && nameMatch;
    }

    return mGenes.length >= 2 && mGenes[0] === filterGene.toUpperCase() && mGenes[1] === filterGene2.toUpperCase() && nameMatch;
  }).sort(sortMutantsByGene);

  // --- LOGIC ---
  let calcResults: BreedingResult[] = [];

  $: if (mode === 'calc' && p1 && p2) {
    calcResults = calculateBreeding(p1, p2, allMutants);
  } else {
    calcResults = [];
  }

  let guideResults: any[] = [];
  let isSearching = false;

  $: if (mode === 'reverse' && target) {
    isSearching = true;
    guideResults = [];
    setTimeout(() => {
        if (!target) return;
        const res = findParentsFor(target, allMutants);
        guideResults = res.map(r => ({
            p1: r.p1, p2: r.p2, isSecret: r.isSecret,
            tag: r.isSecret ? 'РЕЦЕПТ' : 'ПАРЫ'
        })).slice(0, 10);
        isSearching = false;
    }, 100);
  }

  function handleCardClick(m: Mutant) {
    const isSecret = secretNames.has(normalize(getName(m)));

    if (window.innerWidth < 1024) {
        mobileTab = 'lab';
    }

    if (filterGene === 'recipe' || (isSecret && mode === 'reverse')) {
        mode = 'reverse'; target = m; return;
    }
    if (mode === 'calc') {
      if (!p1) p1 = m;
      else if (!p2) p2 = m;  // Allow same mutant for both parents
      else if (p1.id === m.id) p1 = null;
      else if (p2?.id === m.id) p2 = null;
      else { p1 = m; p2 = null; }
    } else {
      target = (target?.id === m.id) ? null : m;
    }
  }
</script>

<div class="main-wrapper">
  <!-- LEFT PANEL: LABORATORY -->
  <div class="panel lab-panel {mobileTab === 'lab' ? 'active' : ''}">
    <div class="panel-header">
      <div class="logo-area">
         <div class="logo-icon">🧬</div>
         <div>
             <h1>MGG <span class="highlight">Breeder</span></h1>
             <div class="subtitle">Genetics Simulator</div>
         </div>
      </div>
      
      <div class="mode-switch-desktop">
         <button class="mode-btn {mode==='calc' ? 'active' : ''}" on:click={() => {mode='calc'; target=null}}>
             Инкубатор
         </button>
         <button class="mode-btn {mode==='reverse' ? 'active' : ''}" on:click={() => {mode='reverse'; p1=null; p2=null}}>
             Справочник
         </button>
      </div>

      <button class="mode-switch-mobile" on:click={() => {
          mode = mode === 'calc' ? 'reverse' : 'calc';
          target = null; p1 = null; p2 = null;
      }}>
          {mode === 'calc' ? 'В Справочник ➜' : 'В Инкубатор ➜'}
      </button>
    </div>

    <div class="workspace custom-scroll">
        {#if mode === 'calc'}
            <div class="calc-container" in:fly={{y:20, duration:400}}>
                <!-- PARENT SLOTS -->
                <div class="slots-area">
                    <div class="parent-slot-wrapper">
                        <button class="slot {p1 ? 'filled' : 'empty'}" on:click={() => { p1 = null; mobileTab = 'list'; }}>
                            {#if p1}
                                <img src={getImageSrc(p1)} alt={p1.name} class="mutant-img"/>
                                <div class="slot-label">{getName(p1)}</div>
                                <div class="remove-icon">✕</div>
                            {:else}
                                 <div class="plus">+</div>
                                 <span class="label">Нажмите для выбора</span>
                            {/if}
                        </button>
                        {#if p1}
                            <div class="parent-genes" in:fade>
                                {#each getAllGenes(p1) as g}
                                    <img src={getGeneIcon(g)} alt={g} class="parent-gene-icon" title="Gene {g}" />
                                {/each}
                            </div>
                        {/if}
                    </div>

                    <div class="cross-icon">✕</div>

                    <div class="parent-slot-wrapper">
                        <button class="slot {p2 ? 'filled' : 'empty'}" on:click={() => { p2 = null; mobileTab = 'list'; }}>
                            {#if p2}
                                <img src={getImageSrc(p2)} alt={p2.name} class="mutant-img"/>
                                <div class="slot-label">{getName(p2)}</div>
                                <div class="remove-icon">✕</div>
                            {:else}
                                 <div class="plus">+</div>
                                 <span class="label">Нажмите для выбора</span>
                            {/if}
                        </button>
                        {#if p2}
                            <div class="parent-genes" in:fade>
                                {#each getAllGenes(p2) as g}
                                    <img src={getGeneIcon(g)} alt={g} class="parent-gene-icon" title="Gene {g}" />
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- RESULTS -->
                {#if p1 && p2}
                    <div class="results-area" in:slide>
                        {#if calcResults.length > 0}
                            <div class="results-header">
                                <span>Возможные варианты разведения: <strong class="text-lime-400">{calcResults.length}</strong></span>
                            </div>
                            
                            <div class="results-list">
                                {#each calcResults as res, i}
                                    <div class="result-card" style="animation-delay: {i * 50}ms">
                                        <div class="card-left">
                                            <div class="mutant-thumb">
                                                <img src={getImageSrc(res.child)} alt="Результат скрещивания"/>
                                            </div>
                                        </div>
                                        <div class="card-info">
                                            <div class="card-header-row">
                                                <div class="card-title">{getName(res.child)}</div>
                                                <div class="card-genes">
                                                    {#each getAllGenes(res.child) as g}
                                                        <img src={getGeneIcon(g)} alt={g} class="gene-result-icon" title="Gene {g}" />
                                                    {/each}
                                                </div>
                                            </div>
                                            <div class="card-meta">
                                                <span class="time">⏱ {formatTime(res.child.incub_time)}</span>
                                                {#if res.isSecret || secretNames.has(normalize(getName(res.child)))}
                                                    <span class="secret-tag">★ Секрет</span>
                                                {/if}
                                                {#if res.tag && res.tag !== 'ВОЗМОЖНО' && res.tag !== 'РЕЦЕПТ'}
                                                    <span class="info-tag">{res.tag}</span>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="empty-state">
                                Нет известных комбинаций для этих родителей.
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div class="instruction">
                        <div class="icon">👆</div>
                        <p>Нажмите на слот выше, чтобы выбрать мутанта из Базы ДНК (справа на ПК / снизу на моб.)</p>
                    </div>
                {/if}
            </div>
        {:else}
            <!-- REVERSE MODE -->
             <div class="reverse-container" in:fly={{y:20, duration:400}}>
                 {#if !target}
                     <div class="empty-search">
                         <div class="big-icon">🔍</div>
                         <h3>Поиск рецептов</h3>
                         <p>Выберите мутанта из базы, чтобы узнать, как его вывести.</p>
                     </div>
                 {:else}
                     {#key target.id}
                         <div class="target-card">
                             <div class="target-bg" style="background-image: url({getImageSrc(target)})"></div>
                             <div class="target-content">
                                 <div class="target-img-wrap">
                                     <img src={getImageSrc(target)} alt="Целевой мутант"/>
                                 </div>
                                 <div class="target-info">
                                     <div class="badges">
                                         <span class="badge">Цель</span>
                                         <span class="time">{formatTime(target.incub_time)}</span>
                                     </div>
                                     <h2>{getName(target)}</h2>
                                     <button class="reset-btn" on:click={() => target=null}>Выбрать другого</button>
                                 </div>
                             </div>
                         </div>
                     {/key}

                     {#if isSearching}
                        <div class="loading">
                            <div class="spinner"></div>
                            <span>Анализ ДНК...</span>
                        </div>
                     {:else}
                        <div class="pairs-list">
                            {#each guideResults as combo, i}
                                <div class="pair-card" style="animation-delay: {i * 30}ms">
                                    <div class="parents">
                                         <div class="p-imgs">
                                              <img src={getImageSrc(combo.p1)} alt="Первый родитель"/>
                                              <div class="plus">+</div>
                                              <img src={getImageSrc(combo.p2)} alt="Второй родитель"/>
                                         </div>
                                         <div class="p-names">
                                              <div>{getName(combo.p1)}</div>
                                              <div>{getName(combo.p2)}</div>
                                         </div>
                                    </div>
                                    <div class="tag {combo.isSecret ? 'secret' : 'normal'}">
                                        {combo.tag}
                                    </div>
                                </div>
                            {:else}
                                <div class="no-pairs">
                                    Невозможно вывести (Сезонный, Магазин или нет данных).
                                </div>
                            {/each}
                        </div>
                     {/if}
                 {/if}
             </div>
        {/if}
    </div>
  </div>

  <!-- RIGHT PANEL: MUTANT LIST -->
  <div class="panel list-panel {mobileTab === 'list' ? 'active' : ''}">
      <div class="list-header">
          <div class="search-box">
              <input type="text" bind:value={search} placeholder="Поиск мутанта..." />
              <span class="icon">🔍</span>
          </div>
          
          <div class="filters">
              <div class="gene-line">
                  <button class="filter-chip gene-chip {filterGene==='all' ? 'active' : ''}" on:click={() => filterGene='all'}>
                      <img src="/genes/gene_all.webp" alt="Все"/>
                  </button>
                  {#each ['A','B','C','D','E','F'] as g}
                      <button class="filter-chip gene-chip {filterGene===g ? 'active' : ''}" on:click={() => filterGene=g}>
                          <img src={getGeneIcon(g)} alt={g}/>
                      </button>
                  {/each}
              </div>
              <div class="gene-line" class:disabled={filterGene==='all'}>
                  <button class="filter-chip gene-chip {filterGene2==='neutral' ? 'active' : ''}" disabled={filterGene==='all'} on:click={() => filterGene2='neutral'}>
                      <img src="/genes/gene_all.webp" alt="Нейтральный"/>
                  </button>
                  {#each ['A','B','C','D','E','F'] as g}
                      <button class="filter-chip gene-chip {filterGene2===g ? 'active' : ''}" disabled={filterGene==='all'} on:click={() => filterGene2=g}>
                          <img src={getGeneIcon(g)} alt={g}/>
                      </button>
                  {/each}
              </div>
              
               <button class="filter-chip secret-chip {filterGene==='recipe' ? 'active' : ''}" on:click={() => filterGene='recipe'}>
                   <span class="star">★</span>
                   <span>Секреты</span>
               </button>
          </div>
      </div>

      <div class="list-grid custom-scroll">
           {#each filteredList as m (m.id + m.name)}
                <button class="grid-item" on:click={() => handleCardClick(m)} title={getName(m)}>
                    <div class="card-badges">
                        <img src={getTypeIcon(m)} alt="Значок типа мутанта" class="type-icon" />
                        <div class="gene-icons">
                            {#each (Array.isArray(m.genes) ? m.genes : [m.genes]) as g}
                                <img src={getGeneIcon(g)} alt={g} class="gene-icon" />
                            {/each}
                        </div>
                    </div>
                    <div class="img-wrapper">
                        <img class="mutant-texture" loading="lazy" src={getImageSrc(m)} alt="Текстура мутанта" on:error={(e) => (e.currentTarget as HTMLImageElement).src = '/preview.jpg'}/>
                    </div>
                    <div class="item-info-row">
                        <div class="item-name">{getName(m)}</div>
                    </div>
                    {#if secretNames.has(normalize(getName(m)))}<div class="secret-badge">★</div>{/if}
                </button>
           {/each}
      </div>
  </div>

  <!-- BOTTOM NAV (MOBILE) -->
  <nav class="mobile-nav">
       <button class="nav-item {mobileTab==='lab' ? 'active' : ''}" on:click={() => mobileTab = 'lab'}>
           <span class="icon">{mode==='calc' ? '🧬' : '🔬'}</span>
           <span class="label">Лаборатория</span>
       </button>
       <div class="divider"></div>
       <button class="nav-item {mobileTab==='list' ? 'active' : ''}" on:click={() => mobileTab = 'list'}>
           <span class="icon">📋</span>
           <span class="label">База ДНК</span>
       </button>
  </nav>

</div>

<style>
  :global(body) { background-color: #050505; color: #e2e8f0; }

  .main-wrapper {
    display: flex;
    flex-direction: column;
    /* Subtract approx header height (65px) + padding to avoid scroll on desktop */
    height: calc(100dvh - 90px);
    max-width: 1600px;
    margin: 0 auto;
    background: #0a0f1c;
    position: relative;
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.05);
  }

  @media (max-width: 1023px) {
    .main-wrapper {
        /* On mobile, we want full height, header will scroll away or be sticky. 
           But if header is sticky, we need to subtract it. 
           BaseLayout header is relative (usually). */
        height: calc(100dvh - 70px);
        border-radius: 0;
        border: none;
    }
  }

  @media (min-width: 1024px) {
    .main-wrapper {
      flex-direction: row;
      padding: 1rem;
      gap: 1.5rem;
    }
  }

  /* PANELS */
  .panel {
    display: none;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(12px);
    overflow: hidden;
  }
  
  .panel.active { display: flex; }

  @media (min-width: 1024px) {
    .panel {
        display: flex;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 24px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .list-panel {
        flex: none;
        width: 400px;
    }
  }

  /* HEADER */
  .panel-header {
    padding: 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo-area {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo-icon {
    width: 2.5rem; height: 2.5rem;
    background: linear-gradient(135deg, #84cc16, #10b981);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem;
    box-shadow: 0 0 15px rgba(132, 204, 22, 0.4);
  }

  .logo-area h1 {
    font-size: 1.1rem; font-weight: 800; line-height: 1;
    text-transform: uppercase; letter-spacing: 0.05em; margin: 0;
  }
  .highlight { color: #84cc16; }
  .subtitle {
    font-size: 0.65rem; color: #64748b; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.2em; margin-top: 2px;
  }

  .mode-switch-desktop {
    display: none;
    background: rgba(0,0,0,0.3);
    padding: 4px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.05);
  }

  .mode-btn {
    padding: 0.5rem 1.25rem;
    border-radius: 8px;
    font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
    color: #64748b;
    transition: all 0.2s;
  }
  .mode-btn:hover { color: #fff; }
  .mode-btn.active { background: #84cc16; color: #000; box-shadow: 0 2px 10px rgba(132, 204, 22, 0.3); }
  .mode-btn.active:last-child { background: #a855f7; color: #fff; box-shadow: 0 2px 10px rgba(168, 85, 247, 0.4); }

  .mode-switch-mobile {
    padding: 0.5rem 0.8rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
    color: #94a3b8;
  }

  @media (min-width: 1024px) {
    .mode-switch-desktop { display: flex; }
    .mode-switch-mobile { display: none; }
    .panel-header { padding: 1.5rem; }
  }

  /* WORKSPACE */
  .workspace {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    padding-bottom: 6rem; /* Space for mobile nav */
    position: relative;
  }

  @media (min-width: 1024px) {
    .workspace { padding: 2rem; padding-bottom: 2rem; }
  }

  .calc-container, .reverse-container {
    max-width: 800px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 2rem;
  }

  /* SLOTS */
  .slots-area {
    display: flex; align-items: flex-start; justify-content: center;
    gap: 1rem;
  }

  .parent-slot-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .parent-genes {
    display: flex;
    gap: 0.375rem;
    align-items: center;
    justify-content: center;
    padding: 0.375rem 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    border: 1px solid rgba(132, 204, 22, 0.2);
  }

  .parent-gene-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    transition: transform 0.2s;
  }

  .parent-gene-icon:hover {
    transform: scale(1.1);
  }

  .slot {
    width: 100px; height: 100px;
    border: 2px dashed #334155;
    border-radius: 20px;
    background: rgba(30, 41, 59, 0.3);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative;
    overflow: hidden;
    transition: all 0.2s;
    cursor: pointer;
  }

  .slot:hover { border-color: #84cc16; background: rgba(30, 41, 59, 0.5); }
  .slot.filled { border-style: solid; border-color: rgba(132, 204, 22, 0.5); background: #0f172a; }

  .slot .plus { font-size: 2rem; color: #475569; margin-bottom: 0.2rem; }
  .slot .label { font-size: 0.6rem; text-transform: uppercase; font-weight: 700; color: #475569; }

  .mutant-img { width: 85%; height: 85%; object-fit: contain; z-index: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }
  .slot-label {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.8);
    color: #fff; font-size: 0.6rem; font-weight: 700;
    text-transform: uppercase; padding: 4px; text-align: center;
    z-index: 2;
  }
  .remove-icon {
    position: absolute; top: 4px; right: 4px;
    color: rgba(255,255,255,0.5); font-size: 0.8rem; z-index: 2;
    /* Скрываем на мобильных, так как клик по слоту сам переключает */
    @media (max-width: 1023px) { display: none; }
  }

  .cross-icon { font-size: 1.2rem; color: #475569; align-self: center; margin-top: 2rem; }

  @media (min-width: 1024px) {
    .slots-area { gap: 3rem; }
    .slot { width: 180px; height: 180px; }
    .slot .plus { font-size: 3rem; }
    .slot .label { font-size: 0.75rem; }
    .slot-label { font-size: 0.8rem; padding: 6px; }
    .parent-gene-icon { width: 40px; height: 40px; }
    .parent-genes { gap: 0.5rem; padding: 0.5rem 0.75rem; }
    .cross-icon { margin-top: 3rem; }
  }

  /* RESULTS */
  .results-area {
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 16px;
    overflow: hidden;
  }
  
  .results-header {
    background: rgba(0,0,0,0.2);
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    display: flex; justify-content: space-between;
    font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #94a3b8;
  }

  .results-list {
    /* Removed max-height to avoid nested scrolls within workspace */
    padding: 0.5rem;
    display: grid; gap: 0.5rem;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .result-card {
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 0.75rem;
    display: flex; gap: 0.75rem; align-items: center;
    animation: fadeIn 0.3s ease-out backwards;
  }

  .card-left { position: relative; width: 50px; height: 50px; flex-shrink: 0; }
  .mutant-thumb { width: 100%; height: 100%; background: #000; border-radius: 8px; overflow: hidden; border: 1px solid #334155; display: flex; align-items: center; justify-content: center; }
  .mutant-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 2px; }
  .card-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 4px; }
  
  .card-header-row {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
  }
  
  .card-title { font-weight: 700; font-size: 0.9rem; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  
  .card-genes { display: flex; gap: 4px; flex-shrink: 0; }
  .gene-result-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4));
  }

  .card-meta { display: flex; gap: 0.5rem; font-size: 0.7rem; color: #64748b; font-weight: 600; align-items: center; }
  .secret-tag { color: #d946ef; background: rgba(217, 70, 239, 0.1); padding: 2px 4px; border-radius: 4px; }
  .info-tag { color: #60a5fa; background: rgba(96, 165, 250, 0.1); padding: 2px 4px; border-radius: 4px; }

  /* REVERSE MODE STYLES */
  .empty-search, .instruction {
    text-align: center;
    padding: 3rem 1rem;
    opacity: 0.6;
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
  }
  .big-icon, .icon { font-size: 3rem; margin-bottom: 0.5rem; filter: grayscale(1); }
  .instruction p { max-width: 300px; font-size: 0.9rem; line-height: 1.5; }

  .target-card {
    position: relative;
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 20px;
    overflow: hidden;
    padding: 1.5rem;
  }
  
  .target-bg {
    position: absolute; inset: 0;
    background-size: cover; background-position: center;
    opacity: 0.1; filter: blur(20px);
  }

  .target-content { position: relative; display: flex; gap: 1.5rem; align-items: center; }
  .target-img-wrap {
    width: 80px; height: 80px;
    border-radius: 16px; background: #000;
    border: 2px solid rgba(168, 85, 247, 0.5);
    overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.5);
    flex-shrink: 0;
  }
  .target-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
  
  .target-info h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #fff; line-height: 1.2; }
  .badges { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
  .badge { background: rgba(168, 85, 247, 0.2); color: #d8b4fe; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; border: 1px solid rgba(168, 85, 247, 0.3); }
  .time { font-family: monospace; color: #94a3b8; font-size: 0.8rem; }
  .reset-btn { margin-top: 0.5rem; font-size: 0.75rem; color: #94a3b8; text-decoration: underline; background: none; border: none; cursor: pointer; padding: 0; }

  .pairs-list { display: grid; gap: 0.75rem; }
  .pair-card {
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(255,255,255,0.05);
    padding: 0.75rem; border-radius: 12px;
    display: flex; justify-content: space-between; align-items: center;
    animation: slideUp 0.3s ease-out backwards;
  }
  .parents { display: flex; gap: 1rem; align-items: center; }
  .p-imgs { display: flex; align-items: center; gap: 0.5rem; }
  .p-imgs img { width: 32px; height: 32px; border-radius: 50%; background: #000; border: 1px solid #475569; }
  .p-imgs .plus { font-size: 0.8rem; color: #64748b; }
  .p-names { font-size: 0.75rem; color: #cbd5e1; font-weight: 600; line-height: 1.2; }
  
  .tag { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; }
  .tag.normal { background: rgba(132, 204, 22, 0.1); color: #bef264; border: 1px solid rgba(132, 204, 22, 0.2); }
  .tag.secret { background: rgba(217, 70, 239, 0.1); color: #f0abfc; border: 1px solid rgba(217, 70, 239, 0.2); }

  /* LIST PANEL STYLES */
  .list-header {
    padding: 1rem;
    background: rgba(0,0,0,0.2);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    display: flex; flex-direction: column; gap: 1rem;
  }
  
  .search-box { position: relative; }
  .search-box input {
    width: 100%;
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(51, 65, 85, 0.8);
    padding: 0.75rem 1rem; padding-right: 2.5rem;
    border-radius: 12px;
    color: #fff; font-size: 0.9rem;
  }
  .search-box .icon { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.5; }

  .filters {
    display: flex; flex-wrap: wrap; gap: 0.5rem;
  }
  
  .filter-chip {
    height: 36px;
    padding: 0 0.8rem;
    border-radius: 8px;
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
    font-size: 0.75rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  
  .filter-chip.active { background: #e2e8f0; color: #0f172a; border-color: #fff; transform: scale(1.05); }
  
  .gene-chip { width: 36px; padding: 0; }
  .gene-chip img { width: 20px; height: 20px; }
  
  .secret-chip {
    gap: 0.3rem;
    background: rgba(88, 28, 135, 0.3); border-color: rgba(168, 85, 247, 0.4); color: #d8b4fe;
  }
  .secret-chip.active { background: #a855f7; color: #fff; }
  .secret-chip .star { font-size: 1rem; line-height: 1; }
  
  .gene-line {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .gene-line.disabled {
    opacity: 0.3;
    pointer-events: none;
  }

  .list-grid {
    flex: 1; overflow-y: auto;
    padding: 0.5rem;
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); 
    gap: 0.5rem;
    padding-bottom: 6rem; /* Mobile nav space */
    align-content: start;
  }
  
  @media (min-width: 1024px) {
    .list-grid { 
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); 
        gap: 0.75rem; padding: 1rem; padding-bottom: 1rem; 
    }
  }

  .grid-item {
    background: #1e293b;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(255,255,255,0.05);
    transition: all 0.2s;
    appearance: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    margin: 0;
    width: 100%;
    height: 120px; /* Фиксированная высота для карточки */
    cursor: pointer;
  }

  .card-badges {
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    pointer-events: none;
    z-index: 2;
  }

  .type-icon {
    width: 14px; /* Уменьшил до размера гена */
    height: 14px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }

  .gene-icons {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .gene-icon {
    width: 14px;
    height: 14px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }
  .grid-item:hover { border-color: #84cc16; background: rgba(30, 41, 59, 0.8); transform: translateY(-2px); z-index: 10; }
  
  .img-wrapper {
      width: 100%;
      height: 70px; /* Больше места для мутанта */
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.25rem;
  }

  .grid-item img.mutant-texture { 
      width: 100%; 
      height: 100%; 
      object-fit: contain; /* Чтобы не обрезалось */
      filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));
      opacity: 0.9;
      transition: 0.2s;
      transform: scale(1.2); /* Немного увеличим для наглядности, раз теперь есть место */
  }
  
  .grid-item:hover img { opacity: 1; transform: scale(1.05); }
  
  .item-info-row {
    width: 100%;
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .item-name {
    font-size: 0.7rem;
    font-weight: 600;
    color: #cbd5e1;
    line-height: 1.1;
    text-align: center;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }
  
  .secret-badge {
    position: absolute; top: 4px; right: 4px; left: auto;
    background: #d946ef; color: #fff;
    font-size: 0.6rem; width: 16px; height: 16px; border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  }

  /* MOBILE NAV */
  .mobile-nav {
    display: flex;
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 80px; /* Safe area included */
    background: #0f172a;
    border-top: 1px solid rgba(255,255,255,0.1);
    z-index: 100;
    padding-bottom: env(safe-area-inset-bottom, 20px);
  }
  
  @media (min-width: 1024px) {
    .mobile-nav { display: none; }
  }

  .nav-item {
    flex: 1;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: #64748b;
    gap: 4px;
  }
  .nav-item.active { color: #84cc16; }
  .nav-item.active:last-child { color: #60a5fa; }
  
  .nav-item .icon { font-size: 1.5rem; }
  .nav-item .label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
  
  .divider { width: 1px; background: rgba(255,255,255,0.1); height: 60%; align-self: center; }

  /* SCROLLBARS */
  .custom-scroll {
    scrollbar-width: thin;
    scrollbar-color: #334155 transparent;
  }
  .custom-scroll::-webkit-scrollbar { width: 5px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
  .custom-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  
  .loading { text-align: center; padding: 2rem; color: #a855f7; font-weight: 700; font-size: 0.9rem; }
  .spinner {
     display: inline-block; width: 30px; height: 30px;
     border: 3px solid rgba(168, 85, 247, 0.3);
     border-top-color: #a855f7;
     border-radius: 50%;
     animation: spin 1s linear infinite;
     margin-bottom: 0.5rem;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
  
