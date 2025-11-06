<script lang="ts">
  import type {
    CashMachineDefinition,
    RewardAggregate,
    RewardChance,
    SpinSummary,
  } from '@/lib/cash-machine';
  import {
    formatNumber,
    getCurrencyIcon,
    getRewardWithChance,
    simulateMachineAsync,
  } from '@/lib/cash-machine';
  import { onDestroy, tick } from 'svelte';

  export interface SimulationResult {
    spins: number;
    budget: number;
    goldSpent: number;
    goldWon: number;
    silverWon: number;
    netGold: number;
  }

  export let machine: CashMachineDefinition;

  const costPerSpin = machine.cost;
  const rewardChances: RewardChance[] = machine.rewards
    .filter((reward) => reward.odds > 0)
    .map((reward) => getRewardWithChance(reward, machine))
    .sort((a, b) => b.chance - a.chance);

  let budget = 1000;
  let isSimulating = false;
  let error: string | null = null;
  let result: SimulationResult | null = null;
  const goldIcon = getCurrencyIcon('hardcurrency');
  const silverIcon = getCurrencyIcon('softcurrency');

  function getRewardUnit(type: string): string {
    if (type === 'hardcurrency') return 'золота';
    if (type === 'softcurrency') return 'серебра';
    return '';
  }

  function formatAmountWithUnit(amount: number, type: string): string {
    const unit = getRewardUnit(type);
    return unit ? `${formatNumber(amount)} ${unit}` : formatNumber(amount);
  }

  let breakdown: RewardAggregate[] = [];
  let history: SpinSummary[] = [];
  let progress = 0;
  let controller: AbortController | null = null;
  let totalSpins = 0;
  let completedSpins = 0;

  function resetSimulation() {
    if (controller) {
      controller.abort();
      controller = null;
    }
    result = null;
    breakdown = [];
    history = [];
    progress = 0;
    totalSpins = 0;
    error = null;
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
    const spins = Math.floor(budget / costPerSpin);

    if (budget <= 0) {
      error = 'Введите положительное количество золота.';
      return;
    }

    if (spins <= 0) {
      error = `Недостаточно золота. Нужен минимум ${costPerSpin} золота.`;
      return;
    }

    result = null;
    breakdown = [];
    history = [];

    isSimulating = true;
    progress = 0;
    totalSpins = spins;
    controller = new AbortController();

    await tick();

    try {
      const simulation = await simulateMachineAsync(spins, machine, {
        historySize: 12,
        batchSize: 2000,
        signal: controller.signal,
        onProgress(completed) {
          completedSpins = completed;
          progress = completed / spins;
        },
      });

      breakdown = simulation.breakdown;

      result = {
        spins,
        budget,
        goldSpent: spins * costPerSpin,
        goldWon: simulation.goldWon,
        silverWon: simulation.silverWon,
        netGold: simulation.goldWon - spins * costPerSpin,
      };

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
      totalSpins = 0;
      completedSpins = 0;
    }
  }

  onDestroy(() => {
    stopSimulation();
  });
</script>

