<script>
  import { onMount } from 'svelte';
  // Import the mutant data for each star tier. These JSON files are placed
  // at the repository root and contain additional fields (atk1_base, atk2_base,
  // atk1p_base, atk2p_base) used to calculate attacks on arbitrary levels.
  import normalData from '@/data/mutants/normal.json';
  import bronzeData from '@/data/mutants/bronze.json';
  import silverData from '@/data/mutants/silver.json';
  import goldData from '@/data/mutants/gold.json';
  import platinumData from '@/data/mutants/platinum.json';

  // Import all orbs. Each orb object has `id`, `name`, `percent` and
  // `description`. The `id` helps build the path to its image (e.g. `/orbs/${id}.png`).
  import allOrbs from '@/data/materials/orbs.json';

  // Group the datasets by star level for easy lookup (0=normal, 1=bronze, etc).
  const starDatasets = [normalData, bronzeData, silverData, goldData, platinumData];

  // Gene filter options and corresponding icons. `all` resets the filter.
  const geneFilters = [
    { key: 'all', icon: '/genes/gene_all.png', title: 'All Genes' },
    { key: 'A', icon: '/genes/icon_gene_a.png', title: 'Galactic' },
    { key: 'B', icon: '/genes/icon_gene_b.png', title: 'Zoomorph' },
    { key: 'C', icon: '/genes/icon_gene_c.png', title: 'Cyber' },
    { key: 'D', icon: '/genes/icon_gene_d.png', title: 'Saber' },
    { key: 'E', icon: '/genes/icon_gene_e.png', title: 'Necro' },
    { key: 'F', icon: '/genes/icon_gene_f.png', title: 'Mythic' },
  ];

  // Separate orbs into basic and special categories. We inspect the ID
  // to determine the category. Adjust these rules if naming changes.
  const basicOrbs = allOrbs.filter((o) => o.id.toLowerCase().includes('basic'));
  const specialOrbs = allOrbs.filter((o) => o.id.toLowerCase().includes('special'));

  // State variables for the UI.
  let selectedGene = 'all';
  let searchTerm = '';
  let selectedMutant = null;
  let starLevel = 0;
  let levelValue = 1;
  // Basic orb slots: heroics use four, others use three. All start empty (null).
  let basicSlots = [null, null, null, null];
  // Special orb slot starts empty.
  let specialSlot = null;
  // Track which orb menu is open (index of slot or 'special'), null if none.
  let openOrbMenu = null;

  /**
   * Compute the list of candidate mutants based on the current gene
   * filter and search term.  We search within the normal dataset so we
   * always show the same names independent of star level.  The filter
   * is case-insensitive and matches any gene among the mutant's genes.
   */
  $: candidateMutants = (() => {
    let list = normalData;
    if (selectedGene !== 'all') {
      const g = selectedGene.toUpperCase();
      list = list.filter((m) => Array.isArray(m.genes) && m.genes.some((v) => v.toUpperCase().includes(g)));
    }
    if (searchTerm.trim()) {
      const lc = searchTerm.trim().toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(lc));
    }
    // sort by name for convenience
    return list.sort((a, b) => a.name.localeCompare(b.name));
  })();

  /**
   * When the user selects a mutant, we reset orbs and set the
   * selection.  Star and level remain unchanged so you can quickly
   * compare different variants.
   */
      function selectMutant(mutant) {
    selectedMutant = mutant;
    // Reset orbs when changing mutant
    basicSlots = [null, null, null, null];
    specialSlot = null;
    openOrbMenu = null;
  }

  /**
   * Helper to get the dataset entry for the currently selected mutant
   * at the chosen star level.  Returns undefined if the mutant
   * doesn't exist in that dataset (which should never happen).
   */
  function getCurrentBase() {
    if (!selectedMutant) return undefined;
    const dataset = starDatasets[starLevel] || normalData;
    return dataset.find((m) => m.id === selectedMutant.id);
  }

  /**
   * Compute the final stats for the currently selected mutant.  This
   * uses the level slider and applies any orb bonuses.  The rules for
   * attacks follow the instructions: attack1 uses `atk1_base` until
   * level 10, then switches to `atk1p_base`.  Attack2 uses
   * `atk2_base` until level 15, then switches to `atk2p_base`.  Both
   * are scaled by (level/10 + 0.9).  HP always scales from the base
   * level1 value.  Speed is constant.  Orb percent bonuses are
   * applied afterwards: HP orbs modify HP, Attack orbs modify both
   * attacks, and Speed orbs increase the speed by the percent.
   */
  // Normalize an image path to ensure it is served from the site root.
  // Mutant image paths in the data are relative (e.g. `textures_by_mutant/a_01/A_01_normal.png`).
  // Prepending a leading slash ensures Astro serves them from the `/public` folder.
  function normalizeImage(path) {
    if (!path) return '';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function computeStats() {
    const baseEntry = getCurrentBase();
    if (!baseEntry) return null;
    const lvl = levelValue;
    // HP calculation
    let hp = baseEntry.base_stats.lvl1.hp * (lvl / 10 + 0.9);
        // Attack1 base selection. If custom base fields are missing (e.g. in legacy JSON), derive them from level 1/30 stats.
        const atk1BaseLvl1 = baseEntry.base_stats.atk1_base ?? baseEntry.base_stats.lvl1?.atk1 ?? 0;
        // atk1p_base corresponds to the boosted attack at level 10+, derived from level 30 stats when missing
        const atk1pBase = baseEntry.base_stats.atk1p_base ?? (baseEntry.base_stats?.lvl30?.atk1
          ? baseEntry.base_stats.lvl30.atk1 / 3.9
          : atk1BaseLvl1);
        const a1base = lvl < 10 ? atk1BaseLvl1 : atk1pBase;
        let atk1 = a1base * (lvl / 10 + 0.9);
        // Attack2 base selection. If custom base fields are missing (e.g. in legacy JSON), derive them from level 1/30 stats.
        const atk2BaseLvl1 = baseEntry.base_stats.atk2_base ?? baseEntry.base_stats.lvl1?.atk2 ?? 0;
        const atk2pBase = baseEntry.base_stats.atk2p_base ?? (baseEntry.base_stats?.lvl30?.atk2
          ? baseEntry.base_stats.lvl30.atk2 / 3.9
          : atk2BaseLvl1);
        const a2base = lvl < 15 ? atk2BaseLvl1 : atk2pBase;
        let atk2 = a2base * (lvl / 10 + 0.9);
    // Speed is constant
    let spd = baseEntry.base_stats.lvl1.spd;
    // Apply orb bonuses
    const applyOrb = (orb) => {
      if (!orb) return;
      const pct = parseFloat(orb.percent);
      const nameLower = orb.name.toLowerCase();
      // Attack orbs
      if (nameLower.includes('атака') || nameLower.includes('attack')) {
        atk1 *= 1 + pct / 100;
        atk2 *= 1 + pct / 100;
      } else if (nameLower.includes('hp') || nameLower.includes('здоров')) {
        hp *= 1 + pct / 100;
      } else if (nameLower.includes('speed') || nameLower.includes('скорость')) {
        spd += pct;
      }
    };
    // Apply basic orbs
    basicSlots.forEach(o => applyOrb(o));
    // Apply special orb
    applyOrb(specialSlot);
    return {
      hp: Math.round(hp),
      atk1: Math.round(atk1),
      atk2: Math.round(atk2),
      spd: spd,
      name: baseEntry.name,
      image: baseEntry.image,
      genes: baseEntry.genes,
      type: baseEntry.type,
      bingo: baseEntry.bingo,
      abilities: baseEntry.abilities,
      name_attack1: baseEntry.name_attack1,
      name_attack2: baseEntry.name_attack2,
      name_attack3: baseEntry.name_attack3
    };
  }

  $: currentStats = computeStats();

  // Determine how many basic slots to show based on mutant type.
  $: basicSlotCount = (() => {
    if (!selectedMutant) return 0;
    // HEROIC mutants get 4 basic slots, all others 3
    return selectedMutant.type && selectedMutant.type.toUpperCase() === 'HEROIC' ? 4 : 3;
  })();

  // Provide a human-readable label for the star level
  const starLabels = ['Normal', 'Bronze', 'Silver', 'Gold', 'Platinum'];

  // Provide a label for mutant type
  function typeLabel(type) {
    if (!type) return '';
    const t = type.toUpperCase();
    if (t === 'DEFAULT') return 'Common';
    if (t === 'LEGEND') return 'Legendary';
    if (t === 'HEROIC') return 'Heroic';
    if (t === 'ZODIAC') return 'Zodiac';
    if (t === 'SPECIAL' || t === 'EXCLUSIVE') return 'Special';
    if (t === 'SEASONAL') return 'Seasonal';
    if (t === 'VIDEOGAME') return 'Videogame';
    if (t === 'GACHA') return 'Gacha';
    if (t === 'COMMUNITY') return 'Community';
    if (t === 'PVP') return 'PvP';
    if (t === 'RECIPE') return 'Recipe';
    return type;
  }

  // Close open orb menus when clicking outside
  function handleDocumentClick(e) {
    const path = e.composedPath();
    const clickedInsideMenu = path.some((el) => el.classList && el.classList.contains('orb-menu'));
    const clickedSlotButton = path.some((el) => el.classList && el.classList.contains('orb-slot-button'));
    if (!clickedInsideMenu && !clickedSlotButton) {
      openOrbMenu = null;
    }
  }
  onMount(() => {
    window.addEventListener('click', handleDocumentClick);
    return () => window.removeEventListener('click', handleDocumentClick);
  });
</script>

<style>
  .scroll-container {
    max-height: 30rem;
    overflow-y: auto;
  }
  .orb-menu {
    z-index: 50;
  }
</style>

<!-- Main Stats Calculator Layout -->
<div class="space-y-6 p-4">
  <h2 class="text-2xl font-bold text-center text-white flex items-center justify-center space-x-2">
    <img src="/placeholder_light_gray_block.png" alt="logo" class="w-6 h-6" />
    <span>Stats Calculator</span>
  </h2>

  <!-- Gene filter and search bar -->
  <div class="bg-gray-800 rounded-lg p-4">
    <div class="flex items-center space-x-3 mb-4">
      {#each geneFilters as gf}
        <img
          src={gf.icon}
          alt={gf.title}
          title={gf.title}
          class="w-6 h-6 cursor-pointer rounded-full border-2 {selectedGene === gf.key ? 'border-green-500' : 'border-transparent'}"
          on:click={() => selectedGene = gf.key}
        />
      {/each}
    </div>
    <input
      type="text"
      placeholder="Start typing mutant name..."
      bind:value={searchTerm}
      class="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400"
    />
    <!-- Mutant selection grid -->
    {#if searchTerm.trim().length > 0 && candidateMutants.length > 0}
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mt-2 max-h-80 overflow-y-auto p-1">
        {#each candidateMutants.slice(0, 40) as m}
          <div
            class="cursor-pointer bg-gray-800 hover:bg-gray-700 p-2 rounded text-center"
            on:click={() => { selectMutant(m); searchTerm = m.name; }}
          >
            <img
              src={normalizeImage(m.image[1] || m.image[0])}
              alt={m.name}
              class="w-10 h-10 mx-auto mb-1"
            />
            <div class="text-xs text-white truncate">{m.name}</div>
            <div class="flex justify-center space-x-0.5 mt-1">
              {#each m.genes as g}
                <img
                  src={geneFilters.find(f => f.key === g?.[0]?.toUpperCase())?.icon || '/genes/gene_all.png'}
                  alt={g}
                  class="w-3 h-3"
                />
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Configuration panel -->
  {#if selectedMutant}
    <div class="space-y-4">
      <!-- Level and star sliders -->
      <div class="bg-gray-800 rounded-lg p-4">
        <div class="mb-4">
          <label class="block text-gray-300 text-sm mb-1">Mutant Level: {levelValue}</label>
          <input type="range" min="1" max="100" step="1" bind:value={levelValue} class="w-full" />
        </div>
        <div class="mb-4">
          <label class="block text-gray-300 text-sm mb-1">Star Level: {starLabels[starLevel]}</label>
          <input type="range" min="0" max="4" step="1" bind:value={starLevel} class="w-full" />
        </div>
      </div>
      <!-- Orb selection panel -->
      <div class="bg-gray-800 rounded-lg p-4">
        <label class="block text-gray-300 text-sm mb-2">Select Orbs</label>
        <div class="flex items-center space-x-4">
          {#each Array(basicSlotCount) as _, i}
            <div class="relative">
              <!-- Slot button -->
              <button
                class="orb-slot-button w-10 h-10 rounded-full overflow-hidden focus:outline-none"
                on:click={() => openOrbMenu = openOrbMenu === i ? null : i}
              >
                <img src="/orbs/orb_slot.png" alt="slot" class="w-full h-full" />
                {#if basicSlots[i]}
                  <img src={`/orbs/${basicSlots[i].id}.png`} alt={basicSlots[i].name} class="absolute inset-0 w-full h-full object-contain" />
                {/if}
              </button>
              {#if openOrbMenu === i}
                <div class="orb-menu absolute left-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg max-h-56 overflow-y-auto p-2 w-52">
                  {#each basicOrbs as orb}
                    <div
                      class="flex items-center p-1 hover:bg-gray-700 cursor-pointer text-sm text-white"
                      on:click={() => { basicSlots[i] = orb; openOrbMenu = null; }}
                    >
                      <img src={`/orbs/${orb.id}.png`} alt={orb.name} class="w-6 h-6 mr-2" />
                      <span>{orb.name}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
          <!-- Special orb slot -->
          <div class="relative">
            <button
              class="orb-slot-button w-10 h-10 rounded-full overflow-hidden focus:outline-none"
              on:click={() => openOrbMenu = openOrbMenu === 'special' ? null : 'special'}
            >
              <img src="/orbs/orb_slot_spe.png" alt="special slot" class="w-full h-full" />
              {#if specialSlot}
                <img src={`/orbs/${specialSlot.id}.png`} alt={specialSlot.name} class="absolute inset-0 w-full h-full object-contain" />
              {/if}
            </button>
            {#if openOrbMenu === 'special'}
              <div class="orb-menu absolute left-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg max-h-56 overflow-y-auto p-2 w-52">
                {#each specialOrbs as orb}
                  <div
                    class="flex items-center p-1 hover:bg-gray-700 cursor-pointer text-sm text-white"
                    on:click={() => { specialSlot = orb; openOrbMenu = null; }}
                  >
                    <img src={`/orbs/${orb.id}.png`} alt={orb.name} class="w-6 h-6 mr-2" />
                    <span>{orb.name}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Display the calculated stats -->
  {#if selectedMutant && currentStats}
    <div class="mx-auto max-w-xs bg-gray-800 rounded-lg p-4 text-white">
      <h3 class="text-xl font-bold mb-2 text-center">{currentStats.name}</h3>
          <div class="relative w-32 h-32 mx-auto mb-2">
            <img
              src={normalizeImage(selectedMutant.image[0])}
              alt={currentStats.name}
              class="w-full h-full object-cover rounded"
            />
        <!-- Genes overlay -->
        <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-1 mb-1">
          {#each currentStats.genes as g}
            <img src={geneFilters.find(f => f.key === g?.[0]?.toUpperCase())?.icon || '/genes/gene_all.png'} alt={g} class="w-5 h-5" />
          {/each}
        </div>
      </div>
      <!-- Orbs row underneath image -->
      <div class="flex justify-center space-x-2 mb-2">
        {#each Array(basicSlotCount) as _, i}
          <img src={basicSlots[i] ? `/orbs/${basicSlots[i].id}.png` : '/orbs/orb_slot.png'} alt="orb" class="w-6 h-6" />
        {/each}
        <img src={specialSlot ? `/orbs/${specialSlot.id}.png` : '/orbs/orb_slot_spe.png'} alt="special orb" class="w-6 h-6" />
      </div>
      <!-- Level and type -->
      <div class="text-center mb-2">
        <div class="text-sm">Level {levelValue}</div>
        <div class="text-xs bg-purple-700 px-2 py-0.5 rounded inline-block mt-1">{typeLabel(selectedMutant.type)}</div>
      </div>
      <!-- Stats list -->
      <ul class="space-y-1 text-sm">
        <li class="flex justify-between items-center">
          <span>HP</span>
          <span>{currentStats.hp.toLocaleString()}</span>
        </li>
        <li class="flex justify-between items-center">
          <span>{currentStats.name_attack1 || 'Attack 1'}</span>
          <span>{currentStats.atk1.toLocaleString()}</span>
        </li>
        <li class="flex justify-between items-center">
          <span>{currentStats.name_attack2 || 'Attack 2'}</span>
          <span>{currentStats.atk2.toLocaleString()}</span>
        </li>
        {#if currentStats.abilities && currentStats.abilities.length > 0}
          <li class="flex justify-between items-center">
            <span>{currentStats.abilities[0]?.name?.replace(/_/g, ' ') || currentStats.abilities[0]?.replace(/_/g, ' ') || 'Ability'}</span>
            <span></span>
          </li>
        {/if}
        <li class="flex justify-between items-center">
          <span>Speed</span>
          <span>{currentStats.spd}</span>
        </li>
        <li class="flex justify-between items-center">
          <span>Bingo</span>
          <span>{currentStats.bingo && currentStats.bingo.length > 0 ? currentStats.bingo[0] : '-'}</span>
        </li>
      </ul>
    </div>
  {/if}
</div>
