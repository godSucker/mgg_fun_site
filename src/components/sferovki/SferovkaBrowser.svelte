<script lang="ts">
  import { textureUrl } from '@/lib/texture-cdn'
  import { getGeneIcon, getTypeIcon } from '@/lib/mutant-icons'
  import { TYPE_RU } from '@/lib/mutant-dicts'
  import {
    BASIC_ORB_TYPES,
    SPECIAL_ORB_TYPES,
    EMPTY_BASIC_SLOT,
    EMPTY_SPECIAL_SLOT,
    isSpecialFile,
  } from '@/lib/orb-catalog'

  type OrbCell = string | [string, string]

  interface Row {
    id: string
    orbingKey: string
    name: string
    icon: string
    type: string
    tier: string
    gene1: string
    gene2: string
    basicSlotCount: number
    specialSlotCount: number
    rows: OrbCell[][]
  }

  let { rows = [] }: { rows: Row[] } = $props()

  const TIER_OPTIONS = ['1+', '1', '1-', '2+', '2', '2-', '3+', '3', '3-', '4', '-']
  const TIER_RANK: Record<string, number> = Object.fromEntries(TIER_OPTIONS.map((t, i) => [t, i]))
  const TIER_BG: Record<string, string> = {
    '1+': 'rgba(220,38,38,0.85)', '1': 'rgba(220,38,38,0.6)', '1-': 'rgba(220,38,38,0.35)',
    '2+': 'rgba(234,88,12,0.85)', '2': 'rgba(234,88,12,0.6)', '2-': 'rgba(234,88,12,0.35)',
    '3+': 'rgba(132,180,20,0.85)', '3': 'rgba(132,180,20,0.6)', '3-': 'rgba(132,180,20,0.35)',
    '4': 'rgba(21,100,55,0.85)', '-': 'transparent',
  }

  const MAX_ROWS = 3

  interface RowBuild {
    basic: (OrbCell | null)[]
    special: (OrbCell | null)[]
  }
  type Build = RowBuild[]

  function emptyRowBuild(r: Row): RowBuild {
    return {
      basic: new Array(r.basicSlotCount).fill(null),
      special: new Array(r.specialSlotCount).fill(null),
    }
  }

  // Разносим существующие ряды orbing.json 1:1 в свои ряды (до 3, как в
  // проде), каждый ряд раскладывается по категории (special/-префикс первой
  // половинки для сдвоенных сфер) в слоты текущей модели (по типу мутанта).
  // Лишние ячейки сверх вместимости слотов одного ряда молча обрезаются -
  // осознанный компромисс (юзер выбрал модель "слоты по типу", а не 1:1
  // повтор прод-раскладки внутри ряда).
  function buildFromExisting(r: Row): Build {
    const existingRows = r.rows.length > 0 ? r.rows.slice(0, MAX_ROWS) : [[]]
    return existingRows.map((row) => {
      const rb = emptyRowBuild(r)
      let bi = 0
      let si = 0
      for (const cell of row) {
        const first = Array.isArray(cell) ? cell[0] : cell
        if (typeof first !== 'string') continue
        if (isSpecialFile(first)) {
          if (si < rb.special.length) rb.special[si++] = cell
        } else {
          if (bi < rb.basic.length) rb.basic[bi++] = cell
        }
      }
      return rb
    })
  }

  let builds = $state(new Map<string, Build>(rows.map((r) => [r.id, buildFromExisting(r)])))
  // Снимок исходного состояния - нужен, чтобы отличить "реально поменяли" от
  // "поставили и вернули обратно" (например поставили сферу и тут же
  // очистили, или добавили ряд и тут же убрали). dirty считается по факту
  // отличия от этого снимка, а не по самому событию правки, иначе счётчик
  // "Отправить в прод" растёт даже без реальных изменений.
  const originalBuilds = new Map<string, Build>(rows.map((r) => [r.id, buildFromExisting(r)]))
  let dirty = $state(new Set<string>())

  function cellEqual(a: OrbCell | null, b: OrbCell | null): boolean {
    if (a === b) return true
    if (Array.isArray(a) && Array.isArray(b)) return a[0] === b[0] && a[1] === b[1]
    return false
  }
  function slotArrayEqual(a: (OrbCell | null)[], b: (OrbCell | null)[]): boolean {
    return a.length === b.length && a.every((v, i) => cellEqual(v, b[i]))
  }
  function buildEqualsOriginal(id: string, build: Build): boolean {
    const orig = originalBuilds.get(id)
    if (!orig || orig.length !== build.length) return false
    return build.every((rb, i) => slotArrayEqual(rb.basic, orig[i].basic) && slotArrayEqual(rb.special, orig[i].special))
  }
  function markDirty(id: string, build: Build) {
    const nextDirty = new Set(dirty)
    if (buildEqualsOriginal(id, build)) nextDirty.delete(id)
    else nextDirty.add(id)
    dirty = nextDirty
  }

  let saving = $state(false)
  let statusMsg = $state('')
  let search = $state('')

  type SortKey = 'tier' | 'name'
  let sortKey: SortKey | null = $state(null)
  let sortDir: 'asc' | 'desc' = $state('asc')

  function setSort(key: SortKey) {
    if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc'
    else { sortKey = key; sortDir = 'asc' }
  }
  function resetSort() {
    sortKey = null
    sortDir = 'asc'
    search = ''
  }

  const searchedRows = $derived.by(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q))
  })

  const sortedRows = $derived.by(() => {
    if (!sortKey) return searchedRows
    const list = [...searchedRows]
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'tier') cmp = (TIER_RANK[a.tier] ?? 99) - (TIER_RANK[b.tier] ?? 99)
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name, 'ru')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  })

  function addRow(id: string) {
    const r = rows.find((x) => x.id === id)!
    const next = new Map(builds)
    const b = [...next.get(id)!, emptyRowBuild(r)]
    if (b.length > MAX_ROWS) return
    next.set(id, b)
    builds = next
    markDirty(id, b)
  }
  function removeRow(id: string, rowIdx: number) {
    const next = new Map(builds)
    const cur = next.get(id)!
    if (cur.length <= 1) return
    const b = cur.filter((_, i) => i !== rowIdx)
    next.set(id, b)
    builds = next
    markDirty(id, b)
    if (openPicker?.id === id) openPicker = null
  }

  // Попап выбора сферы для конкретного слота - одна открытая панель за раз.
  // comboMode переключает попап в режим "сдвоенной" сферы (одна физическая
  // сфера с двумя эффектами - формат уже поддержан в orbing.json/MutantModal
  // через ".сфера" в telegram-webhook.ts, парсинг "часть1/часть2"). comboStaging -
  // черновик половинок, применяется по кнопке "Применить" одним действием,
  // не по каждому полу-выбору - те же соображения, что и батч-сохранение
  // тир-таблицы (не плодить промежуточные dirty-состояния на полпути).
  // Попап теперь модальный, по центру экрана (фикс по фидбеку - привязка к
  // кнопке слота вылезала за край на широких/узких экранах и заставляла
  // скроллить). Оверлей сзади закрывает по клику, как обычная модалка.
  let openPicker: { id: string; rowIdx: number; kind: 'basic' | 'special'; index: number } | null = $state(null)
  let comboMode = $state(false)
  let comboStaging: { a: string | null; b: string | null } = $state({ a: null, b: null })

  function openSlot(e: MouseEvent, id: string, rowIdx: number, kind: 'basic' | 'special', index: number) {
    e.stopPropagation()
    if (openPicker?.id === id && openPicker.rowIdx === rowIdx && openPicker.kind === kind && openPicker.index === index) {
      openPicker = null
      return
    }
    openPicker = { id, rowIdx, kind, index }
    const cur = builds.get(id)![rowIdx][kind][index]
    if (Array.isArray(cur)) {
      comboMode = true
      comboStaging = { a: cur[0], b: cur[1] }
    } else {
      comboMode = false
      comboStaging = { a: null, b: null }
    }
  }

  function pickOrb(id: string, rowIdx: number, kind: 'basic' | 'special', index: number, cell: OrbCell | null) {
    const next = new Map(builds)
    const b = next.get(id)!.map((rb, i) =>
      i === rowIdx ? { basic: [...rb.basic], special: [...rb.special] } : rb,
    )
    b[rowIdx][kind][index] = cell
    next.set(id, b)
    builds = next
    markDirty(id, b)
    openPicker = null
  }

  function applyCombo(id: string, rowIdx: number, kind: 'basic' | 'special', index: number) {
    if (!comboStaging.a || !comboStaging.b) return
    pickOrb(id, rowIdx, kind, index, [comboStaging.a, comboStaging.b])
  }

  function slotDisplay(rb: RowBuild, kind: 'basic' | 'special', index: number): OrbCell {
    const v = rb[kind][index]
    if (v) return v
    return kind === 'basic' ? EMPTY_BASIC_SLOT : EMPTY_SPECIAL_SLOT
  }

  async function pushToProd() {
    if (!dirty.size) return
    saving = true
    statusMsg = ''
    const changes: Record<string, OrbCell[][]> = {}
    for (const id of dirty) {
      const row = rows.find((r) => r.id === id)!
      const b = builds.get(id)!
      const rowsOut = b
        .map((rb) => [...rb.basic, ...rb.special].filter((c): c is OrbCell => !!c))
        .filter((cells) => cells.length > 0)
      changes[row.orbingKey] = rowsOut
    }
    try {
      const res = await fetch('/api/sferovki', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', changes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        statusMsg = `Ошибка публикации: ${err.error ?? res.status}`
      } else {
        dirty = new Set()
        statusMsg = 'Отправлено в прод ✓'
        setTimeout(() => (statusMsg = ''), 4000)
      }
    } catch {
      statusMsg = 'Ошибка сети при публикации'
    } finally {
      saving = false
    }
  }

  function closePicker() {
    openPicker = null
  }
