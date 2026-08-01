<script lang="ts">
  import { textureUrl } from '@/lib/texture-cdn'
  import { getGeneIcon, getTypeIcon, ABILITY_ICONS } from '@/lib/mutant-icons'
  import { ABILITY_RU, TYPE_RU } from '@/lib/mutant-dicts'

  interface Row {
    number: number
    id: string
    name: string
    icon: string
    type: string
    lastRebalance: string | null
    gene1: string
    gene2: string
    speed: number
    hp: number
    atk1: number
    atk1Gene: string
    atk1Aoe: boolean
    atk2: number
    atk2Gene: string
    atk2Aoe: boolean
    abilityKey: string | null
    abilityPct: number | null
    abilityAtk1: number | null
    abilityAtk2: number | null
    tierBefore: string
    tierAfter: string
  }

  let { rows = [] }: { rows: Row[] } = $props()

  const TIER_OPTIONS = ['1+', '1', '1-', '2+', '2', '2-', '3+', '3', '3-', '4', '-']
  const TIER_RANK: Record<string, number> = Object.fromEntries(TIER_OPTIONS.map((t, i) => [t, i]))
  const TIER_BG: Record<string, string> = {
    '1+': 'rgba(220,38,38,0.85)',
    '1': 'rgba(220,38,38,0.6)',
    '1-': 'rgba(220,38,38,0.35)',
    '2+': 'rgba(234,88,12,0.85)',
    '2': 'rgba(234,88,12,0.6)',
    '2-': 'rgba(234,88,12,0.35)',
    '3+': 'rgba(132,180,20,0.85)',
    '3': 'rgba(132,180,20,0.6)',
    '3-': 'rgba(132,180,20,0.35)',
    '4': 'rgba(21,100,55,0.85)',
    '-': 'transparent',
  }

  // Локальная редактируемая копия тиров - источник истины для рендера ячеек,
  // независимая от исходных rows props (правки не пишут ни в mutants.json,
  // ни в тир-лист, только в это состояние + на сервер по кнопке "Сохранить").
  let tiers = $state(new Map(rows.map((r) => [r.id, { before: r.tierBefore, after: r.tierAfter }])))
  let dirty = $state(new Set<string>())
  let saving = $state(false)
  let refreshing = $state(false)
  let statusMsg = $state('')

  type FilterCol = 'tierBefore' | 'tierAfter' | 'gene1' | 'gene2' | 'abilityKey'
  let filters = $state<Record<FilterCol, Set<string>>>({
    tierBefore: new Set(),
    tierAfter: new Set(),
    gene1: new Set(),
    gene2: new Set(),
    abilityKey: new Set(),
  })
  let openFilter: FilterCol | null = $state(null)

  const GENE_VALUES = ['A', 'B', 'C', 'D', 'E', 'F', 'NEUTRO']
  const ABILITY_VALUES = ['shield', 'regen', 'retaliate', 'slash', 'strengthen', 'weaken']

  function filterOptions(col: FilterCol): string[] {
    if (col === 'tierBefore' || col === 'tierAfter') return TIER_OPTIONS
    if (col === 'gene1' || col === 'gene2') return GENE_VALUES
    return ABILITY_VALUES
  }
  function filterLabel(col: FilterCol, v: string): string {
    if (col === 'abilityKey') return ABILITY_RU[`ability_${v}_plus`] ?? v
    if (v === 'NEUTRO') return 'Нейтральный'
    return v
  }
  function toggleFilter(col: FilterCol, value: string) {
    const set = new Set(filters[col])
    if (set.has(value)) set.delete(value)
    else set.add(value)
    filters = { ...filters, [col]: set }
  }

  type SortKey =
    | 'number'
    | 'lastRebalance'
    | 'tierBefore'
    | 'tierAfter'
    | 'speed'
    | 'hp'
    | 'atk1'
    | 'atk2'
    | 'abilityPct'
    | 'abilityAtk1'
    | 'abilityAtk2'
    | null
  let sortKey: SortKey = $state(null)
  let sortDir: 'asc' | 'desc' = $state('asc')

  function setSort(key: NonNullable<SortKey>) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey = key
      sortDir = 'asc'
    }
  }

  function resetAll() {
    filters = { tierBefore: new Set(), tierAfter: new Set(), gene1: new Set(), gene2: new Set(), abilityKey: new Set() }
    sortKey = null
    sortDir = 'asc'
    openFilter = null
  }

  const filteredRows = $derived.by(() => {
    return rows.filter((r) => {
      const t = tiers.get(r.id)!
      if (filters.tierBefore.size && !filters.tierBefore.has(t.before)) return false
      if (filters.tierAfter.size && !filters.tierAfter.has(t.after)) return false
      if (filters.gene1.size && !filters.gene1.has(r.gene1)) return false
      if (filters.gene2.size && !filters.gene2.has(r.gene2)) return false
      if (filters.abilityKey.size && !filters.abilityKey.has(r.abilityKey ?? '')) return false
      return true
    })
  })

  function rowValue(r: Row, key: NonNullable<SortKey>): number {
    switch (key) {
      case 'number': return r.number
      case 'tierBefore': return TIER_RANK[tiers.get(r.id)!.before] ?? 99
      case 'tierAfter': return TIER_RANK[tiers.get(r.id)!.after] ?? 99
      case 'speed': return r.speed
      case 'hp': return r.hp
      case 'atk1': return r.atk1
      case 'atk2': return r.atk2
      case 'abilityPct': return r.abilityPct ?? -Infinity
      case 'abilityAtk1': return r.abilityAtk1 ?? -Infinity
      case 'abilityAtk2': return r.abilityAtk2 ?? -Infinity
      default: return 0
    }
  }

  const sortedRows = $derived.by(() => {
    const list = [...filteredRows]
    if (sortKey === 'lastRebalance') {
      const withDate = list.filter((r) => r.lastRebalance)
      const withoutDate = list.filter((r) => !r.lastRebalance)
      withDate.sort((a, b) => {
        const cmp = (a.lastRebalance as string).localeCompare(b.lastRebalance as string)
        return sortDir === 'asc' ? cmp : -cmp
      })
      return [...withDate, ...withoutDate]
    }
    if (sortKey) {
      const key = sortKey
      list.sort((a, b) => {
        const cmp = rowValue(a, key) - rowValue(b, key)
        return sortDir === 'asc' ? cmp : -cmp
      })
      return list
    }
    // Дефолт: Тир до (лучше -> выше), при равенстве - скорость по убыванию.
    list.sort((a, b) => {
      const ta = TIER_RANK[tiers.get(a.id)!.before] ?? 99
      const tb = TIER_RANK[tiers.get(b.id)!.before] ?? 99
      if (ta !== tb) return ta - tb
      return b.speed - a.speed
    })
    return list
  })

  function editTier(id: string, col: 'before' | 'after', value: string) {
    const next = new Map(tiers)
    const cur = next.get(id)!
    next.set(id, { ...cur, [col]: value })
    tiers = next
    dirty = new Set(dirty).add(id)
  }

  async function saveChanges() {
    if (!dirty.size) return
    saving = true
    statusMsg = ''
    const changes: Record<string, { before: string; after: string }> = {}
    for (const id of dirty) changes[id] = tiers.get(id)!
    try {
      const res = await fetch('/api/tier-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', changes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        statusMsg = `Ошибка сохранения: ${err.error ?? res.status}`
      } else {
        dirty = new Set()
        statusMsg = 'Сохранено ✓'
        setTimeout(() => (statusMsg = ''), 3000)
      }
    } catch {
      statusMsg = 'Ошибка сети при сохранении'
    } finally {
      saving = false
    }
  }

  async function refreshTiers() {
    if (!confirm('Это перезапишет ОБЕ колонки (Тир до/после) у ВСЕХ мутантов текущими значениями из тир-листа сайта, включая несохранённые правки. Продолжить?')) return
    refreshing = true
    statusMsg = ''
    try {
      const res = await fetch('/api/tier-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        statusMsg = `Ошибка обновления: ${err.error ?? res.status}`
      } else {
        const data = await res.json()
        tiers = new Map(Object.entries(data.table))
        dirty = new Set()
        statusMsg = 'Тиры обновлены ✓'
        setTimeout(() => (statusMsg = ''), 3000)
      }
    } catch {
      statusMsg = 'Ошибка сети при обновлении'
    } finally {
      refreshing = false
    }
  }

  function fmt(n: number): string {
    return n.toLocaleString('ru-RU')
  }
  function fmtAbility(n: number | null): string {
    return n != null && n > 0 ? n.toLocaleString('ru-RU') : '-'
  }
  function fmtDate(iso: string | null): string {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }
  function sortIndicator(key: NonNullable<SortKey>): string {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? '▲' : '▼'
  }
