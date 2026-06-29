<script lang="ts">
  import MutantCard from './MutantCard.svelte'

  let { items = [], variant = 'normal', onSelect }: { items: any[]; variant?: string; onSelect?: (m: any) => void } = $props()

  function selectMutant(m: any) {
    onSelect?.(m)
  }
</script>

<div class="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
  {#each items as m (m.id)}
    <div
      role="button"
      tabindex="0"
      class="cursor-pointer"
      onclick={() => selectMutant(m)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectMutant(m); } }}
    >
      <MutantCard
        id={m.id}
        name={m.name}
        {variant}
        tier={m.tier ?? m.rank ?? null}
        type={m.type}
      />
    </div>
  {/each}
</div>
