<script>
  import MutantCard from './MutantCard.svelte';
  import MutantModal from './MutantModal.svelte';
  import { onMount, onDestroy } from 'svelte';

  export let rows = [];
  export let initialTier = 'all'; // 'all' | 'normal' | 'bronze' | 'silver' | 'gold' | 'platinum'

  const IS_BROWSER = typeof window !== 'undefined';

  // Коллатор для сортировки по имени/алфавитных списков (SSR-safe)
  const coll = (globalThis.Intl && Intl.Collator)
    ? new Intl.Collator('ru', { sensitivity: 'base', numeric: true })
    : { compare: (a, b) => String(a ?? '').localeCompare(String(b ?? '')) };

  // === Словарь генов ===
  const GENE_LABELS = { A:'Киборг', B:'Нежить', C:'Рубака', D:'Зверь', E:'Галактик', F:'Мифик' };
  const GENE_ORDER  = { A:0, B:1, C:2, D:3, E:4, F:5 };
  const REVERSE_GENE = Object.fromEntries(Object.entries(GENE_LABELS).map(([k,v])=>[v.toLowerCase(), k]));

  const geneLabel = (g) => GENE_LABELS[String(g).toUpperCase()] ?? String(g);
  const geneRank  = (g) => GENE_ORDER[String(g).toUpperCase()] ?? 999;

  // Хелперы нормализации
  const pickFirst = (obj, keys, def='') => {
    for (const k of keys) if (obj[k] != null && obj[k] !== '') return obj[k];
    return def;
  };
  function normalizeName(r) {
    const val = pickFirst(r, [
      'name','Name','mutant_name','mutantName','displayName','title',
      'name_ru','nameRu','ruName','name_en','nameEn','fullname','fullName','mutant'
    ], '');
    return String(val ?? '').trim();
  }
  function normalizeType(r) {
    const val = pickFirst(r, ['type','Type','class','Class','category','Category'], '');
    return String(val ?? '').trim();
  }
  function normalizeGene(r) {
    let raw = pickFirst(r, ['gene','Gene','GENE','gen','Gen','gene_code','geneCode','g','gene_label','geneLabel'], '');
    raw = String(raw ?? '').trim();
    if (!raw) return '';
    // если пришло «Киборг» и т.п. — переведём в A–F
    const asLetter = raw.length === 1 ? raw.toUpperCase() : (REVERSE_GENE[raw.toLowerCase()] ?? '');
    return (asLetter || raw.slice(0,1).toUpperCase());
  }

  // ID для путей (без specimen_ и без _normal/_bronze/_silver/_gold/_platinum/_plat)
  function baseCoreFromId(raw) {
    const noSpecimen = String(raw ?? '').trim().replace(/\s+/g,'_').replace(/^specimen[_-]*/i,'');
    const m = noSpecimen.match(/^(.*?)(?:_(normal|bronze|silver|gold|platinum|plat))?$/i);
    return (m ? m[1] : noSpecimen).toUpperCase();
  }

  // Нормализация строки бинго
  function normalizeBingo(r) {
    const bingoRaw = pickFirst(r, ['bingo','bingoType','bingo_name','bingoName','bingos','Bingo'], null);
    if (Array.isArray(bingoRaw)) {
      return bingoRaw.map(x => typeof x === 'string' ? x : (x?.name ?? x?.type ?? String(x))).filter(Boolean);
    }
    if (bingoRaw != null) {
      return String(bingoRaw).split(/[|,/;]/).map(s=>s.trim()).filter(Boolean);
    }
    return [];
  }

  // --- нормализация входных данных ---
  const mapRow = (r, i) => {
    const idRaw = pickFirst(r, ['id','ID','code','slug'], (i+1));
    const idStr = String(idRaw);
    const tier  = String(pickFirst(r, ['tier','Tier'], '')).toLowerCase();

    const gCode = normalizeGene(r);
    const gLbl  = geneLabel(gCode);
    const gRnk  = geneRank(gCode);

    const baseIdUpper = baseCoreFromId(idStr);

    return {
      ...r,
      _id: idStr,
      _baseIdUpper: baseIdUpper,
      _name: normalizeName(r),
      _tier: tier,
      _gene: gCode,
      _geneLabel: gLbl,
      _geneRank: gRnk,
      _type: normalizeType(r),
      _bingo: normalizeBingo(r),
      _speed: Number(pickFirst(r, ['speed','Speed','spd'], 0)) || 0,
      _hp: Number(pickFirst(r, ['hp','HP','health'], 0)) || 0,
      _attack: Number(pickFirst(r, ['attack','Attack','atk'], 0)) || 0,
    };
  };
  const data = rows.map(mapRow);

  const uniq = (arr) => Array.from(new Set(arr)).filter(v=>v!=='' && v!=null);

  // гены — только присутствующие, в порядке A→F
  const geneOptions = uniq(data.map(r=>r._gene)).sort((a,b)=>geneRank(a)-geneRank(b));
  // типы/бинго — алфавит
  const allTypes  = uniq(data.map(r=>r._type)).sort((a,b)=>coll.compare(String(a), String(b)));
  const allBingos = uniq(data.flatMap(r=>r._bingo ?? [])).sort((a,b)=>coll.compare(String(a), String(b)));

  // --- состояние фильтров/сортировки ---
  let q = '';
  let tier = initialTier;
  const tierSelectable = initialTier === 'all';

  let gene = '';
  let type = '';
  let bingo = '';
  let speedMin = '';
  let speedMax = '';

  let sortBy = 'name';   // 'name' | 'gene' | 'speed' | 'hp' | 'attack'
  let sortDir = 'asc';   // 'asc' | 'desc'
  let withTextureOnly = false;

  // --- статус текстур из карточек ---
  // ключ: baseIdUpper → true/false
  const textureOK = new Map();
  function onTexture(e) {
    const { id, ok } = e.detail || {};
    if (!id) return;
    textureOK.set(String(id), !!ok);
  }

  // --- ленивый показ ---
  let pageSize = 60;
  let visibleCount = pageSize;

  let scrollHandler;
  onMount(() => {
    // init из URL
    const p = new URLSearchParams(window.location.search);
    q = p.get('q') ?? q;
    if (tierSelectable) tier = p.get('tier') ?? tier;
    gene = p.get('gene') ?? gene;
    type = p.get('type') ?? type;
    bingo = p.get('bingo') ?? bingo;
    speedMin = p.get('smin') ?? speedMin;
    speedMax = p.get('smax') ?? speedMax;
    sortBy = p.get('sort') ?? sortBy;
    sortDir = p.get('dir') ?? sortDir;
    withTextureOnly = p.get('tex') === '1' ? true : withTextureOnly;

    scrollHandler = () => {
      const nearBottom = (window.innerHeight + window.scrollY) > (document.body.offsetHeight - 800);
      if (nearBottom) visibleCount += pageSize;
    };
    window.addEventListener('scroll', scrollHandler);
  });
  onDestroy(() => {
    if (IS_BROWSER && scrollHandler) window.removeEventListener('scroll', scrollHandler);
  });

  // --- фильтры ---
  function passFilters(m) {
    if (tierSelectable && tier !== 'all' && m._tier !== String(tier).toLowerCase()) return false;
    if (gene && m._gene !== gene) return false;
    if (type && m._type !== type) return false;
    if (bingo) {
      const hay = (m._bingo ?? []).map(s=>String(s).toLowerCase());
      if (!hay.includes(bingo.toLowerCase())) return false;
    }
    if (q) {
      const needle = q.toLowerCase().trim();
      const byName = (m._name ?? '').toLowerCase().includes(needle);
      const byId   = (m._id   ?? '').toLowerCase().includes(needle);
      if (!byName && !byId) return false;
    }
    if (speedMin !== '' && m._speed < Number(speedMin)) return false;
    if (speedMax !== '' && m._speed > Number(speedMax)) return false;

    if (withTextureOnly) {
      const baseId = m._baseIdUpper;
      // жёсткое требование: только карточки, которые подтвердили загрузку текстуры
      if (textureOK.get(baseId) !== true) return false;
    }
    return true;
  }

  // --- вычисления: фильтр → сортировка → видимая часть ---
  $: filtered = data.filter(passFilters);

  // явный токен — чтобы Svelte пересортировал при смене sortBy/sortDir
  $: __sortToken = `${sortBy}|${sortDir}`;

  $: sorted = [...filtered].sort((a, b) => {
    let res;
    switch (sortBy) {
      case 'speed':
        res = (a._speed > b._speed) - (a._speed < b._speed);
        break;
      case 'hp':
        res = (a._hp > b._hp) - (a._hp < b._hp);
        break;
      case 'attack':
        res = (a._attack > b._attack) - (a._attack < b._attack);
        break;
      case 'gene':
        res = (a._geneRank > b._geneRank) - (a._geneRank < b._geneRank);
        if (res === 0) res = coll.compare(a._name ?? '', b._name ?? '');
        break;
      default: // name
        res = coll.compare(a._name ?? '', b._name ?? '');
    }
    return sortDir === 'asc' ? res : -res;
  });

  $: visible = sorted.slice(0, visibleCount);

  // QoL: при смене сортировки сбрасываем пагинацию
  let __prevSortToken = '';
  $: {
    if (__sortToken !== __prevSortToken) {
      visibleCount = pageSize;
      __prevSortToken = __sortToken;
    }
  }

  // --- безопасное обновление URL ---
  function updateURL(){
    if (!IS_BROWSER) return;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (tierSelectable && tier !== 'all') params.set('tier', tier);
    if (gene) params.set('gene', gene);
    if (type) params.set('type', type);
    if (bingo) params.set('bingo', bingo);
    if (speedMin !== '') params.set('smin', String(speedMin));
    if (speedMax !== '') params.set('smax', String(speedMax));
    if (sortBy !== 'name') params.set('sort', sortBy);
    if (sortDir !== 'asc') params.set('dir', sortDir);
    if (withTextureOnly) params.set('tex', '1');

    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }
  $: IS_BROWSER && updateURL();

  // --- модалка ---
  let modalOpen = false;
  let modalMutant = null;
  function openModal(m){ modalMutant = m; modalOpen = true; }
  function closeModal(){ modalOpen = false; modalMutant = null; }

  // чипсы и сброс
  function removeChip(kind){
    if (kind==='q') q='';
    if (kind==='tier') tier='all';
    if (kind==='gene') gene='';
    if (kind==='type') type='';
    if (kind==='bingo') bingo='';
    if (kind==='smin') speedMin='';
    if (kind==='smax') speedMax='';
  }
  function resetAll(){
    q=''; if (tierSelectable) tier='all'; gene=''; type=''; bingo='';
    speedMin=''; speedMax='';
    sortBy='name'; sortDir='asc'; withTextureOnly=false; visibleCount=pageSize;
  }
