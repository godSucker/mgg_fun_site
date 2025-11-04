<script lang="ts">
  import { tick, onDestroy } from 'svelte';
  import type {
    MadnessMachineDefinition,
    MadnessResearchChance,
    MadnessRewardAggregate,
    MadnessSimulation,
  } from '@/lib/madness-machine';
  import {
    getMaxResearchForLevel,
    getResearchChanceBreakdown,
    getResearchLabel,
    getRewardChances,
    madnessMachine,
    simulateMadnessAsync,
  } from '@/lib/madness-machine';

  export let machine: MadnessMachineDefinition = madnessMachine;

  const discountOptions = [0, 50, 55, 60, 65, 70, 75, 80, 85, 90];

  let level = 1;
  let gold = 0;
  let tokens = 0;
  let discountValue = '0';
  let discount = 0;

  let isSimulating = false;
  let error: string | null = null;
  let result: MadnessSimulation | null = null;
  let researchChances: MadnessResearchChance[] = getResearchChanceBreakdown(level, machine);
  let rewardChances = getRewardChances(level, machine);

  let progress = 0;
  let completedSpins = 0;
  let controller: AbortController | null = null;

  const numberFormatter = new Intl.NumberFormat('ru-RU');

  function formatNumber(value: number): string {
    return numberFormatter.format(Math.floor(value));
  }

  type ResourceSummaryKey =
    | 'consumables'
    | 'stars'
    | 'spheres'
    | 'boosters'
    | 'tokens'
    | 'mutants'
    | 'jackpots';

  interface ResourceSummaryDefinition {
    label: string;
    icon: string;
    metaLabel: string;
  }

  interface ResourceSummary extends ResourceSummaryDefinition {
    key: ResourceSummaryKey;
    count: number;
    totalAmount: number;
  }

  const resourceSummaryConfig: Record<ResourceSummaryKey, ResourceSummaryDefinition> = {
    consumables: {
      label: 'Расходники',
      icon: '/med/normal_med.png',
      metaLabel: 'Ресурсов суммарно',
    },
    stars: {
      label: 'Звёзды',
      icon: '/stars/all_stars.png',
      metaLabel: 'Ресурсов суммарно',
    },
    spheres: {
      label: 'Сферы',
      icon: '/orbs/basic/orb_slot.png',
      metaLabel: 'Ресурсов суммарно',
    },
    boosters: {
      label: 'Бустеры',
      icon: '/boosters/charm_xpx2.png',
      metaLabel: 'Ресурсов суммарно',
    },
    tokens: {
      label: 'Жетоны',
      icon: '/tokens/material_jackpot_token.png',
      metaLabel: 'Ресурсов суммарно',
    },
    mutants: {
      label: 'Мутанты',
      icon: '/etc/icon_larva.png',
      metaLabel: 'Выпало суммарно',
    },
    jackpots: {
      label: 'Джекпоты',
      icon: '/cash/jackpot.png',
      metaLabel: 'Выпало суммарно',
    },
  };

  const resourceSummaryOrder: ResourceSummaryKey[] = [
    'consumables',
    'stars',
    'spheres',
    'boosters',
    'tokens',
    'mutants',
    'jackpots',
  ];

  function detectResourceSummaryKey(entry: MadnessRewardAggregate): ResourceSummaryKey {
    const { reward, label } = entry;

    if (reward.isSuperJackpot) {
      return 'jackpots';
    }

    if (reward.id?.startsWith('Specimen')) {
      return 'mutants';
    }

    const slug = reward.slug?.toLowerCase() ?? '';
    const name = label.toLowerCase();

    if (
      name.includes('жетон') ||
      slug.includes('token') ||
      slug.includes('jackpot') ||
      slug.includes('reactor')
    ) {
      return 'tokens';
    }

    if (
      name.includes('сфер') ||
      name.includes('sphere') ||
      name.includes('орб') ||
      slug.includes('orb') ||
      slug.includes('sphere')
    ) {
      return 'spheres';
    }

    if (
      name.includes('бустер') ||
      name.includes('ускорител') ||
      name.includes('чарм') ||
      name.includes('booster') ||
      slug.includes('booster') ||
      slug.includes('charm')
    ) {
      return 'boosters';
    }

    if (
      name.includes('звёзд') ||
      name.includes('звезд') ||
      name.includes('звезда') ||
      name.includes('звезды') ||
      name.includes('star') ||
      slug.includes('star') ||
      slug.includes('elite')
    ) {
      return 'stars';
    }

    if (
      name.includes('апт') ||
      name.includes('опыт') ||
      name.includes('мутостерон') ||
      name.includes('серон') ||
      name.includes('стерон') ||
      name.includes('пропуск') ||
      name.includes('experience') ||
      slug.includes('med') ||
      slug.includes('mutoster') ||
      slug.includes('steroid') ||
      slug.includes('pass') ||
      slug.includes('consumable') ||
      slug.includes('xp')
    ) {
      return 'consumables';
    }

    return 'mutants';
  }

  function buildResourceSummaries(simulation: MadnessSimulation | null): ResourceSummary[] {
    const totals = new Map<ResourceSummaryKey, { count: number; totalAmount: number }>();

    if (simulation) {
      for (const entry of simulation.rewardBreakdown) {
        const key = detectResourceSummaryKey(entry);
        const current = totals.get(key) ?? { count: 0, totalAmount: 0 };
        current.count += entry.count;
        current.totalAmount += entry.totalAmount;
        totals.set(key, current);
      }

      const jackpotBucket = totals.get('jackpots') ?? { count: 0, totalAmount: 0 };
      if (simulation.jackpotCount > jackpotBucket.count) {
        jackpotBucket.count = simulation.jackpotCount;
        jackpotBucket.totalAmount = simulation.jackpotCount;
        totals.set('jackpots', jackpotBucket);
      }
    }

    return resourceSummaryOrder.map((key) => {
      const config = resourceSummaryConfig[key];
      const bucket = totals.get(key) ?? { count: 0, totalAmount: 0 };
      return {
        key,
        label: config.label,
        icon: config.icon,
        metaLabel: config.metaLabel,
        count: bucket.count,
        totalAmount: bucket.totalAmount,
      };
    });
  }

  let resourceSummaries: ResourceSummary[] = [];
  let displayedResourceSummaries: ResourceSummary[] = [];

  function formatPercent(value: number, digits = 3): string {
    return `${(value * 100).toFixed(digits)}%`;
  }

  $: discount = Number(discountValue);
  $: multiplier = Math.max(0, (100 - discount) / 100);
  $: goldCostPerSpin = Math.ceil(machine.cost * multiplier);
  $: tokenCostPerSpin = Math.ceil(machine.tokenCost * multiplier);

  $: maxResearch = getMaxResearchForLevel(level);
  $: rewardChances = getRewardChances(level, machine);
  $: researchChances = getResearchChanceBreakdown(level, machine);

  $: tokenSpins = tokenCostPerSpin > 0 ? Math.floor(tokens / tokenCostPerSpin) : 0;
  $: goldSpins = goldCostPerSpin > 0 ? Math.floor(gold / goldCostPerSpin) : 0;
  $: totalSpins = tokenSpins + goldSpins;

  $: tokenSpent = tokenSpins * tokenCostPerSpin;
  $: goldSpent = goldSpins * goldCostPerSpin;
  $: tokenRemaining = Math.max(tokens - tokenSpent, 0);
  $: goldRemaining = Math.max(gold - goldSpent, 0);

  $: jackpotChance = researchChances.find((entry) => entry.key === 'jackpot')?.chance ?? 0;
  $: jackpotOddsRatio = jackpotChance > 0 ? 1 / jackpotChance : null;
  $: resourceSummaries = buildResourceSummaries(result);
  $: displayedResourceSummaries = resourceSummaries.filter((summary) =>
    summary.key === 'mutants' || summary.key === 'jackpots',
  );

  function resetSimulation() {
    if (controller) {
      controller.abort();
      controller = null;
    }
    result = null;
    error = null;
    progress = 0;
    completedSpins = 0;
  }

  function stopSimulation() {
    if (controller) {
      controller.abort();
      controller = null;
    }
  }

  async function handleSimulate() {
    error = null;

    if (level < 1) {
      error = 'Уровень славы игрока должен быть не менее 1.';
      return;
    }

    if (totalSpins <= 0) {
      error = 'Введите ресурсы для хотя бы одного прокрута.';
      return;
    }

    if (!Number.isFinite(level)) {
      error = 'Уровень славы игрока указан некорректно.';
      return;
    }

    result = null;
    progress = 0;
    completedSpins = 0;
    isSimulating = true;
    controller = new AbortController();

    await tick();

    try {
      const simulation = await simulateMadnessAsync(
        { level, tokenSpins, goldSpins },
        machine,
        {
          historySize: 30,
          batchSize: 2000,
          signal: controller.signal,
          onProgress(completed, total) {
            completedSpins = completed;
            progress = total > 0 ? Math.min(completed / total, 1) : 0;
          },
        },
      );
      result = simulation;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        error = 'Симуляция остановлена.';
      } else {
        console.error(err);
        error = 'Не удалось выполнить симуляцию. Попробуйте ещё раз.';
      }
    } finally {
      controller = null;
      isSimulating = false;
      progress = 0;
    }
  }

  function getActualShare(entry: MadnessRewardAggregate): string {
    if (!result || result.totalSpins <= 0) return '—';
    return `${((entry.count / result.totalSpins) * 100).toFixed(2)}%`;
  }

  function getCurrencyLabel(entry: MadnessRewardAggregate): string {
    const { token, gold } = entry.currencyCounts;
    if (!token && !gold) return '—';
    const parts: string[] = [];
    if (token) parts.push(`${formatNumber(token)} × жетоны джекпота`);
    if (gold) parts.push(`${formatNumber(gold)} × золото`);
    return parts.join(' · ');
  }

  onDestroy(() => {
    stopSimulation();
  });
