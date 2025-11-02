<script lang="ts">
  import type {
    LuckyMachineDefinition,
    LuckyRewardAggregate,
    LuckyRewardChance,
    LuckySimulation,
  } from '@/lib/lucky-machine';
  import {
    formatNumber,
    getRewardWithChance,
    simulateLuckyMachineAsync,
  } from '@/lib/lucky-machine';
  import { onDestroy, tick } from 'svelte';

  export let machine: LuckyMachineDefinition;

  const rewardChances: LuckyRewardChance[] = machine.rewards
    .filter((reward) => reward.odds > 0)
    .map((reward) => getRewardWithChance(reward, machine))
    .sort((a, b) => b.chance - a.chance);

  let spins = 200;
  let isSimulating = false;
  let error: string | null = null;
  let result: LuckySimulation | null = null;
  let progress = 0;
  let completedPaid = 0;
  let controller: AbortController | null = null;

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

  const rewardChanceMap = new Map<number, number>();
  for (const reward of rewardChances) {
    rewardChanceMap.set(reward.rewardId, reward.chance);
  }

  function detectResourceSummaryKey(entry: LuckyRewardAggregate): ResourceSummaryKey | null {
    const { reward } = entry;
    const name = reward.name.toLowerCase();
    const slug = reward.id?.toLowerCase?.() ?? '';

    if (reward.isSuperJackpot || reward.category === 'jackpot' || name.includes('джекпот')) {
      return 'jackpots';
    }

    if (reward.category === 'mutant' || slug.includes('specimen') || name.includes('мутант')) {
      return 'mutants';
    }

    if (
      reward.category === 'token' ||
      name.includes('жетон') ||
      slug.includes('token') ||
      slug.includes('jackpot') ||
      slug.includes('reactor')
    ) {
      return 'tokens';
    }

    if (
      reward.category === 'orb' ||
      name.includes('сфер') ||
      name.includes('sphere') ||
      name.includes('орб') ||
      slug.includes('orb')
    ) {
      return 'spheres';
    }

    if (
      reward.category === 'booster' ||
      name.includes('бустер') ||
      name.includes('ускорител') ||
      name.includes('чарм') ||
      slug.includes('booster') ||
      slug.includes('charm')
    ) {
      return 'boosters';
    }

    if (
      reward.category === 'star' ||
      name.includes('звёзд') ||
      name.includes('звезд') ||
      name.includes('звезда') ||
      name.includes('звезды') ||
      name.includes('star') ||
      slug.includes('star')
    ) {
      return 'stars';
    }

    if (
      reward.category === 'material' ||
      reward.category === 'special' ||
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

    return null;
  }

  function buildResourceSummaries(simulation: LuckySimulation | null): ResourceSummary[] {
    const totals = new Map<ResourceSummaryKey, { count: number; totalAmount: number }>();

    if (simulation) {
      for (const entry of simulation.breakdown) {
        const key = detectResourceSummaryKey(entry);
        if (!key) continue;
        const current = totals.get(key) ?? { count: 0, totalAmount: 0 };
        current.count += entry.count;
        current.totalAmount += entry.totalAmount;
        totals.set(key, current);
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
  let jackpotCount = 0;

  function formatPercent(value: number, digits = 2): string {
    return `${(value * 100).toFixed(digits)}%`;
  }

  function getActualShare(entry: LuckyRewardAggregate): string {
    if (!result || result.totalSpins <= 0) return '—';
    return formatPercent(entry.count / result.totalSpins, 2);
  }

  function getExpectedShare(entry: LuckyRewardAggregate): string {
    const chance = rewardChanceMap.get(entry.reward.rewardId);
    if (chance == null) return '—';
    return formatPercent(chance, 4);
  }

  function getCurrencyLabel(entry: LuckyRewardAggregate): string {
    const { reward, totalAmount } = entry;
    if (reward.type === 'hardcurrency') {
      return `${formatNumber(totalAmount)} × золото`;
    }
    if (reward.type === 'softcurrency') {
      return `${formatNumber(totalAmount)} × серебро`;
    }
    if (reward.category === 'token') {
      return `${formatNumber(totalAmount)} × жетоны джекпота`;
    }
    return '—';
  }

  function resetSimulation() {
    if (controller) {
      controller.abort();
      controller = null;
    }
    result = null;
    progress = 0;
    completedPaid = 0;
    error = null;
  }

  function stopSimulation() {
    if (controller) {
      controller.abort();
      controller = null;
    }
  }

  async function handleSimulate() {
    error = null;

    if (!Number.isFinite(spins) || spins <= 0) {
      error = 'Введите положительное количество прокрутов.';
      return;
    }

    result = null;
    progress = 0;
    completedPaid = 0;

    isSimulating = true;
    controller = new AbortController();

    await tick();

    try {
      const simulation = await simulateLuckyMachineAsync(spins, machine, {
        historySize: 24,
        batchSize: 1800,
        signal: controller.signal,
        onProgress(completed) {
          completedPaid = completed;
          progress = spins > 0 ? Math.min(completed / spins, 1) : 0;
        },
      });

      result = simulation;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        error = 'Симуляция остановлена.';
      } else {
        console.error(err);
        error = 'Не удалось выполнить симуляцию. Попробуйте снова.';
      }
    } finally {
      controller = null;
      isSimulating = false;
      progress = 0;
      completedPaid = 0;
    }
  }

  function getFreeSpinRate(sim?: LuckySimulation | null): string {
    if (!sim || sim.totalSpins === 0) return '—';
    const rate = (sim.freeSpins / sim.totalSpins) * 100;
    return `${rate.toFixed(2)}%`;
  }

  function getFreeSpinRatio(sim?: LuckySimulation | null): string {
    if (!sim || sim.freeSpins === 0) return '—';
    const ratio = sim.freeSpins > 0 ? sim.paidSpins / sim.freeSpins : 0;
    if (!Number.isFinite(ratio) || ratio <= 0) return '—';
    return `1 к ${ratio.toFixed(2)}`;
  }

  $: resourceSummaries = buildResourceSummaries(result);
  $: jackpotCount = resourceSummaries.find((summary) => summary.key === 'jackpots')?.count ?? 0;

  onDestroy(() => {
    stopSimulation();
  });
</script>

<div class="machine-shell">
  <div class="machine-body">
    <div class="machine-header">
      <span class="machine-tag">Lucky Slots</span>
      <h2>{machine.title}</h2>
      <p>
        Крутите слот-машину с реальными шансами. Бесплатные прокруты добавляются
        автоматически, так что можно увидеть, сколько бонусов приносит рулетка.
      </p>
    </div>

    <form class="control-panel" on:submit|preventDefault={handleSimulate}>
      <label class="input-group">
        <span>Количество платных прокрутов</span>
        <div class="input-wrapper">
          <input
            type="number"
            min={1}
            step={1}
            bind:value={spins}
            aria-describedby="spins-hint"
          />
          <span class="suffix">спинов</span>
        </div>
        <small id="spins-hint">Бесплатные спины считаются отдельно и не требуют жетонов джекпота.</small>
      </label>

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
            Выполнено {Math.min(Math.floor(progress * 100), 100)}% —
            {formatNumber(completedPaid)} из {formatNumber(spins)} платных прокрутов
          </div>
        </div>
      {/if}

      {#if error}
        <p class="error">{error}</p>
      {/if}
    </form>

    {#if result}
      <section class="stats">
        <div class="stat-card metric total-spins">
          <div class="metric-icon" aria-hidden="true">
            <img src="/etc/icon_timer.png" alt="" loading="lazy" />
          </div>
          <div class="metric-body">
            <span class="label">Всего прокрутов</span>
            <strong>{formatNumber(result.totalSpins)}</strong>
          </div>
        </div>
        <div class="stat-card metric paid-spins">
          <div class="metric-icon" aria-hidden="true">
            <img src="/tokens/material_gacha_token.png" alt="" loading="lazy" />
          </div>
          <div class="metric-body">
            <span class="label">Платных</span>
            <strong>{formatNumber(result.paidSpins)}</strong>
          </div>
        </div>
        <div class="stat-card metric highlight free-spins">
          <div class="metric-icon" aria-hidden="true">
            <img src="/etc/freespin.png" alt="" loading="lazy" />
          </div>
          <div class="metric-body">
            <span class="label">Бесплатных</span>
            <strong>{formatNumber(result.freeSpins)}</strong>
            <small>Доля: {getFreeSpinRate(result)} • Каждые {getFreeSpinRatio(result)}</small>
          </div>
        </div>
        <div class="stat-card currency">
          <img class="stat-icon" src="/cash/g20.png" alt="Иконка золота" loading="lazy" />
          <div class="stat-body">
            <span class="label">Выиграно золота</span>
            <strong>{formatNumber(result.goldWon)}</strong>
          </div>
        </div>
        <div class="stat-card currency">
          <img class="stat-icon" src="/cash/softcurrency.png" alt="Иконка серебра" loading="lazy" />
          <div class="stat-body">
            <span class="label">Выиграно серебра</span>
            <strong>{formatNumber(result.silverWon)}</strong>
          </div>
        </div>
        <div class="stat-card currency">
          <img
            class="stat-icon"
            src="/tokens/material_gacha_token.png"
            alt="Иконка жетона джекпота"
            loading="lazy"
          />
          <div class="stat-body">
            <span class="label">Жетоны</span>
            <strong>{formatNumber(result.tokenItems)}</strong>
          </div>
        </div>
      </section>
      <section class="results">
        <header class="results-header">
          <h3>Результаты симуляции</h3>
          <p>
            Выполнено {formatNumber(result.totalSpins)} прокрутов: {formatNumber(result.paidSpins)} платных и
            {formatNumber(result.freeSpins)} бесплатных. Выпало джекпотов: {formatNumber(jackpotCount)}.
          </p>
        </header>

        <div class="resource-summary" role="presentation">
          {#each resourceSummaries as summary (summary.key)}
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
        </div>

        <div class="result-grid">
          <section class="result-column">
            <h4>По наградам</h4>
            {#if result.breakdown.length}
              <ul class="reward-board">
                {#each result.breakdown as entry, index}
                  {@const totalLabel = getCurrencyLabel(entry)}
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
                        <span class="pill expected">Теор: {getExpectedShare(entry)}</span>
                      </div>
                      {#if totalLabel !== '—'}
                        <span class="currency">{totalLabel}</span>
                      {:else if entry.totalAmount > entry.count}
                        <span class="currency">{formatNumber(entry.totalAmount)} шт.</span>
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
                {#each result.history as spin}
                  <li class:free-spin={spin.type === 'free-spin'}>
                    <div class="history-info">
                      <img src={spin.icon ?? '/etc/icon_larva.png'} alt="" loading="lazy" />
                      <span class="title">{spin.label}</span>
                    </div>
                    {#if spin.type === 'free-spin'}
                      <span class="note">+1 спин</span>
                    {:else}
                      <span class="note">{formatNumber(spin.reward.amount)}×</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="muted">Запустите симуляцию, чтобы увидеть историю.</p>
            {/if}
          </section>
        </div>
      </section>
    {/if}
  </div>

  <aside class="odds-panel">
    <h3>Теоретические шансы</h3>
    <p class="odds-caption">Каждый процент рассчитан из реальных весов наград.</p>
    <ul class="odds-list">
      {#each rewardChances as reward}
        <li>
          <span class="odds-name">
            <img class="odds-icon" src={reward.icon} alt={reward.name} loading="lazy" />
            <span class="name">{reward.name}</span>
          </span>
          <span class="chance">{(reward.chance * 100).toFixed(4)}%</span>
        </li>
      {/each}
    </ul>
  </aside>
</div>

<style>
  .machine-shell {
    display: grid;
    gap: 1.75rem;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    align-items: start;
  }

  .machine-body {
    background: linear-gradient(150deg, rgba(124, 77, 255, 0.25), rgba(16, 14, 26, 0.92));
    border: 1px solid rgba(129, 140, 248, 0.35);
    border-radius: 34px;
    padding: 2.25rem;
    box-shadow: 0 28px 46px rgba(92, 107, 192, 0.25);
    display: flex;
    flex-direction: column;
    gap: 2.25rem;
  }

  .machine-header {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    color: rgba(226, 232, 240, 0.9);
  }

  .machine-header h2 {
    margin: 0;
    font-size: 2.4rem;
    color: #e0e7ff;
  }

  .machine-header p {
    margin: 0;
    line-height: 1.7;
    color: rgba(226, 232, 240, 0.75);
  }

  .machine-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1.1rem;
    border-radius: 999px;
    background: rgba(124, 77, 255, 0.35);
    color: #c7b8ff;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 0.78rem;
  }

  .control-panel {
    display: grid;
    gap: 1.35rem;
  }

  .input-group span {
    display: block;
    font-size: 0.95rem;
    color: #e0e7ff;
    margin-bottom: 0.4rem;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-wrapper input {
    width: 100%;
    padding: 0.75rem 3.5rem 0.75rem 1rem;
    border-radius: 16px;
    border: 1px solid rgba(129, 140, 248, 0.5);
    background: rgba(12, 10, 24, 0.85);
    color: #e0e7ff;
    font-size: 1.05rem;
    font-weight: 600;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .input-wrapper input:focus {
    outline: none;
    border-color: #c7b8ff;
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.3);
  }

  .suffix {
    position: absolute;
    right: 1rem;
    color: rgba(226, 232, 240, 0.6);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  small {
    color: rgba(148, 163, 184, 0.7);
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  button {
    border: none;
    border-radius: 999px;
    padding: 0.85rem 1.9rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  }

  button.primary {
    background: linear-gradient(120deg, #7c4dff, #c084fc);
    color: #0f172a;
    box-shadow: 0 16px 35px rgba(124, 77, 255, 0.35);
  }

  button.primary:disabled {
    opacity: 0.7;
    cursor: progress;
    box-shadow: none;
  }

  button.ghost {
    background: rgba(129, 140, 248, 0.12);
    color: #c7d2fe;
  }

  button.ghost.danger {
    background: rgba(248, 113, 113, 0.18);
    color: #fecaca;
  }

  button:not(:disabled):hover {
    transform: translateY(-2px);
  }

  .progress {
    position: relative;
    border-radius: 14px;
    border: 1px solid rgba(129, 140, 248, 0.25);
    overflow: hidden;
    background: rgba(15, 23, 42, 0.75);
  }

  .progress-bar {
    width: var(--progress, 0%);
    height: 100%;
    background: linear-gradient(90deg, rgba(124, 77, 255, 0.6), rgba(192, 132, 252, 0.8));
    transition: width 0.2s ease;
  }

  .progress-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    color: #e0e7ff;
  }

  .error {
    margin: 0;
    color: #fecaca;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    padding: 0.75rem 1rem;
    border-radius: 12px;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.85rem;
  }

  .stat-card {
    background: rgba(17, 24, 39, 0.55);
    border-radius: 18px;
    padding: 0.95rem 1.1rem;
    border: 1px solid rgba(148, 163, 184, 0.16);
    display: flex;
    align-items: center;
    gap: 0.85rem;
    color: rgba(226, 232, 240, 0.88);
    min-width: 0;
    box-shadow: none;
  }

  .stat-card.highlight {
    background: rgba(129, 140, 248, 0.16);
    border-color: rgba(129, 140, 248, 0.32);
  }

  .metric-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 14px;
    background: rgba(129, 140, 248, 0.15);
    border: none;
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .metric-icon img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  .metric-body,
  .stat-body {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
    color: rgba(226, 232, 240, 0.88);
    min-width: 0;
    justify-content: center;
    align-items: flex-start;
    text-align: left;
  }

  .stat-card strong {
    font-size: clamp(1.1rem, 0.95rem + 0.6vw, 1.55rem);
    color: #f8fafc;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
    white-space: nowrap;
    max-width: 100%;
  }

  .stat-card.small {
    width: 100%;
    font-size: clamp(1rem, 0.9rem + 0.45vw, 1.4rem);
    color: #f8fafc;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    overflow-wrap: anywhere;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
  }

  .stat-card.currency .stat-body {
    align-items: flex-start;
  }

  .label {
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.72);
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .results-header h3 {
    margin: 0;
    font-size: 1.85rem;
    color: #c7d2fe;
  }

  .results-header p {
    margin: 0.6rem 0 0;
    color: rgba(226, 232, 240, 0.8);
  }

  .resource-summary {
    display: grid;
    gap: 0.85rem;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .resource-card {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-radius: 16px;
    background: rgba(17, 24, 39, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.16);
  }

  .resource-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(30, 41, 59, 0.8);
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .resource-icon img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .resource-body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    align-items: flex-start;
    text-align: left;
  }

  .resource-title {
    font-size: 0.9rem;
    color: rgba(226, 232, 240, 0.9);
  }

  .resource-body strong {
    font-size: 1.1rem;
    color: #f8fafc;
    letter-spacing: 0.01em;
  }

  .resource-meta {
    font-size: 0.78rem;
    color: rgba(148, 163, 184, 0.72);
  }

  .results-grid {
    display: grid;
    gap: 1.4rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .result-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.4rem;
    border-radius: 24px;
    background: rgba(15, 23, 42, 0.78);
    border: 1px solid rgba(129, 140, 248, 0.2);
  }

  .result-column h4 {
    margin: 0;
    font-size: 1.2rem;
    color: #e0e7ff;
  }

  .reward-board,
  .history-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    max-height: 420px;
    overflow-y: auto;
  }

  .reward-board li,
  .history-list li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.85rem;
    align-items: flex-start;
  }

  .reward-board li {
    padding: 0.8rem 0.95rem;
    border-radius: 18px;
    background: rgba(22, 30, 46, 0.85);
    border: 1px solid rgba(129, 140, 248, 0.18);
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .reward-board li.index-top {
    border-color: rgba(129, 140, 248, 0.48);
    box-shadow: 0 16px 32px rgba(99, 102, 241, 0.18);
    transform: translateY(-2px);
  }

  .icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(129, 140, 248, 0.28);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .details .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .details .name {
    font-weight: 600;
    color: #e0e7ff;
  }

  .count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: rgba(129, 140, 248, 0.18);
    border: 1px solid rgba(129, 140, 248, 0.45);
    color: #c7d2fe;
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .pills {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: rgba(148, 163, 184, 0.16);
    color: rgba(226, 232, 240, 0.75);
  }

  .pill.actual {
    background: rgba(248, 113, 113, 0.16);
    color: rgba(248, 113, 113, 0.95);
  }

  .pill.expected {
    background: rgba(129, 140, 248, 0.18);
    color: rgba(165, 180, 252, 0.92);
  }

  .currency {
    font-size: 0.82rem;
    color: rgba(203, 213, 225, 0.78);
  }

  .muted {
    margin: 0;
    color: rgba(148, 163, 184, 0.65);
  }

  .history-list li {
    padding: 0.65rem 0.85rem;
    border-radius: 16px;
    background: rgba(17, 24, 39, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.16);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  .history-list li.free-spin {
    border-color: rgba(129, 140, 248, 0.32);
    background: rgba(129, 140, 248, 0.18);
  }

  .history-info {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }

  .history-info img {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(30, 41, 59, 0.82);
    padding: 0.25rem;
  }

  .history-info .title {
    font-size: 0.95rem;
    color: #e0e7ff;
    overflow-wrap: anywhere;
  }

  .history-list .note {
    font-size: 0.82rem;
    color: rgba(226, 232, 240, 0.78);
    white-space: nowrap;
  }

  .odds-panel {
    background: linear-gradient(170deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.92));
    border-radius: 32px;
    padding: 2.2rem 2rem;
    border: 1px solid rgba(99, 102, 241, 0.35);
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    color: rgba(226, 232, 240, 0.88);
    box-shadow: 0 24px 40px rgba(79, 70, 229, 0.25);
    min-width: 360px;
  }

  .odds-panel h3 {
    margin: 0;
    font-size: 1.4rem;
    color: #c7d2fe;
  }

  .odds-caption {
    margin: 0;
    color: rgba(148, 163, 184, 0.75);
    font-size: 0.9rem;
  }

  .odds-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 1.05rem 1.25rem;
  }

  .odds-list li {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.1rem 1.7rem;
  }

  .odds-list li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 1rem;
    padding: 1.05rem 1.3rem;
    border-radius: 18px;
    border: 1px solid rgba(129, 140, 248, 0.35);
    background: linear-gradient(155deg, rgba(129, 140, 248, 0.16), rgba(30, 41, 59, 0.85));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .odds-name {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .odds-icon {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    background: rgba(129, 140, 248, 0.2);
    padding: 0.3rem;
  }

  .odds-name .name {
    font-size: 0.95rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .chance {
    font-variant-numeric: tabular-nums;
    color: #c7d2fe;
    text-align: right;
    min-width: 76px;
    font-size: 0.96rem;
    letter-spacing: 0.02em;
  }

  /* Responsive overrides removed to keep desktop layout across devices */
</style>