<div class="machine-shell">
  <div class="machine-body">
    <div class="machine-header">
      <span class="machine-tag">Золотая рулетка</span>
      <h2>{machine.title}</h2>
      <p>Стоимость прокрута — {costPerSpin} золота. Выберите бюджет и посмотрите, какие призы можно собрать.</p>
    </div>

    <form class="control-panel" on:submit|preventDefault={handleSimulate}>
      <label class="input-group">
        <span>Бюджет золота</span>
        <div class="input-wrapper">
          <input
            type="number"
            min={costPerSpin}
            step={costPerSpin}
            bind:value={budget}
            aria-describedby="budget-hint"
          />
          <span class="suffix">золота</span>
        </div>
        <small id="budget-hint">Кратно {costPerSpin} — столько стоит один прокрут.</small>
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
            Выполнено {Math.min(Math.floor(progress * 100), 100)}% — {formatNumber(completedSpins)} из
            {formatNumber(totalSpins)} прокрутов
          </div>
        </div>
      {/if}
      {#if error}
        <p class="error">{error}</p>
      {/if}
    </form>

    {#if result}
      <section class="stats">
        <div class="stat-card metric spins">
          <div class="metric-icon" aria-hidden="true">
            <img src="/etc/icon_timer.png" alt="" loading="lazy" />
          </div>
          <div class="metric-body">
            <span class="label">Прокрутов</span>
            <strong>{formatNumber(result.spins)}</strong>
          </div>
        </div>
        <div class="stat-card currency">
          <img class="stat-icon" src={goldIcon} alt="Иконка золота" loading="lazy" />
          <div class="stat-body">
            <span class="label">Потрачено золота</span>
            <strong>{formatNumber(result.goldSpent)}</strong>
          </div>
        </div>
        <div class="stat-card currency">
          <img class="stat-icon" src={goldIcon} alt="Иконка золота" loading="lazy" />
          <div class="stat-body">
            <span class="label">Выиграно золота</span>
            <strong>{formatNumber(result.goldWon)}</strong>
          </div>
        </div>
        <div class="stat-card currency">
          <img class="stat-icon" src={silverIcon} alt="Иконка серебра" loading="lazy" />
          <div class="stat-body">
            <span class="label">Выиграно серебра</span>
            <strong>{formatNumber(result.silverWon)}</strong>
          </div>
        </div>
        <div class={`stat-card currency net ${result.netGold >= 0 ? 'positive' : 'negative'}`}>
          <img class="stat-icon" src={goldIcon} alt="Иконка золота" loading="lazy" />
          <div class="stat-body">
            <span class="label">Чистый результат</span>
            <strong>{result.netGold >= 0 ? '+' : ''}{formatNumber(result.netGold)}</strong>
          </div>
        </div>
      </section>

      <section class="results-grid">
        <div class="panel">
          <h3>Статистика призов</h3>
          <div class="table">
            <div class="table-row head">
              <span>Награда</span>
              <span>Выпало</span>
              <span>Всего ресурсов</span>
            </div>
            {#each breakdown as entry}
              <div class="table-row">
                <span class="reward-label">
                  <img class="reward-icon" src={entry.icon} alt={entry.label} loading="lazy" />
                  <span>{entry.label}</span>
                </span>
                <span>x{formatNumber(entry.count)}</span>
                <span>{formatAmountWithUnit(entry.totalAmount, entry.reward.type)}</span>
              </div>
            {/each}
          </div>
        </div>
        <div class="panel">
          <h3>Последние выигрыши</h3>
          {#if history.length === 0}
            <p class="empty">Запустите симуляцию, чтобы увидеть историю.</p>
          {:else}
            <ul class="history">
              {#each history as spin (spin.timestamp)}
                <li>
                  <div class="history-info">
                    <img class="history-icon" src={spin.icon} alt={spin.label} loading="lazy" />
                    <span class="title">{spin.label}</span>
                  </div>
                  <span class="odds">+{formatAmountWithUnit(spin.reward.amount, spin.reward.type)}</span>
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
    <p class="odds-caption">Вероятность выпадения каждого приза на один прокрут.</p>
    <ul class="odds-list">
      {#each rewardChances as reward}
        <li>
          <span class="odds-name">
            <img class="odds-icon" src={reward.icon} alt={reward.label} loading="lazy" />
            <span class="name">{reward.label}</span>
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
    gap: 2rem;
    grid-template-columns: minmax(0, 2.2fr) minmax(320px, 1fr);
    align-items: start;
  }

  .machine-body {
    background: linear-gradient(160deg, rgba(253, 216, 112, 0.12), rgba(22, 27, 34, 0.92));
    border: 1px solid rgba(255, 202, 40, 0.25);
    border-radius: 32px;
    padding: 2rem;
    box-shadow: 0 24px 40px rgba(255, 193, 7, 0.18);
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .machine-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    color: rgba(248, 250, 252, 0.9);
  }

  .machine-header h2 {
    margin: 0;
    font-size: 2rem;
    color: #fceabb;
  }

  .machine-header p {
    margin: 0;
    line-height: 1.6;
    color: rgba(248, 250, 252, 0.75);
  }

  .machine-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 1rem;
    border-radius: 999px;
    background: rgba(255, 193, 7, 0.18);
    color: #ffd54f;
    letter-spacing: 0.06em;
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
    color: #fceabb;
    margin-bottom: 0.45rem;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-wrapper input {
    width: 100%;
    padding: 0.8rem 3.5rem 0.8rem 1rem;
    border-radius: 14px;
    border: 1px solid rgba(255, 213, 79, 0.45);
    background: rgba(13, 17, 23, 0.88);
    color: #fceabb;
    font-size: 1.05rem;
    font-weight: 600;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .input-wrapper input:focus {
    outline: none;
    border-color: #ffd54f;
    box-shadow: 0 0 0 3px rgba(255, 213, 79, 0.25);
  }

  .suffix {
    position: absolute;
    right: 1rem;
    color: rgba(255, 248, 225, 0.7);
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  small {
    color: rgba(248, 250, 252, 0.6);
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
    background: linear-gradient(120deg, #ffd54f, #ff9100);
    color: #0d1117;
    box-shadow: 0 12px 28px rgba(255, 193, 7, 0.28);
  }

  button.primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 18px 32px rgba(255, 193, 7, 0.35);
  }

  button.ghost {
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  button.ghost:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.25);
  }

  button.ghost.danger {
    border-color: rgba(255, 138, 101, 0.4);
    color: #ffab91;
  }

  button.ghost.danger:hover:not(:disabled) {
    background: rgba(255, 82, 82, 0.15);
    border-color: rgba(255, 138, 101, 0.65);
    color: #ffcdd2;
  }

  .error {
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: rgba(255, 82, 82, 0.12);
    border: 1px solid rgba(255, 138, 101, 0.45);
    color: #ffab91;
  }

  .progress {
    display: grid;
    gap: 0.4rem;
    margin-top: -0.25rem;
  }

  .progress-bar {
    position: relative;
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    overflow: hidden;
  }

  .progress-bar::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, #ffcc80, #ff9100);
    transform-origin: left center;
    transform: scaleX(calc(var(--progress, 0%) / 100));
    transition: transform 0.18s ease-out;
  }

  .progress-label {
    font-size: 0.85rem;
    color: rgba(255, 248, 225, 0.75);
    letter-spacing: 0.02em;
  }

  .stats {
    display: grid;
<<<<<<< HEAD
    gap: 1.15rem;
=======
    gap: 0.85rem;
>>>>>>> 4d2fd57f (Refine roulette resource panels and fix reactor listing)
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .stat-card {
<<<<<<< HEAD
    background: rgba(13, 17, 23, 0.82);
    border-radius: 18px;
    border: 1px solid rgba(255, 213, 79, 0.3);
    padding: 1.15rem 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  .stat-card.metric,
  .stat-card.currency {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 1rem;
=======
    background: rgba(13, 17, 23, 0.6);
    border-radius: 16px;
    border: 1px solid rgba(255, 213, 79, 0.18);
    padding: 0.95rem 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    min-width: 0;
  }

  .stat-card.no-icon {
    justify-content: space-between;
    padding: 0.95rem 1.1rem;
>>>>>>> 4d2fd57f (Refine roulette resource panels and fix reactor listing)
  }

  .stat-card.spins {
    background: linear-gradient(150deg, rgba(255, 213, 79, 0.22), rgba(13, 17, 23, 0.92));
    border-color: rgba(255, 213, 79, 0.45);
  }

  .metric-icon {
<<<<<<< HEAD
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 213, 79, 0.45);
=======
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 14px;
    background: rgba(255, 213, 79, 0.16);
>>>>>>> 4d2fd57f (Refine roulette resource panels and fix reactor listing)
    display: grid;
    place-items: center;
  }

  .metric-icon img {
<<<<<<< HEAD
    width: 44px;
    height: 44px;
=======
    width: 28px;
    height: 28px;
>>>>>>> 4d2fd57f (Refine roulette resource panels and fix reactor listing)
    object-fit: contain;
  }

  .stat-icon {
<<<<<<< HEAD
    width: 56px;
    height: 56px;
    object-fit: contain;
=======
    width: 36px;
    height: 36px;
  }

  .stat-card.spins {
    background: linear-gradient(150deg, rgba(255, 213, 79, 0.18), rgba(13, 17, 23, 0.78));
    border-color: rgba(255, 213, 79, 0.3);
  }

  .stat-card.spins .metric-icon {
    background: rgba(255, 213, 79, 0.22);
>>>>>>> 4d2fd57f (Refine roulette resource panels and fix reactor listing)
  }

  .metric-body,
  .stat-body {
    display: flex;
    flex-direction: column;
<<<<<<< HEAD
    gap: 0.3rem;
    min-width: 0;
    align-items: flex-end;
    text-align: right;
  }

  .stat-card .label {
    display: block;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(248, 250, 252, 0.58);
    align-self: flex-start;
  }

  .stat-card strong {
    font-size: clamp(1.05rem, 0.9rem + 0.5vw, 1.45rem);
    color: #fceabb;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
=======
    gap: 0.25rem;
    min-width: 0;
    align-items: flex-start;
    text-align: left;
    color: rgba(252, 234, 187, 0.88);
  }

  .stat-card.currency .stat-body {
    align-items: flex-start;
  }

  .stat-card .label {
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(252, 234, 187, 0.6);
  }

  .stat-card strong {
    font-size: clamp(1.05rem, 0.95rem + 0.55vw, 1.5rem);
    color: #ffe082;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.015em;
    white-space: nowrap;
>>>>>>> 4d2fd57f (Refine roulette resource panels and fix reactor listing)
  }

  .stat-card.currency.net.positive strong {
    color: #a5d6a7;
  }

<<<<<<< HEAD
  .stat-card.currency.net.negative strong {
    color: #ffab91;
=======
  .stat-icon,
  .reward-icon,
  .history-icon,
  .odds-icon {
    display: block;
  }

  .stat-card.net {
    background: linear-gradient(160deg, rgba(255, 213, 79, 0.2), rgba(13, 17, 23, 0.82));
    border: 1px solid rgba(255, 213, 79, 0.32);
    box-shadow: none;
  }

  .stat-card.net.positive strong {
    color: #d4ff6a;
  }

  .stat-card.net.negative strong {
    color: #ffab91;
  }

  .odds-panel h3 {
    margin: 0;
    color: #ffe082;
  }

  .odds-caption {
    margin: 0;
    color: rgba(248, 250, 252, 0.6);
    font-size: 0.9rem;
  }

  .odds-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.9rem;
>>>>>>> 4d2fd57f (Refine roulette resource panels and fix reactor listing)
  }

  .results-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .panel {
    background: rgba(13, 17, 23, 0.78);
    border-radius: 20px;
    border: 1px solid rgba(255, 213, 79, 0.2);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel h3 {
    margin: 0;
    font-size: 1.2rem;
    color: #ffe082;
  }

  .table {
    display: grid;
    gap: 0.75rem;
  }

  .table-row {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 0.7fr) minmax(0, 1fr);
    gap: 0.75rem;
    align-items: center;
    color: rgba(248, 250, 252, 0.85);
  }

  .table-row.head {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(248, 250, 252, 0.55);
  }

  .reward-label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }

  .reward-icon {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  .history {
    list-style: none;
    display: grid;
    gap: 0.65rem;
    padding: 0;
    margin: 0;
    max-height: 360px;
    overflow-y: auto;
  }

  .history li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.06);
  }

  .history-info {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .history-icon {
    width: 44px;
    height: 44px;
    object-fit: contain;
  }

  .odds-panel {
    background: rgba(13, 17, 23, 0.82);
    border-radius: 28px;
    border: 1px solid rgba(255, 213, 79, 0.22);
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    color: rgba(248, 250, 252, 0.85);
  }

  .odds-panel h3 {
    margin: 0;
    font-size: 1.2rem;
    color: #ffe082;
  }

  .odds-caption {
    margin: 0;
    color: rgba(248, 250, 252, 0.65);
    font-size: 0.92rem;
  }

  .odds-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.85rem;
  }

  .odds-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .odds-name {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  .odds-icon {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  .odds-name .name {
    font-weight: 600;
    color: #fff8e1;
  }

  .chance {
    font-variant-numeric: tabular-nums;
    color: rgba(248, 250, 252, 0.7);
  }

  @media (max-width: 980px) {
    .machine-shell {
      grid-template-columns: minmax(0, 1fr);
    }

    .odds-panel {
      order: -1;
    }
  }

  @media (max-width: 640px) {
    .machine-body {
      padding: 1.5rem;
    }

    .odds-panel {
      padding: 1.5rem;
    }
  }
</style>