</script>

<div class="toolbar">
  <div class="toolbar-left">
    <button class="btn" onclick={refreshTiers} disabled={refreshing}>
      {refreshing ? 'Обновляю…' : '↻ Обновить тиры'}
    </button>
    <button class="btn btn-primary" onclick={saveChanges} disabled={saving || dirty.size === 0}>
      {saving ? 'Сохраняю…' : `💾 Сохранить изменения${dirty.size ? ` (${dirty.size})` : ''}`}
    </button>
    <button class="btn" onclick={resetAll}>Сбросить всё</button>
    {#if statusMsg}<span class="status-msg">{statusMsg}</span>{/if}
  </div>
  <div class="toolbar-right">Показано: {sortedRows.length} / {rows.length}</div>
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="sortable" onclick={() => setSort('number')}>№ {sortIndicator('number')}</th>
        <th>Иконка</th>
        <th>Имя</th>
        <th>Тип</th>
        <th class="sortable" onclick={() => setSort('lastRebalance')}>Ребаланс {sortIndicator('lastRebalance')}</th>
        <th class="sortable filterable">
          <span onclick={() => setSort('tierBefore')}>Тир до {sortIndicator('tierBefore')}</span>
          <button class="filter-btn" onclick={(e) => { e.stopPropagation(); openFilter = openFilter === 'tierBefore' ? null : 'tierBefore' }}>▾</button>
          {#if openFilter === 'tierBefore'}
            <div class="filter-pop">
              {#each filterOptions('tierBefore') as v}
                <label><input type="checkbox" checked={filters.tierBefore.has(v)} onchange={() => toggleFilter('tierBefore', v)} />{filterLabel('tierBefore', v)}</label>
              {/each}
            </div>
          {/if}
        </th>
        <th class="sortable filterable">
          <span onclick={() => setSort('tierAfter')}>Тир после {sortIndicator('tierAfter')}</span>
          <button class="filter-btn" onclick={(e) => { e.stopPropagation(); openFilter = openFilter === 'tierAfter' ? null : 'tierAfter' }}>▾</button>
          {#if openFilter === 'tierAfter'}
            <div class="filter-pop">
              {#each filterOptions('tierAfter') as v}
                <label><input type="checkbox" checked={filters.tierAfter.has(v)} onchange={() => toggleFilter('tierAfter', v)} />{filterLabel('tierAfter', v)}</label>
              {/each}
            </div>
          {/if}
        </th>
        <th class="filterable">
          <span>Ген 1</span>
          <button class="filter-btn" onclick={(e) => { e.stopPropagation(); openFilter = openFilter === 'gene1' ? null : 'gene1' }}>▾</button>
          {#if openFilter === 'gene1'}
            <div class="filter-pop">
              {#each filterOptions('gene1') as v}
                <label><input type="checkbox" checked={filters.gene1.has(v)} onchange={() => toggleFilter('gene1', v)} />{filterLabel('gene1', v)}</label>
              {/each}
            </div>
          {/if}
        </th>
        <th class="filterable">
          <span>Ген 2</span>
          <button class="filter-btn" onclick={(e) => { e.stopPropagation(); openFilter = openFilter === 'gene2' ? null : 'gene2' }}>▾</button>
          {#if openFilter === 'gene2'}
            <div class="filter-pop">
              {#each filterOptions('gene2') as v}
                <label><input type="checkbox" checked={filters.gene2.has(v)} onchange={() => toggleFilter('gene2', v)} />{filterLabel('gene2', v)}</label>
              {/each}
            </div>
          {/if}
        </th>
        <th class="sortable" onclick={() => setSort('speed')}>Спд {sortIndicator('speed')}</th>
        <th class="sortable" onclick={() => setSort('hp')}>HP {sortIndicator('hp')}</th>
        <th class="sortable" onclick={() => setSort('atk1')}>Атк1 {sortIndicator('atk1')}</th>
        <th class="sortable" onclick={() => setSort('atk2')}>Атк2 {sortIndicator('atk2')}</th>
        <th class="filterable">
          <span>Абилка</span>
          <button class="filter-btn" onclick={(e) => { e.stopPropagation(); openFilter = openFilter === 'abilityKey' ? null : 'abilityKey' }}>▾</button>
          {#if openFilter === 'abilityKey'}
            <div class="filter-pop">
              {#each filterOptions('abilityKey') as v}
                <label><input type="checkbox" checked={filters.abilityKey.has(v)} onchange={() => toggleFilter('abilityKey', v)} />{filterLabel('abilityKey', v)}</label>
              {/each}
            </div>
          {/if}
        </th>
        <th class="sortable" onclick={() => setSort('abilityPct')}>% {sortIndicator('abilityPct')}</th>
        <th class="sortable" onclick={() => setSort('abilityAtk1')}>Аб.Атк1 {sortIndicator('abilityAtk1')}</th>
        <th class="sortable" onclick={() => setSort('abilityAtk2')}>Аб.Атк2 {sortIndicator('abilityAtk2')}</th>
      </tr>
    </thead>
    <tbody>
      {#each sortedRows as r (r.id)}
        {@const t = tiers.get(r.id)!}
        <tr class:dirty-row={dirty.has(r.id)}>
          <td class="num">{r.number}</td>
          <td class="icon-cell">
            {#if r.icon}<img src={textureUrl(r.icon)} alt="" loading="lazy" decoding="async" />{/if}
          </td>
          <td class="name-cell">{r.name}</td>
          <td class="type-cell">
            {#if getTypeIcon(r.type)}<img class="mini-ico" src={textureUrl(getTypeIcon(r.type))} alt="" loading="lazy" decoding="async" />{/if}
            {TYPE_RU[r.type] ?? r.type}
          </td>
          <td class="rebalance-cell">
            {#if r.lastRebalance}<a href="/rebalance">{fmtDate(r.lastRebalance)}</a>{:else}-{/if}
          </td>
          <td class="tier-cell" style={`background:${TIER_BG[t.before]}`}>
            <select value={t.before} onchange={(e) => editTier(r.id, 'before', (e.target as HTMLSelectElement).value)}>
              {#each TIER_OPTIONS as opt}<option value={opt}>{opt}</option>{/each}
            </select>
          </td>
          <td class="tier-cell" style={`background:${TIER_BG[t.after]}`}>
            <select value={t.after} onchange={(e) => editTier(r.id, 'after', (e.target as HTMLSelectElement).value)}>
              {#each TIER_OPTIONS as opt}<option value={opt}>{opt}</option>{/each}
            </select>
          </td>
          <td class="gene-cell">{#if getGeneIcon(r.gene1)}<img class="mini-ico" src={textureUrl(getGeneIcon(r.gene1))} alt={r.gene1} loading="lazy" decoding="async" />{/if}</td>
          <td class="gene-cell">{#if getGeneIcon(r.gene2)}<img class="mini-ico" src={textureUrl(getGeneIcon(r.gene2))} alt={r.gene2} loading="lazy" decoding="async" />{/if}</td>
          <td class="num">{r.speed}</td>
          <td class="num">{fmt(r.hp)}</td>
          <td class="num">
            {fmt(r.atk1)}
            {#if getGeneIcon(r.atk1Gene)}<img class="mini-ico inline-ico" src={textureUrl(getGeneIcon(r.atk1Gene))} alt="" loading="lazy" decoding="async" />{/if}
            {#if r.atk1Aoe}<span class="aoe-badge" title="Площадная атака">AOE</span>{/if}
          </td>
          <td class="num">
            {fmt(r.atk2)}
            {#if getGeneIcon(r.atk2Gene)}<img class="mini-ico inline-ico" src={textureUrl(getGeneIcon(r.atk2Gene))} alt="" loading="lazy" decoding="async" />{/if}
            {#if r.atk2Aoe}<span class="aoe-badge" title="Площадная атака">AOE</span>{/if}
          </td>
          <td class="ability-cell">
            {#if r.abilityKey && ABILITY_ICONS[r.abilityKey]}
              <img class="mini-ico" src={textureUrl(ABILITY_ICONS[r.abilityKey])} alt={r.abilityKey} title={ABILITY_RU[`ability_${r.abilityKey}_plus`] ?? r.abilityKey} loading="lazy" decoding="async" />
            {/if}
          </td>
          <td class="num">{r.abilityPct != null ? `${r.abilityPct}%` : '-'}</td>
          <td class="num">{fmtAbility(r.abilityAtk1)}</td>
          <td class="num">{fmtAbility(r.abilityAtk2)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.6rem; }
  .toolbar-left { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .toolbar-right { color: #64748b; font-size: 0.8rem; }
  .btn { appearance: none; border: 1px solid rgba(255,255,255,0.12); background: rgba(22,27,34,0.9); color: #cbd5f5; border-radius: 6px; padding: 0.35rem 0.7rem; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
  .btn:hover:not(:disabled) { background: rgba(51,65,85,0.8); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-primary { background: rgba(34,197,94,0.2); border-color: rgba(34,197,94,0.4); color: #86efac; }
  .btn-primary:hover:not(:disabled) { background: rgba(34,197,94,0.32); }
  .status-msg { font-size: 0.78rem; color: #93c5fd; }

  .table-wrap { max-height: 82vh; overflow: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 0.74rem; }
  thead th {
    position: sticky; top: 0; z-index: 2; background: #161b22; color: #94a3b8;
    text-align: left; padding: 0.3rem 0.4rem; font-weight: 700; white-space: nowrap;
    border-bottom: 1px solid rgba(255,255,255,0.12); user-select: none;
  }
  th.sortable { cursor: pointer; }
  th.sortable:hover { color: #e2e8f0; }
  th.filterable { position: relative; display: table-cell; }
  .filter-btn { appearance: none; border: none; background: transparent; color: #64748b; cursor: pointer; margin-left: 2px; font-size: 0.7rem; }
  .filter-btn:hover { color: #e2e8f0; }
  .filter-pop {
    position: absolute; top: 100%; left: 0; z-index: 5; background: #0d1117; border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px; padding: 0.35rem; display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow-y: auto;
    box-shadow: 0 6px 18px rgba(0,0,0,0.5); white-space: nowrap;
  }
  .filter-pop label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 400; color: #cbd5f5; cursor: pointer; padding: 1px 3px; }
  .filter-pop label:hover { background: rgba(255,255,255,0.06); }

  tbody td { padding: 0.15rem 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.04); white-space: nowrap; color: #cbd5f5; }
  tbody tr:hover td { background: rgba(255,255,255,0.03); }
  tr.dirty-row td { box-shadow: inset 0 0 0 9999px rgba(96,165,250,0.05); }

  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .icon-cell img { width: 24px; height: 24px; object-fit: cover; border-radius: 4px; vertical-align: middle; }
  .name-cell { font-weight: 600; color: #e2e8f0; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
  .type-cell { color: #94a3b8; }
  .rebalance-cell a { color: #60a5fa; text-decoration: none; }
  .rebalance-cell a:hover { text-decoration: underline; }

  .mini-ico { width: 14px; height: 14px; vertical-align: middle; object-fit: contain; }
  .inline-ico { margin-left: 2px; }
  .aoe-badge { margin-left: 3px; font-size: 8px; font-weight: 800; color: #fca5a5; border: 1px solid rgba(252,165,165,0.5); border-radius: 3px; padding: 0 2px; vertical-align: middle; }

  .gene-cell { text-align: center; }
  .ability-cell { text-align: center; }

  .tier-cell { padding: 0; text-align: center; }
  .tier-cell select {
    width: 100%; appearance: none; text-align: center; border: none; background: transparent; color: #f1f5f9;
    font-weight: 800; font-size: 0.74rem; padding: 0.15rem 0.2rem; cursor: pointer; text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  }
  .tier-cell select:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }

  @media (max-width: 767px) {
    .table-wrap { max-height: 75vh; }
    table { font-size: 0.68rem; }
    .name-cell { max-width: 100px; }
  }
</style>
