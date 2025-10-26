<script lang="ts">
  import type { BasicReward, GachaDefinition } from '@/lib/reactor-gacha';
  import {
    GACHA_NAME_RU,
    STAR_ICON,
    STAR_LABEL,
    gachaMap,
    getMutantName,
  } from '@/lib/reactor-gacha';

  export let gachaId: string;

  const gacha: GachaDefinition | undefined = gachaMap[gachaId];
  if (!gacha) {
    throw new Error(`Не найден генератор с id "${gachaId}"`);
  }

  const gachaName = GACHA_NAME_RU[gachaId] ?? gachaId;

  interface SpinResult {
    item: BasicReward;
    costType: 'token' | 'hc';
    isCompletionReward: boolean;
    completedNow: boolean;
    completionTrigger?: string;
  }

  let unlocked = new Set<string>();
  let completed = false;
  let completionTrigger: string | null = null;
  let lastResult: SpinResult | null = null;
  let history: SpinResult[] = [];

  const baseRewards = gacha.basic_elements.map((item) => ({
    ...item,
    name: getMutantName(item.specimen),
  }));

  const completionReward = gacha.completion_reward
    ? { ...gacha.completion_reward, name: getMutantName(gacha.completion_reward.specimen) }
    : null;

  const totalBasicOdds = gacha.basic_elements.reduce((sum, item) => sum + item.odds, 0);

  const formatPercent = (item: BasicReward) => {
    const total = completed && completionReward
      ? totalBasicOdds + completionReward.odds
      : totalBasicOdds;
    if (!total) return '—';
    return `${((item.odds / total) * 100).toFixed(2)}%`;
  };

  const progress = () => {
    if (!baseRewards.length) return 0;
    return Math.round((unlocked.size / baseRewards.length) * 100);
  };

  function updateUnlocked(specimenId: string) {
    if (!unlocked.has(specimenId)) {
      const next = new Set(unlocked);
      next.add(specimenId);
      unlocked = next;
      if (!completed && unlocked.size === baseRewards.length) {
        completed = true;
        completionTrigger = getMutantName(specimenId);
      }
    }
  }

  function registerResult(result: SpinResult) {
    lastResult = result;
    history = [result, ...history].slice(0, 12);
  }

  function rollToken(): BasicReward {
    const options: BasicReward[] = [...gacha.basic_elements];
    const weights: number[] = options.map((item) => item.odds);

    if (completed && completionReward) {
      options.push(completionReward);
      weights.push(completionReward.odds);
    }

    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    if (!totalWeight) {
      return options[0];
    }

    let threshold = Math.random() * totalWeight;
    for (let i = 0; i < options.length; i += 1) {
      threshold -= weights[i];
      if (threshold <= 0) {
        return options[i];
      }
    }

    return options[options.length - 1];
  }

  function rollSequential(): { reward: BasicReward; completedNow: boolean; trigger?: string } {
    for (const item of gacha.basic_elements) {
      if (!unlocked.has(item.specimen)) {
        return {
          reward: item,
          completedNow: unlocked.size + 1 === baseRewards.length,
          trigger: item.specimen,
        };
      }
    }

    if (!completed) {
      completed = true;
    }

    if (completionReward) {
      return { reward: completionReward, completedNow: false };
    }

    const randomIndex = Math.floor(Math.random() * baseRewards.length);
    return { reward: baseRewards[randomIndex], completedNow: false };
  }

  function spin(costType: 'token' | 'hc') {
    if (costType === 'token') {
      const reward = rollToken();
      const wasCompleted = completed;
      updateUnlocked(reward.specimen);
      const completedNow = !wasCompleted && completed && unlocked.size === baseRewards.length;
      registerResult({
        item: reward,
        costType: 'token',
        isCompletionReward: completionReward ? reward.specimen === completionReward.specimen : false,
        completedNow,
        completionTrigger: completedNow ? reward.specimen : undefined,
      });
      if (completedNow && !completionTrigger) {
        completionTrigger = getMutantName(reward.specimen);
      }
    } else {
      const { reward, completedNow, trigger } = rollSequential();
      const wasCompleted = completed;
      updateUnlocked(reward.specimen);
      const completionJustNow = completedNow || (!wasCompleted && completed);
      registerResult({
        item: reward,
        costType: 'hc',
        isCompletionReward: completionReward ? reward.specimen === completionReward.specimen : false,
        completedNow: completionJustNow,
        completionTrigger: completionJustNow ? (trigger ?? reward.specimen) : undefined,
      });
      if (completionJustNow && !completionTrigger) {
        completionTrigger = getMutantName((trigger ?? reward.specimen));
      }
    }
  }
</script>

