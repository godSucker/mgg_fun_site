<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
  import {
    STAR_LABEL,
    STAR_COLOR,
    TYPE_RU,
    geneLabel,
    bingoLabel,
    ABILITY_RU
  } from '@/lib/mutant-dicts';
  import normalData from '@/data/mutants/normal.json';
  import { orbingMap } from '@/lib/orbing-map';
  import { calculateFinalStats } from '@/lib/stats/unified-calculator';

  export let open = false;
  export let mutant: any = null;
  export let star: string = 'normal';

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');

   onMount(() => {
    // Запретим браузеру масштабировать модальное окно
    document.documentElement.style.fontSize = '16px';
  });

  // ===== helpers / maps =====
  const baseId = (id?: string) =>
  String(id ?? '')
    .toLowerCase()
    // ⤵️ добавлен normal
    .replace(/_+(?:normal|bronze|silver|gold|platinum|plat).*$/i, '');

  const loreMap: Record<string, string> = {};
  const bingoMap: Record<string, string[]> = {};
  const abilitiesMap: Record<string, any[]> = {};
  const attackNamesMap: Record<string, { name1?: string; name2?: string }> = {};

  // Нормализация бинго из мутанта (string[] | {key}[] | object) с фолбэком на normal.json
$: displayBingo = (() => {
  const raw = mutant?.bingo;
  let arr: string[] = [];

  if (Array.isArray(raw)) {
    // поддержка string[] и массивов вида [{ key: "..." }]
    arr = raw.map((x: any) =>
      typeof x === 'string'
        ? x
        : (x && typeof x === 'object' && typeof x.key === 'string' ? x.key : '')
    ).filter(Boolean);
  } else if (raw && typeof raw === 'object') {
    // объект → берём ключи
    arr = Object.keys(raw);
  }

  if (arr.length) return arr;
  return bingoMap[baseId(mutant?.id)] ?? [];
})();


  for (const m of (normalData as any[])) {
    const key = String((m as any).id ?? '').toLowerCase();
    loreMap[key] = String((m as any).name_lore ?? '');
    bingoMap[key] = Array.isArray((m as any).bingo) ? (m as any).bingo as string[] : [];
    abilitiesMap[key] = Array.isArray((m as any).abilities) ? (m as any).abilities : [];
    attackNamesMap[key] = {
      name1: (m as any).name_attack1 ?? undefined,
      name2: (m as any).name_attack2 ?? undefined
    };
  }

  const TYPE_ICON: Record<string, string> = {
    zodiac: '/mut_icons/icon_zodiac.webp',
    videogame: '/mut_icons/icon_videogame.webp',
    special: '/mut_icons/icon_special.webp',
    seasonal: '/mut_icons/icon_seasonal.webp',
    recipe: '/mut_icons/icon_recipe.webp',
    pvp: '/mut_icons/icon_pvp.webp',
    heroic: '/mut_icons/icon_heroic.webp',
    legend: '/mut_icons/icon_legendary.webp',
    legends: '/mut_icons/icon_legendary.webp',
    legendary: '/mut_icons/icon_legendary.webp',
    gacha: '/mut_icons/icon_gacha.webp',
    reactor: '/mut_icons/icon_gacha.webp',
    'реактор': '/mut_icons/icon_gacha.webp'
  };
  const typeIcon = (t?: string | null) => TYPE_ICON[String(t ?? '').toLowerCase()] ?? null;

  // Genes
  const GENE_ICON: Record<string, string> = {
    a: '/genes/gene_a.webp',
    b: '/genes/gene_b.webp',
    c: '/genes/gene_c.webp',
    d: '/genes/gene_d.webp',
    e: '/genes/gene_e.webp',
    f: '/genes/gene_f.webp',
    neutro: '/genes/gene_all.webp'
  };
  const normalizeGene = (code?: string | null) => {
    if (!code) return null;
    const k = String(code).trim().toLowerCase();
    if (k === 'neutral' || k === 'none' || k === 'all') return 'neutro';
    return k;
  };
  const geneIcon = (code?: string | null) => {
    const k = normalizeGene(code);
    return k ? (GENE_ICON[k] ?? null) : null;
  };

  // Ability icons
  const ABILITY_ICON: Record<string, string> = {
    weaken: '/ability/ability_weaken.webp',
    curse: '/ability/ability_weaken.webp',
    strengthen: '/ability/ability_strengthen.webp',
    buff: '/ability/ability_strengthen.webp',
    slash: '/ability/ability_slash.webp',
    wound: '/ability/ability_slash.webp',
    bleed: '/ability/ability_slash.webp',
    shield: '/ability/ability_shield.webp',
    protect: '/ability/ability_shield.webp',
    retaliate: '/ability/ability_retaliate.webp',
    counter: '/ability/ability_retaliate.webp',
    regenerate: '/ability/ability_regenerate.webp',
    lifesteal: '/ability/ability_regenerate.webp',
    life_drain: '/ability/ability_regenerate.webp',
    drain: '/ability/ability_regenerate.webp',
    regen: '/ability/ability_regenerate.webp'
  };
  const ABILITY_RU_INV: Record<string, string> = {};
  for (const k in (ABILITY_RU as any)) {
    const v = (ABILITY_RU as any)[k];
    if (typeof v === 'string') ABILITY_RU_INV[v.toLowerCase()] = k.toLowerCase();
  }
  const abilityIcon = (name?: string | null): string | null => {
    if (!name) return null;
    const raw = String(name).trim().toLowerCase();
    if (ABILITY_ICON[raw]) return ABILITY_ICON[raw];
    const ruToCode = ABILITY_RU_INV[raw];
    if (ruToCode && ABILITY_ICON[ruToCode]) return ABILITY_ICON[ruToCode];
    const alias: Record<string, string> = {
      'проклятие': 'weaken',
      'усиление': 'strengthen',
      'рана': 'slash',
      'кровотечение': 'slash',
      'щит': 'shield',
      'отражение': 'retaliate',
      'вытягивание жизни': 'regenerate',
      'регенерация': 'regenerate'
    };
    const a = alias[raw];
    return a ? (ABILITY_ICON[a] ?? null) : null;
  };

  // Names
  const attackName = (m: any, which: 1 | 2): string => {
    const local = which === 1 ? m?.name_attack1 : m?.name_attack2;
    if (local) return String(local);
    const fb = attackNamesMap[baseId(m?.id)];
    return String((which === 1 ? fb?.name1 : fb?.name2) ?? (which === 1 ? 'Атака 1' : 'Атака 2'));
  };
  const abilityLabel = (name?: string) => {
    const raw = String(name ?? '');
    return ABILITY_RU?.[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Base fields
  $: baseStats = mutant?.base_stats ?? {};
  $: genes = Array.isArray(mutant?.genes) ? mutant.genes[0] : '';

  // Display type: show star if it exists (for rated versions), otherwise show original type
  $: displayType = mutant?.star ? mutant.star : mutant?.type;

  // Calculation Logic - Use unified calculator with debug
  const calcHP = (level: number) => {
    const stats = calculateFinalStats(baseStats, level);
    return stats.hp;
  };

  const calcAtk1 = (level: number) => {
    const stats = calculateFinalStats(baseStats, level);
    return stats.atk1;
  };

  const calcAtk2 = (level: number) => {
    const stats = calculateFinalStats(baseStats, level);
    return stats.atk2;
  };

  const calcBank = (level: number) => {
    const stats = calculateFinalStats(baseStats, level);
    return Math.round(stats.silver);
  };

  const calcSpeed = () => {
    const stats = calculateFinalStats(baseStats, 1);
    // Round to hundredths (2 decimal places)
    return Math.round(stats.speed * 100) / 100;
  };

  const getAbilityValue = (level: number, abilityIndex: number): number => {
    const stats = calculateFinalStats(baseStats, level);
    // Return pre-calculated ability values from mutant data if available
    const abilities = mutant?.abilities ?? [];
    if (abilityIndex < abilities.length && abilities[abilityIndex]) {
      const ability = abilities[abilityIndex];
      // Check if this is a retaliate ability (always uses ATK1 values)
      const isRetaliate = ability.name?.toLowerCase().includes('retaliate') ?? false;

      if (level < 25) {
        if (isRetaliate || abilityIndex === 0) {
          return ability.value_atk1_lvl1 ?? 0;
        } else {
          return ability.value_atk2_lvl1 ?? 0;
        }
      } else {
        if (isRetaliate || abilityIndex === 0) {
          return ability.value_atk1_lvl30 ?? 0;
        } else {
          return ability.value_atk2_lvl30 ?? 0;
        }
      }
    }
    // Fallback to calculated value
    return abilityIndex === 0 ? stats.ability : 0;
  };

  const getAbilityPct = (level: number) => {
    // Перед уровнем 25 используем abilityPct1, после 25 - abilityPct2
    return level < 25 ? (baseStats.abilityPct1 ?? 0) : (baseStats.abilityPct2 ?? 0);
  };

  const imgSrc = (m: any) => {
    const list: string[] = m?.image ?? [];
    const pick =
      list.find((p) => p.includes('textures_by_mutant/') && !p.includes('specimen') && !p.includes('larva')) || list[0];
    if (!pick) return '/placeholder-mutant.webp';
    return pick.startsWith('/') ? pick : `/${pick}`;
  };

  // pct parsing
  const parsePct = (val: any): number => {
    if (val == null) return NaN;
    const match = String(val).match(/-?\d*\.?\d+/);
    return match ? parseFloat(match[0]) : NaN;
  };

  // formatting
  function fmt(n: any): string {
    if (n === undefined || n === null || n === '' || Number.isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('ru-RU');
  }
  function fmtNoSign(v: any): string {
    if (v === undefined || v === null || v === '' || Number.isNaN(Number(v))) return '—';
    const num = Number(v);
    if (Number.isFinite(num)) return Math.abs(num).toLocaleString('ru-RU');
    return String(v).replace(/^-+/, '');
  }

  // rows
  type Row = {
    atkName: string;
    dmg: any;
    abCode: string | null;
    abName: string;
    value: any;
    pct: any;
    gene?: string | null;
    isAoe?: boolean;
  };

  function getRows(level: number) {
    const atk1 = calcAtk1(level);
    const atk2 = calcAtk2(level);

    const baseLvl = level === 1 ? baseStats.lvl1 : baseStats.lvl30;
    const gene1 = baseLvl?.atk1_gene || 'neutro';
    const gene2 = baseLvl?.atk2_gene || 'neutro';
    const aoe1 = baseLvl?.atk1_AOE ?? false;
    const aoe2 = baseLvl?.atk2_AOE ?? false;

    const list = (Array.isArray(mutant?.abilities) ? mutant.abilities : (abilitiesMap[baseId(mutant?.id)] ?? [])) as any[];

    const rows: Row[] = [];

    // Check if both abilities are retaliate (special case - both apply to ATK1)
    const bothRetaliate = list.length >= 2 &&
      list[0]?.name?.toLowerCase().includes('retaliate') &&
      list[1]?.name?.toLowerCase().includes('retaliate');

    // Atk 1
    let ab1, abilityIndex1;
    if (bothRetaliate) {
      // Both retaliate abilities apply to first attack - select based on level
      ab1 = level < 25 ? list[0] : list[1];
      abilityIndex1 = level < 25 ? 0 : 1;
    } else {
      ab1 = list[0];
      abilityIndex1 = 0;
    }

    if (ab1) {
      const value1 = getAbilityValue(level, abilityIndex1);
      rows.push({
        atkName: attackName(mutant, 1),
        dmg: atk1,
        abCode: ab1.name || null,
        abName: ab1.name ? abilityLabel(ab1.name) : '—',
        value: value1,
        pct: ab1.pct,
        gene: gene1,
        isAoe: aoe1
      });
    }

    // Atk 2 - always show attack, but without ability if both are retaliate
    const ab2 = bothRetaliate ? null : list[1];
    rows.push({
      atkName: attackName(mutant, 2),
      dmg: atk2,
      abCode: ab2?.name || null,
      abName: ab2?.name ? abilityLabel(ab2.name) : '—',
      value: ab2 ? getAbilityValue(level, 1) : 0,
      pct: ab2?.pct ?? 0,
      gene: gene2,
      isAoe: aoe2
    });

    return rows;
  }

  $: rowsLvl1 = getRows(1);
  $: rowsLvl30 = getRows(30);

  // Misc
  $: incubTime =
    mutant?.incub_time ??
    mutant?.incubation ??
    mutant?.incubation_time ??
    mutant?.incubationTime ??
    mutant?.incubation_hours ??
    mutant?.hatch_time ??
    null;

  // Orbing ID matching logic
  const getOrbingImages = (m: any) => {
    if (!m) return null;
    const id = String(m.id || '');
    // Try exact ID
    if (orbingMap[id]) return orbingMap[id];
    // Try Case-insensitive ID
    const entry = Object.entries(orbingMap).find(([k]) => k.toLowerCase() === id.toLowerCase());
    if (entry) return entry[1];
    // Try baseId
    const bId = baseId(id);
    const entryBase = Object.entries(orbingMap).find(([k]) => k.toLowerCase() === bId.toLowerCase());
    if (entryBase) return entryBase[1];
    return null;
  };

  $: orbingImages = getOrbingImages(mutant);
  $: chanceVal = mutant?.chance ?? mutant?.chance_percent ?? null;

  // ===== a11y: focus trap =====
  let modalRef: HTMLElement;
  let closeBtn: HTMLButtonElement;

  function focusFirst() {
    if (!modalRef) return;
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    const list = Array.from(modalRef.querySelectorAll<HTMLElement>(selectors))
      .filter((el) => el.offsetParent !== null);
    (list[0] || closeBtn)?.focus();
  }

  function onKeydownTrap(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    const items = Array.from(modalRef.querySelectorAll<HTMLElement>(selectors))
      .filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    }
  }

  // ESC
  let escHandler: (e: KeyboardEvent) => void;
  onMount(() => {
    escHandler = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', escHandler);
  });
  onDestroy(() => window.removeEventListener('keydown', escHandler));

 // Открывать верхом и давать фокус
  $: if (open) { (async () => { await tick(); try{ modalRef?.scrollTo({ top: 0, behavior: 'auto' }); }catch{}; focusFirst(); })(); }
</script>

{#if open}
<div
  class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center p-2 md:p-3 overflow-y-auto overscroll-contain"
  on:click|self={close}
  aria-hidden="false"
>
  <div
    bind:this={modalRef}
    role="dialog"
    aria-modal="true"
    aria-labelledby="mutant-title"
    on:keydown={onKeydownTrap}
    class="modal-2k relative w-full max-w-5xl grid md:grid-cols-[minmax(0,42%)_minmax(0,58%)] gap-2 md:gap-4 bg-slate-800/70 rounded-2xl max-h-[92svh] overflow-y-auto ring-1 ring-white/10"
  >
    <!-- Left -->
    <div class="bg-gradient-to-b from-slate-900/80 to-slate-800/70 rounded-xl p-2 md:p-3 flex items-center justify-center ring-1 ring-white/10 overflow-hidden">
      <img
        alt={mutant?.name}
        src={imgSrc(mutant)}
        class="max-h-[290px] md:max-h-[480px] object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        width="640"
        height="640"
      />
    </div>

    <!-- Right -->
    <div class="space-y-2 md:space-y-3 p-2 md:p-3 min-w-0">
      <!-- Header -->
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h2 id="mutant-title" class="text-lg md:text-xl font-bold tracking-wide break-words">{mutant?.name}</h2>
          <div class="mt-0.5 text-xs md:text-sm text-white/70 flex items-center gap-2 flex-wrap">
            {#if mutant?.star}
              <!-- Show star/rating for rated versions -->
              <span class="break-words">{STAR_LABEL[mutant.star] ?? mutant.star}</span>
            {:else if typeIcon(displayType)}
              <!-- Show type icon for non-rated versions -->
              <span class="inline-flex items-center gap-1 break-words">
                <img class="type-icon opacity-90" src={typeIcon(displayType)} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                {TYPE_RU[displayType] ?? displayType}
              </span>
            {:else}
              <!-- Fallback: show type without icon -->
              <span class="break-words">{TYPE_RU[displayType] ?? displayType}</span>
            {/if}
            {#if genes}
              <span class="opacity-70">•</span>{geneLabel(genes)}
            {/if}
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          {#if mutant?.tier}
            <span class="px-2 py-1 rounded-full text-[11px] bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-500/40">Тир {mutant.tier}</span>
          {/if}
          <span class={`px-2 py-1 rounded-full text-[10px] ring-1 ${STAR_COLOR[star]}`}>{STAR_LABEL[star] ?? star}</span>
        </div>
      </div>

      <!-- Lvl 1 -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 px-2 py-1.5 overflow-hidden">
        <div class="text-xs text-white/60 mb-1.5">Статы на 1 уровне</div>
        <dl class="grid grid-cols-2 gap-y-[2px] text-sm mb-1">
          <dt class="mut-dt"><span class="row-icon"><img class="stat-icon" src="/etc/icon_hp.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />HP</span></dt><dd class="mut-dd whitespace-nowrap pl-1">{fmt(calcHP(1))}</dd>
          <dt class="mut-dt"><span class="row-icon"><img class="stat-icon" src="/etc/icon_speed.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />Скорость</span></dt><dd class="mut-dd whitespace-nowrap pl-1">{fmt(calcSpeed())}</dd>
        </dl>

        <div class="mt-1 grid grid-cols-[26px_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-[2px] text-sm min-w-0">
          {#each rowsLvl1 as r}
            <div class="contents group">
              <div class="flex items-center">
                {#if geneIcon(r.gene)}
                  <span class="gene-ico">
                    <img src={geneIcon(r.gene)} alt="" aria-hidden="true" class="w-full h-full" loading="lazy" decoding="async" />
                    {#if r.isAoe}
                      <img src="/genes/atk_multiple.webp" alt="" aria-hidden="true" class="gene-aoe" loading="lazy" decoding="async" />
                    {/if}
                  </span>
                {/if}
              </div>
              <div class="mut-dt break-words">{r.atkName}</div>
              <div class="mut-dd whitespace-nowrap pl-1">{fmt(r.dmg)}</div>
              <div class="mut-dt break-words flex items-center gap-1.5">
                {#if abilityIcon(r.abCode) || abilityIcon(r.abName)}
                  <img class="ability-icon align-middle" src={abilityIcon(r.abCode) || abilityIcon(r.abName)} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                {/if}
                {r.abName}
              </div>
              <div class="mut-dd text-right min-w-0">
                <div class="break-words">{fmtNoSign(r.value)}</div>
              </div>
            </div>
          {/each}
          {#if !rowsLvl1.length}
            <div class="col-span-5 text-sm text-white/50">—</div>
          {/if}
        </div>
      </div>

      <!-- Lvl 30 -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 px-2 py-1.5 overflow-hidden">
        <div class="text-xs text-white/60 mb-1.5">Статы на 30 уровне</div>
        <dl class="grid grid-cols-2 gap-y-[2px] text-sm mb-1">
          <dt class="mut-dt"><span class="row-icon"><img class="stat-icon" src="/etc/icon_hp.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />HP</span></dt><dd class="mut-dd whitespace-nowrap pl-1">{fmt(calcHP(30))}</dd>
          <dt class="mut-dt"><span class="row-icon"><img class="stat-icon" src="/etc/icon_speed.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />Скорость</span></dt><dd class="mut-dd whitespace-nowrap pl-1">{fmt(calcSpeed())}</dd>
        </dl>

        <div class="mt-1 grid grid-cols-[26px_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-[2px] text-sm min-w-0">
          {#each rowsLvl30 as r}
            <div class="contents group">
              <div class="flex items-center">
                {#if geneIcon(r.gene)}
                  <span class="gene-ico">
                    <img src={geneIcon(r.gene)} alt="" aria-hidden="true" class="w-full h-full" loading="lazy" decoding="async" />
                    {#if r.isAoe}
                      <img src="/genes/atk_multiple.webp" alt="" aria-hidden="true" class="gene-aoe" loading="lazy" decoding="async" />
                    {/if}
                  </span>
                {/if}
              </div>
              <div class="mut-dt break-words">{r.atkName}</div>
              <div class="mut-dd whitespace-nowrap pl-1">{fmt(r.dmg)}</div>
              <div class="mut-dt break-words flex items-center gap-1.5">
                {#if abilityIcon(r.abCode) || abilityIcon(r.abName)}
                  <img class="ability-icon align-middle" src={abilityIcon(r.abCode) || abilityIcon(r.abName)} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                {/if}
                {r.abName}
              </div>
              <div class="mut-dd text-right min-w-0">
                <div class="break-words">{fmtNoSign(r.value)}</div>
              </div>
            </div>
          {/each}
          {#if !rowsLvl30.length}
            <div class="col-span-5 text-sm text-white/50">—</div>
          {/if}
        </div>
      </div>

      <!-- Bingo -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-2 overflow-hidden">
        <div class="text-xs text-white/60 mb-1"><span class="row-icon"><img class="stat-icon" src="/etc/icon_bingo.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />Бинго</span></div>
        {#if displayBingo.length}
          <div class="flex flex-wrap gap-2">
              {#each displayBingo as b}
              <span class="text-[11px] px-2 py-1 rounded-full bg-indigo-500/15 ring-1 ring-indigo-500/40 text-indigo-100 break-words">{bingoLabel(b)}</span>
            {/each}
          </div>
        {:else}
          <div class="text-sm text-white/50">—</div>
        {/if}
      </div>

      <!-- Misc -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-2 overflow-hidden">
        <div class="text-xs text-white/60 mb-1">Прочее</div>
        <div class="text-sm text-white/80 space-y-1">
          <div class="flex items-center gap-2 leading-tight">
            <span class="row-icon"><img class="stat-icon" src="/cash/softcurrency.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />Серебро (лвл 1):</span>
            <span class="text-white">{fmt(calcBank(1))}</span>
          </div>
          <div class="flex items-center gap-2 leading-tight">
            <span class="row-icon"><img class="stat-icon" src="/etc/icon_timer.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />Инкубация:</span>
            <span class="text-white">{incubTime ?? '—'}</span>{#if incubTime != null}<span class="opacity-80"> мин.</span>{/if}
          </div>
          <div class="flex items-center gap-2 leading-tight">
            <span class="row-icon"><img class="stat-icon" src="/etc/icon_chance.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />Шанс:</span>
            <span class="text-white">{chanceVal ?? '—'}</span>{#if chanceVal != null}<span class="opacity-80"> %</span>{/if}
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-2 overflow-hidden">
        <div class="text-xs text-white/60 mb-1">Описание</div>
        <div class="text-sm text-white/70 leading-relaxed break-words">
          { (loreMap[baseId(mutant?.id)] ?? mutant?.name_lore ?? '').trim() || '—' }
        </div>
      </div>

      <!-- Spheres -->
      <div class="rounded-lg bg-slate-900/60 ring-1 ring-white/10 p-2 overflow-hidden">
        <div class="text-xs text-white/60 mb-2">Сферовка</div>
        {#if orbingImages && orbingImages.rows}
          <div class="flex flex-col items-center gap-3 py-2">
            {#each orbingImages.rows as row}
              <div class="flex items-center justify-center gap-3">
                {#each row as orbFile}
                  <div class="w-12 h-12 md:w-16 md:h-16 flex-shrink-0 relative group">
                    <img
                      src={orbFile.startsWith('special/') ? '/orbs/special/orb_slot_spe.webp' : '/orbs/basic/orb_slot.webp'}
                      alt=""
                      class="absolute inset-0 w-full h-full opacity-40"
                    />
                    <img
                      src={`/orbs/${orbFile}`}
                      alt="Orb"
                      class="relative z-10 w-full h-full drop-shadow-md transition-transform group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                {/each}
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-sm text-white/70 italic flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse"></span>
            Сферовки скоро появятся...
          </div>
        {/if}
      </div>

      <!-- Close -->
      <div class="mt-0 flex items-center justify-end">
        <button
          bind:this={closeBtn}
          class="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/50"
          on:click={close}
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
</div>
{/if}

<style>
  :root {
    font-size: 16px;
  }

  .stat-icon { width: 24px; height: 24px; display:inline-block; }
  .type-icon { width: 26px; height: 26px; display:inline-block; }
  .ability-icon { width: 24px; height: 24px; display:inline-block; vertical-align: middle; }
  .row-icon { display: inline-flex; align-items: center; gap: .45rem; }
  .mut-dt { color: rgba(255,255,255,.6); }
  .mut-dd { color: rgba(255,255,255,.9); }
  .break-words { overflow-wrap: break-word; word-break: break-word; }

  .gene-ico {
    position: relative;
    width: 26px;
    height: 26px;
    display: inline-block;
  }

  .gene-aoe {
    position: absolute;
    right: -6px;
    top: 0;
    bottom: 0;
    margin: auto 0;
    height: 100%;
    width: auto;
    pointer-events: none;
    filter: drop-shadow(0 1px 1px rgba(0,0,0,.55));
    opacity: .88;
    transition: opacity .12s linear;
  }
  .group:hover .gene-aoe { opacity: .96; }

  /* Мобильные устройства */
  @media (max-width: 1200px) {
    :root {
      font-size: 16px;
    }

    .stat-icon { width: 18px; height: 18px; }
    .type-icon { width: 20px; height: 20px; }
    .ability-icon { width: 18px; height: 18px; }
    .gene-ico { width: 20px; height: 20px; }
    .gene-aoe { right: -3px; }
  }

  @media (max-width: 640px) {
    .stat-icon { width: 16px; height: 16px; }
    .type-icon { width: 18px; height: 18px; }
    .ability-icon { width: 16px; height: 16px; }
    .gene-ico { width: 18px; height: 18px; }
    .mut-dt, .mut-dd { font-size: 11px; }
  }

  @media (max-width: 400px) {
    .stat-icon { width: 14px; height: 14px; }
    .type-icon { width: 16px; height: 16px; }
    .ability-icon { width: 14px; height: 14px; }
    .gene-ico { width: 16px; height: 16px; }
    .mut-dt, .mut-dd { font-size: 10px; }
  }
</style>
