<script>
  export let items = []          // [{ id, name, tier?, type? }]
  export let variant = 'normal'  // normal | bronze | silver | gold | platinum
  import MutantCard from './MutantCard.svelte'
</script>

<div class="grid gap-4
            grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
  {#each items as m (m.id)}
    <MutantCard id={m.id} name={m.name} variant={variant} tier={m.tier ?? m.rank ?? null} type={m.type} />
  {/each}
</div>