</script>

<div class="madness-shell">
  <form class="control-panel" on:submit|preventDefault={handleSimulate}>
    <div class="inputs">
      <label class="field">
        <span class="label">Уровень славы игрока</span>
        <input type="number" min={1} bind:value={level} />
        <small>Максимальное исследование: {maxResearch > 0 ? maxResearch : 'не доступно'}</small>
      </label>
      <label class="field">
        <span class="label">Золото</span>
        <input type="number" min={0} step={1} bind:value={gold} />
        <small>Стоимость прокрута: {formatNumber(goldCostPerSpin)} золота</small>
      </label>
      <label class="field">
        <span class="label">Жетоны джекпота</span>
        <input type="number" min={0} step={1} bind:value={tokens} />
        <small>Стоимость прокрута: {formatNumber(tokenCostPerSpin)} жетонов джекпота</small>
      </label>
      <label class="field">
        <span class="label">Скидка</span>
        <select bind:value={discountValue}>
          {#each discountOptions as option}
            <option value={option}>{option}%</option>
          {/each}
        </select>
        <small>После скидки стоимость округляется вверх.</small>
      </label>
    </div>

    <div class="summary-grid" role="presentation">
      <div class="summary-card token-spins">
        <div class="summary-icon" aria-hidden="true">
          <img src="/tokens/material_gacha_token.png" alt="" loading="lazy" />
        </div>
        <div class="summary-body">
          <span class="title">Прокруты за жетоны джекпота</span>
          <strong>{formatNumber(tokenSpins)}</strong>
          <span class="meta">Останется: {formatNumber(tokenRemaining)} жетонов джекпота</span>
        </div>
      </div>
      <div class="summary-card gold-spins">
        <div class="summary-icon" aria-hidden="true">
          <img src="/cash/g20.png" alt="" loading="lazy" />
        </div>
        <div class="summary-body">
          <span class="title">Прокруты за золото</span>
          <strong>{formatNumber(goldSpins)}</strong>
          <span class="meta">Останется: {formatNumber(goldRemaining)} зол.</span>
        </div>
      </div>
      <div class="summary-card total-spins">
        <div class="summary-icon" aria-hidden="true">
          <img src="/etc/icon_timer.png" alt="" loading="lazy" />
        </div>
        <div class="summary-body">
          <span class="title">Всего прокрутов</span>
          <strong>{formatNumber(totalSpins)}</strong>
          <span class="meta">Открыто исследований: {maxResearch}</span>
        </div>
      </div>
      <div class="summary-card highlight jackpot-chance">
        <div class="summary-icon" aria-hidden="true">
          <img src="/etc/icon_chance.png" alt="" loading="lazy" />
        </div>
        <div class="summary-body">
          <span class="title">Шанс джекпота</span>
          <strong>{formatPercent(jackpotChance, 4)}</strong>
          <span class="meta">Для уровня {level}</span>
          {#if jackpotOddsRatio}
            <span class="meta odds">К общему количеству жетонов джекпота: 1 к {jackpotOddsRatio.toFixed(2)}</span>
          {/if}
        </div>
      </div>
    </div>

    <div class="actions">
      <button type="submit" class="primary" disabled={isSimulating}>
        {isSimulating ? 'Считаем…' : 'Запустить симуляцию'}
      </button>
      <button
        type="button"
        class={`ghost ${isSimulating ? 'danger' : ''}`}
        on:click={isSimulating ? stopSimulation : resetSimulation}
      >
        {isSimulating ? 'Остановить' : 'Очистить'}
      </button>
    </div>

    {#if isSimulating}
      <div class="progress">
        <div class="progress-bar" style={`--progress: ${Math.min(progress * 100, 100)}%`}></div>
        <div class="progress-label">
          Выполнено {Math.floor(progress * 100)}% — {formatNumber(completedSpins)} из
          {formatNumber(totalSpins)} спинов
        </div>
      </div>
    {/if}

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}
  </form>

  <section class="odds-section">
    <header>
      <h3>Шансы наград по исследованиям</h3>
      <p>Для уровня {level} доступны исследования до {maxResearch}. Всего наград: {rewardChances.length}.</p>
    </header>
    <div class="odds-table">
      {#each researchChances as group}
        <article class="odds-card">
          <header>
            <h4>{group.label}</h4>
            <span class="chance">{formatPercent(group.chance, 4)}</span>
          </header>
          <p class="odds-meta">Наград: {group.rewards.length}</p>
          <ul>
            {#each group.rewards.slice(0, 5) as reward}
              <li>
                <span>{reward.label}</span>
                <span class="value">{formatPercent(reward.chance, 4)}</span>
              </li>
            {/each}
            {#if group.rewards.length > 5}
              <li class="more">…и ещё {group.rewards.length - 5}</li>
            {/if}
          </ul>
        </article>
      {/each}
    </div>
  </section>

  {#if result}
    <section class="results">
      <header class="results-header">
        <h3>Результаты симуляции</h3>
        <p>
          Выполнено {formatNumber(result.totalSpins)} прокрутов: {formatNumber(result.tokenSpins)} за жетоны джекпота и
          {formatNumber(result.goldSpins)} за золото. Выпало джекпотов: {formatNumber(result.jackpotCount)}.
        </p>
      </header>

      <div class="resource-summary" role="presentation">
        {#if displayedResourceSummaries.length === 0}
          <p class="muted">Мутанты и джекпоты ещё не выпадали.</p>
        {:else}
          {#each displayedResourceSummaries as summary (summary.key)}
            <article class="resource-card">
              <div class="resource-icon">
                <img src={summary.icon} alt="" loading="lazy" />
              </div>
              <div class="resource-body">
                <span class="resource-title">{summary.label}</span>
                <strong>{formatNumber(summary.count)}</strong>
                <span class="resource-meta">
                  {summary.metaLabel}: {formatNumber(summary.totalAmount)}
                </span>
              </div>
            </article>
          {/each}
        {/if}
      </div>

      <div class="result-grid">
        <section class="result-column">
          <h4>По наградам</h4>
          {#if result.rewardBreakdown.length}
            <ul class="reward-board">
              {#each result.rewardBreakdown as entry, index}
                {@const currencyLabel = getCurrencyLabel(entry)}
                <li class:index-top={index < 3}>
                  <div class="icon">
                    <img src={entry.icon ?? '/etc/icon_larva.png'} alt="" loading="lazy" />
                  </div>
                  <div class="details">
                    <div class="row">
                      <span class="name">{entry.label}</span>
                      <span class="count-badge">{formatNumber(entry.count)}×</span>
                    </div>
                    <div class="pills">
                      <span class="pill actual">Факт: {getActualShare(entry)}</span>
                      <span class="pill expected">Теор: {formatPercent(entry.chance, 4)}</span>
                    </div>
                    {#if currencyLabel !== '—'}
                      <span class="currency">{currencyLabel}</span>
                    {/if}
                  </div>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="muted">Награды пока не выпадали.</p>
          {/if}
        </section>

        <section class="result-column">
          <h4>История последних выпадений</h4>
          {#if result.history.length}
            <ul class="history-list">
              {#each result.history as entry}
                <li>
                  <div class="icon">
                    <img src={entry.icon ?? '/etc/icon_larva.png'} alt="" loading="lazy" />
                  </div>
                  <div class="details">
                    <span class="name">{entry.label}</span>
                    <span class="meta">
                      {entry.currency === 'token' ? 'жетоны джекпота' : 'золото'} · {getResearchLabel(entry.researchKey)}
                    </span>
                  </div>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="muted">История пуста — запустите симуляцию.</p>
          {/if}
        </section>

        <section class="result-column">
          <h4>Распределение по исследованиям</h4>
          {#if result.researchBreakdown.length}
            <ul class="research-list">
              {#each result.researchBreakdown as entry}
                <li>
                  <span>{entry.label}</span>
                  <span class="meta">
                    {formatNumber(entry.count)}× · факт: {result.totalSpins > 0
                      ? `${((entry.count / result.totalSpins) * 100).toFixed(2)}%`
                      : '—'}
                    · теор: {formatPercent(entry.chance, 4)}
                  </span>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="muted">Нет данных для отображения.</p>
          {/if}
        </section>
      </div>
    </section>
  {/if}
</div>

<style>
  :global(body) {
    scroll-padding-top: 80px;
  }

  .madness-shell {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 1.8rem;
    padding: 2.2rem;
    border-radius: 32px;
    background: linear-gradient(145deg, rgba(24, 32, 44, 0.9), rgba(24, 17, 38, 0.92));
    border: 1px solid rgba(226, 232, 240, 0.12);
  }

  .inputs {
    display: grid;
    gap: 1.4rem;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .label {
    font-size: 0.9rem;
    color: rgba(226, 232, 240, 0.8);
  }

  input,
  select {
    height: 46px;
    padding: 0 0.9rem;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(15, 23, 42, 0.65);
    color: #e2e8f0;
    font-size: 1rem;
  }

  select {
    appearance: none;
    background-image: url('data:image/svg+xml,%3csvg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20"%3e%3cpath fill="%23cbd5f5" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.99l3.71-3.76a.75.75 0 1 1 1.08 1.04l-4.24 4.3a.75.75 0 0 1-1.07 0l-4.24-4.3a.75.75 0 0 1 .02-1.06Z"/%3e%3c/svg%3e');
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 18px;
  }

  small {
    color: rgba(148, 163, 184, 0.7);
  }

  .summary-grid {
    display: grid;
    gap: 1.2rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .summary-card {
    display: flex;
    gap: 0.85rem;
    padding: 1rem 1.1rem;
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(226, 232, 240, 0.12);
    align-items: center;
  }

  .summary-card.highlight {
    background: rgba(30, 64, 175, 0.28);
    border-color: rgba(96, 165, 250, 0.35);
  }

  .summary-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: rgba(30, 41, 59, 0.75);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .summary-icon img {
    width: 36px;
    height: 36px;
  }

  .summary-body {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    color: rgba(226, 232, 240, 0.9);
  }

  .summary-body .title {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(148, 163, 184, 0.8);
  }

  .summary-body strong {
    font-size: clamp(1.1rem, 0.95rem + 0.6vw, 1.6rem);
    color: #e2e8f0;
  }

  .summary-body .meta {
    font-size: 0.8rem;
    color: rgba(148, 163, 184, 0.75);
  }

  .summary-body .meta.odds {
    color: rgba(125, 211, 252, 0.85);
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  button {
    border: none;
    border-radius: 999px;
    padding: 0.85rem 1.8rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease;
  }

  button:disabled {
    cursor: progress;
    opacity: 0.65;
  }

  button.primary {
    background: linear-gradient(120deg, #38bdf8, #1d4ed8);
    color: #0f172a;
    box-shadow: 0 12px 26px rgba(37, 99, 235, 0.25);
  }

  button.primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 30px rgba(37, 99, 235, 0.32);
  }

  button.ghost {
    background: rgba(148, 163, 184, 0.12);
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.25);
  }

  button.ghost:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: rgba(148, 163, 184, 0.35);
  }

  button.ghost.danger {
    border-color: rgba(248, 113, 113, 0.4);
    color: #fecaca;
  }

  .progress {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .progress-bar {
    height: 8px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.2);
    position: relative;
    overflow: hidden;
  }

  .progress-bar::after {
    content: '';
    position: absolute;
    inset: 0;
    transform-origin: left;
    transform: scaleX(calc(var(--progress) / 100));
    background: linear-gradient(120deg, #38bdf8, #1d4ed8);
    transition: transform 0.2s ease;
  }

  .progress-label {
    font-size: 0.85rem;
    color: rgba(148, 163, 184, 0.85);
  }

  .error {
    color: #fecaca;
    margin: 0;
  }

  .odds-section {
    display: flex;
    flex-direction: column;
    gap: 1.8rem;
    padding: 2.2rem;
    border-radius: 32px;
    background: linear-gradient(145deg, rgba(13, 20, 32, 0.92), rgba(15, 23, 42, 0.92));
    border: 1px solid rgba(96, 165, 250, 0.2);
  }

  .odds-section header h3 {
    margin: 0 0 0.5rem;
    color: #e2e8f0;
  }

  .odds-section header p {
    margin: 0;
    color: rgba(148, 163, 184, 0.75);
  }

  .odds-table {
    display: grid;
    gap: 1.4rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .odds-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.1rem 1.2rem;
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(96, 165, 250, 0.25);
  }

  .odds-card header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  .odds-card h4 {
    margin: 0;
    color: #bae6fd;
  }

  .odds-card .chance {
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #93c5fd;
  }

  .odds-meta {
    margin: 0;
    color: rgba(148, 163, 184, 0.75);
    font-size: 0.85rem;
  }

  .odds-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.6rem;
  }

  .odds-card li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    color: rgba(226, 232, 240, 0.85);
  }

  .odds-card li .value {
    color: #60a5fa;
  }

  .odds-card li.more {
    justify-content: flex-start;
    color: rgba(148, 163, 184, 0.75);
    font-size: 0.85rem;
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2.2rem;
    border-radius: 32px;
    background: linear-gradient(145deg, rgba(13, 18, 28, 0.92), rgba(15, 23, 42, 0.95));
    border: 1px solid rgba(96, 165, 250, 0.22);
  }

  .results-header h3 {
    margin: 0 0 0.6rem;
    color: #e2e8f0;
  }

  .results-header p {
    margin: 0;
    color: rgba(148, 163, 184, 0.78);
  }

  .resource-summary {
    display: grid;
    gap: 1.2rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .resource-card {
    display: flex;
    gap: 0.9rem;
    padding: 1rem 1.15rem;
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(96, 165, 250, 0.2);
  }

  .resource-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: rgba(30, 41, 59, 0.75);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .resource-icon img {
    width: 32px;
    height: 32px;
  }

  .resource-body {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: rgba(226, 232, 240, 0.88);
  }

  .resource-title {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(148, 163, 184, 0.8);
  }

  .resource-meta {
    font-size: 0.8rem;
    color: rgba(148, 163, 184, 0.75);
  }

  .result-grid {
    display: grid;
    gap: 1.8rem;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .result-column h4 {
    margin: 0 0 1rem;
    color: #e2e8f0;
  }

  .reward-board {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .reward-board li {
    display: flex;
    gap: 0.9rem;
    padding: 1rem 1.1rem;
    border-radius: 18px;
    background: rgba(13, 19, 33, 0.78);
    border: 1px solid rgba(96, 165, 250, 0.2);
  }

  .reward-board li.index-top {
    border-color: rgba(96, 165, 250, 0.45);
  }

  .reward-board .icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: rgba(30, 41, 59, 0.75);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .reward-board .icon img {
    width: 38px;
    height: 38px;
    object-fit: contain;
  }

  .reward-board .details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .reward-board .row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
  }

  .reward-board .name {
    color: rgba(226, 232, 240, 0.9);
    font-weight: 600;
  }

  .count-badge {
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.25);
    color: #bfdbfe;
    font-size: 0.85rem;
  }

  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pill {
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    letter-spacing: 0.04em;
  }

  .pill.actual {
    background: rgba(125, 211, 252, 0.25);
    color: #bae6fd;
  }

  .pill.expected {
    background: rgba(59, 130, 246, 0.25);
    color: #93c5fd;
  }

  .currency {
    color: rgba(226, 232, 240, 0.8);
    font-size: 0.85rem;
  }

  .history-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .history-list li {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 0.9rem 1rem;
    border-radius: 18px;
    background: rgba(13, 19, 33, 0.78);
    border: 1px solid rgba(96, 165, 250, 0.22);
  }

  .history-list .icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: rgba(30, 41, 59, 0.75);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .history-list .icon img {
    width: 34px;
    height: 34px;
  }

  .history-list .details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    color: rgba(226, 232, 240, 0.85);
  }

  .history-list .meta {
    color: rgba(148, 163, 184, 0.78);
    font-size: 0.8rem;
  }

  .research-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .research-list li {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.9rem 1rem;
    border-radius: 18px;
    background: rgba(13, 19, 33, 0.78);
    border: 1px solid rgba(96, 165, 250, 0.2);
  }

  .research-list .meta {
    color: rgba(148, 163, 184, 0.8);
    font-size: 0.8rem;
  }

  .muted {
    margin: 0;
    color: rgba(148, 163, 184, 0.78);
  }

  @media (max-width: 960px) {
    .results,
    .odds-section {
      padding: 1.6rem;
      border-radius: 24px;
    }
  }
</style>
