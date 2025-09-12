<script lang="ts">
  import { STAR_LABEL, STAR_COLOR, TYPE_RU, geneLabel, bingoLabel } from '@/lib/mutant-dicts';
  import { createEventDispatcher, onMount } from 'svelte';

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
</script>

{#if open && mutant}
<div class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" on:click|self={close}>
  <div class="relative w-full max-w-5xl grid md:grid-cols-[380px_1fr] gap-6 bg-[#0b1220] border border-white/10 rounded-2xl p-5 shadow-2xl">
    <!-- изображение -->
    <div class="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 flex items-center justify-center ring-1 ring-white/10">
      <img alt={mutant?.name} src={imgSrc(mutant)} class="max-h-[420px] object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]" />
    </div>

    <!-- данные -->
    <div class="space-y-4">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-xl md:text-2xl font-bold tracking-wide">{mutant?.name}</h2>
          <div class="mt-1 text-sm text-white/70">
            {TYPE_RU[mutant?.type] ?? mutant?.type}
            {#if genes}&nbsp;•&nbsp;{geneLabel(genes)}{/if}
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
            <dt class="text-white/60">HP</dt><dd class="text-white/90">{lvl1.hp ?? '—'}</dd>
            <dt class="text-white/60">Атака 1</dt><dd class="text-white/90">{lvl1.atk1 ?? '—'}</dd>
            <dt class="text-white/60">Атака 2</dt><dd class="text-white/90">{lvl1.atk2 ?? '—'}</dd>
            <dt class="text-white/60">Скорость</dt><dd class="text-white/90">{lvl1.spd ?? '—'}</dd>
          </dl>
        </div>
        <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">
          <div class="text-xs text-white/60 mb-2">Статы на 30 уровне</div>
          <dl class="grid grid-cols-2 gap-y-1 text-sm">
            <dt class="text-white/60">HP</dt><dd class="text-white/90">{lvl30.hp ?? '—'}</dd>
            <dt class="text-white/60">Атака 1</dt><dd class="text-white/90">{lvl30.atk1 ?? '—'}</dd>
            <dt class="text-white/60">Атака 2</dt><dd class="text-white/90">{lvl30.atk2 ?? '—'}</dd>
            <dt class="text-white/60">Скорость</dt><dd class="text-white/90">{lvl30.spd ?? '—'}</dd>
          </dl>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">
          <div class="text-xs text-white/60 mb-1">Бинго</div>
          {#if mutant?.bingo?.length}
            <div class="flex flex-wrap gap-2">
              {#each mutant.bingo as b}
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
            <div>Инкубация: <span class="text-white">{mutant?.incub_time ?? '—'}</span> мин.</div>
            <div>Шанс: <span class="text-white">{mutant?.chance ?? '—'}</span>%</div>
          </div>
        </div>
      </div>

      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-3">
        <div class="text-xs text-white/60 mb-1">Описание</div>
        <div class="text-sm text-white/60">Скоро будет добавлено…</div>
      </div>

      <button class="mt-2 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 ring-1 ring-white/10"
              on:click={close}>Закрыть</button>
    </div>
  </div>
</div>
{/if}