</script>

<div class="toolbar">
  <div class="toolbar-left">
    <button class="btn btn-primary" onclick={pushToProd} disabled={saving || dirty.size === 0}>
      {saving ? 'Отправляю…' : `🚀 Отправить в прод${dirty.size ? ` (${dirty.size})` : ''}`}
    </button>
    <input class="search-input" type="text" placeholder="Поиск по имени…" bind:value={search} />
    <button class="btn" onclick={resetSort}>Сбросить</button>
    {#if statusMsg}<span class="status-msg">{statusMsg}</span>{/if}
  </div>
  <div class="toolbar-right">Показано: {sortedRows.length} / {rows.length}</div>
</div>
<p class="hint">
  Уровень сферы не выбирается - фиксированная иконка на слот (реальный уровень выставляется в игре).
  Слотов под тип: обычные - по типу мутанта (default 1 / gacha 2 / heroic 3), особая - 1.
  У мутанта может быть до {MAX_ROWS} рядов сферовок ("+ Ряд" под слотами). В попапе слота можно
  переключить на "Сдвоенная" - одна физическая сфера с двумя эффектами.
</p>

<div class="table-wrap">
  <table>
    <colgroup>
      <col style="width: 56px" />
      <col style="width: 190px" />
      <col style="width: 64px" />
      <col style="width: 56px" />
      <col />
    </colgroup>
    <thead>
      <tr>
        <th>Иконка</th>
        <th class="sortable" onclick={() => setSort('name')}>Имя {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
        <th>Гены</th>
        <th class="sortable" onclick={() => setSort('tier')}>Тир {sortKey === 'tier' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
        <th>Сферовка</th>
      </tr>
    </thead>
    <tbody>
      {#each sortedRows as r (r.id)}
        {@const build = builds.get(r.id)!}
        <tr class:dirty-row={dirty.has(r.id)}>
          <td class="icon-cell">
            {#if r.icon}<img src={textureUrl(r.icon)} alt="" loading="lazy" decoding="async" />{/if}
          </td>
          <td class="name-cell" title={r.name}>
            <div class="name-text">{r.name}</div>
            <div class="type-sub">
              {#if getTypeIcon(r.type)}<img class="mini-ico" src={textureUrl(getTypeIcon(r.type))} alt="" loading="lazy" decoding="async" />{/if}
              <span>{TYPE_RU[r.type] ?? r.type}</span>
            </div>
          </td>
          <td class="gene-cell">
            {#if getGeneIcon(r.gene1)}<img class="mini-ico" src={textureUrl(getGeneIcon(r.gene1))} alt={r.gene1} loading="lazy" decoding="async" />{/if}
            {#if getGeneIcon(r.gene2)}<img class="mini-ico" src={textureUrl(getGeneIcon(r.gene2))} alt={r.gene2} loading="lazy" decoding="async" />{/if}
          </td>
          <td class="tier-cell" style={`background:${TIER_BG[r.tier] ?? 'transparent'}`}>{r.tier}</td>
          <td class="orbs-cell">
            {#each build as rb, rowIdx}
              <div class="orb-row">
                <span class="row-label">{rowIdx + 1}</span>
                {#each rb.basic as _, i}
                  <button class="orb-slot" onclick={(e) => openSlot(e, r.id, rowIdx, 'basic', i)}>
                    {#if Array.isArray(slotDisplay(rb, 'basic', i))}
                      {@const cell = slotDisplay(rb, 'basic', i) as [string, string]}
                      <img src={textureUrl(`/orbs/${cell[0]}`)} alt="" class="half half-a" />
                      <img src={textureUrl(`/orbs/${cell[1]}`)} alt="" class="half half-b" />
                    {:else}
                      <img src={textureUrl(`/orbs/${slotDisplay(rb, 'basic', i)}`)} alt="" loading="lazy" decoding="async" />
                    {/if}
                  </button>
                {/each}
                {#each rb.special as _, i}
                  <button class="orb-slot special" onclick={(e) => openSlot(e, r.id, rowIdx, 'special', i)}>
                    {#if Array.isArray(slotDisplay(rb, 'special', i))}
                      {@const cell = slotDisplay(rb, 'special', i) as [string, string]}
                      <img src={textureUrl(`/orbs/${cell[0]}`)} alt="" class="half half-a" />
                      <img src={textureUrl(`/orbs/${cell[1]}`)} alt="" class="half half-b" />
                    {:else}
                      <img src={textureUrl(`/orbs/${slotDisplay(rb, 'special', i)}`)} alt="" loading="lazy" decoding="async" />
                    {/if}
                  </button>
                {/each}
                {#if build.length > 1}
                  <button class="row-del" title="Убрать ряд" onclick={() => removeRow(r.id, rowIdx)}>✕</button>
                {/if}
              </div>
            {/each}
            {#if build.length < MAX_ROWS}
              <button class="row-add" onclick={() => addRow(r.id)}>+ Ряд</button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if openPicker}
  {@const label = openPicker.kind === 'basic' ? BASIC_ORB_TYPES : SPECIAL_ORB_TYPES}
  {@const emptyFile = openPicker.kind === 'basic' ? EMPTY_BASIC_SLOT : EMPTY_SPECIAL_SLOT}
  <div class="modal-overlay" onclick={closePicker}>
    <div class="picker-pop" onclick={(e) => e.stopPropagation()}>
      <div class="picker-modes">
        <button class:active={!comboMode} onclick={() => (comboMode = false)}>Одна</button>
        <button class:active={comboMode} onclick={() => (comboMode = true)}>Сдвоенная</button>
      </div>
      {#if !comboMode}
        <button class="picker-opt clear" onclick={() => pickOrb(openPicker.id, openPicker.rowIdx, openPicker.kind, openPicker.index, null)}>
          <img src={textureUrl(`/orbs/${emptyFile}`)} alt="" />
          <span>Очистить</span>
        </button>
        <div class="picker-grid">
          {#each label as t}
            <button class="picker-opt" onclick={() => pickOrb(openPicker.id, openPicker.rowIdx, openPicker.kind, openPicker.index, t.file)}>
              <img src={textureUrl(`/orbs/${t.file}`)} alt="" />
              <span>{t.label}</span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="combo-cols">
          <div class="combo-col">
            <div class="combo-col-title">Часть 1</div>
            {#each label as t}
              <button class="picker-opt small" class:selected={comboStaging.a === t.file} onclick={() => (comboStaging = { ...comboStaging, a: t.file })}>
                <img src={textureUrl(`/orbs/${t.file}`)} alt="" />
              </button>
            {/each}
          </div>
          <div class="combo-col">
            <div class="combo-col-title">Часть 2</div>
            {#each label as t}
              <button class="picker-opt small" class:selected={comboStaging.b === t.file} onclick={() => (comboStaging = { ...comboStaging, b: t.file })}>
                <img src={textureUrl(`/orbs/${t.file}`)} alt="" />
              </button>
            {/each}
          </div>
        </div>
        <button class="btn-apply" disabled={!comboStaging.a || !comboStaging.b} onclick={() => applyCombo(openPicker.id, openPicker.rowIdx, openPicker.kind, openPicker.index)}>Применить</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.4rem; }
  .toolbar-left { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .toolbar-right { color: #64748b; font-size: 0.8rem; }
  .btn { appearance: none; border: 1px solid rgba(255,255,255,0.12); background: rgba(22,27,34,0.9); color: #cbd5f5; border-radius: 6px; padding: 0.35rem 0.7rem; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
  .btn:hover:not(:disabled) { background: rgba(51,65,85,0.8); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-primary { background: rgba(34,197,94,0.2); border-color: rgba(34,197,94,0.4); color: #86efac; }
  .btn-primary:hover:not(:disabled) { background: rgba(34,197,94,0.32); }
  .status-msg { font-size: 0.78rem; color: #93c5fd; }
  .hint { color: #64748b; font-size: 0.74rem; margin: 0 0 0.6rem; }
  .search-input { appearance: none; border: 1px solid rgba(255,255,255,0.12); background: rgba(13,17,23,0.9); color: #e2e8f0; border-radius: 6px; padding: 0.35rem 0.6rem; font-size: 0.78rem; min-width: 200px; }
  .search-input::placeholder { color: #64748b; }

  .table-wrap { max-height: 82vh; min-height: 320px; overflow: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; background: rgba(13,17,23,0.94); }
  table { border-collapse: collapse; width: 100%; font-size: 0.78rem; table-layout: fixed; }
  thead th { position: sticky; top: 0; z-index: 2; background: #161b22; color: #94a3b8; text-align: left; padding: 0.4rem 0.5rem; font-weight: 700; white-space: nowrap; border-bottom: 1px solid rgba(255,255,255,0.12); border-right: 2px solid rgba(255,255,255,0.1); user-select: none; }
  th.sortable { cursor: pointer; }
  th.sortable:hover { color: #e2e8f0; }

  tbody td { padding: 0.35rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.04); border-right: 2px solid rgba(255,255,255,0.07); color: #cbd5f5; vertical-align: middle; }
  tbody tr:hover td { background: rgba(255,255,255,0.03); }
  tr.dirty-row td { box-shadow: inset 0 0 0 9999px rgba(96,165,250,0.06); }

  .icon-cell img { width: 34px; height: 34px; object-fit: cover; border-radius: 4px; }
  .name-cell { font-weight: 600; color: #e2e8f0; overflow: hidden; }
  .name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .type-sub { display: flex; align-items: center; gap: 0.25rem; font-weight: 400; color: #64748b; font-size: 0.7rem; margin-top: 2px; }
  .gene-cell { text-align: center; white-space: nowrap; }
  .mini-ico { width: 18px; height: 18px; vertical-align: middle; object-fit: contain; margin: 0 1px; }

  .tier-cell { text-align: center; font-weight: 800; text-shadow: 0 1px 2px rgba(0,0,0,0.6); white-space: nowrap; }

  .orbs-cell { min-width: 300px; padding-top: 0.3rem; padding-bottom: 0.3rem; }
  .orb-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
  .orb-row:last-of-type { margin-bottom: 0; }
  .row-label { width: 14px; flex-shrink: 0; text-align: center; color: #64748b; font-size: 0.66rem; font-weight: 700; }
  .row-del {
    appearance: none; border: 1px solid rgba(220,38,38,0.35); background: rgba(220,38,38,0.12); color: #fca5a5;
    border-radius: 5px; width: 22px; height: 22px; line-height: 1; cursor: pointer; font-size: 0.68rem; flex-shrink: 0;
  }
  .row-del:hover { background: rgba(220,38,38,0.25); }
  .row-add {
    appearance: none; border: 1px dashed rgba(255,255,255,0.2); background: transparent; color: #64748b;
    border-radius: 6px; padding: 3px 8px; font-size: 0.68rem; cursor: pointer; margin-top: 2px;
  }
  .row-add:hover { color: #93c5fd; border-color: #38bdf8; }

  .orb-slot { appearance: none; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.03); border-radius: 7px; padding: 2px; cursor: pointer; width: 41px; height: 41px; position: relative; overflow: hidden; flex-shrink: 0; }
  .orb-slot:hover { border-color: #38bdf8; }
  .orb-slot.special { border-color: rgba(250,204,21,0.35); }
  .orb-slot > img:not(.half) { width: 100%; height: 100%; object-fit: contain; }
  .orb-slot .half { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  .orb-slot .half-a { clip-path: inset(0 50% 0 0); }
  .orb-slot .half-b { clip-path: inset(0 0 0 50%); }

  .modal-overlay {
    position: fixed; inset: 0; z-index: 30; background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .picker-pop {
    background: #0d1117; border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px; padding: 0.7rem; max-height: min(80vh, 520px); overflow-y: auto;
    box-shadow: 0 20px 48px rgba(0,0,0,0.6); width: min(90vw, 320px);
  }
  .picker-modes { display: flex; gap: 4px; margin-bottom: 0.35rem; }
  .picker-modes button { flex: 1; appearance: none; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #94a3b8; border-radius: 5px; padding: 4px; font-size: 0.72rem; cursor: pointer; }
  .picker-modes button.active { background: rgba(56,189,248,0.2); border-color: #38bdf8; color: #7dd3fc; }
  .picker-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: 4px; }
  .picker-opt { appearance: none; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); border-radius: 6px; padding: 5px; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; color: #cbd5f5; font-size: 0.68rem; text-align: center; }
  .picker-opt:hover { background: rgba(56,189,248,0.15); border-color: #38bdf8; }
  .picker-opt img { width: 34px; height: 34px; object-fit: contain; }
  .picker-opt.clear { width: 100%; flex-direction: row; justify-content: center; }
  .picker-opt.clear img { width: 24px; height: 24px; }

  .combo-cols { display: flex; gap: 8px; }
  .combo-col { flex: 1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; align-content: start; }
  .combo-col-title { grid-column: 1 / -1; font-size: 0.68rem; color: #64748b; text-align: center; margin-bottom: 2px; }
  .picker-opt.small { padding: 4px; }
  .picker-opt.small img { width: 27px; height: 27px; }
  .picker-opt.small.selected { border-color: #38bdf8; background: rgba(56,189,248,0.2); }
  .btn-apply { width: 100%; margin-top: 0.4rem; appearance: none; border: 1px solid rgba(34,197,94,0.4); background: rgba(34,197,94,0.2); color: #86efac; border-radius: 6px; padding: 0.3rem; font-size: 0.72rem; font-weight: 600; cursor: pointer; }
  .btn-apply:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-apply:hover:not(:disabled) { background: rgba(34,197,94,0.32); }

  @media (max-width: 767px) {
    .table-wrap { max-height: 75vh; }
    table { font-size: 0.72rem; }
  }
</style>
