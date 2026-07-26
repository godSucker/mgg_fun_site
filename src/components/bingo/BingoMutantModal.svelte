<script lang="ts">
  import mutantsData from '@/data/mutants/mutants.json'
  import MutantModal from '../MutantModal.svelte'

  const mutants = mutantsData as any[]
  const byId = new Map(mutants.map((m) => [String(m.id).toLowerCase(), m]))

  const STAR_ORDER = ['platinum', 'gold', 'silver', 'bronze', 'normal']

  let modalOpen = $state(false)
  let selectedMutant: any = $state(null)
  let selectedStar = $state('normal')

  function onOpen(e: Event) {
    const specimenId = (e as CustomEvent).detail?.specimenId as string | undefined
    if (!specimenId) return
    const m = byId.get(specimenId.toLowerCase())
    if (!m) return
    selectedMutant = m
    selectedStar = m.stars ? STAR_ORDER.find((s) => m.stars[s]) || 'normal' : 'normal'
    modalOpen = true
  }

  function closeModal() {
    modalOpen = false
    selectedMutant = null
  }

  $effect(() => {
    window.addEventListener('archivist:open-mutant', onOpen)
    return () => window.removeEventListener('archivist:open-mutant', onOpen)
  })
</script>

{#if modalOpen && selectedMutant}
  <MutantModal open={modalOpen} mutant={selectedMutant} star={selectedStar} onclose={closeModal} />
{/if}
