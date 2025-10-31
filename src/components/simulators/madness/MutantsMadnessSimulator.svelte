<script lang="ts">
  import { tick, onDestroy } from 'svelte';
  import type {
    MadnessMachineDefinition,
    MadnessResearchChance,
    MadnessRewardAggregate,
    MadnessSimulation,
    MadnessSpinSummary,
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
      error = 'Уровень игрока должен быть не менее 1.';
      return;
    }

    if (totalSpins <= 0) {
      error = 'Введите ресурсы для хотя бы одного прокрута.';
      return;
    }

    if (!Number.isFinite(level)) {
      error = 'Уровень игрока указан некорректно.';
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
    if (token) parts.push(`${formatNumber(token)} × жетоны`);
    if (gold) parts.push(`${formatNumber(gold)} × золото`);
    return parts.join(' · ');
  }

  onDestroy(() => {
    stopSimulation();
  });
</script>

<div class="madness-shell">
  <header class="hero">
    <div class="hero-content">
      <span class="badge">Sim • Mutants Madness</span>
      <h2>{machine.title}</h2>
      <p>
        Рулетка с эксклюзивными мутантами в стиле казино. Симулятор повторяет официальные веса
        наград и учитывает открытые исследования в зависимости от уровня игрока.
      </p>
      <dl class="hero-stats">
        <div>
          <dt>Стоимость золота</dt>
          <dd>{formatNumber(machine.cost)} за спин</dd>
        </div>
        <div>
          <dt>Стоимость жетонов</dt>
          <dd>{formatNumber(machine.tokenCost)} за спин</dd>
        </div>
        <div>
          <dt>Доступно наград</dt>
          <dd>{rewardChances.length}</dd>
        </div>
        <div>
          <dt>Шанс джекпота</dt>
          <dd>{formatPercent(jackpotChance, 4)}</dd>
        </div>
      </dl>
    </div>
  </header>

  <form class="control-panel" on:submit|preventDefault={handleSimulate}>
    <div class="inputs">
      <label class="field">
        <span class="label">Уровень игрока</span>
        <input type="number" min={1} max={200} bind:value={level} />
        <small>Максимальное исследование: {maxResearch > 0 ? maxResearch : 'не доступно'}</small>
      </label>
      <label class="field">
        <span class="label">Золото</span>
        <input type="number" min={0} step={1} bind:value={gold} />
        <small>Стоимость прокрута: {formatNumber(goldCostPerSpin)} золота</small>
      </label>
      <label class="field">
        <span class="label">Жетоны</span>
        <input type="number" min={0} step={1} bind:value={tokens} />
        <small>Стоимость прокрута: {formatNumber(tokenCostPerSpin)} жетонов</small>
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
      <div class="summary-card">
        <span class="title">Прокруты за жетоны</span>
        <strong>{formatNumber(tokenSpins)}</strong>
        <span class="meta">Останется: {formatNumber(tokenRemaining)} жет.</span>
      </div>
      <div class="summary-card">
        <span class="title">Прокруты за золото</span>
        <strong>{formatNumber(goldSpins)}</strong>
        <span class="meta">Останется: {formatNumber(goldRemaining)} зол.</span>
      </div>
      <div class="summary-card">
        <span class="title">Всего прокрутов</span>
        <strong>{formatNumber(totalSpins)}</strong>
        <span class="meta">Открыто исследований: {maxResearch}</span>
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
          Выполнено {formatNumber(result.totalSpins)} прокрутов: {formatNumber(result.tokenSpins)} за жетоны и
          {formatNumber(result.goldSpins)} за золото. Выпало джекпотов: {formatNumber(result.jackpotCount)}.
        </p>
      </header>

      <div class="result-grid">
        <section class="result-column">
          <h4>По наградам</h4>
          {#if result.rewardBreakdown.length}
            <ul class="reward-list">
              {#each result.rewardBreakdown.slice(0, 30) as entry}
                <li>
                  <div class="icon">
                    <img src={entry.icon ?? '/mutants/icon_gacha.png'} alt="" loading="lazy" />
                  </div>
                  <div class="details">
                    <span class="name">{entry.label}</span>
                    <span class="meta">
                      {formatNumber(entry.count)}× — факт: {getActualShare(entry)} · теор: {formatPercent(entry.chance, 4)}
                    </span>
                    <span class="meta">{getCurrencyLabel(entry)}</span>
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
                    <img src={entry.icon ?? '/mutants/icon_gacha.png'} alt="" loading="lazy" />
                  </div>
                  <div class="details">
                    <span class="name">{entry.label}</span>
                    <span class="meta">
                      {entry.currency === 'token' ? 'жетоны' : 'золото'} · {getResearchLabel(entry.researchKey)}
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

  .hero {
    position: relative;
    padding: 2.8rem;
    border-radius: 38px;
    background: radial-gradient(circle at 15% 15%, rgba(244, 63, 94, 0.18), rgba(15, 23, 42, 0.92));
    border: 1px solid rgba(244, 114, 182, 0.28);
    box-shadow: 0 28px 48px rgba(244, 63, 94, 0.16);
    overflow: hidden;
  }

  .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.12), transparent 60%);
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
    color: #fdf4ff;
  }

  .badge {
    align-self: flex-start;
    padding: 0.48rem 1.2rem;
    border-radius: 999px;
    border: 1px solid rgba(244, 114, 182, 0.45);
    background: rgba(244, 63, 94, 0.22);
    color: #fbcfe8;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 0.82rem;
  }

  h2 {
    margin: 0;
    font-size: 3rem;
    color: #fdf2f8;
  }

  .hero p {
    margin: 0;
    max-width: 720px;
    color: rgba(252, 231, 243, 0.82);
    line-height: 1.75;
    font-size: 1.08rem;
  }

  .hero-stats {
    display: grid;
    gap: 1.3rem;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    margin: 0;
  }

  .hero-stats dt {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(244, 215, 255, 0.7);
  }

  .hero-stats dd {
    margin: 0.35rem 0 0;
    font-size: 1.3rem;
    color: #fdf4ff;
    font-weight: 600;
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

  input:focus,
  select:focus {
    outline: none;
    border-color: rgba(249, 168, 212, 0.8);
    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.25);
  }

  small {
    color: rgba(148, 163, 184, 0.7);
    font-size: 0.78rem;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.2rem;
  }

  .summary-card {
    padding: 1.2rem 1.4rem;
    border-radius: 22px;
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(148, 163, 184, 0.18);
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .summary-card .title {
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.75);
  }

  .summary-card strong {
    font-size: 1.7rem;
    color: #fce7f3;
  }

  .summary-card .meta {
    font-size: 0.82rem;
    color: rgba(203, 213, 225, 0.72);
  }

  .actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  button {
    border: none;
    cursor: pointer;
    border-radius: 14px;
    padding: 0.9rem 1.6rem;
    font-size: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  button.primary {
    background: linear-gradient(135deg, #fb7185, #ec4899);
    color: white;
    box-shadow: 0 15px 30px rgba(236, 72, 153, 0.35);
  }

  button.primary:disabled {
    opacity: 0.7;
    cursor: wait;
    box-shadow: none;
  }

  button.ghost {
    background: transparent;
    border: 1px solid rgba(248, 113, 113, 0.35);
    color: rgba(248, 113, 113, 0.9);
  }

  button.ghost.danger {
    border-color: rgba(248, 113, 113, 0.6);
    color: #fee2e2;
    background: rgba(248, 113, 113, 0.12);
  }

  button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .progress {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    width: 100%;
  }

  .progress-bar {
    height: 6px;
    border-radius: 999px;
    background: rgba(248, 113, 113, 0.25);
    position: relative;
    overflow: hidden;
  }

  .progress-bar::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(248, 113, 113, 0.8), rgba(236, 72, 153, 0.85));
    width: var(--progress, 0%);
  }

  .progress-label {
    font-size: 0.85rem;
    color: rgba(226, 232, 240, 0.8);
  }

  .error {
    margin: 0;
    color: #fecaca;
    font-size: 0.9rem;
  }

  .odds-section {
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
  }

  .odds-section header h3 {
    margin: 0;
    font-size: 1.8rem;
    color: #fdf2f8;
  }

  .odds-section header p {
    margin: 0;
    color: rgba(226, 232, 240, 0.7);
  }

  .odds-table {
    display: grid;
    gap: 1.2rem;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .odds-card {
    padding: 1.4rem;
    border-radius: 24px;
    background: rgba(17, 24, 39, 0.78);
    border: 1px solid rgba(148, 163, 184, 0.18);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .odds-card header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .odds-card h4 {
    margin: 0;
    font-size: 1.1rem;
    color: #fce7f3;
  }

  .odds-card .chance {
    font-size: 0.95rem;
    color: rgba(248, 113, 113, 0.9);
  }

  .odds-card .odds-meta {
    margin: 0;
    font-size: 0.82rem;
    color: rgba(203, 213, 225, 0.7);
  }

  .odds-card ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .odds-card li {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    font-size: 0.9rem;
    color: rgba(226, 232, 240, 0.88);
  }

  .odds-card li .value {
    color: rgba(248, 113, 113, 0.9);
  }

  .odds-card li.more {
    color: rgba(148, 163, 184, 0.75);
    font-style: italic;
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 1.8rem;
  }

  .results-header h3 {
    margin: 0;
    font-size: 1.9rem;
    color: #fdf2f8;
  }

  .results-header p {
    margin: 0.6rem 0 0;
    color: rgba(226, 232, 240, 0.75);
  }

  .result-grid {
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
    background: rgba(17, 24, 39, 0.78);
    border: 1px solid rgba(148, 163, 184, 0.15);
  }

  .result-column h4 {
    margin: 0;
    font-size: 1.2rem;
    color: #fce7f3;
  }

  .reward-list,
  .history-list,
  .research-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    max-height: 420px;
    overflow-y: auto;
  }

  .reward-list li,
  .history-list li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.85rem;
    align-items: center;
  }

  .icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(148, 163, 184, 0.2);
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

  .details .name {
    font-weight: 600;
    color: #e9d5ff;
  }

  .details .meta,
  .research-list .meta {
    font-size: 0.82rem;
    color: rgba(203, 213, 225, 0.7);
  }

  .muted {
    margin: 0;
    color: rgba(148, 163, 184, 0.65);
  }

  .research-list li {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px dashed rgba(148, 163, 184, 0.18);
  }

  .research-list li:last-child {
    border-bottom: none;
  }

  @media (max-width: 720px) {
    .hero {
      padding: 2.2rem;
      border-radius: 28px;
    }

    .hero-stats {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .control-panel {
      padding: 1.8rem;
    }
  }
</style>
