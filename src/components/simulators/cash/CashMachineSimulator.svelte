<script lang="ts">
  import type {
    CashMachineDefinition,
<<<<<<< ours
    CashReward,
=======
    RewardAggregate,
>>>>>>> theirs
    RewardChance,
    SpinSummary,
  } from '@/lib/cash-machine';
  import {
    formatNumber,
<<<<<<< ours
    getRewardLabel,
    getRewardWithChance,
    simulateSpins,
  } from '@/lib/cash-machine';

  export interface RewardBreakdown {
    reward: CashReward;
    label: string;
    count: number;
    totalAmount: number;
  }
=======
    getCurrencyIcon,
    getRewardWithChance,
    simulateMachineAsync,
  } from '@/lib/cash-machine';
  import { onDestroy, tick } from 'svelte';
>>>>>>> theirs

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
<<<<<<< ours
  let breakdown: RewardBreakdown[] = [];
  let history: SpinSummary[] = [];

  function resetSimulation() {
    result = null;
    breakdown = [];
    history = [];
    error = null;
  }

  function handleSimulate() {
=======
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
>>>>>>> theirs
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

<<<<<<< ours
    isSimulating = true;

    const spinResults = simulateSpins(spins, machine);

    const rewardMap = new Map<number, RewardBreakdown>();
    let totalGoldWon = 0;
    let totalSilverWon = 0;

    for (const spin of spinResults) {
      const { reward } = spin;
      const label = getRewardLabel(reward);
      const entry = rewardMap.get(reward.rewardId) ?? {
        reward,
        label,
        count: 0,
        totalAmount: 0,
      };
      entry.count += 1;
      entry.totalAmount += reward.amount;
      rewardMap.set(reward.rewardId, entry);

      if (reward.type === 'hardcurrency') {
        totalGoldWon += reward.amount;
      } else if (reward.type === 'softcurrency') {
        totalSilverWon += reward.amount;
      }
    }

    breakdown = Array.from(rewardMap.values()).sort((a, b) => b.count - a.count);

    result = {
      spins,
      budget,
      goldSpent: spins * costPerSpin,
      goldWon: totalGoldWon,
      silverWon: totalSilverWon,
      netGold: totalGoldWon - spins * costPerSpin,
    };

    history = spinResults.slice(-12).reverse();

    isSimulating = false;
  }
=======
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
>>>>>>> theirs
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
<<<<<<< ours
        <button type="button" class="ghost" on:click={resetSimulation} disabled={isSimulating}>
          Очистить
        </button>
      </div>
