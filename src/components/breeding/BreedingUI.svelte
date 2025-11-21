<script lang="ts">
  import { secretCombos } from '@/lib/secretCombos';
  import mutantsData from '@/data/mutants/normal.json';
  import { calculateBreeding, findParentsFor } from '@/lib/breeding/breeding';
  import type { Mutant, BreedingResult, ParentPair } from '@/lib/breeding/breeding';
  import { fly, fade } from 'svelte/transition';

  // --- DATA ---
  const allMutants: Mutant[] = (mutantsData as any[]).map((m: any) => ({
    id: String(m.id),
    name: m.name,
    genes: m.genes,
    odds: Number(m.odds) || 0,
    type: m.type || 'default',
    incub_time: Number(m.incub_time) || 0,
    image: m.image
  }));

  const normalize = (n: string) => n ? n.toLowerCase().replace(/[^a-z0-9а-яё]/g, '') : '';
  const secretNames = new Set(secretCombos.map(s => normalize(s.childName)));

  // --- HELPERS ---
  const getName = (m: Mutant) => m.name || m.id;

  function getImageSrc(m: Mutant): string {
    const img = m.image;
    const path = Array.isArray(img) ? (img[1] ?? img[0]) : img;
    if (!path) return '';
    return path.startsWith('/') ? path : '/' + path;
  }

  function getGeneIcon(geneChar: string): string {
    const char = geneChar.toLowerCase();
    if (['a', 'b', 'c', 'd', 'e', 'f'].includes(char)) {
        return `/genes/gene_${char}.webp`;
    }
    return '/genes/gene_all.webp';
  }

  function getTypeIcon(m: Mutant): string {
    const t = (m.type ?? '').toLowerCase();
    if (t.includes('legend')) return '/mut_icons/icon_legendary.webp';
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

  // --- SORTING ---
  const geneRank: Record<string, number> = { 'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5, 'f': 6 };
  function getPrimaryGeneRank(m: Mutant): number {
      const gStr = Array.isArray(m.genes) ? m.genes[0] : m.genes;
      if (!gStr) return 100;
      const firstChar = gStr.charAt(0).toLowerCase();
      return geneRank[firstChar] || 100;
  }

  // --- STATE ---
  let mode: 'calc' | 'reverse' = 'calc';
  let mobileTab: 'lab' | 'list' = 'lab'; // NEW: Для мобильной навигации

  let p1: Mutant | null = null;
  let p2: Mutant | null = null;
  let target: Mutant | null = null;
  let search = '';
  let filterGene = 'all';

  $: filteredList = allMutants.filter(m => {
    if (filterGene === 'recipe') return secretNames.has(normalize(getName(m)));
    const geneMatch = filterGene === 'all' || (Array.isArray(m.genes) && m.genes.some((g: string) => g.includes(filterGene)));
    const nameMatch = getName(m).toLowerCase().includes(search.toLowerCase());
    return geneMatch && nameMatch;
  }).sort((a, b) => {
      const rankA = getPrimaryGeneRank(a);
      const rankB = getPrimaryGeneRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return getName(a).localeCompare(getName(b), 'ru');
  });

  // --- LOGIC ---
  let calcResults: BreedingResult[] = [];
  let bestTime = '';

  $: if (mode === 'calc' && p1 && p2) {
    calcResults = calculateBreeding(p1, p2, allMutants);
    const times = calcResults.map(r => Number(r.child.incub_time)).filter(t => t > 0);
    bestTime = times.length ? formatTime(Math.min(...times)) : '--';
  } else {
    calcResults = [];
    bestTime = '';
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
        }));
        isSearching = false;
    }, 100);
  }

  function handleCardClick(m: Mutant) {
    const isSecret = secretNames.has(normalize(getName(m)));

    // Auto Switch Logic
    if (window.innerWidth < 1024) {
        mobileTab = 'lab'; // На мобилке сразу кидаем в лабу при выборе
    }

    if (filterGene === 'recipe' || (isSecret && mode === 'reverse')) {
        mode = 'reverse'; target = m; return;
    }
    if (mode === 'calc') {
      if (!p1) p1 = m;
      else if (!p2 && p1.id !== m.id) p2 = m;
      else if (p1.id === m.id) p1 = null;
      else if (p2?.id === m.id) p2 = null;
      else { p1 = m; p2 = null; }
    } else {
      target = (target?.id === m.id) ? null : m;
    }
  }
</script>

