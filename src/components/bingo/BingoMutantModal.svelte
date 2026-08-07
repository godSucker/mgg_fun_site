<script lang="ts">
  import mutantsData from '@/data/mutants/mutants.json'
  import skinsData from '@/data/mutants/skins.json'
  import MutantModal from '../MutantModal.svelte'
  import { baseMutantId as baseId, buildSkinLookup } from '@/lib/utils'

  const mutants = mutantsData as any[]
  const byId = new Map(mutants.map((m) => [String(m.id).toLowerCase(), m]))
  const skinLookup = buildSkinLookup((skinsData as any)?.specimens ?? [])

  const STAR_ORDER = ['platinum', 'gold', 'silver', 'bronze', 'normal']

  let modalOpen = $state(false)
  let selectedMutant: any = $state(null)
  let selectedStar = $state('normal')
  let selectedSkins: any[] = $state([])

  function onOpen(e: Event) {
    const specimenId = (e as CustomEvent).detail?.specimenId as string | undefined
    if (!specimenId) return
    const m = byId.get(specimenId.toLowerCase())
    if (!m) return
    selectedMutant = m
    selectedStar = m.stars ? STAR_ORDER.find((s) => m.stars[s]) || 'normal' : 'normal'
    selectedSkins = skinLookup.get(baseId(m.id)) ?? []
    modalOpen = true
  }

  function closeModal() {
    modalOpen = false
    selectedMutant = null
    selectedSkins = []
  }

  $effect(() => {
    window.addEventListener('archivist:open-mutant', onOpen)
    return () => window.removeEventListener('archivist:open-mutant', onOpen)
  })
</script>

{#if modalOpen && selectedMutant}
  <MutantModal open={modalOpen} mutant={selectedMutant} star={selectedStar} skins={selectedSkins} onclose={closeModal} />
{/if}