</script>

<div class="toolbar">
  <div class="control grow">
    <input class="input" placeholder="Поиск по имени или ID…" bind:value={q} />
  </div>

  {#if tierSelectable}
  <div class="control">
    <select bind:value={tier} class="select">
      <option value="all">Все тиры</option>
      <option value="normal">Обычные</option>
      <option value="bronze">Бронза</option>
      <option value="silver">Серебро</option>
      <option value="gold">Золото</option>
      <option value="platinum">Платина</option>
    </select>
  </div>
  {/if}

  <div class="control">
    <select bind:value={gene} class="select">
      <option value="">{geneOptions.length ? 'Ген (все)' : 'Ген (нет данных)'}</option>
      {#each geneOptions as g}
        <option value={g}>{geneLabel(g)}</option>
      {/each}
    </select>
  </div>

  <div class="control">
    <select bind:value={type} class="select">
      <option value="">{allTypes.length ? 'Тип (все)' : 'Тип (нет данных)'}</option>
      {#each allTypes as t}<option value={t}>{t}</option>{/each}
    </select>
  </div>

  <div class="control">
    <select bind:value={bingo} class="select">
      <option value="">{allBingos.length ? 'Бинго (все)' : 'Бинго (нет данных)'}</option>
      {#each allBingos as b}<option value={b}>{b}</option>{/each}
    </select>
  </div>

  <div class="control speed">
    <span>Скорость</span>
    <input type="number" placeholder="мин" min="0" bind:value={speedMin}/>
    <span class="dash">—</span>
    <input type="number" placeholder="макс" min="0" bind:value={speedMax}/>
  </div>

  <div class="control sort">
    <select bind:value={sortBy} class="select">
      <option value="name">Имя</option>
      <option value="gene">Ген</option>
      <option value="speed">Скорость</option>
      <option value="hp">ХП</option>
      <option value="attack">Атака</option>
    </select>
    <button class="dir" title="Направление" on:click={() => sortDir = (sortDir==='asc'?'desc':'asc')} type="button">
      {sortDir==='asc' ? '↑' : '↓'}
    </button>
  </div>

  <label class="control chk">
    <input type="checkbox" bind:checked={withTextureOnly}/>
    <span>Только с текстурой</span>
  </label>

  <button class="reset" on:click={resetAll} type="button">Сбросить</button>
</div>

<!-- chips -->
<div class="chips">
  {#if q}<button class="chip" on:click={()=>removeChip('q')} type="button">Поиск: “{q}” ✕</button>{/if}
  {#if tierSelectable && tier!=='all'}<button class="chip" on:click={()=>removeChip('tier')} type="button">Тир: {tier} ✕</button>{/if}
  {#if gene}<button class="chip" on:click={()=>removeChip('gene')} type="button">Ген: {geneLabel(gene)} ✕</button>{/if}
  {#if type}<button class="chip" on:click={()=>removeChip('type')} type="button">Тип: {type} ✕</button>{/if}
  {#if bingo}<button class="chip" on:click={()=>removeChip('bingo')} type="button">Бинго: {bingo} ✕</button>{/if}
  {#if speedMin!==''}<button class="chip" on:click={()=>removeChip('smin')} type="button">Скор. ≥ {speedMin} ✕</button>{/if}
  {#if speedMax!==''}<button class="chip" on:click={()=>removeChip('smax')} type="button">Скор. ≤ {speedMax} ✕</button>{/if}
</div>

<p class="count">Найдено: <strong>{filtered.length}</strong> {filtered.length !== visible.length ? `(показано ${visible.length})` : ''}</p>

<div class="grid">
  {#each visible as m (m._id)}
    <MutantCard
      client:visible
      mutant={{ id: m._id, name: m._name, tier: m._tier, gene: m._gene, type: m._type, bingo: m._bingo, speed: m._speed, hp: m._hp, attack: m._attack }}
      on:texture={onTexture}
      on:select={()=>openModal({ id: m._id, name: m._name, tier: m._tier, gene: m._gene, type: m._type, bingo: m._bingo, speed: m._speed, hp: m._hp, attack: m._attack })}
    />
  {/each}
</div>

{#if IS_BROWSER}
  <MutantModal open={modalOpen} mutant={modalMutant} onClose={closeModal}>
    <svelte:fragment slot="image">
      <div style="width:100%;max-height:520px;display:grid;place-items:center;"></div>
    </svelte:fragment>
  </MutantModal>
{/if}

<style>
.toolbar{
  display:flex; flex-wrap:wrap; gap:.5rem; align-items:center;
  margin: .2rem 0 .5rem;
}
.control{ display:flex; gap:.4rem; align-items:center; min-width:180px; }
.control.grow{ flex:1 1 260px; min-width:220px; }
.input, .select{
  width:100%; padding:.55rem .6rem; border:1px solid #30363d; border-radius:10px;
  background:#0b0f14; color:#c9d1d9;
}
.speed input{ width:90px; padding:.45rem .5rem; border:1px solid #30363d; border-radius:10px; background:#0b0f14; color:#c9d1d9; }
.speed .dash{ color:#8b949e; }
.sort .dir{
  width:40px; height:38px; border:1px solid #30363d; border-radius:10px; background:#161b22; color:#c9d1d9; cursor:pointer;
}
.chk{ gap:.35rem; color:#c9d1d9; }
.reset{ padding:.5rem .7rem; border:1px solid #304357; background:#0d1520; color:#cfe3ff; border-radius:10px; cursor:pointer; }

.chips{ display:flex; flex-wrap:wrap; gap:.4rem; margin:.2rem 0 .6rem; }
.chip{
  background:#111826; color:#cfe3ff; border:1px solid #2a3f5a; border-radius:999px;
  padding:.2rem .5rem; font-size:.83rem; cursor:pointer;
}

.count{ color:#8b949e; margin:.2rem 0 .6rem; }

.grid{
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
</style>
