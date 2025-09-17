<script lang="ts">
  import { STAR_LABEL, STAR_COLOR, TYPE_RU, geneLabel, bingoLabel } from '@/lib/mutant-dicts';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import normalData from '@/data/mutants/normal.json';
  // ЛОР: словарь id->name_lore (регистронезависимо, без звёздных суффиксов)
  const loreMap: Record<string, string> = {};
  for (const m of (normalData as any[])) {
    if (m && m.id) loreMap[String(m.id).toLowerCase()] = String(m.name_lore ?? '');
  }
  const baseId = (id?: string) => String(id ?? '').toLowerCase().replace(/_+(?:bronze|silver|gold|platinum|plat).*$/i, '');
  const loreFor = (id?: string) => loreMap[baseId(id)] || loreMap[String(id ?? '').toLowerCase()] || '';

  // Бинго: словарь id->массив тегов из normal.json (фолбэк для звёзд/скинов)
  const bingoMap: Record<string, string[]> = {};
  for (const m of (normalData as any[])) {
    if (m && (m as any).id) {
      bingoMap[String((m as any).id).toLowerCase()] = Array.isArray((m as any).bingo) ? ((m as any).bingo as string[]) : [];
    }
  }
  const bingoFor = (m: any): string[] => {
    const own = (m?.bingo ?? []) as string[];
    if (Array.isArray(own) && own.length) return own;
    return bingoMap[baseId(m?.id)] ?? [];
  };


  // Иконки для типов мутантов
  const TYPE_ICON: Record<string, string> = {
    zodiac: '/mut_icons/icon_zodiac.png',
    videogame: '/mut_icons/icon_videogame.png',
    special: '/mut_icons/icon_special.png',
    seasonal: '/mut_icons/icon_seasonal.png',
    recipe: '/mut_icons/icon_recipe.png',
    pvp: '/mut_icons/icon_pvp.png',
    heroic: '/mut_icons/icon_heroic.png',
    legend: '/mut_icons/icon_legendary.png',
    legends: '/mut_icons/icon_legendary.png',
    legendary: '/mut_icons/icon_legendary.png',
    gacha: '/mut_icons/icon_gacha.png',
    reactor: '/mut_icons/icon_gacha.png',
    "реактор": '/mut_icons/icon_gacha.png'
  };
  function typeIcon(t?: string | null): string | null {
    const key = String(t ?? '').toLowerCase();
    return TYPE_ICON[key] ?? null;
  }


  export let open = false;
  export let mutant: any = null;
  export let star: string = 'normal';

  const dispatch = createEventDispatcher();

  function close() { dispatch('close'); }

  function imgSrc(m: any) {
    const list: string[] = m?.image ?? [];
    const pick = list.find(p => p.includes('textures_by_mutant/') && !p.includes('specimen') && !p.includes('larva')) || list[0];
    if (!pick) return '/placeholder-mutant.png';
    return pick.startsWith('/') ? pick : `/${pick}`;
  }

  let escHandler: (e: KeyboardEvent)=>void;
  onMount(() => {
    escHandler = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', escHandler);
    return () => window.removeEventListener('keydown', escHandler);
  });

  // удобные геттеры
  $: lvl1 = mutant?.base_stats?.lvl1 ?? {};
  $: lvl30 = mutant?.base_stats?.lvl30 ?? {};
  $: genes = Array.isArray(mutant?.genes) ? mutant.genes[0] : '';

  // lock body scroll when modal is open (desktop/mobile)
  let __unlockBody = null;
  function __lockBodyScroll(){
    if (typeof document === 'undefined') return () => {};
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevTouch = body.style.touchAction;
    const prevObs = body.style.overscrollBehavior;
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    body.style.overscrollBehavior = 'contain';
    return () => {
      body.style.overflow = prevOverflow;
      body.style.touchAction = prevTouch;
      body.style.overscrollBehavior = prevObs || '';
    };
  }
  $: {
    if (open && typeof window !== 'undefined'){
      if (!__unlockBody) __unlockBody = __lockBodyScroll();
    } else if (__unlockBody){
      __unlockBody();
      __unlockBody = null;
    }
  }
  onDestroy(() => { if (__unlockBody) { __unlockBody(); __unlockBody = null; } });


  // Flip state and helpers
  let showAbilities = false;

  // Ability name dictionary (RU)
  import { ABILITY_RU } from '@/lib/mutant-dicts';

  // Fallback maps from normal.json
  const abilitiesMap: Record<string, any[]> = {};
  const attackNamesMap: Record<string, {name1?: string; name2?: string}> = {};
  for (const m of (normalData as any[])) {
    const key = String((m as any).id ?? '').toLowerCase();
    abilitiesMap[key] = Array.isArray((m as any).abilities) ? (m as any).abilities : [];
    attackNamesMap[key] = {
      name1: (m as any).name_attack1 ?? undefined,
      name2: (m as any).name_attack2 ?? undefined
    };
  }
  const abilitiesFor = (m: any) => {
    if (Array.isArray(m?.abilities) && m.abilities.length) return m.abilities;
    return abilitiesMap[baseId(m?.id)] ?? [];
  };
  const abilityLabel = (name?: string) => {
    const raw = String(name ?? '');
    return ABILITY_RU[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const attackName = (m: any, which: 1|2): string => {
    const local = which === 1 ? m?.name_attack1 : m?.name_attack2;
    if (local) return String(local);
    const fb = attackNamesMap[baseId(m?.id)];
    return String((which === 1 ? fb?.name1 : fb?.name2) ?? (which === 1 ? 'Атака 1' : 'Атака 2'));
  };
</script>

{#if open && mutant}
<div class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto overscroll-contain" on:click|self={close}>
  <div class="relative w-full max-w-5xl grid md:grid-cols-[380px_1fr] gap-6 bg-[#0b1220] border border-white/10 rounded-2xl p-5 shadow-2xl max-h-[90svh] md:max-h-[88vh] overflow-y-auto scroll-panel">
    <!-- изображение -->
    <div class="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 flex items-center justify-center ring-1 ring-white/10">
      <img alt={mutant?.name} src={imgSrc(mutant)} class="max-h-[420px] object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]" />
    </div>

    <!-- данные -->
    <div class="space-y-4">
        <div class="flip-scene">
          <div class="flip-card" class:flipped={showAbilities}>
            <div class="flip-face front">

      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-xl md:text-2xl font-bold tracking-wide">{mutant?.name}</h2>
          <div class="mt-1 text-sm text-white/70 flex items-center gap-2">
            {#if typeIcon(mutant?.type)}
              <span class="inline-flex items-center gap-1"><img src={typeIcon(mutant?.type)} alt="type" class="h-7 w-7 md:h-8 md:w-8 object-contain opacity-90" /> {TYPE_RU[mutant?.type] ?? mutant?.type}</span>
            {:else}
              <span>{TYPE_RU[mutant?.type] ?? mutant?.type}</span>
            {/if}
            {#if genes}<span class="opacity-70">•</span> {geneLabel(genes)}{/if}
          </div>
        </div>
        <div class="flex items-center gap-2">
          {#if mutant?.tier}
            <span class="px-2 py-1 rounded-full text-xs bg-emerald-900/60 text-emerald-100 ring-1 ring-emerald-500/40">Тир {mutant.tier}</span>
          {/if}
          <span class={`px-2 py-1 rounded-full text-[10px] ring-1 ${STAR_COLOR[star]}`}>{STAR_LABEL[star] ?? star}</span>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">
          <div class="text-xs text-white/60 mb-2">Статы на 1 уровне</div>
          <dl class="grid grid-cols-2 gap-y-1 text-sm">
            <dt class="text-white/60"><span class="row-icon"><img class="stat-icon" src="/etc/icon_hp.png" alt="hp" /> HP</span></dt><dd class="text-white/90">{lvl1.hp ?? '—'}</dd>
            <dt class="text-white/60"><span class="row-icon"><img class="stat-icon" src="/etc/icon_atk.png" alt="atk1" /> {attackName(mutant, 1)}</span></dt><dd class="text-white/90">{lvl1.atk1 ?? '—'}</dd>
            <dt class="text-white/60"><span class="row-icon"><img class="stat-icon" src="/etc/icon_atk.png" alt="atk2" /> {attackName(mutant, 2)}</span></dt><dd class="text-white/90">{lvl1.atk2 ?? '—'}</dd>
            <dt class="text-white/60"><span class="row-icon"><img class="stat-icon" src="/etc/icon_speed.png" alt="spd" /> Скорость</span></dt><dd class="text-white/90">{lvl1.spd ?? '—'}</dd>
          </dl>
        </div>
        <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">
          <div class="text-xs text-white/60 mb-2">Статы на 30 уровне</div>
          <dl class="grid grid-cols-2 gap-y-1 text-sm">
            <dt class="text-white/60"><span class="row-icon"><img class="stat-icon" src="/etc/icon_hp.png" alt="hp" /> HP</span></dt><dd class="text-white/90">{lvl30.hp ?? '—'}</dd>
            <dt class="text-white/60"><span class="row-icon"><img class="stat-icon" src="/etc/icon_atk.png" alt="atk1" /> {attackName(mutant, 1)}</span></dt><dd class="text-white/90">{lvl30.atk1 ?? '—'}</dd>
            <dt class="text-white/60"><span class="row-icon"><img class="stat-icon" src="/etc/icon_atk.png" alt="atk2" /> {attackName(mutant, 2)}</span></dt><dd class="text-white/90">{lvl30.atk2 ?? '—'}</dd>
            <dt class="text-white/60"><span class="row-icon"><img class="stat-icon" src="/etc/icon_speed.png" alt="spd" /> Скорость</span></dt><dd class="text-white/90">{lvl30.spd ?? '—'}</dd>
          </dl>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">
          <div class="text-xs text-white/60 mb-1"><span class="row-icon"><img class="stat-icon" src="/etc/icon_bingo.png" alt="bingo" /> Бинго</span></div>
          {#if bingoFor(mutant).length}
            <div class="flex flex-wrap gap-2">
              {#each bingoFor(mutant) as b}
                <span class="text-xs px-2 py-1 rounded-full bg-indigo-900/50 ring-1 ring-indigo-500/40 text-indigo-100">{bingoLabel(b)}</span>
              {/each}
            </div>
          {:else}
            <div class="text-sm text-white/50">—</div>
          {/if}
        </div>
        <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">
          <div class="text-xs text-white/60 mb-1">Прочее</div>
          <div class="text-sm text-white/80 space-y-1">
            <div class="flex items-center gap-2 leading-tight"><span class="row-icon"><img class="stat-icon" src="/etc/icon_timer.png" alt="timer" /> Инкубация:</span> <span class="text-white">{mutant?.incub_time ?? '—'}</span><span class="opacity-80"> мин.</span></div>
            <div class="flex items-center gap-2 leading-tight"><span class="row-icon"><img class="stat-icon" src="/etc/icon_chance.png" alt="chance" /> Шанс:</span> <span class="text-white">{mutant?.chance ?? '—'}</span><span class="opacity-80"> %</span></div>
          </div>
        </div>
      </div>

      

      <button class="mt-2 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 ring-1 ring-white/10"
              on:click={close}>Закрыть</button>
      <button class="mt-2 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/50"
              on:click={() => showAbilities = !showAbilities}>
        {showAbilities ? 'Статы' : 'Switch'}
      </button>

    
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">
        <div class="text-xs text-white/60 mb-1">Способности</div>
        {#if abilitiesFor(mutant).length}
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <div class="text-xs text-white/60 mb-1">На 1 уровне</div>
              <div class="text-sm text-white/80 space-y-2">
                {#each abilitiesFor(mutant) as ab}
                  <div class="flex items-start gap-3 leading-tight">
                    <div class="mt-0.5 text-white/70">{abilityLabel(ab.name)}</div>
                    <div class="ml-auto text-white/80 text-right">
                      <div class="text-xs opacity-70">pct: {ab.pct ?? '—'}%</div>
                      <div>{attackName(mutant, 1)}: {ab.value_atk1_lvl1 ?? '—'}</div>
                      <div>{attackName(mutant, 2)}: {ab.value_atk2_lvl1 ?? '—'}</div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
            <div>
              <div class="text-xs text-white/60 mb-1">На 30 уровне</div>
              <div class="text-sm text-white/80 space-y-2">
                {#each abilitiesFor(mutant) as ab}
                  <div class="flex items-start gap-3 leading-tight">
                    <div class="mt-0.5 text-white/70">{abilityLabel(ab.name)}</div>
                    <div class="ml-auto text-white/80 text-right">
                      <div class="text-xs opacity-70">pct: {ab.pct ?? '—'}%</div>
                      <div>{attackName(mutant, 1)}: {ab.value_atk1_lvl30 ?? '—'}</div>
                      <div>{attackName(mutant, 2)}: {ab.value_atk2_lvl30 ?? '—'}</div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {:else}
          <div class="text-sm text-white/60">Скоро будет добавлено…</div>
        {/if}
      </div>

      <!-- Сферовка (зарезервировано) -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">

        <div class="text-sm text-white/60">Скоро будет добавлено…</div>
      </div>

            </div>
            <div class="flip-face back">

      <div class="space-y-4">
<div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">
        <div class="text-xs text-white/60 mb-1">Описание</div>
        <div class="text-sm text-white/60">{loreFor(mutant?.id) || 'Скоро будет добавлено…'}</div>
      </div>
        
        <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">
          <div class="text-xs text-white/60 mb-1">Сферовка</div>
          <div class="text-sm text-white/60">Скоро будет добавлено…</div>
        </div>
<div class="flex justify-end">
          <button class="mt-2 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/50"
                  on:click={() => showAbilities = false}>
            Назад к статам
          </button>
        </div>
      </div>

            </div>
          </div>
        </div>
</div>
  </div>
</div>
{/if}

<style>
  .stat-icon { width: 18px; height: 18px; display:inline-block; }
  .row-icon { display: inline-flex; align-items: center; gap: .4rem; }

  .flip-scene{ perspective: 1200px; }
  .flip-card{ position: relative; transform-style: preserve-3d; transition: transform .45s cubic-bezier(.2,.8,.2,1); }
  .flip-card.flipped{ transform: rotateY(180deg); }
  .flip-face{ backface-visibility: hidden; -webkit-backface-visibility: hidden; transform-style: preserve-3d; }
  .flip-face.back{ position:absolute; inset:0; overflow-y:auto; overscroll-behavior: contain; transform: rotateY(180deg); }

</style>
