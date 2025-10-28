<script lang="ts">
  import type {
    CashMachineDefinition,
    CashReward,
    RewardChance,
    SpinSummary,
  } from '@/lib/cash-machine';
  import {
    formatNumber,
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
  let breakdown: RewardBreakdown[] = [];
  let history: SpinSummary[] = [];

  function resetSimulation() {
    result = null;
    breakdown = [];
    history = [];
    error = null;
  }

  function handleSimulate() {
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
        <button type="button" class="ghost" on:click={resetSimulation} disabled={isSimulating}>
          Очистить
        </button>
      </div>
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
                <span>{entry.label}</span>
                <span>x{formatNumber(entry.count)}</span>
                <span>{formatNumber(entry.totalAmount)}</span>
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
                  <span class="title">{spin.label}</span>
                  <span class="odds">×{formatNumber(spin.reward.amount)}</span>
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
          <span class="name">{reward.label}</span>
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

  .error {
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: rgba(255, 82, 82, 0.12);
    border: 1px solid rgba(255, 138, 101, 0.4);
    color: #ffab91;
  }

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
  }

  .stat-card .label {
    display: block;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(248, 250, 252, 0.55);
    margin-bottom: 0.45rem;
  }

  .stat-card strong {
    font-size: 1.5rem;
    color: #fceabb;
  }

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
    grid-template-columns: 1.6fr 0.7fr 1fr;
    gap: 0.75rem;
    align-items: center;
    font-size: 0.95rem;
    color: #f8fafc;
  }

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
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
  }

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
    align-items: baseline;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

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
