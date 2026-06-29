<script lang="ts">
  import { sortMutantsByGene } from '@/lib/mutant-sort'
  import MutantModal from './MutantModal.svelte'

  let { mutants = [] }: { mutants: any[] } = $props()

  const MAIN_TIERS = ['1', '2', '3', '4']

  const SUB_ORDER: Record<string, string[]> = {
    '1': ['1+', '1', '1-'],
    '2': ['2+', '2', '2-'],
    '3': ['3+', '3', '3-'],
    '4': ['4'],
  }

  const TIER_COLORS: Record<string, { border: string; bg: string; headerBg: string; subText: string }> = {
    '1': { border: 'border-red-500', bg: 'bg-red-500/10', headerBg: 'bg-red-600', subText: 'text-red-300' },
    '2': { border: 'border-orange-500', bg: 'bg-orange-500/10', headerBg: 'bg-orange-600', subText: 'text-orange-300' },
    '3': { border: 'border-yellow-500', bg: 'bg-yellow-500/10', headerBg: 'bg-yellow-600', subText: 'text-yellow-300' },
    '4': { border: 'border-green-500', bg: 'bg-green-500/10', headerBg: 'bg-green-600', subText: 'text-green-300' },
  }

  const SUB_LABELS: Record<string, string> = {
    '1+': 'Топ тира', '1': 'Середина', '1-': 'Низ тира',
    '2+': 'Топ тира', '2': 'Середина', '2-': 'Низ тира',
    '3+': 'Топ тира', '3': 'Середина', '3-': 'Низ тира',
  }

  function groupByTier(list: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {}
    for (const m of list) {
      const t = String(m.tier ?? '').trim()
      if (!t) continue
      if (!groups[t]) groups[t] = []
      groups[t].push(m)
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort(sortMutantsByGene)
    }
    return groups
  }

  const grouped = $derived(groupByTier(mutants))

  let modalOpen = $state(false)
  let selectedMutant: any = $state(null)
  let selectedStar = $state('normal')

  function openModal(m: any) {
    selectedMutant = m
    if (m.stars) {
      const available = ['platinum', 'gold', 'silver', 'bronze', 'normal']
      selectedStar = available.find(s => m.stars[s]) || 'normal'
    } else {
      selectedStar = 'normal'
    }
    modalOpen = true
  }

  function closeModal() {
    modalOpen = false
    selectedMutant = null
  }

  function specimenSrc(m: any): string {
    const id = String(m.id ?? '')
    const base = id
      .replace(/^specimen[_-]/i, '')
      .replace(/_(normal|bronze|silver|gold|plat.*)$/i, '')
      .toLowerCase()
    return `/textures_by_mutant/${base}/thumb_specimen_${base}_normal.webp`
  }
</script>

<div class="space-y-4 sm:space-y-6">
  {#each MAIN_TIERS as mainTier}
    {@const subs = SUB_ORDER[mainTier] ?? [mainTier]}
    {@const colors = TIER_COLORS[mainTier]}
    {@const hasAny = subs.some(s => grouped[s]?.length > 0)}

    {#if hasAny}
      <section class="rounded-2xl border-2 {colors.border} {colors.bg} overflow-hidden">
        <div class="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 {colors.headerBg}">
          <span class="text-lg sm:text-xl font-extrabold text-white tracking-wide">ТИР {mainTier}</span>
          <span class="text-xs sm:text-sm text-slate-300">
            {subs.reduce((sum, s) => sum + (grouped[s]?.length ?? 0), 0)} мутантов
          </span>
        </div>

        {#each subs as subTier}
          {@const list = grouped[subTier] ?? []}
          {#if list.length > 0}
            <div class="px-3 sm:px-4 pt-2.5 sm:pt-3 pb-1.5 sm:pb-2">
              {#if subs.length > 1}
                <div class="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <span class="text-[11px] sm:text-xs font-bold {colors.subText} opacity-80 uppercase tracking-wider">
                    {subTier}
                  </span>
                  <span class="text-[10px] sm:text-[11px] text-slate-400">
                    {SUB_LABELS[subTier] ?? ''}
                  </span>
                  <div class="flex-1 h-px bg-white/5"></div>
                </div>
              {/if}

              <div class="flex flex-wrap gap-1 sm:gap-1.5">
                {#each list as m (m.id)}
                  <button
                    class="group relative w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16 rounded-lg overflow-hidden
                           border border-slate-600/40 bg-slate-900/70
                           hover:border-sky-400/60 hover:shadow-[0_0_12px_rgba(56,189,248,0.2)]
                           transition-all duration-200 cursor-pointer flex-shrink-0"
                    onclick={() => openModal(m)}
                    title={m.name}
                  >
                    <img
                      src={specimenSrc(m)}
                      alt={m.name}
                      class="w-full h-full object-contain p-0.5 sm:p-1"
                      loading="eager"
                      decoding="async"
                    />
                    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent
                                px-0.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span class="text-[7px] sm:text-[8px] md:text-[9px] text-white leading-tight line-clamp-2 text-center block">
                        {m.name}
                      </span>
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      </section>
    {/if}
  {/each}
</div>

{#if modalOpen && selectedMutant}
  <MutantModal
    open={modalOpen}
    mutant={selectedMutant}
    star={selectedStar}
    onclose={closeModal}
  />
{/if}
