<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import MutantCard from './MutantCard.svelte';

  // Список объектов для отображения
  export let items: any[] = [];
  // Текущая выбранная звёздная редкость (normal | bronze | silver | gold | platinum)
  export let variant: string = 'normal';

  const dispatch = createEventDispatcher<{ select: any }>();

  /**
   * Обработка клика по карточке. Отправляем событие select с объектом мутанта.
   */
  function selectMutant(m: any) {
    dispatch('select', m);
  }
</script>

<div class="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
  {#each items as m (m.id)}
    <div
      role="button"
      tabindex="0"
      class="cursor-pointer"
      on:click={() => selectMutant(m)}
      on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectMutant(m); } }}
    >
      <MutantCard
        id={m.id}
        name={m.name}
        variant={variant}
        tier={m.tier ?? m.rank ?? null}
        type={m.type}
      />
    </div>
  {/each}
</div>