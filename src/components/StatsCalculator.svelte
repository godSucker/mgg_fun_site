<script>
  // ДАННЫЕ
  import mutantsRaw from '@/data/mutants/normal.json';
  import orbsRaw from '@/data/materials/orbs.json';

  // --- УТИЛИТЫ И КОНСТАНТЫ ---
  const GENE_NAME = {
    A: 'Кибер',     // yellow
    B: 'Зверь',     // brown
    C: 'Галактик',  // blue
    D: 'Зомби',     // green
    E: 'Мифик',     // purple
    F: 'Рубака',    // red
  };
  const GENE_ICON = (g) => `/genes/icon_gene_${(g || '').toLowerCase()}.png`;

  const byNameAsc  = (a, b) => a.name.localeCompare(b.name, 'ru');
  const byNameDesc = (a, b) => b.name.localeCompare(a.name, 'ru');
  const byGene     = (a, b) => (a.geneKey||'').localeCompare(b.geneKey||'');

  // Нормализуем мутантов из normal.json
  function normalizeMutants(raw) {
    return raw.map((m) => {
      // предполагаем: m.genes — массив букв ['A','D'] или строка 'AD'
      const genes = Array.isArray(m.genes) ? m.genes : String(m.genes||'').split('');
      const geneKey = genes.join('');
      // изображение: массив путей, где 0 — normal, 1..4 — bronze..platinum
      const images = Array.isArray(m.image) ? m.image : [m.image].filter(Boolean);
      // звёздные множители, если есть (bronze/silver/gold/platinum)
      const starMul = m.stars || m.starMultipliers || {};
      return {
        id: m.id ?? m.slug ?? m.name,
        name: m.name,
        rarity: m.rarity || m.type || 'Default',
        genes,
        geneKey,
        images,
        hp1: Number(m.hp) || Number(m.lifePoint) || 0,
        atk1: numTag(m,'atk1') ?? 0,
        atk1p: numTag(m,'atk1p') ?? numTag(m,'atk1P') ?? numTag(m,'atk1_plus') ?? 0,
        atk2: numTag(m,'atk2') ?? 0,
        atk2p: numTag(m,'atk2p') ?? numTag(m,'atk2P') ?? numTag(m,'atk2_plus') ?? 0,
        speed: Number(m.speed) || Number(tag(m,'speed')) || 0,
        abilities: normalizeAbilities(m),
        starMultipliers: {
          0: 1.0,
          1: starMul.bronze ?? starMul['1'] ?? 1.0,
          2: starMul.silver ?? starMul['2'] ?? 1.0,
          3: starMul.gold ??   starMul['3'] ?? 1.0,
          4: starMul.platinum ?? starMul['4'] ?? 1.0,
        },
        // heroic: 4 базовых + 1 спец, иначе 3 + 1
        slots: (m.category || m.rarity || '').toLowerCase() === 'heroic' ? 4 : 3,
      };
    });
  }
  function tag(m, key) {
    // поддержка формата с m.tags: [{key,value}] или m[key]
    if (m.tags && Array.isArray(m.tags)) {
      const t = m.tags.find(t => t.key === key);
      return t?.value ?? null;
    }
    return m[key] ?? null;
  }
  function numTag(m, key) {
    const v = tag(m, key);
    const n = Number(String(v||'').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  function normalizeAbilities(m){
    // abilities могут храниться как строка "a;b" или массив
    const ab = m.abilities ?? tag(m,'abilities') ?? [];
    if (Array.isArray(ab)) return ab;
    if (typeof ab === 'string') return ab.split(/[;,]/).map(s=>s.trim()).filter(Boolean);
    return [];
  }

  // Списки сфер
  const ORBS = {
    basic: (orbsRaw.basic || []).map(o => ({...o, type:'basic', icon: `/orbs/basic/${o.id}.png`})),
    special: (orbsRaw.special || []).map(o => ({...o, type:'special', icon: `/orbs/special/${o.id}.png`}))
  };

  // Приводим мутантов
  const ALL_MUTANTS = normalizeMutants(mutantsRaw);

  // --- РЕАКТИВНОЕ СОСТОЯНИЕ UI ---
  let query = '';                      // строка поиска
  let geneFilter = new Set();          // активные фильтры генов (A..F)
  let sortMode = 'nameAsc';            // nameAsc | nameDesc | gene
  let selected = ALL_MUTANTS[0];       // текущий мутант
  let level = 30;                      // уровень из инпута
  let stars = 0;                       // 0..4
  // выбранные сферы: массив из N базовых и 1 спец
  let basicSlots = [];                 // длина = selected.slots
  let specialSlot = null;

  // контейнер дропдауна сфер (для клика вне)
  let dropdownHost = null;
  let openDropdown = null; // 'basic-i' | 'special' | null

  // --- РАСЧЕТЫ ---
  // фильтрация + сортировка + поиск
  $: filtered = ALL_MUTANTS
      .filter(m => {
        if (geneFilter.size) {
          // mutant имеет хотя бы один из выбранных генов
          if (!m.genes.some(g => geneFilter.has(g))) return false;
        }
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          if (!m.name.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort(sortMode==='nameAsc' ? byNameAsc
            : sortMode==='nameDesc' ? byNameDesc
            : byGene);

  // смена выбранного мутанта — сбрасываем слоты по его типу
  $: if (selected) {
    basicSlots = Array(selected.slots).fill(null);
    specialSlot = null;
  }

  function pickImage(m, stars){
    // если в m.images есть варианты по звёздам — берём по индексу
    // 0: normal, 1: bronze, 2: silver, 3: gold, 4: platinum
    return (m.images && m.images[stars] ? m.images[stars] : (m.images?.[0] || ''));
  }

  // Применение модификаторов сфер (проценты)
  function orbMods() {
    // собираем проценты в одну кучу
    const mods = { hp:0, atk1:0, atk2:0, ability:0 };
    const all = [...basicSlots.filter(Boolean), specialSlot].filter(Boolean);
    for (const o of all) {
      // ожидаем поля: o.hpPct, o.atkPct, o.abilityPct и т.п. (в orbs.json имена могут отличаться)
      const hp  = Number(o.hpPct ?? o.hp ?? 0);
      const atk = Number(o.atkPct ?? o.atk ?? 0);
      const ab  = Number(o.abilityPct ?? o.ability ?? 0);
      if (hp)  mods.hp  += hp;
      if (atk) { mods.atk1 += atk; mods.atk2 += atk; }
      if (ab)  mods.ability += ab;
    }
    return mods;
  }

  function starMulOf(m, s){
    return m?.starMultipliers?.[s] ?? 1.0;
  }

  function calcStats(m, lvl, s){
    const mulStar = starMulOf(m, s);
    const mulLvl = (Number(lvl)/10 + 0.9);

    // БАЗА
    let hp  = (m.hp1 || 0) * mulLvl;
    let a1b = (Number(lvl) < 10 ? m.atk1 : (m.atk1p || m.atk1));
    let a2b = (Number(lvl) < 15 ? m.atk2 : (m.atk2p || m.atk2));
    let atk1 = (a1b || 0) * mulLvl;
    let atk2 = (a2b || 0) * mulLvl;

    // ЗВЕЗДНОСТЬ
    hp   *= mulStar;
    atk1 *= mulStar;
    atk2 *= mulStar;

    // СФЕРЫ (проценты)
    const mods = orbMods();
    if (mods.hp)   hp   *= (1 + mods.hp/100);
    if (mods.atk1) atk1 *= (1 + mods.atk1/100);
    if (mods.atk2) atk2 *= (1 + mods.atk2/100);

    // ОКРУГЛЕНИЕ
    return {
      hp:   Math.round(hp),
      atk1: Math.round(atk1),
      atk2: Math.round(atk2),
      speed: m.speed || 0
    };
  }

  $: stats = selected ? calcStats(selected, level, stars) : {hp:0, atk1:0, atk2:0, speed:0};

  // --- ХЭНДЛЕРЫ UI ---
  function toggleGene(letter){
    if (geneFilter.has(letter)) geneFilter.delete(letter);
    else geneFilter.add(letter);
    // триггерим реактив
    geneFilter = new Set(geneFilter);
  }
  function selectMutant(m){
    selected = m;
  }
  function pickBasic(slotIndex, orb){
    basicSlots = basicSlots.map((v,i)=> i===slotIndex ? orb : v);
    openDropdown = null;
  }
  function pickSpecial(orb){
    specialSlot = orb;
    openDropdown = null;
  }
  function clearSlot(kind, i=null){
    if (kind==='basic') basicSlots = basicSlots.map((v,idx)=> idx===i ? null : v);
    else specialSlot = null;
  }

  // Закрытие открытых выпадашек по клику вне
  function windowClick(e){
    if (!openDropdown) return;
    if (!dropdownHost) return;
    if (!dropdownHost.contains(e.target)) openDropdown = null;
  }
</script>

<!-- глобальный клик — безопасно для SSR -->
<svelte:window on:click={windowClick} />

<div class="stats-page">
  <!-- ЛЕВАЯ КОЛОНКА: КАТАЛОГ -->
  <aside class="catalog">
    <div class="filters-row">
      <!-- фильтры по генам -->
      {#each ['A','B','C','D','E','F'] as g}
        <button
          class:active={geneFilter.has(g)}
          class="gene-chip"
          on:click={() => toggleGene(g)}
          title={GENE_NAME[g]}>
          <img src={GENE_ICON(g)} alt={g} />
        </button>
      {/each}

      <!-- сортировки -->
      <div class="sort-switch">
        <button class:active={sortMode==='nameAsc'}  on:click={() => sortMode='nameAsc'}>Имя [А–Я]</button>
        <button class:active={sortMode==='nameDesc'} on:click={() => sortMode='nameDesc'}>Имя [Я–А]</button>
        <button class:active={sortMode==='gene'}     on:click={() => sortMode='gene'}>Ген</button>
      </div>
    </div>

    <input
      class="search"
      type="text"
      placeholder="Введите имя мутанта"
      bind:value={query}
    />

    <div class="list">
      {#each filtered as m (m.id)}
        <button class="mut-row {selected?.id===m.id ? 'active' : ''}" on:click={() => selectMutant(m)}>
          <img class="mut-icon" src={"/textures_by_mutant/" + (m.images?.[0] || '')} alt={m.name} />
          <div class="mut-meta">
            <div class="name">{m.name}</div>
            <div class="genes">
              {#each m.genes as g}
                <img src={GENE_ICON(g)} alt={g} title={GENE_NAME[g]} />
              {/each}
            </div>
          </div>
          <div class="rar">{m.rarity}</div>
        </button>
      {/each}
    </div>
  </aside>

  <!-- ПРАВАЯ КОЛОНКА: КАРТОЧКА -->
  <section class="panel" >
    {#if selected}
      <header class="title">{selected.name}</header>

      <div class="mut-figure">
        <img class="texture" src={"/textures_by_mutant/" + pickImage(selected, stars)} alt={selected.name} />
      </div>

      <!-- слоты сфер — единственные интерактивные -->
      <div class="slots" bind:this={dropdownHost}>
        <!-- базовые -->
        {#each basicSlots as orb, i}
          <div class="slot">
            <button class="slot-btn" on:click={() => openDropdown = openDropdown === `basic-${i}` ? null : `basic-${i}`}>
              <img class="slot-bg" src="/orbs/basic/orb_slot.png" alt="slot" />
              {#if orb}<img class="orb" src={orb.icon} alt={orb.id} />{/if}
            </button>
            {#if orb}
              <button class="x" title="убрать" on:click={() => clearSlot('basic', i)}>×</button>
            {/if}
            {#if openDropdown === `basic-${i}`}
              <div class="dropdown">
                {#each ORBS.basic as o}
                  <button class="orb-row" on:click={() => pickBasic(i, o)}>
                    <img src={o.icon} alt={o.id} /> <span>{o.name || o.id}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}

        <!-- спец-слот -->
        <div class="slot">
          <button class="slot-btn" on:click={() => openDropdown = openDropdown === 'special' ? null : 'special'}>
            <img class="slot-bg" src="/orbs/special/orb_slot_spe.png" alt="special" />
            {#if specialSlot}<img class="orb" src={specialSlot.icon} alt={specialSlot.id} />{/if}
          </button>
          {#if specialSlot}
            <button class="x" title="убрать" on:click={() => clearSlot('special')}>×</button>
          {/if}
          {#if openDropdown === 'special'}
            <div class="dropdown">
              {#each ORBS.special as o}
                <button class="orb-row" on:click={() => pickSpecial(o)}>
                  <img src={o.icon} alt={o.id} /> <span>{o.name || o.id}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- уровень + звёзды -->
      <div class="controls">
        <div class="control">
          <label>Уровень:</label>
          <input class="lvl" type="number" min="1" max="300" bind:value={level} />
        </div>
        <div class="control">
          <label>Звёздность:</label>
          <div class="stars">
            {#each [0,1,2,3,4] as s}
              <button class={"star "+(stars>=s?'on':'')}
                on:click={() => stars = s}
                title={s===0?'Без звёзд': s===1?'Бронза': s===2?'Серебро': s===3?'Золото':'Платина'}>
                <img src={"/stars/"+(s===0?'star_none.png': s===1?'star_bronze.png': s===2?'star_silver.png': s===3?'star_gold.png':'star_platinum.png')} alt="*" />
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- СТАТЫ -->
      <div class="stats">
        <div class="row"><span>Редкость</span><b>{selected.rarity}</b></div>
        <div class="row"><span>HP</span><b>{stats.hp.toLocaleString('ru-RU')}</b></div>
        <div class="row"><span>Атака 1</span><b>{stats.atk1.toLocaleString('ru-RU')}</b></div>
        <div class="row"><span>Атака 2</span><b>{stats.atk2.toLocaleString('ru-RU')}</b></div>
        <div class="row"><span>Скорость</span><b>{stats.speed}</b></div>
        <div class="row abils">
          <span>Abilities</span>
          <div class="abilities">
            {#each selected.abilities as ab}
              <div class="ability">{ab}</div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .stats-page{ display:grid; grid-template-columns: 360px 1fr; gap:24px; }
  .catalog{ background:#212832; border-radius:12px; padding:16px; display:flex; flex-direction:column; }
  .filters-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
  .gene-chip{ width:28px; height:28px; padding:2px; border-radius:6px; background:#2b3442; border:1px solid #364456; }
  .gene-chip.active{ outline:2px solid #90f36b; }
  .gene-chip img{ width:100%; height:100%; object-fit:contain; }
  .sort-switch{ margin-left:auto; display:flex; gap:6px; }
  .sort-switch button{ background:#2b3442; border:1px solid #3a475a; border-radius:8px; padding:6px 10px; font-size:12px; }
  .sort-switch .active{ background:#7a56ff; border-color:#7a56ff; color:white; }
  .search{ width:100%; margin:8px 0 12px; padding:8px 10px; border-radius:8px; border:1px solid #3a475a; background:#1b212a; color:#dfe7f3; }
  .list{ overflow:auto; max-height:70vh; display:flex; flex-direction:column; gap:6px; }
  .mut-row{ display:flex; align-items:center; gap:10px; background:#1b212a; border:1px solid #2e3948; border-radius:10px; padding:8px; width:100%; }
  .mut-row.active{ border-color:#90f36b; }
  .mut-icon{ width:38px; height:38px; border-radius:6px; background:#0f1319; object-fit:cover; }
  .mut-meta{ flex:1; display:flex; flex-direction:column; }
  .mut-meta .name{ font-size:13px; color:#e9eef6; }
  .mut-meta .genes{ display:flex; gap:4px; }
  .mut-meta .genes img{ width:16px; height:16px; }
  .rar{ font-size:11px; color:#aab6c8; }

  .panel{ background:#2a313c; border-radius:12px; padding:18px; }
  .title{ font-size:22px; font-weight:700; color:#e9eef6; margin-bottom:12px; }
  .mut-figure{ display:flex; justify-content:center; margin-bottom:10px; }
  .mut-figure .texture{ width:280px; height:280px; object-fit:contain; image-rendering: auto; }

  .slots{ display:flex; gap:18px; justify-content:center; margin:10px 0 6px; position:relative; }
  .slot{ position:relative; }
  .slot-btn{ position:relative; width:64px; height:64px; border-radius:12px; background:transparent; border:none; padding:0; }
  .slot-bg{ width:100%; height:100%; object-fit:contain; }
  .orb{ position:absolute; inset:8px; width:auto; height:auto; object-fit:contain; }
  .x{ position:absolute; right:-6px; top:-6px; width:18px; height:18px; border-radius:50%; border:none; background:#ff6464; color:white; }
  .dropdown{ position:absolute; top:74px; left:0; width:240px; max-height:240px; overflow:auto; background:#1b212a; border:1px solid #3a475a; border-radius:10px; padding:6px; z-index:10; }
  .orb-row{ display:flex; align-items:center; gap:8px; width:100%; padding:6px; border-radius:8px; background:#242b36; margin:4px 0; }
  .orb-row img{ width:28px; height:28px; object-fit:contain; }

  .controls{ display:flex; gap:24px; justify-content:center; margin:10px 0 12px; }
  .control{ display:flex; align-items:center; gap:10px; color:#aab6c8; }
  .lvl{ width:90px; padding:6px 8px; border-radius:8px; border:1px solid #3a475a; background:#1b212a; color:#e9eef6; }

  .stars{ display:flex; gap:6px; }
  .star{ width:28px; height:28px; border-radius:50%; background:transparent; border:none; padding:0; opacity:.6; }
  .star.on{ opacity:1; }
  .star img{ width:100%; height:100%; object-fit:contain; }

  .stats{ margin-top:8px; display:flex; flex-direction:column; gap:8px; }
  .row{ display:flex; justify-content:space-between; align-items:center; background:#1b212a; border:1px solid #2e3948; border-radius:10px; padding:10px 12px; color:#dfe7f3; }
  .row span{ color:#aab6c8; }
  .abilities{ display:flex; gap:8px; flex-wrap:wrap; }
  .ability{ background:#2b3442; padding:4px 8px; border-radius:8px; font-size:12px; }
</style>