=======
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
>>>>>>> theirs
      {#if error}
        <p class="error">{error}</p>
      {/if}
    </form>

    {#if result}
      <section class="stats">
        <div class="stat-card">
          <span class="label">Прокрутов</span>
          <strong>{formatNumber(result.spins)}</strong>
        </div>
<<<<<<< ours
        <div class="stat-card">
          <span class="label">Потрачено золота</span>
          <strong>{formatNumber(result.goldSpent)}</strong>
        </div>
        <div class="stat-card">
          <span class="label">Выиграно золота</span>
          <strong>{formatNumber(result.goldWon)}</strong>
        </div>
        <div class="stat-card">
          <span class="label">Выиграно серебра</span>
          <strong>{formatNumber(result.silverWon)}</strong>
        </div>
        <div class={`stat-card net ${result.netGold >= 0 ? 'positive' : 'negative'}`}>
          <span class="label">Чистый результат</span>
          <strong>{result.netGold >= 0 ? '+' : ''}{formatNumber(result.netGold)}</strong>
=======
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
        <div
          class={`stat-card currency net ${result.netGold >= 0 ? 'positive' : 'negative'}`}
        >
          <img class="stat-icon" src={goldIcon} alt="Иконка золота" loading="lazy" />
          <div class="stat-body">
            <span class="label">Чистый результат</span>
            <strong>{result.netGold >= 0 ? '+' : ''}{formatNumber(result.netGold)}</strong>
          </div>
>>>>>>> theirs
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
<<<<<<< ours
                <span>{entry.label}</span>
                <span>x{formatNumber(entry.count)}</span>
                <span>{formatNumber(entry.totalAmount)}</span>
=======
                <span class="reward-label">
                  <img class="reward-icon" src={entry.icon} alt={entry.label} loading="lazy" />
                  <span>{entry.label}</span>
                </span>
                <span>x{formatNumber(entry.count)}</span>
                <span>{formatAmountWithUnit(entry.totalAmount, entry.reward.type)}</span>
>>>>>>> theirs
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
<<<<<<< ours
                  <span class="title">{spin.label}</span>
                  <span class="odds">×{formatNumber(spin.reward.amount)}</span>
=======
                  <div class="history-info">
                    <img class="history-icon" src={spin.icon} alt={spin.label} loading="lazy" />
                    <span class="title">{spin.label}</span>
                  </div>
                  <span class="odds">+{formatAmountWithUnit(spin.reward.amount, spin.reward.type)}</span>
>>>>>>> theirs
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
<<<<<<< ours
          <span class="name">{reward.label}</span>
=======
          <span class="odds-name">
            <img class="odds-icon" src={reward.icon} alt={reward.label} loading="lazy" />
            <span class="name">{reward.label}</span>
          </span>
>>>>>>> theirs
          <span class="chance">{(reward.chance * 100).toFixed(4)}%</span>
        </li>
      {/each}
    </ul>
  </aside>
</div>

<style>
  .machine-shell {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    align-items: stretch;
  }

  .machine-body {
    background: linear-gradient(160deg, rgba(253, 216, 112, 0.12), rgba(22, 27, 34, 0.92));
    border: 1px solid rgba(255, 202, 40, 0.25);
    border-radius: 32px;
    padding: 2rem;
    box-shadow: 0 24px 40px rgba(255, 193, 7, 0.15);
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .machine-header h2 {
    margin: 0.5rem 0 0.75rem;
    font-size: 2rem;
    color: #fceabb;
  }

  .machine-header p {
    margin: 0;
    color: #f8fafc;
    opacity: 0.8;
    line-height: 1.6;
  }

  .machine-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: rgba(255, 160, 0, 0.18);
    color: #ffd54f;
    border-radius: 999px;
    padding: 0.35rem 0.9rem;
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .control-panel {
    display: grid;
    gap: 1.25rem;
  }

  .input-group span {
    display: block;
    font-size: 0.95rem;
    color: #f8fafc;
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
    border-radius: 14px;
    border: 1px solid rgba(255, 213, 79, 0.4);
    background: rgba(13, 17, 23, 0.85);
    color: #fceabb;
    font-size: 1.1rem;
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
    text-transform: uppercase;
    letter-spacing: 0.08em;
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
    box-shadow: 0 10px 24px rgba(255, 193, 7, 0.25);
  }

  button.primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 28px rgba(255, 193, 7, 0.35);
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

<<<<<<< ours
=======
  button.ghost.danger {
    border-color: rgba(255, 138, 101, 0.35);
    color: #ffab91;
  }

  button.ghost.danger:hover {
    border-color: rgba(255, 138, 101, 0.7);
    background: rgba(255, 82, 82, 0.18);
    color: #ffcdd2;
  }

>>>>>>> theirs
  .error {
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: rgba(255, 82, 82, 0.12);
    border: 1px solid rgba(255, 138, 101, 0.4);
    color: #ffab91;
  }

<<<<<<< ours
=======
  .progress {
    display: grid;
    gap: 0.35rem;
    margin-top: -0.5rem;
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

>>>>>>> theirs
  .stats {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  .stat-card {
    background: rgba(13, 17, 23, 0.75);
    border-radius: 18px;
    border: 1px solid rgba(255, 213, 79, 0.25);
    padding: 1rem 1.25rem;
<<<<<<< ours
=======
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .stat-card.currency {
    flex-direction: row;
    align-items: center;
    gap: 0.9rem;
>>>>>>> theirs
  }

  .stat-card .label {
    display: block;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(248, 250, 252, 0.55);
    margin-bottom: 0.45rem;
  }

<<<<<<< ours
=======
  .stat-card.currency .label {
    margin-bottom: 0.2rem;
  }

>>>>>>> theirs
  .stat-card strong {
    font-size: 1.5rem;
    color: #fceabb;
  }

<<<<<<< ours
=======
  .stat-body {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    flex: 1;
  }

  .stat-icon {
    width: 52px;
    height: 52px;
    flex-shrink: 0;
  }

  .stat-icon,
  .reward-icon,
  .history-icon,
  .odds-icon {
    display: block;
  }

>>>>>>> theirs
  .stat-card.net.positive strong {
    color: #c6ff00;
  }

  .stat-card.net.negative strong {
    color: #ff8a80;
  }

  .results-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .panel {
    background: rgba(13, 17, 23, 0.85);
    border-radius: 18px;
    border: 1px solid rgba(255, 213, 79, 0.22);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel h3 {
    margin: 0;
    color: #fceabb;
  }

  .table {
    display: grid;
    gap: 0.75rem;
  }

  .table-row {
    display: grid;
<<<<<<< ours
    grid-template-columns: 1.6fr 0.7fr 1fr;
=======
    grid-template-columns: 1.8fr 0.7fr 1fr;
>>>>>>> theirs
    gap: 0.75rem;
    align-items: center;
    font-size: 0.95rem;
    color: #f8fafc;
  }

<<<<<<< ours
=======
  .reward-label {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .reward-icon {
    width: 48px;
    height: 48px;
  }

>>>>>>> theirs
  .table-row.head {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(248, 250, 252, 0.5);
  }

  .history {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.6rem;
  }

  .history li {
    display: flex;
    justify-content: space-between;
<<<<<<< ours
=======
    align-items: center;
>>>>>>> theirs
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
  }

<<<<<<< ours
=======
  .history-info {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .history-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
  }

>>>>>>> theirs
  .history .title {
    color: #fceabb;
  }

  .history .odds {
    color: rgba(248, 250, 252, 0.6);
    font-size: 0.85rem;
  }

  .empty {
    color: rgba(248, 250, 252, 0.6);
    margin: 0;
  }

  .odds-panel {
    background: linear-gradient(200deg, rgba(255, 215, 0, 0.1), rgba(13, 17, 23, 0.95));
    border-radius: 28px;
    border: 1px solid rgba(255, 213, 79, 0.25);
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
    gap: 0.75rem;
  }

  .odds-list li {
    display: flex;
    justify-content: space-between;
<<<<<<< ours
    align-items: baseline;
=======
    align-items: center;
>>>>>>> theirs
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

<<<<<<< ours
=======
  .odds-name {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .odds-icon {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }

>>>>>>> theirs
  .odds-list .name {
    color: #fceabb;
  }

  .odds-list .chance {
    color: rgba(248, 250, 252, 0.7);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.9rem;
  }

  @media (max-width: 1100px) {
    .machine-shell {
      grid-template-columns: 1fr;
    }

    .odds-panel {
      order: -1;
    }
  }

  @media (max-width: 640px) {
    .machine-body {
      padding: 1.5rem;
      border-radius: 24px;
    }

    .results-grid {
      grid-template-columns: 1fr;
    }

    .table-row {
      grid-template-columns: 1fr 0.6fr 0.8fr;
      font-size: 0.85rem;
    }
  }
</style>
