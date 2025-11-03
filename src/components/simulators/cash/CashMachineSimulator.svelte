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
      <section class="stats" aria-label="Итоги симуляции">
        <article class="stat-card metric">
          <div class="stat-icon" aria-hidden="true">
            <img src="/etc/icon_timer.png" alt="" loading="lazy" />
          </div>
          <div class="stat-body">
            <span class="label">Прокрутов</span>
            <span class="value">{formatNumber(result.spins)}</span>
          </div>
        </article>
        <article class="stat-card currency">
          <div class="stat-icon gold" aria-hidden="true">
            <img src={goldIcon} alt="" loading="lazy" />
          </div>
          <div class="stat-body">
            <span class="label">Потрачено золота</span>
            <span class="value">{formatNumber(result.goldSpent)}</span>
          </div>
        </article>
        <article class="stat-card currency">
          <div class="stat-icon gold" aria-hidden="true">
            <img src={goldIcon} alt="" loading="lazy" />
          </div>
          <div class="stat-body">
            <span class="label">Выиграно золота</span>
            <span class="value">{formatNumber(result.goldWon)}</span>
          </div>
        </article>
        <article class="stat-card currency silver">
          <div class="stat-icon silver" aria-hidden="true">
            <img src={silverIcon} alt="" loading="lazy" />
          </div>
          <div class="stat-body">
            <span class="label">Выиграно серебра</span>
            <span class="value">{formatNumber(result.silverWon)}</span>
          </div>
        </article>
        <article class={`stat-card currency net ${result.netGold >= 0 ? 'positive' : 'negative'}`}>
          <div class="stat-icon gold" aria-hidden="true">
            <img src={goldIcon} alt="" loading="lazy" />
          </div>
          <div class="stat-body">
            <span class="label">Чистый результат</span>
            <span class="value">{result.netGold >= 0 ? '+' : ''}{formatNumber(result.netGold)}</span>
            <span class="meta">
              {result.netGold >= 0 ? 'В плюс к бюджету' : 'В минус от бюджета'}
            </span>
          </div>
        </article>
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
    grid-template-columns: minmax(0, 2.3fr) minmax(340px, 1fr);
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

  button.ghost.danger {
    border-color: rgba(255, 138, 101, 0.35);
    color: #ffab91;
  }

  button.ghost.danger:hover {
    border-color: rgba(255, 138, 101, 0.7);
    background: rgba(255, 82, 82, 0.18);
    color: #ffcdd2;
  }

  .error {
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: rgba(255, 82, 82, 0.12);
    border: 1px solid rgba(255, 138, 101, 0.4);
    color: #ffab91;
  }

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

  .stats {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .stat-card {
    position: relative;
    display: grid;
    grid-template-columns: 60px 1fr;
    align-items: center;
    gap: 1rem;
    padding: 1.1rem 1.25rem;
    border-radius: 20px;
    background: radial-gradient(120% 140% at 0% 0%, rgba(255, 213, 79, 0.22), rgba(13, 17, 23, 0.92));
    border: 1px solid rgba(255, 213, 79, 0.28);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 14px 26px rgba(255, 193, 7, 0.18);
    overflow: hidden;
  }

  .stat-card.metric {
    background: radial-gradient(150% 150% at 0% 0%, rgba(255, 213, 79, 0.28), rgba(13, 17, 23, 0.9));
  }

  .stat-card.currency.silver {
    border-color: rgba(165, 243, 252, 0.35);
    background: radial-gradient(150% 150% at 0% 0%, rgba(165, 243, 252, 0.2), rgba(13, 17, 23, 0.9));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 14px 26px rgba(6, 182, 212, 0.12);
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    background: rgba(255, 213, 79, 0.18);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  .stat-icon.gold {
    background: rgba(255, 213, 79, 0.22);
  }

  .stat-icon.silver {
    background: rgba(165, 243, 252, 0.18);
  }

  .stat-icon img {
    width: 34px;
    height: 34px;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
  }

  .stat-body {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  .stat-body .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(252, 234, 187, 0.65);
  }

  .stat-body .value {
    font-size: clamp(1.25rem, 1.05rem + 0.9vw, 1.9rem);
    font-weight: 600;
    color: #ffecb3;
    font-variant-numeric: tabular-nums;
  }

  .stat-body .meta {
    font-size: 0.82rem;
    color: rgba(252, 234, 187, 0.65);
  }

  .stat-card.currency .stat-body .value {
    color: #ffe082;
  }

  .stat-card.currency.silver .stat-body .value {
    color: #bae6fd;
  }

  .stat-card.net {
    border-color: rgba(255, 213, 79, 0.32);
    background: radial-gradient(160% 160% at 0% 0%, rgba(255, 213, 79, 0.2), rgba(13, 17, 23, 0.9));
  }

  .stat-card.net.positive {
    border-color: rgba(134, 239, 172, 0.45);
    background: radial-gradient(160% 160% at 0% 0%, rgba(34, 197, 94, 0.22), rgba(13, 17, 23, 0.9));
  }

  .stat-card.net.positive .stat-body .value {
    color: #bbf7d0;
  }

  .stat-card.net.negative {
    border-color: rgba(248, 113, 113, 0.45);
    background: radial-gradient(160% 160% at 0% 0%, rgba(248, 113, 113, 0.26), rgba(13, 17, 23, 0.9));
  }

  .stat-card.net.negative .stat-body .value {
    color: #ffcdd2;
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
    grid-template-columns: 1.8fr 0.7fr 1fr;
    gap: 0.75rem;
    align-items: center;
    font-size: 0.95rem;
    color: #f8fafc;
  }

  .reward-label {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .reward-icon {
    width: 48px;
    height: 48px;
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
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
  }

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
    padding: 2rem 1.9rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 340px;
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
  }

  .odds-list li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    padding: 0.85rem 1rem;
    gap: 1rem;
    padding: 0.95rem 1.2rem;
    border-radius: 16px;
    border: 1px solid rgba(255, 213, 79, 0.25);
    background: linear-gradient(145deg, rgba(255, 213, 79, 0.08), rgba(255, 214, 0, 0.02));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .odds-name {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .odds-icon {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }

  .odds-list .name {
    color: #fceabb;
  }

  .odds-list .chance {
    color: rgba(248, 250, 252, 0.78);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.92rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  /* Responsive overrides removed to keep desktop layout across devices */
</style>