<!-- MAIN LAYOUT CONTAINER -->
<!-- h-[100dvh] fix for mobile browsers url bar -->
<div class="flex flex-col lg:flex-row h-[100dvh] max-w-[1600px] mx-auto lg:gap-6 lg:p-4 font-sans text-slate-200 bg-[#0a0f1c] overflow-hidden relative">

  <!-- SECTION 1: LABORATORY (LEFT PANEL) -->
  <!-- Hidden on mobile if tab is 'list', Visible on Desktop always -->
  <div class="{mobileTab === 'lab' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-h-0 bg-slate-900/40 backdrop-blur-md lg:border border-slate-800/60 lg:rounded-3xl overflow-hidden relative shadow-2xl shadow-black/50">
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-500/50 via-purple-500/50 to-blue-500/50"></div>

    <!-- HEADER -->
    <div class="shrink-0 p-4 lg:p-6 flex items-center justify-between border-b border-white/5 bg-black/20 z-10">
        <div class="flex items-center gap-3 lg:gap-4">
             <div class="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-600 shadow-[0_0_20px_rgba(132,204,22,0.3)] flex items-center justify-center text-xl lg:text-2xl">🧬</div>
             <div>
                 <h1 class="font-black text-lg lg:text-xl tracking-widest text-white uppercase leading-none">MGG <span class="text-lime-400">Mutants</span></h1>
                 <div class="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Bio-Lab v5.0</div>
             </div>
        </div>

        <!-- DESKTOP MODE SWITCHER (Hidden on mobile, integrated in Bottom Bar) -->
        <div class="hidden lg:flex bg-black/40 p-1.5 rounded-xl border border-white/5">
             <button class="relative px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all {mode==='calc' ? 'text-black' : 'text-slate-500 hover:text-white'}" on:click={() => {mode='calc'; target=null}}>
                 {#if mode==='calc'}<div class="absolute inset-0 bg-lime-500 rounded-lg" in:fade={{duration:200}}></div>{/if}
                 <span class="relative z-10">Инкубатор</span>
             </button>
             <button class="relative px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all {mode==='reverse' ? 'text-white' : 'text-slate-500 hover:text-white'}" on:click={() => {mode='reverse'; p1=null; p2=null}}>
                 {#if mode==='reverse'}<div class="absolute inset-0 bg-purple-600 rounded-lg" in:fade={{duration:200}}></div>{/if}
                 <span class="relative z-10">База ДНК</span>
             </button>
        </div>

        <!-- MOBILE MODE TOGGLE (Simple text switch) -->
         <button class="lg:hidden px-3 py-1.5 rounded-lg border border-white/10 bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-300"
            on:click={() => {
                mode = mode === 'calc' ? 'reverse' : 'calc';
                target = null; p1 = null; p2 = null;
            }}>
            {mode === 'calc' ? 'Включить Гид ➜' : 'Включить Лабу ➜'}
         </button>
    </div>

    <!-- WORKSPACE (Scrollable) -->
    <!-- pb-24 on mobile to account for Bottom Nav -->
    <div class="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scroll p-4 lg:p-6 relative z-0 pb-24 lg:pb-6">
        {#if mode === 'calc'}
            <div class="flex flex-col items-center gap-6 lg:gap-8 py-2" in:fly={{y:20, duration:400}}>
                <!-- SLOTS -->
                <div class="flex items-center justify-center gap-3 lg:gap-12 w-full">
                    <!-- SLOT 1 -->
                    <button class="group relative w-28 lg:w-48 aspect-square rounded-2xl border-2 border-dashed {p1?'border-lime-500/50 bg-slate-900':'border-slate-700 bg-slate-800/20'} flex flex-col items-center justify-center overflow-hidden transition-all" on:click={() => p1 = null}>
                        {#if p1}
                            <img src={getImageSrc(p1)} class="w-[85%] h-[85%] object-contain drop-shadow-2xl z-10" alt=""/>
                            <div class="absolute bottom-2 lg:bottom-3 inset-x-0 text-center text-[10px] lg:text-xs font-black uppercase truncate px-1">{getName(p1)}</div>
                        {:else}
                             <div class="text-2xl lg:text-3xl text-slate-600 group-hover:text-lime-500 mb-1 lg:mb-2">+</div>
                             <span class="text-[9px] lg:text-[10px] font-bold text-slate-600 uppercase">Родитель 1</span>
                        {/if}
                    </button>

                    <div class="text-slate-600 text-sm lg:text-base">✖</div>

                    <!-- SLOT 2 -->
                    <button class="group relative w-28 lg:w-48 aspect-square rounded-2xl border-2 border-dashed {p2?'border-lime-500/50 bg-slate-900':'border-slate-700 bg-slate-800/20'} flex flex-col items-center justify-center overflow-hidden transition-all" on:click={() => p2 = null}>
                        {#if p2}
                            <img src={getImageSrc(p2)} class="w-[85%] h-[85%] object-contain drop-shadow-2xl z-10" alt=""/>
                            <div class="absolute bottom-2 lg:bottom-3 inset-x-0 text-center text-[10px] lg:text-xs font-black uppercase truncate px-1">{getName(p2)}</div>
                        {:else}
                             <div class="text-2xl lg:text-3xl text-slate-600 group-hover:text-lime-500 mb-1 lg:mb-2">+</div>
                             <span class="text-[9px] lg:text-[10px] font-bold text-slate-600 uppercase">Родитель 2</span>
                        {/if}
                    </button>
                </div>

                <!-- RESULTS -->
                {#if p1 && p2}
                    <div class="w-full max-w-3xl animate-in slide-in-from-bottom-10 fade-in duration-500">
                        {#if calcResults.length > 0}
                            <div class="bg-slate-950/50 border border-slate-800/60 rounded-xl overflow-hidden">
                                <div class="px-4 lg:px-6 py-3 flex justify-between items-center text-xs uppercase font-bold text-slate-500 border-b border-white/5">
                                    <span>Результат: <span class="text-lime-400 ml-1">{calcResults.length}</span></span>
                                    <span>Мин. время: <span class="text-white ml-1">{bestTime}</span></span>
                                </div>
                                <div class="divide-y divide-white/5 max-h-[350px] lg:max-h-[400px] overflow-y-auto custom-scroll">
                                    {#each calcResults as res}
                                        <div class="flex items-center gap-3 lg:gap-5 p-3 lg:p-4 hover:bg-white/5 transition-colors group relative">
                                            {#if res.isSecret}<div class="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia-500"></div>{/if}

                                            <div class="w-14 h-14 lg:w-16 lg:h-16 bg-slate-900 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                                <img src={getImageSrc(res.child)} class="w-full h-full object-cover group-hover:scale-110 transition-transform" alt=""/>
                                            </div>

                                            <div class="flex-1 min-w-0 flex flex-col gap-1">
                                                <div class="flex items-center gap-2">
                                                    <span class="font-black text-sm lg:text-base text-slate-200 truncate">{getName(res.child)}</span>
                                                    {#if res.isSecret}
                                                        <span class="px-1.5 py-0.5 text-[8px] lg:text-[9px] font-bold text-black bg-fuchsia-500 rounded">РЕЦЕПТ</span>
                                                    {/if}
                                                </div>

                                                <div class="flex items-center gap-2 lg:gap-3">
                                                    <div class="flex -space-x-1 items-center">
                                                        {#each ((Array.isArray(res.child.genes)?res.child.genes[0]:res.child.genes)||'').split('') as g}
                                                             <img src={getGeneIcon(g)} class="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-black ring-2 ring-slate-800 z-10 relative" alt={g}/>
                                                        {/each}
                                                    </div>
                                                    <div class="w-px h-4 bg-white/10"></div>
                                                    <img src={getTypeIcon(res.child)} class="w-7 h-7 lg:w-8 lg:h-8 opacity-100 drop-shadow-lg" alt=""/>
                                                </div>
                                            </div>

                                            <div class="text-right self-center">
                                                 <div class="text-[9px] lg:text-[10px] font-bold uppercase {res.tag==='ВОЗМОЖНО'?'text-lime-500':(res.tag==='РЕЦЕПТ'?'text-fuchsia-400':'text-blue-400')} mb-1">{res.tag}</div>
                                                 <div class="text-xs lg:text-sm font-mono text-slate-500 bg-slate-900 px-1.5 lg:px-2 py-0.5 rounded">{formatTime(res.child.incub_time)}</div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {:else}
                            <div class="text-center p-6 lg:p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-slate-500 font-medium text-xs lg:text-sm">
                                Нет совместимых вариантов.
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>

        {:else if mode === 'reverse'}
             <div class="flex flex-col items-center py-4 lg:py-6 px-2" in:fly={{y:20, duration:400}}>
                 {#if !target}
                     <div class="flex flex-col items-center text-center mt-6 lg:mt-10 opacity-50">
                         <div class="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl lg:text-4xl mb-4">🔍</div>
                         <h3 class="text-base lg:text-lg font-bold text-white">Поиск родителей</h3>
                         <p class="text-[10px] lg:text-xs text-slate-400 max-w-[250px] mt-1">Нажмите "База" и выберите мутанта для анализа.</p>
                     </div>
                 {:else}
                     {#key target.id}
                         <div class="w-full max-w-2xl bg-slate-950/50 border border-purple-500/30 rounded-2xl p-4 lg:p-6 flex items-center gap-4 lg:gap-6 mb-6 relative overflow-hidden">
                             <div class="absolute -right-6 -top-6 opacity-5 pointer-events-none rotate-12"><img src={getTypeIcon(target)} alt="" class="w-40 h-40 lg:w-64 lg:h-64 grayscale"/></div>
                             <div class="w-20 h-20 lg:w-28 lg:h-28 bg-black rounded-xl border-2 border-slate-800 shadow-xl z-10 shrink-0 overflow-hidden"><img src={getImageSrc(target)} class="w-full h-full object-cover" alt=""/></div>
                             <div class="z-10 flex-1">
                                 <div class="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
                                     <span class="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] lg:text-[10px] font-bold px-2 py-0.5 rounded uppercase">Цель</span>
                                     <span class="text-[9px] lg:text-[10px] font-mono text-slate-500">{formatTime(target.incub_time)}</span>
                                 </div>
                                 <h2 class="text-xl lg:text-3xl font-black text-white leading-tight mb-1 lg:mb-2 truncate">{getName(target)}</h2>
                                 <button class="text-[10px] lg:text-xs font-bold text-slate-500 hover:text-white underline" on:click={() => target=null}>Сбросить</button>
                             </div>
                         </div>
                     {/key}
                     {#if isSearching}
                        <div class="text-center py-10"><div class="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-2"></div><div class="text-xs font-bold text-purple-500 uppercase">Поиск...</div></div>
                     {:else}
                        <div class="grid gap-2 lg:gap-3 w-full max-w-2xl">
                            {#each guideResults as combo, i}
                                <div class="bg-slate-900/60 border border-white/5 hover:border-purple-500/40 rounded-xl p-3 lg:p-4 flex items-center justify-between transition-all animate-in slide-in-from-bottom-2" style="animation-delay: {i * 30}ms">
                                    <div class="flex items-center gap-3 lg:gap-4">
                                         <div class="flex -space-x-2 lg:-space-x-3">
                                              <img src={getImageSrc(combo.p1)} class="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-black border border-slate-600 z-10 relative" alt=""/>
                                              <img src={getImageSrc(combo.p2)} class="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-black border border-slate-600 relative" alt=""/>
                                         </div>
                                         <div class="text-xs text-slate-300 font-medium">
                                              <div class="font-bold text-[10px] lg:text-xs">{getName(combo.p1)}</div>
                                              <div class="opacity-50 flex items-center gap-1 text-[9px] lg:text-[10px] uppercase"><span>+</span><span>{getName(combo.p2)}</span></div>
                                         </div>
                                    </div>
                                    <span class="text-[9px] lg:text-[10px] font-black uppercase px-2 lg:px-3 py-1 rounded border {combo.isSecret ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' : 'bg-lime-500/10 text-lime-400 border-lime-500/20'}">{combo.tag}</span>
                                </div>
                            {:else}
                                <div class="text-center py-6 lg:py-8 opacity-50 text-xs lg:text-sm font-bold border border-dashed border-slate-800 rounded-xl">Невозможно вывести (Сезонный/Магазин).</div>
                            {/each}
                        </div>
                     {/if}
                 {/if}
             </div>
        {/if}
    </div>
  </div>

  <!-- SECTION 2: SIDEBAR / LIST (RIGHT PANEL) -->
  <!-- Hidden on mobile if tab is 'lab', Visible on Desktop always -->
  <div class="{mobileTab === 'list' ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 flex-none bg-slate-900/80 backdrop-blur-md lg:border border-slate-800 lg:rounded-3xl flex-col overflow-hidden relative z-10">
      <div class="p-4 lg:p-5 bg-black/40 border-b border-white/5 shrink-0 space-y-3 lg:space-y-4 z-20">
          <div class="relative group">
              <input type="text" bind:value={search} placeholder="Поиск мутанта..." class="w-full bg-slate-800/50 text-sm text-white border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 lg:py-3 outline-none focus:border-lime-500 transition-all" />
              <span class="absolute left-3 top-3 lg:top-3.5 text-slate-500">🔍</span>
          </div>
          <!-- FILTERS -->
          <div class="flex justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
              <button class="h-9 lg:h-10 px-3 rounded-lg text-[10px] font-black uppercase border {filterGene==='all' ? 'bg-lime-400 text-black border-lime-400' : 'bg-slate-800 border-slate-700 text-slate-400'}" on:click={() => filterGene='all'}>ВСЕ</button>
              {#each ['A','B','C','D','E','F'] as g}
                  <button class="h-9 w-9 lg:h-10 lg:w-10 shrink-0 flex items-center justify-center rounded-lg border {filterGene===g ? 'bg-slate-700 border-white text-white scale-110' : 'bg-slate-800 border-slate-700 opacity-60'}" on:click={() => filterGene=g}>
                      <img src={getGeneIcon(g)} class="w-5 h-5 lg:w-6 lg:h-6" alt={g}/>
                  </button>
              {/each}
               <button class="h-9 w-9 lg:h-10 lg:w-10 shrink-0 flex items-center justify-center rounded-lg border {filterGene==='recipe' ? 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-400 scale-110' : 'bg-slate-800 border-slate-700 opacity-60'}" on:click={() => filterGene='recipe'}>
                   <img src="/mut_icons/icon_recipe.webp" class="w-5 h-5 lg:w-6 lg:h-6" alt="★"/>
               </button>
          </div>
      </div>

      <!-- GRID List -->
      <!-- pb-24 for Mobile Nav space -->
      <div class="flex-1 overflow-y-auto custom-scroll p-3 lg:p-4 pb-24 lg:pb-4">
           <div class="grid grid-cols-3 lg:grid-cols-3 gap-2 lg:gap-3 pb-10">
               {#each filteredList as m (m.id)}
                    <button class="group relative aspect-square w-full bg-slate-800/50 border border-white/5 rounded-xl overflow-hidden hover:border-lime-500/50 hover:scale-[1.02] transition-all" on:click={() => handleCardClick(m)}>
                        <img loading="lazy" src={getImageSrc(m)} class="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity" alt=""/>
                        <div class="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                        <div class="absolute bottom-0 inset-x-0 p-1 lg:p-1.5 text-center"><p class="text-[9px] lg:text-[10px] font-bold text-slate-300 truncate group-hover:text-lime-300">{getName(m)}</p></div>
                        {#if secretNames.has(normalize(getName(m)))}<div class="absolute top-1 left-1 lg:top-1.5 lg:left-1.5 text-[8px] bg-fuchsia-600 text-white px-1 rounded">★</div>{/if}
                    </button>
               {/each}
           </div>
      </div>
  </div>

  <!-- MOBILE BOTTOM NAVIGATION (Fixed) -->
  <div class="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0a0f1c]/90 backdrop-blur-xl border-t border-white/10 z-50 flex items-start pt-2 justify-around pb-safe">
       <button class="flex flex-col items-center gap-1 p-2 w-1/2 {mobileTab==='lab' ? 'text-lime-400' : 'text-slate-500'}"
           on:click={() => mobileTab = 'lab'}>
           <div class="text-2xl mb-1 transition-transform {mobileTab==='lab' ? 'scale-110' : ''}">{mode==='calc' ? '🧬' : '🔍'}</div>
           <span class="text-[10px] font-black uppercase tracking-widest">Лаборатория</span>
       </button>

       <div class="w-px h-10 bg-white/10 mt-2"></div>

       <button class="flex flex-col items-center gap-1 p-2 w-1/2 {mobileTab==='list' ? 'text-blue-400' : 'text-slate-500'}"
           on:click={() => mobileTab = 'list'}>
           <div class="text-2xl mb-1 transition-transform {mobileTab==='list' ? 'scale-110' : ''}">📋</div>
           <span class="text-[10px] font-black uppercase tracking-widest">База</span>
       </button>
  </div>

</div>

<style>
  :global(body) { background-color: #050505; }
  .custom-scroll::-webkit-scrollbar { width: 6px; }
  .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
  .custom-scroll::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
  .custom-scroll::-webkit-scrollbar-thumb:hover { background: #334155; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Safe area for iPhone X+ home indicator */
  .pb-safe {
      padding-bottom: env(safe-area-inset-bottom, 20px);
  }
</style>
