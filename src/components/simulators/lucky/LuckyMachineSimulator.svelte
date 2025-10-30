<script lang="ts">
  import type {
    LuckyMachineDefinition,
    LuckyRewardAggregate,
    LuckyRewardChance,
    LuckyCategoryAggregate,
    LuckySimulation,
    LuckySpinSummary,
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
  let breakdown: LuckyRewardAggregate[] = [];
  let categories: LuckyCategoryAggregate[] = [];
  let history: LuckySpinSummary[] = [];
  let progress = 0;
  let completedPaid = 0;
  let controller: AbortController | null = null;

  function resetSimulation() {
    if (controller) {
      controller.abort();
      controller = null;
    }
    result = null;
    breakdown = [];
    categories = [];
    history = [];
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
    breakdown = [];
    categories = [];
    history = [];
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
      breakdown = simulation.breakdown;
      categories = simulation.categories;
      history = simulation.history;
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

  function formatRewardAmount(entry: LuckyRewardAggregate): string {
    const { reward, totalAmount } = entry;
    if (reward.type === 'hardcurrency') {
      return `${formatNumber(totalAmount)} золота`;
    }
    if (reward.type === 'softcurrency') {
      return `${formatNumber(totalAmount)} серебра`;
    }
    if (reward.amount > 1 && totalAmount > 1) {
      return `${formatNumber(totalAmount)} шт.`;
    }
    return formatNumber(totalAmount);
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
        <small id="spins-hint">Бесплатные спины считаются отдельно и не требуют токенов.</small>
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
        <div class="stat-card">
          <span class="label">Всего прокрутов</span>
          <strong>{formatNumber(result.totalSpins)}</strong>
        </div>
        <div class="stat-card">
          <span class="label">Платных</span>
          <strong>{formatNumber(result.paidSpins)}</strong>
        </div>
        <div class="stat-card highlight">
          <span class="label">Бесплатных</span>
          <strong>{formatNumber(result.freeSpins)}</strong>
          <small>Доля: {getFreeSpinRate(result)} • Каждые {getFreeSpinRatio(result)}</small>
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
          <img class="stat-icon" src="/tokens/material_gacha_token.png" alt="Иконка жетона" loading="lazy" />
          <div class="stat-body">
            <span class="label">Жетоны и билеты</span>
            <strong>{formatNumber(result.tokenItems)}</strong>
          </div>
        </div>
      </section>

      {#if categories.length}
        <section class="category-grid">
          {#each categories as category (category.category)}
            <article class="category-card">
              <header>
                <img src={category.icon} alt={category.label} loading="lazy" />
                <div>
                  <h4>{category.label}</h4>
                  <span class="count">x{formatNumber(category.count)}</span>
                </div>
              </header>
              <p>Ресурсов суммарно: {formatNumber(category.totalAmount)}</p>
            </article>
          {/each}
        </section>
      {/if}

      <section class="results-grid">
        <div class="panel">
          <h3>Статистика призов</h3>
          <div class="table">
            <div class="table-row head">
              <span>Награда</span>
              <span class="reward-count">Выпало</span>
              <span class="reward-total">Всего</span>
            </div>
            {#each breakdown as entry}
              <div class="table-row">
                <span class="reward-label">
                  <img class="reward-icon" src={entry.icon} alt={entry.label} loading="lazy" />
                  <span class="name">{entry.label}</span>
                </span>
                <span class="reward-count">x{formatNumber(entry.count)}</span>
                <span class="reward-total">{formatRewardAmount(entry)}</span>
              </div>
            {/each}
          </div>
        </div>
        <div class="panel">
          <h3>Последние события</h3>
          {#if history.length === 0}
            <p class="empty">Запустите симуляцию, чтобы увидеть историю.</p>
          {:else}
            <ul class="history">
              {#each history as spin (spin.timestamp)}
                <li class={spin.type === 'free-spin' ? 'free-spin' : ''}>
                  <div class="history-info">
                    <img class="history-icon" src={spin.icon} alt={spin.label} loading="lazy" />
                    <span class="title">{spin.label}</span>
                  </div>
                  {#if spin.type === 'free-spin'}
                    <span class="note">+1 спин</span>
                  {:else}
                    <span class="note">x{formatNumber(spin.reward.amount)}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
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
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: rgba(15, 23, 42, 0.8);
    border-radius: 18px;
    padding: 1.1rem 1.3rem;
    border: 1px solid rgba(148, 163, 184, 0.2);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: rgba(226, 232, 240, 0.85);
  }

  .stat-card strong {
    font-size: 1.4rem;
    color: #f1f5f9;
  }

  .stat-card.small {
    font-size: 0.9rem;
  }

  .stat-card.highlight {
    background: rgba(129, 140, 248, 0.15);
    border-color: rgba(129, 140, 248, 0.35);
  }

  .stat-card.highlight small {
    color: rgba(148, 163, 184, 0.8);
  }

  .stat-card.currency {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
  }

  .stat-body {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .label {
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.75);
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .category-card {
    background: rgba(20, 24, 38, 0.85);
    border-radius: 20px;
    padding: 1.1rem 1.25rem;
    border: 1px solid rgba(129, 140, 248, 0.28);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .category-card header {
    display: flex;
    gap: 0.85rem;
    align-items: center;
  }

  .category-card header img {
    width: 46px;
    height: 46px;
  }

  .category-card h4 {
    margin: 0;
    font-size: 1.1rem;
    color: #e0e7ff;
  }

  .category-card .count {
    color: rgba(148, 163, 184, 0.75);
    font-size: 0.85rem;
  }

  .category-card p {
    margin: 0;
    color: rgba(203, 213, 225, 0.8);
  }

  .results-grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .panel {
    background: rgba(15, 23, 42, 0.85);
    border-radius: 20px;
    padding: 1.25rem 1.5rem;
    border: 1px solid rgba(129, 140, 248, 0.2);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel h3 {
    margin: 0;
    font-size: 1.3rem;
    color: #e0e7ff;
  }

  .table {
    display: grid;
    gap: 0.75rem;
  }

  .table-row {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.75fr) minmax(0, 1fr);
    align-items: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    color: rgba(226, 232, 240, 0.85);
  }

  .table-row.head {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(148, 163, 184, 0.7);
  }

  .reward-label {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .reward-icon {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: rgba(129, 140, 248, 0.2);
    padding: 0.25rem;
  }

  .reward-label .name {
    overflow-wrap: anywhere;
  }

  .reward-count,
  .reward-total {
    justify-self: end;
    font-variant-numeric: tabular-nums;
  }

  .reward-total {
    text-align: right;
    overflow-wrap: anywhere;
    max-width: 100%;
  }

  .table-row.head .reward-count,
  .table-row.head .reward-total {
    justify-self: start;
    text-align: left;
  }

  .history {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.65rem;
  }

  .history li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.8rem;
    border-radius: 14px;
    background: rgba(22, 30, 46, 0.7);
    border: 1px solid rgba(129, 140, 248, 0.12);
    color: rgba(226, 232, 240, 0.9);
  }

  .history li.free-spin {
    border-color: rgba(129, 140, 248, 0.35);
    background: rgba(129, 140, 248, 0.18);
  }

  .history-info {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .history-icon {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(129, 140, 248, 0.25);
    padding: 0.25rem;
  }

  .history .title {
    font-size: 0.95rem;
  }

  .history .note {
    font-size: 0.8rem;
    color: rgba(226, 232, 240, 0.7);
  }

  .empty {
    margin: 0;
    color: rgba(148, 163, 184, 0.7);
  }

  .odds-panel {
    background: linear-gradient(170deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.92));
    border-radius: 32px;
    padding: 2rem 1.75rem;
    border: 1px solid rgba(99, 102, 241, 0.35);
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    color: rgba(226, 232, 240, 0.88);
    box-shadow: 0 24px 40px rgba(79, 70, 229, 0.25);
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
    gap: 1rem 1.25rem;
  }

  .odds-list li {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .odds-name {
    display: flex;
    align-items: center;
    gap: 0.65rem;
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
    overflow-wrap: anywhere;
  }

  .chance {
    font-variant-numeric: tabular-nums;
    color: #c7d2fe;
    text-align: right;
    min-width: 72px;
  }

  @media (max-width: 1100px) {
    .machine-shell {
      grid-template-columns: 1fr;
    }

    .odds-panel {
      order: -1;
    }
  }

  @media (max-width: 720px) {
    .machine-body {
      padding: 1.75rem;
    }

    .results-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