<div class="reactor-wrapper">
  <section class="reactor-panel">
    <header class="panel-header">
      <div>
        <h1>{gachaName}</h1>
        <p class="subtitle">Симулятор реактора • {baseRewards.length} мутантов</p>
      </div>
      <div class="cost-block">
        <div class="cost-item">
          <span class="cost-label">Жетоны</span>
          <strong>{gacha.token_cost}</strong>
        </div>
        <div class="cost-item">
          <span class="cost-label">Золото</span>
          <strong>{gacha.hc_cost}</strong>
        </div>
      </div>
    </header>

    <div class="actions">
      <button class="spin token" on:click={() => spin('token')}>
        🎲 Крутить за жетоны
      </button>
      <button class="spin hc" on:click={() => spin('hc')}>
        💰 Крутить за золото
      </button>
    </div>

    <div class="status">
      <div class="progress">
        <span>Прогресс коллекции</span>
        <div class="progress-bar">
          <div class="progress-fill" style={`width: ${progress()}%`}></div>
        </div>
        <small>{unlocked.size} / {baseRewards.length} мутантов ({progress()}%)</small>
        {#if completed}
          <div class="completion">Генератор завершён{completionTrigger ? `: ${completionTrigger}` : ''}!</div>
        {/if}
      </div>
    </div>

    {#if lastResult}
      <div class="result-card">
        <div class="result-header">
          <span class={`badge ${lastResult.costType === 'token' ? 'token' : 'hc'}`}>
            {lastResult.costType === 'token' ? 'Жетоны' : 'Золото'}
          </span>
          {#if lastResult.isCompletionReward}
            <span class="badge completion">🏆 Награда за завершение</span>
          {/if}
        </div>
        <h2>{getMutantName(lastResult.item.specimen)}</h2>
        {#if STAR_ICON[lastResult.item.stars]}
          <img class="star" src={STAR_ICON[lastResult.item.stars]} alt={STAR_LABEL[lastResult.item.stars]} />
        {/if}
        <p class="odds">Шанс: {formatPercent(lastResult.item)}</p>
        {#if lastResult.completedNow}
          <p class="completion-message">Генератор завершён!</p>
        {/if}
      </div>
    {/if}
  </section>

  <section class="mutants-panel">
    <h3>Список наград</h3>
    <div class="mutant-grid">
      {#each baseRewards as reward}
        <div class={`mutant-card ${unlocked.has(reward.specimen) ? 'unlocked' : ''}`}>
          <div class="mutant-name">{reward.name}</div>
          <div class="mutant-meta">
            {#if STAR_ICON[reward.stars]}
              <img src={STAR_ICON[reward.stars]} alt={STAR_LABEL[reward.stars]} title={STAR_LABEL[reward.stars]} />
            {/if}
            <span class="chance">{formatPercent(reward)}</span>
          </div>
          <div class="status-line">
            {unlocked.has(reward.specimen) ? 'Открыт' : 'Не получен'}
          </div>
        </div>
      {/each}
      {#if completionReward}
        <div class={`mutant-card completion ${completed ? 'unlocked' : ''}`}>
          <div class="mutant-name">🏆 {completionReward.name}</div>
          <div class="mutant-meta">
            {#if STAR_ICON[completionReward.stars]}
              <img src={STAR_ICON[completionReward.stars]} alt={STAR_LABEL[completionReward.stars]} />
            {/if}
            <span class="chance">
              {completed ? formatPercent(completionReward) : '—'}
            </span>
          </div>
          <div class="status-line">
            {completed ? 'Доступна в пуле' : 'Откроется после сбора коллекции'}
          </div>
        </div>
      {/if}
    </div>

    {#if history.length}
      <div class="history">
        <h3>Последние прокрутки</h3>
        <ul>
          {#each history as entry, index}
            <li>
              <span class={`badge ${entry.costType === 'token' ? 'token' : 'hc'}`}>
                {entry.costType === 'token' ? 'Жетоны' : 'Золото'}
              </span>
              <strong>{getMutantName(entry.item.specimen)}</strong>
              {#if entry.isCompletionReward}
                <span class="small">🏆</span>
              {/if}
              {#if entry.completedNow}
                <span class="small">(коллекция собрана)</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>
</div>

<style>
  .reactor-wrapper {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 2rem;
  }

  @media (max-width: 980px) {
    .reactor-wrapper {
      grid-template-columns: 1fr;
    }
  }

  .reactor-panel {
    background: linear-gradient(160deg, rgba(44,62,80,0.85), rgba(20,24,32,0.9));
    border: 1px solid #2f3846;
    border-radius: 18px;
    padding: 2rem;
    box-shadow: 0 20px 40px rgba(0,0,0,0.35);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .panel-header h1 {
    margin: 0;
    font-size: 2rem;
    color: #f1f5f9;
  }

  .panel-header .subtitle {
    margin: 0.25rem 0 0;
    color: #94a3b8;
    font-size: 0.95rem;
  }

  .cost-block {
    display: flex;
    gap: 1rem;
  }

  .cost-item {
    background: rgba(15,23,42,0.7);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    text-align: center;
    border: 1px solid rgba(148,163,184,0.15);
  }

  .cost-label {
    display: block;
    font-size: 0.8rem;
    color: #94a3b8;
    margin-bottom: 0.25rem;
  }

  .cost-item strong {
    font-size: 1.25rem;
    color: #f8fafc;
  }

  .actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .spin {
    flex: 1 1 220px;
    padding: 1rem 1.5rem;
    border-radius: 14px;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  }

  .spin.token {
    background: linear-gradient(135deg, #22d3ee, #3b82f6);
    color: #0f172a;
    box-shadow: 0 14px 25px rgba(34,211,238,0.3);
  }

  .spin.hc {
    background: linear-gradient(135deg, #f97316, #ef4444);
    color: #0f172a;
    box-shadow: 0 14px 25px rgba(249,115,22,0.3);
  }

  .spin:hover {
    transform: translateY(-2px);
    filter: brightness(1.05);
  }

  .status {
    background: rgba(15,23,42,0.7);
    border-radius: 14px;
    padding: 1.5rem;
    border: 1px solid rgba(148,163,184,0.15);
  }

  .progress > span {
    font-size: 0.95rem;
    color: #e2e8f0;
    display: block;
    margin-bottom: 0.5rem;
  }

  .progress-bar {
    background: rgba(148,163,184,0.2);
    border-radius: 999px;
    overflow: hidden;
    height: 12px;
  }

  .progress-fill {
    background: linear-gradient(135deg, #34d399, #10b981);
    height: 100%;
    transition: width 0.3s ease;
  }

  .progress small {
    display: block;
    margin-top: 0.5rem;
    color: #94a3b8;
    font-size: 0.85rem;
  }

  .completion {
    margin-top: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(16,185,129,0.15);
    border: 1px solid rgba(16,185,129,0.4);
    border-radius: 10px;
    color: #6ee7b7;
    font-size: 0.95rem;
  }

  .result-card {
    background: linear-gradient(140deg, rgba(148,163,184,0.08), rgba(59,130,246,0.12));
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid rgba(59,130,246,0.2);
  }

  .result-header {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .badge.token {
    background: rgba(34,211,238,0.2);
    color: #22d3ee;
    border: 1px solid rgba(34,211,238,0.5);
  }

  .badge.hc {
    background: rgba(249,115,22,0.2);
    color: #fb923c;
    border: 1px solid rgba(249,115,22,0.45);
  }

  .badge.completion {
    background: rgba(250,204,21,0.2);
    color: #facc15;
    border: 1px solid rgba(250,204,21,0.45);
  }

  .result-card h2 {
    margin: 0 0 0.5rem;
    color: #f8fafc;
  }

  .result-card .star {
    height: 48px;
    margin-bottom: 0.75rem;
  }

  .result-card .odds {
    margin: 0;
    color: #94a3b8;
  }

  .completion-message {
    margin-top: 0.75rem;
    color: #facc15;
    font-weight: 700;
  }

  .mutants-panel {
    background: rgba(15,23,42,0.65);
    border-radius: 18px;
    border: 1px solid rgba(30,41,59,0.8);
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .mutants-panel h3 {
    margin: 0;
    color: #e2e8f0;
    font-size: 1.3rem;
  }

  .mutant-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }

  .mutant-card {
    background: rgba(30,41,59,0.75);
    border-radius: 12px;
    padding: 1rem;
    border: 1px solid rgba(148,163,184,0.12);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .mutant-card.unlocked {
    border-color: rgba(16,185,129,0.5);
    transform: translateY(-2px);
  }

  .mutant-card.completion {
    background: linear-gradient(140deg, rgba(250,204,21,0.12), rgba(30,41,59,0.85));
  }

  .mutant-name {
    font-size: 1rem;
    color: #f1f5f9;
  }

  .mutant-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mutant-meta img {
    height: 28px;
    width: 28px;
  }

  .chance {
    color: #94a3b8;
    font-size: 0.9rem;
  }

  .status-line {
    margin-top: auto;
    font-size: 0.85rem;
    color: #64748b;
  }

  .mutant-card.unlocked .status-line {
    color: #34d399;
  }

  .history ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .history li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    color: #e2e8f0;
  }

  .history .small {
    font-size: 0.8rem;
    color: #facc15;
  }
</style>
