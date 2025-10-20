<script lang="ts">
  /**
   * Showcases the possible children produced by breeding two parents. The `outcomes`
   * array should contain objects with a `mutants` array, where each entry is a
   * mutant object from your data set. The component does not link to any
   * separate pages. Instead, it simply displays the image and name of each
   * candidate child. If you need to hook into a modal or another page on click,
   * dispatch a custom event from the click handler.
   */
  export let outcomes: { geneCode: string; mutants: any[] }[] = [];

  import { createEventDispatcher } from 'svelte';

  // Event dispatcher to notify parent when a mutant card is clicked.
  const dispatch = createEventDispatcher();

  /**
   * Flatten the list of outcomes into a single array of children. Each outcome
   * contains a `mutants` array; we concatenate them all into one list for
   * display. Reactive assignment updates whenever outcomes changes.
   */
  $: children = outcomes.reduce((acc: any[], out) => acc.concat(out.mutants), []);

  /**
   * Helper to get a human-friendly name for a mutant. Uses the `name` field if
   * available; otherwise falls back to the `id`.
   */
  function getName(m: any): string {
    return (m.name ?? m.id).toString();
  }

  /**
   * Determine which image to use for a mutant. If the `image` field is an array
   * (as in normal.json), pick the first element; otherwise use the value directly.
   */
  function getImageSrc(m: any): string {
    const img = m.image;
    // The `image` field from normal.json is a relative path under `textures_by_mutant`. In
    // Astro/Vite, assets in `public` are served from the site root. So prefix with a
    // leading slash (e.g. `/textures_by_mutant/...`) rather than `/public/`.
    if (Array.isArray(img)) {
      // When available, use the second element as the icon (specimen) image. It
      // provides a more compact representation than the full card art (index 0).
      const selected = img[1] ?? img[0];
      return '/' + selected;
    }
    return '/' + img;
  }
</script>

{#if !children || children.length === 0}
  <p class="text-gray-400">Нет возможных детей для выбранных родителей.</p>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
    {#each children as child (child.id)}
      <div
        class="p-3 border border-gray-600 rounded bg-gray-700 hover:bg-gray-600 cursor-pointer flex flex-col items-center space-y-2"
        on:click={() => dispatch('openMutant', { mutant: child })}
      >
        <img
          src={getImageSrc(child)}
          alt={getName(child)}
          class="w-12 h-12 rounded object-cover"
        />
        <span class="text-center text-sm font-semibold">{getName(child)}</span>
      </div>
    {/each}
  </div>
{/if}