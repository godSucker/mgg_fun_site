<script lang="ts">
  import { onMount } from 'svelte';
  import ChildrenShowcase from '@/components/breeding/ChildrenShowcase.svelte';
  import { findMutantsByGenes } from '@/lib/breed-map';
  import { secretCombos } from '@/lib/secretCombos';
import mutantsData from '@/data/mutants/normal.json';

  /**
   * Maximum number of parent pairs to show in reverse search. Too many results can
   * clutter the UI and make it hard to scan. Adjust this value to taste.
   */
  // Limit reverse search results to a small number to keep the list compact.
  const MAX_REVERSE_RESULTS = 8;

  /*
   * This component provides an interactive UI for selecting two parent mutants
   * and viewing the resulting children. It also supports a reverse search
   * mode where you can pick a child mutant and see potential parent pairs.
   * A list of secret breeding recipes is included below the main interface.
   *
   * The design of this calculator has been reworked to more closely resemble
   * the layout on m3guide.github.io. The parent selection boxes sit next to
   * each other with a dividing line, the results are displayed in a table with
   * columns for icon, name, genes, category and incubation time, and the
   * header includes decorative controls like a level selector (which is
   * currently informational only). Secret recipes can be toggled open or
   * closed, and each secret child now shows a compact icon on its row.
   */

  /**
   * The full list of mutants available for parent selection. Unlike previous
   * versions of the breeding UI, the list is no longer restricted to
   * `type === 'default'`. Every mutant from the normal dataset can be chosen
   * as a potential parent. Downstream filters will decide which children are
   * actually displayed (e.g. only default types, certain legendary names).
   */
  const allMutants: any[] = mutantsData;

  /**
   * Extract a display name for a mutant. Falls back to the id if no name.
   */
  function getName(m: any): string {
    return (m.name ?? m.id).toString();
  }

  /**
   * Determine which image to display for a mutant. Prefer the second entry in
   * the `image` array (specimen icon) when available; otherwise use the first.
   * Returned paths are relative to the site root (e.g. `/textures_by_mutant/...`).
   */
  function getImageSrc(m: any): string {
    const img = m.image;
    if (Array.isArray(img)) {
      const selected = img[1] ?? img[0];
      return '/' + selected;
    }
    return '/' + img;
  }

  /**
   * Compute the path to a gene icon. Each gene letter maps to an image file in
   * the `/genes` directory: e.g. `icon_gene_a.webp` for gene A. If the gene
   * letter isn't one of A-F, fall back to a generic `gene_all.webp` which
   * represents a universal gene. The returned path is relative to the site
   * root (e.g. `/genes/icon_gene_a.webp`).
   */
  function getGeneIconSrc(ch: string): string {
    const letter = ch.toLowerCase();
    const valid = ['a', 'b', 'c', 'd', 'e', 'f'];
    if (valid.includes(letter)) {
      return `/genes/icon_gene_${letter}.webp`;
    }
    // If the gene is unknown or empty, use the generic icon.
    return `/genes/gene_all.webp`;
  }

  /**
   * Compute the path to a bingo/icon for a mutant type. Assets live in
   * `/public/mut_icons/` and are named `icon_{type}.webp`. Ordinary
   * (default) mutants all share `icon_morphology.webp`. A missing or
   * unknown type results in the morphology icon as a sensible default.
   */
  function getBingoIconSrc(type: string | undefined): string {
    const t = (type ?? '').toLowerCase();
    // Default/empty types fall back to morphology icon
    if (!t || t === 'default') {
      return '/mut_icons/icon_morphology.webp';
    }
    return `/mut_icons/icon_${t}.webp`;
  }

  /**
   * Compute the path to a type icon based on the mutant's `type` property.
   * This mirrors the logic used in getBingoIconSrc: default types map to
   * `icon_morphology.webp`; other types lowercased map to `icon_{type}.webp`.
   */
  function getTypeIcon(m: any): string {
    const type = (m.type ?? '').toLowerCase();
    // legend uses a custom filename 'icon_legendary.webp'
    if (type === 'legend') return '/mut_icons/icon_legendary.webp';
    // community has no dedicated icon
    if (type === 'community') return '';
    // default and empty types map to morphology
    if (!type || type === 'default') return '/mut_icons/icon_morphology.webp';
    return `/mut_icons/icon_${type}.webp`;
  }

  /**
   * List of legendary mutant names that should be included in breeding results
   * even if their `type` is not `default`. These names correspond to the
   * "legendary" mutants shown in the design mockup provided by the user.
   */
  const alwaysBreedableLegends: string[] = [
    'H.U.M.A.N.',
    'Дезингер',
    'Механорог',
    'Инвадрон',
    'Проклятый гончник',
    'Тачдаун',
    'Жуткий мишка',
    'Рагнар',
    'Бак Морис',
    'Страж Галактики',
    'Тор',
    'Кобракай',
    'Космо-Конг',
    'Абсолем',
    'Долгорог',
    'Звёздный Десантник',
    'Вампаа',
    'Мастер Йоуда',
    'Анубис',
    'Вороний Глаз',
    // Добавлены легендарные имена, которые пользователь перечислил как выводимые
    'Киберслизень',
    'Коммодор Акула',
    'Мантидроид',
    'Перехватчица',
    'Пожиратель',
    'Темновзор',
    'Гор',
    'Капитан Костьмилягу',
    'Капитан Гаечный Ключ'
  ];

  /**
   * Compute all possible child gene codes given the gene strings of two parents.
   * See documentation in ChildrenShowcase for details.
   */
  function getChildGeneCodes(aGenes: string[], bGenes: string[]): string[] {
    const codes = new Set<string>();
    for (const geneA of aGenes) {
      for (const geneB of bGenes) {
        const lettersA = geneA.split('');
        const lettersB = geneB.split('');
        for (const charA of lettersA) {
          for (const charB of lettersB) {
            const pair = [charA, charB].sort().join('');
            codes.add(pair);
          }
        }
        // If both genes consist of the same single letter (e.g. "A" or "AA"),
        // then a monogenic child (single letter) is also possible. This reflects
        // the idea that crossing AA+AA or A+A can produce an A child (e.g. robot A).
        const setA = new Set(lettersA);
        const setB = new Set(lettersB);
        if (setA.size === 1 && setB.size === 1) {
          const [letterA] = Array.from(setA);
          const [letterB] = Array.from(setB);
          if (letterA === letterB) {
            codes.add(letterA);
          }
        }
      }
    }
    return Array.from(codes);
  }

  /**
   * Lookup child mutants by gene code and restrict to breedable (type === 'default').
   */
  function lookupChildren(
    code: string,
    selectedA?: any,
    selectedB?: any
  ) {
    const candidates: any[] = findMutantsByGenes(code);
    return candidates.filter((m: any) => {
      const type = (m.type ?? '').toLowerCase();
      const name = getName(m);
      // Exclude completely unbreedable types (including secret recipe types)
      const excluded = ['seasonal', 'special', 'exclusive', 'zodiac', 'videogame', 'gacha', 'recipe'];
      if (excluded.includes(type)) return false;
      // Default types and explicitly named legends are always breedable
      if (type === 'default' || alwaysBreedableLegends.includes(name)) return true;
      // All other types require the mutant itself to be one of the parents
      if (selectedA && selectedA.id === m.id) return true;
      if (selectedB && selectedB.id === m.id) return true;
      return false;
    });
  }

  /**
   * Mapping of gene letters to tailwind background color classes. These
   * approximate the colored gene icons seen in the m3guide reference. If a
   * gene character isn't found in this map, a neutral gray will be used.
   */
  const geneColors: Record<string, string> = {
    a: 'bg-yellow-500',
    b: 'bg-red-500',
    c: 'bg-purple-600',
    d: 'bg-blue-500',
    e: 'bg-green-500',
    f: 'bg-pink-500',
  };

  /**
   * Convert an incubation time value from the dataset into a human-readable
   * string. Times less than 10 are treated as minutes; times up to 24 as
   * hours; larger values are converted to days. Units use Russian letters to
   * match the screenshot (м — minutes, ч — hours, д — days).
   */
 function formatIncubationTime(input: any): string {
  const m = Math.round(Number(input));
  if (!isFinite(m) || m <= 0) return '';
  if (m <= 60) return `${m}м`;
  const h = Math.round(m / 60);
  return `${h}ч`;
}

  /**
   * Derive a user-friendly category label and associated color class from a
   * mutant's type. Categories loosely follow the naming conventions found in
   * m3guide. Unknown types fall back to a neutral gray.
   */
  function getCategory(m: any): { label: string; color: string } {
    const type = (m.type ?? '').toLowerCase();
    switch (type) {
      case 'default':
        return { label: 'Обычный', color: 'bg-gray-400' };
      case 'legend':
        return { label: 'Легенда', color: 'bg-yellow-600' };
      case 'special':
        return { label: 'Особый', color: 'bg-teal-600' };
      case 'heroic':
        return { label: 'Герой', color: 'bg-red-600' };
      case 'seasonal':
        return { label: 'Сезон', color: 'bg-blue-600' };
      case 'pvp':
        return { label: 'PVP', color: 'bg-purple-600' };
      default:
        return { label: m.type ?? '—', color: 'bg-gray-600' };
    }
  }

  /**
   * Flattened list of child mutants derived from selected parents. When in
   * calculation mode and both parents are chosen, we compute all gene codes
   * produced by the parents, look up matching children, and collect unique
   * mutants into `childResults`. Otherwise the array is empty. This array
   * drives the results table in the markup.
   */
  let childResults: any[] = [];
  $: if (mode === 'calc' && selectedA && selectedB) {
    const codes = getChildGeneCodes(selectedA.genes, selectedB.genes);
    const map = new Map<string, any>();
    codes.forEach((code) => {
      const list = lookupChildren(code, selectedA, selectedB);
      list.forEach((m) => {
        if (!map.has(m.id)) map.set(m.id, m);
      });
    });
    childResults = Array.from(map.values());
  } else {
    childResults = [];
  }

  /**
   * Derived breeding time estimate. When both parents are selected and there
   * are children, choose the minimum incubation time among children for display.
   */
  let breedingTime: string = '';
  $: if (selectedA && selectedB && childResults.length > 0) {
    const times = childResults
      .map((m) => Number(m.incub_time))
      .filter((n) => isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    if (times.length > 0) {
      breedingTime = formatIncubationTime(times[0]);
    } else {
      breedingTime = '';
    }
  } else {
    breedingTime = '';
  }

  // ---------------------------------------------------------------------------
  // UI state variables
  // ---------------------------------------------------------------------------

  /**
   * The calculator has two modes: 'calc' for forward breeding (parent → child)
   * and 'reverse' for breeding guide (child → parent combos). Switching
   * modes will reset selections and search state accordingly.
   */
  let mode: 'calc' | 'reverse' = 'calc';

  /** Selected parent mutants for calculation mode. When both parents are
   * assigned, results are computed automatically. */
  let selectedA: any = null;
  let selectedB: any = null;

  /** Selected target mutant for reverse mode (breeding guide). */
  let selectedTarget: any = null;

  /** Breeding center level selector (1-3). Currently decorative but stored
   * in state so it can be bound to the dropdown control. */
  let breedingLevel: string = '3';

  /** Search and filter state for the side panel. `searchParents` holds the
   * current search term typed into the search box. `geneFilter` holds
   * the currently selected gene letter filter ('all' means no filter). */
  let searchParents: string = '';
  let geneFilter: string = 'all';

  // The parent list is always sorted alphabetically by name.  A previous
  // implementation exposed buttons to toggle sorting by gene or name, but
  // these controls have been removed at the user's request.  We keep
  // sorting by name only for a more intuitive default ordering.

  /** Compute the list of mutants shown in the side panel. The list includes
   * every mutant from the dataset (allMutants) filtered by the gene letter
   * and name search. Gene filter checks if any gene string of the mutant
   * contains the selected letter. Search is case-insensitive. */
  $: filteredParents = allMutants
    .filter((m) => {
      const matchesGene =
        geneFilter === 'all' ||
        (Array.isArray(m.genes) && m.genes.some((g: string) => g.includes(geneFilter)));
      const matchesName = getName(m).toLowerCase().includes(searchParents.toLowerCase());
      return matchesGene && matchesName;
    })
    // Sort alphabetically by display name.  The previous option to sort by gene
    // has been removed to streamline the interface.
    .sort((a, b) => getName(a).localeCompare(getName(b), 'ru', { sensitivity: 'base' }));

  /** Handle clicking a mutant in the side panel. Behavior depends on the
   * current mode: in 'calc' mode, the first click fills A, the second
   * fills B, and subsequent clicks toggle selection; in 'reverse' mode,
   * the click selects the target child. */
  function handlePanelClick(m: any) {
    if (mode === 'calc') {
      // If no parents selected, assign to A.
      if (!selectedA) {
        selectedA = m;
        return;
      }
      // If only A selected and clicked again on same mutant, clear A.
      if (selectedA && !selectedB && selectedA.id === m.id) {
        selectedA = null;
        return;
      }
      // If only A selected and different mutant clicked, assign to B.
      if (selectedA && !selectedB) {
        selectedB = m;
        return;
      }
      // If both selected and clicked on one of them, toggle that one off.
      if (selectedA && selectedB) {
        if (selectedA.id === m.id) {
          selectedA = null;
          return;
        }
        if (selectedB.id === m.id) {
          selectedB = null;
          return;
        }
        // If clicked on a third mutant, reset A with it and clear B.
        selectedA = m;
        selectedB = null;
      }
    } else {
      // reverse mode: set target child
      if (selectedTarget && selectedTarget.id === m.id) {
        selectedTarget = null;
      } else {
        selectedTarget = m;
      }
    }
  }

  /** Clear a selected parent by slot (A or B). */
  function clearParent(which: 'A' | 'B') {
    if (which === 'A') selectedA = null;
    else selectedB = null;
  }

  /** Clear the selected target child. */
  function clearTarget() {
    selectedTarget = null;
  }

  /** Compute child outcomes when both parents are selected in calc mode. */
  let childOutcomes: any[] = [];
  $: if (mode === 'calc' && selectedA && selectedB) {
    const codes = getChildGeneCodes(selectedA.genes, selectedB.genes);
    childOutcomes = codes.map((code) => ({ geneCode: code, mutants: lookupChildren(code, selectedA, selectedB) }));
  } else {
    childOutcomes = [];
  }

  /** Compute reverse search parent pairs when a target is selected in reverse mode. */
  let reversePairs: { a: any; b: any }[] = [];
  $: if (mode === 'reverse' && selectedTarget) {
    const targetCode = Array.isArray(selectedTarget.genes) ? selectedTarget.genes[0] : selectedTarget.genes;
    const pairs: { a: any; b: any }[] = [];
    for (let i = 0; i < allMutants.length; i++) {
      for (let j = i; j < allMutants.length; j++) {
        const a = allMutants[i];
        const b = allMutants[j];
        const codes = getChildGeneCodes(a.genes, b.genes);
        if (codes.includes(targetCode)) {
          // Use lookupChildren with specific parents to enforce rules on exotic types
          const allowed = lookupChildren(targetCode, a, b);
          // Only keep pairs that actually yield the selected target mutant
          if (allowed.some((m: any) => m.id === selectedTarget.id)) {
            pairs.push({ a, b });
          }
        }
      }
    }
    reversePairs = pairs.slice(0, MAX_REVERSE_RESULTS);
  } else {
    reversePairs = [];
  }

  /** Group secret combos by child name for compact display. */
  $: groupedSecrets = (() => {
    const map = new Map<string, string[]>();
    for (const entry of secretCombos) {
      const key = entry.childName;
      const pairText = `${entry.parents[0]} + ${entry.parents[1]}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(pairText);
    }
    // Build an array of grouped secrets with associated child mutant for image display.
    return Array.from(map.entries()).map(([childName, combos]) => {
      // Try to find the child mutant in the normal dataset for an icon.
      const child = allMutants.find((m) => getName(m) === childName);
      return { childName, combos, child };
    });
  })();

  // Control whether secret combos are expanded or collapsed. Collapsed by default to save space.
  let showSecrets: boolean = false;

  /**
   * When a child card is clicked in the ChildrenShowcase component, re-dispatch a
   * global event so that other parts of the application (e.g. a mutant modal)
   * can listen for and display the selected mutant. The event detail will
   * contain the mutant object under `detail.mutant`.
   */
  function handleOpenMutant(event: CustomEvent<{ mutant: any }>) {
    const { mutant } = event.detail;
    // Re-dispatch a CustomEvent on the window so global listeners can catch it.
    window.dispatchEvent(new CustomEvent('openMutant', { detail: { mutant } }));
  }
</script>

<div class="flex flex-col xl:flex-row w-full gap-6 xl:gap-10">
  <!-- Main panel: title, selectors and results -->
  <div class="flex-1 w-full xl:pr-4">
    <!-- Header -->
    <div class="flex flex-col items-start space-y-2 mb-4">
      <h1 class="text-lime-400 text-2xl font-bold">Breeding Calculator</h1>
      <!-- Toggle between calculation and reverse search -->
      <div class="inline-flex overflow-hidden rounded border border-gray-600 divide-x divide-gray-600 text-sm">
        <button
          class="px-4 py-2 focus:outline-none"
          class:bg-lime-600={mode === 'calc'}
          class:text-gray-900={mode === 'calc'}
          class:bg-gray-700={mode !== 'calc'}
          class:text-gray-300={mode !== 'calc'}
          on:click={() => {
            mode = 'calc';
            selectedTarget = null;
            searchParents = '';
            geneFilter = 'all';
          }}
        >
          Скрещивание
        </button>
        <button
          class="px-4 py-2 focus:outline-none"
          class:bg-lime-600={mode === 'reverse'}
          class:text-gray-900={mode === 'reverse'}
          class:bg-gray-700={mode !== 'reverse'}
          class:text-gray-300={mode !== 'reverse'}
          on:click={() => {
            mode = 'reverse';
            selectedA = null;
            selectedB = null;
            searchParents = '';
            geneFilter = 'all';
          }}
        >
          Гид по скрещиванию
        </button>
      </div>
      <!-- Breeding center level selector -->
      <div class="flex items-center space-x-2 text-xs">
        <span class="text-gray-400">Уровень Центра Выведения:</span>
        <select bind:value={breedingLevel} class="bg-gray-700 text-gray-200 border border-gray-600 rounded px-2 py-1">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </div>
    </div>

    {#if mode === 'calc'}
      <!-- Parent selection area (two slots) -->
      <div class="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-center mb-6">
        <!-- Parent A card -->
        <div class="w-full sm:flex-1 sm:max-w-xs border border-gray-600 rounded-xl bg-gray-800 p-4 flex flex-col items-center relative">
          {#if selectedA}
            <button
              class="absolute top-2 right-2 text-gray-400 hover:text-white"
              on:click|stopPropagation={() => clearParent('A')}
            >
              ×
            </button>
            <img src={getImageSrc(selectedA)} alt={getName(selectedA)} class="w-28 h-28 rounded object-cover mb-2" />
            <span class="text-sm font-semibold text-center mb-1">{getName(selectedA)}</span>
            <div class="flex justify-center space-x-1">
              {#each ((Array.isArray(selectedA.genes) ? selectedA.genes[0] : selectedA.genes) || '').split('') as ch}
                <img src={getGeneIconSrc(ch)} alt={ch} class="w-6 h-6" />
              {/each}
            </div>
          {:else}
            <div class="flex flex-col items-center justify-center space-y-1 h-40 text-gray-500">
              Выбрать первого родителя
            </div>
          {/if}
        </div>
        <div class="flex items-center justify-center text-lime-400 text-3xl sm:text-4xl font-bold select-none">
          +
        </div>
        <!-- Parent B card -->
        <div class="w-full sm:flex-1 sm:max-w-xs border border-gray-600 rounded-xl bg-gray-800 p-4 flex flex-col items-center relative">
          {#if selectedB}
            <button
              class="absolute top-2 right-2 text-gray-400 hover:text-white"
              on:click|stopPropagation={() => clearParent('B')}
            >
              ×
            </button>
            <img src={getImageSrc(selectedB)} alt={getName(selectedB)} class="w-28 h-28 rounded object-cover mb-2" />
            <span class="text-sm font-semibold text-center mb-1">{getName(selectedB)}</span>
            <div class="flex justify-center space-x-1">
              {#each ((Array.isArray(selectedB.genes) ? selectedB.genes[0] : selectedB.genes) || '').split('') as ch}
                <img src={getGeneIconSrc(ch)} alt={ch} class="w-6 h-6" />
              {/each}
            </div>
          {:else}
            <div class="flex flex-col items-center justify-center space-y-1 h-40 text-gray-500">
              Выбрать второго родителя
            </div>
          {/if}
        </div>
      </div>
      <!-- Results table for children -->
      {#if selectedA && selectedB}
        <div class="mb-8">
          {#if childResults.length > 0}
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-gray-800 border border-gray-700 rounded-t-lg px-4 py-2 text-sm text-gray-300">
              <div>
                Время выведения: <span class="text-lime-400 font-semibold">{breedingTime}</span>
              </div>
              <div>
                Возможных детей: <span class="text-lime-400 font-semibold">{childResults.length}</span>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm border border-gray-700 rounded-b-lg overflow-hidden">
                <thead class="bg-gray-700 text-gray-200">
                  <tr>
                    <th class="px-3 py-2 text-left">Иконка</th>
                    <th class="px-3 py-2 text-left">Имя</th>
                    <th class="px-3 py-2 text-left">Гены</th>
                    <th class="px-3 py-2 text-left">Бинго</th>
                    <th class="px-3 py-2 text-left">Тип</th>
                    <th class="px-3 py-2 text-left">Категория</th>
                    <th class="px-3 py-2 text-left">Инкубация</th>
                  </tr>
                </thead>
                <tbody class="bg-gray-800 divide-y divide-gray-700">
                  {#each childResults as child (child.id)}
                    <tr class="hover:bg-gray-700 cursor-pointer" on:click={() => handleOpenMutant({ detail: { mutant: child }})}>
                      <td class="px-3 py-1">
                        <img src={getImageSrc(child)} alt={getName(child)} class="w-8 h-8 rounded object-cover" />
                      </td>
                      <td class="px-3 py-1 whitespace-nowrap">{getName(child)}</td>
                      <td class="px-3 py-1">
                        <div class="flex space-x-1">
                          {#each ((Array.isArray(child.genes) ? child.genes[0] : child.genes) || '').split('') as ch}
                            <img src={getGeneIconSrc(ch)} alt={ch} class="w-6 h-6" />
                          {/each}
                        </div>
                      </td>
                      <td class="px-3 py-1">
                        {#if Array.isArray(child.bingo) && child.bingo.length > 0}
                          <!-- Use the morphology icon for all bingo groups for simplicity -->
                          <img src="/mut_icons/icon_morphology.webp" alt="bingo" class="w-6 h-6" />
                        {:else}
                          —
                        {/if}
                      </td>
                      <td class="px-3 py-1">
                        <img src={getTypeIcon(child)} alt={child.type} class="w-6 h-6" />
                      </td>
                      <td class="px-3 py-1">
                        <span class={`inline-block px-2 py-1 rounded-full text-xs font-semibold text-gray-900 ${getCategory(child).color}`}>{getCategory(child).label}</span>
                      </td>
                      <td class="px-3 py-1 whitespace-nowrap">{formatIncubationTime(child.incub_time)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-400">
              Нет возможных детей для выбранных родителей.
            </div>
          {/if}
        </div>
      {/if}
    {:else}
      <!-- Reverse search mode -->
      <div class="mb-8">
        <label class="block font-bold mb-2">Выберите целевого мутанта</label>
        {#if selectedTarget}
          <div
            class="border border-gray-600 rounded-lg bg-gray-800 p-4 flex items-center space-x-3 relative cursor-pointer"
            on:click={() => { clearTarget(); }}
          >
            <img src={getImageSrc(selectedTarget)} alt={getName(selectedTarget)} class="w-16 h-16 rounded object-cover" />
            <span class="text-sm font-semibold">{getName(selectedTarget)}</span>
            <button class="absolute top-2 right-2 text-gray-400 hover:text-white">
              ×
            </button>
          </div>
        {:else}
          <div class="border border-gray-600 rounded-lg bg-gray-800 p-4 text-gray-400">
            Выберите ребёнка из списка справа
          </div>
        {/if}
        {#if selectedTarget && reversePairs.length > 0}
          <div class="mt-6">
            <h3 class="text-lg font-semibold mb-2">Возможные пары родителей</h3>
            <ul class="space-y-2">
              {#each reversePairs as pair (pair.a.id + '-' + pair.b.id)}
                <li class="flex items-center space-x-4 p-2 border border-gray-600 rounded bg-gray-800">
                  <div class="flex items-center space-x-2 flex-1">
                    <img src={getImageSrc(pair.a)} alt={getName(pair.a)} class="w-8 h-8 rounded object-cover" />
                    <span class="text-sm">{getName(pair.a)}</span>
                  </div>
                  <span class="text-gray-400">+</span>
                  <div class="flex items-center space-x-2 flex-1">
                    <img src={getImageSrc(pair.b)} alt={getName(pair.b)} class="w-8 h-8 rounded object-cover" />
                    <span class="text-sm">{getName(pair.b)}</span>
                  </div>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if selectedTarget && reversePairs.length === 0}
          <p class="text-gray-400 mt-4">Нет найденных пар родителей для выбранного ребёнка.</p>
        {/if}
      </div>
    {/if}
    <!-- Secret combos grouped list -->
    <div class="my-6">
      <button
        class="flex items-center justify-between w-full text-left p-3 border border-gray-600 rounded bg-gray-800 hover:bg-gray-700 focus:outline-none"
        on:click={() => { showSecrets = !showSecrets; }}
      >
        <span class="font-semibold text-lg">Секретные рецепты</span>
        <span class="text-sm text-gray-400">{showSecrets ? 'Свернуть ▲' : 'Развернуть ▼'}</span>
      </button>
      {#if showSecrets}
        <ul class="space-y-2 mt-3">
          {#each groupedSecrets as item (item.childName)}
            <li class="p-3 border border-gray-600 rounded bg-gray-800">
              <div class="flex items-center space-x-3 mb-1">
                {#if item.child}
                  <img src={getImageSrc(item.child)} alt={item.childName} class="w-8 h-8 rounded object-cover" />
                {/if}
                <span class="font-semibold">{item.childName}</span>
              </div>
              <div class="text-sm text-gray-400">
                {#each item.combos as combo, idx}
                  <span>{combo}{idx < item.combos.length - 1 ? ' или ' : ''}</span>
                {/each}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
  <!-- Side panel: filter and parent selection -->
  <!-- The width of the side panel has been increased to show more mutants at once -->
  <div class="w-full xl:w-[26rem] xl:flex-shrink-0 xl:border-l xl:pl-4 border-gray-700 mt-8 xl:mt-0">
    <!-- Gene filter row -->
    <div class="flex flex-wrap justify-center gap-2 mb-3">
      {#each ['all', 'A', 'B', 'C', 'D', 'E', 'F'] as gene (gene)}
        <button
          class="p-1 rounded border border-gray-600 flex items-center justify-center"
          class:bg-lime-600={geneFilter === gene}
          on:click={() => { geneFilter = gene; }}
        >
          {#if gene === 'all'}
            <img src="/genes/gene_all.webp" alt="all" class="w-5 h-5" />
          {:else}
            <img src={getGeneIconSrc(gene)} alt={gene} class="w-5 h-5" />
          {/if}
        </button>
      {/each}
    </div>

    <!-- Search bar -->
    <input
      type="text"
      bind:value={searchParents}
      placeholder="Поиск по имени..."
      class="w-full px-3 py-2 mb-1 rounded bg-gray-700 border border-gray-600 text-gray-200"
    />
    <!-- List of parent mutants -->
    <!-- Increase the maximum height of the scroll area to reveal more items at once -->
    <div class="max-h-[60vh] md:max-h-[700px] overflow-y-auto pr-1">
      <!-- Increase to four columns to display more mutants simultaneously -->
      <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
        {#each filteredParents as m (m.id)}
          <div
            class="relative border border-gray-600 rounded cursor-pointer overflow-hidden bg-gray-800 hover:border-lime-500"
            on:click={() => handlePanelClick(m)}
          >
            <img src={getImageSrc(m)} alt={getName(m)} class="w-full h-16 object-cover" />
            <div class="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 text-xs text-center truncate px-1 py-0.5">
              {getName(m)}
            </div>
            <img src={getTypeIcon(m)} alt={m.type} class="absolute top-1 right-1 w-4 h-4" />
          </div>
        {/each}
        {#if filteredParents.length === 0}
          <div class="text-gray-400 col-span-2">Совпадений не найдено</div>
        {/if}
      </div>
    </div>
  </div>

</div>
