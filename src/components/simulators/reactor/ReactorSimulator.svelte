<script lang="ts">
  import type { BasicReward, GachaDefinition } from '@/lib/reactor-gacha';
  import {
    GACHA_NAME_RU,
    STAR_ICON,
    STAR_LABEL,
    getMutantName,
  } from '@/lib/reactor-gacha';

  export interface DecoratedReward extends BasicReward {
    name: string;
    texture: string | null;
  }

  interface SpinResult {
    item: BasicReward;
    costType: 'token' | 'hc';
    isCompletionReward: boolean;
    completedNow: boolean;
    completionTrigger?: string;
  }

  export let gachaId: string;
  export let gacha: GachaDefinition;
  export let baseTextures: Record<string, string | null>;
  export let completionTexture: string | null;

  const gachaName = GACHA_NAME_RU[gachaId] ?? gachaId;

  const baseRewards: DecoratedReward[] = gacha.basic_elements.map((item) => ({
    ...item,
    name: getMutantName(item.specimen),
    texture: baseTextures[item.specimen] ?? null,
  }));

  const baseSpecimenIds = new Set(baseRewards.map((reward) => reward.specimen));

  let unlocked = new Set<string>();
  let unlockedBaseCount = 0;
  let completed = false;
  let completionGranted = false;
  let completionTrigger: string | null = null;
  let lastResult: SpinResult | null = null;
  let history: SpinResult[] = [];

  const totalUniqueBaseRewards = baseSpecimenIds.size || baseRewards.length;

  $: progressPercent = totalUniqueBaseRewards
    ? Math.round((unlockedBaseCount / totalUniqueBaseRewards) * 100)
    : 0;
  $: progressSummary = totalUniqueBaseRewards
    ? `${unlockedBaseCount} / ${totalUniqueBaseRewards}`
    : '0 / 0';
  $: generatorStatus = completed
    ? 'Завершён'
    : unlockedBaseCount > 0
      ? 'В процессе'
      : 'Не начат';

  const completionReward: DecoratedReward | null = gacha.completion_reward
    ? {
        ...gacha.completion_reward,
        name: getMutantName(gacha.completion_reward.specimen),
        texture: completionTexture ?? null,
      }
    : null;

  const rewardDisplay = new Map<string, DecoratedReward>();
  for (const reward of baseRewards) {
    rewardDisplay.set(reward.specimen, reward);
  }
  if (completionReward) {
    rewardDisplay.set(completionReward.specimen, completionReward);
  }

  const totalBasicOdds = gacha.basic_elements.reduce((sum, item) => sum + item.odds, 0);

  const formatPercent = (item: BasicReward) => {
    const total = completed && completionReward ? totalBasicOdds + completionReward.odds : totalBasicOdds;
    if (!total) return '—';
    return `${((item.odds / total) * 100).toFixed(2)}%`;
  };

  const getRewardName = (specimenId: string) => rewardDisplay.get(specimenId)?.name ?? getMutantName(specimenId);
  const getRewardTexture = (specimenId: string) => rewardDisplay.get(specimenId)?.texture ?? null;

  function updateUnlocked(specimenId: string): boolean {
    if (unlocked.has(specimenId)) {
      return false;
    }
    const next = new Set(unlocked);
    next.add(specimenId);
    unlocked = next;

    let completedNow = false;
    if (baseSpecimenIds.has(specimenId)) {
      unlockedBaseCount += 1;
      if (!completed && unlockedBaseCount >= totalUniqueBaseRewards) {
        completed = true;
        completedNow = true;
        completionTrigger = getMutantName(specimenId);
      }
    }

    return completedNow;
  }

  function registerResult(result: SpinResult) {
    lastResult = result;
    history = [result, ...history].slice(0, 10);
  }

  function rollToken(): BasicReward {
    const options: BasicReward[] = [...gacha.basic_elements];
    const weights: number[] = options.map((item) => item.odds);

    if (completionGranted && completionReward) {
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

  function rollSequential(): { reward: BasicReward; trigger?: string } {
    for (const item of gacha.basic_elements) {
      if (!unlocked.has(item.specimen)) {
        return {
          reward: item,
          trigger: item.specimen,
        };
      }
    }

    if (!completed) {
      completed = true;
    }

    if (completionReward && !completionGranted) {
      return { reward: completionReward };
    }

    const randomIndex = Math.floor(Math.random() * baseRewards.length);
    return { reward: baseRewards[randomIndex] };
  }

  function grantCompletionReward(costType: 'token' | 'hc', trigger?: string) {
    if (!completionReward || completionGranted) {
      return;
    }

    completionGranted = true;
    updateUnlocked(completionReward.specimen);

    const completionResult: SpinResult = {
      item: completionReward,
      costType,
      isCompletionReward: true,
      completedNow: true,
      completionTrigger: trigger ?? completionReward.specimen,
    };

    registerResult(completionResult);

    if (!completionTrigger) {
      completionTrigger = getMutantName(trigger ?? completionReward.specimen);
    }
  }

  function spin(costType: 'token' | 'hc') {
    if (costType === 'token') {
      const reward = rollToken();
      const wasCompleted = completed;
      const completedNow = updateUnlocked(reward.specimen);
      const completionJustNow = completedNow || (!wasCompleted && completed);
      registerResult({
        item: reward,
        costType: 'token',
        isCompletionReward: completionReward ? reward.specimen === completionReward.specimen : false,
        completedNow: completionJustNow,
        completionTrigger: completionJustNow ? reward.specimen : undefined,
      });
      if (completionJustNow && !completionTrigger) {
        completionTrigger = getMutantName(reward.specimen);
      }
      if (completionJustNow) {
        grantCompletionReward('token', reward.specimen);
      }
    } else {
      const { reward, trigger } = rollSequential();
      const wasCompleted = completed;
      const completedNow = updateUnlocked(reward.specimen);
      const completionJustNow = completedNow || (!wasCompleted && completed);
      registerResult({
        item: reward,
        costType: 'hc',
        isCompletionReward: completionReward ? reward.specimen === completionReward.specimen : false,
        completedNow: completionJustNow,
        completionTrigger: completionJustNow ? trigger ?? reward.specimen : undefined,
      });
      if (completionJustNow && !completionTrigger) {
        completionTrigger = getMutantName(trigger ?? reward.specimen);
      }
      if (completionJustNow) {
        grantCompletionReward('hc', trigger ?? reward.specimen);
      }
    }
  }
</script>

<div class="reactor-layout">
  <div class="reactor-stage">
    <div class="stage-header">
      <div>
        <h1>{gachaName}</h1>
        <p>Соберите коллекцию из {baseRewards.length} мутантов и получите награду.</p>
      </div>
      <div class="header-progress">
        <span>Прогресс {progressSummary}</span>
        <div class="header-meter">
          <div class="header-fill" style={`width: ${progressPercent}%`}></div>
        </div>
      </div>
    </div>

    <div
      class="slot-track"
      style={`--slot-count: ${baseRewards.length + (completionReward ? 1 : 0)}`}
    >
      {#each baseRewards as reward (reward.specimen)}
        <div
          class={`slot-card ${unlocked.has(reward.specimen) ? 'unlocked' : ''} ${
            lastResult?.item.specimen === reward.specimen ? 'active' : ''
          }`}
        >
          <div class="slot-inner">
            <div class="slot-top">
              {#if STAR_ICON[reward.stars]}
                <img
                  class="slot-stars"
                  src={STAR_ICON[reward.stars]}
                  alt={STAR_LABEL[reward.stars]}
                  title={STAR_LABEL[reward.stars]}
                />
              {/if}
              <span class="slot-odds">{formatPercent(reward)}</span>
            </div>
            <div class="slot-art">
              {#if reward.texture}
                <img src={reward.texture} alt={reward.name} loading="lazy" />
              {:else}
                <span class="slot-placeholder">Нет иллюстрации</span>
              {/if}
            </div>
            <div class="slot-name">{reward.name}</div>
            <div class="slot-footer">
              <span class={`slot-status ${unlocked.has(reward.specimen) ? 'is-unlocked' : ''}`}>
                {unlocked.has(reward.specimen) ? 'Получен' : 'В пуле'}
              </span>
            </div>
          </div>
          {#if unlocked.has(reward.specimen)}
            <span class="slot-check">✔</span>
          {/if}
        </div>
      {/each}

      {#if completionReward}
        <div
          class={`slot-card completion ${completed ? 'unlocked' : ''} ${
            lastResult?.item.specimen === completionReward.specimen ? 'active' : ''
          }`}
        >
          <div class="slot-inner">
            <div class="slot-top">
              <span class="completion-label">🏆 Финальная награда</span>
              <span class="slot-odds">{completed ? formatPercent(completionReward) : '—'}</span>
            </div>
            <div class="slot-art">
              {#if completionReward.texture}
                <img src={completionReward.texture} alt={completionReward.name} loading="lazy" />
              {:else}
                <span class="slot-placeholder">Нет иллюстрации</span>
              {/if}
            </div>
            <div class="slot-name">{completionReward.name}</div>
            <div class="slot-footer">
              <span class={`slot-status ${completed ? 'is-unlocked' : ''}`}>
                {completed ? 'Теперь в пуле' : 'Соберите коллекцию'}
              </span>
            </div>
          </div>
          {#if completed}
            <span class="slot-check">★</span>
          {/if}
        </div>
      {/if}
    </div>

    <div class="stage-controls">
      <div class="cost-line">
        <div class="cost-pill">
          <span class="pill-label">Стоимость жетона</span>
          <strong>{gacha.token_cost}</strong>
        </div>
        <div class="cost-pill">
          <span class="pill-label">Стоимость золота</span>
          <strong>{gacha.hc_cost}</strong>
        </div>
      </div>
      <div class="spin-buttons">
        <button class="spin token" on:click={() => spin('token')}>
          🎲 Крутить за жетоны
        </button>
        <button class="spin hc" on:click={() => spin('hc')}>
          💰 Крутить за золото
        </button>
      </div>
    </div>
  </div>

  <aside class="info-panel">
    <div class="info-card progress-card">
      <header>
        <h2>Состояние генератора</h2>
        <span>{progressPercent}%</span>
      </header>
      <div class="progress-meter">
        <div class="progress-fill" style={`width: ${progressPercent}%`}></div>
      </div>
      <p class="info-text">Открыто {progressSummary} мутантов.</p>
      <p class="info-text status-text">Статус: {generatorStatus}</p>
      {#if completed}
        <div class="completion-banner">
          Генератор завершён{completionTrigger ? `: ${completionTrigger}` : ''}!
        </div>
      {/if}
    </div>

    {#if lastResult}
      <div class="info-card result-card">
        <header>
          <span class={`badge ${lastResult.costType === 'token' ? 'token' : 'hc'}`}>
            {lastResult.costType === 'token' ? 'Жетоны' : 'Золото'}
          </span>
          {#if lastResult.isCompletionReward}
            <span class="badge completion">🏆</span>
          {/if}
        </header>
        <div class="result-body">
          {#if getRewardTexture(lastResult.item.specimen)}
            <img
              class="result-art"
              src={getRewardTexture(lastResult.item.specimen) ?? ''}
              alt={getRewardName(lastResult.item.specimen)}
            />
          {/if}
          <div class="result-info">
            <h3>{getRewardName(lastResult.item.specimen)}</h3>
            {#if STAR_ICON[lastResult.item.stars]}
              <img
                class="result-star"
                src={STAR_ICON[lastResult.item.stars]}
                alt={STAR_LABEL[lastResult.item.stars]}
              />
            {/if}
            <p>Шанс: {formatPercent(lastResult.item)}</p>
            {#if lastResult.completedNow}
              <p class="result-complete">Коллекция собрана!</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    {#if history.length}
      <div class="info-card history-card">
        <h3>Последние прокрутки</h3>
        <ul>
          {#each history as entry}
            <li>
              {#if getRewardTexture(entry.item.specimen)}
                <img
                  class="history-art"
                  src={getRewardTexture(entry.item.specimen) ?? ''}
                  alt={getRewardName(entry.item.specimen)}
                />
              {/if}
              <div class="history-main">
                <strong>{getRewardName(entry.item.specimen)}</strong>
                <div class="history-meta">
                  <span class={`badge ${entry.costType === 'token' ? 'token' : 'hc'}`}>
                    {entry.costType === 'token' ? 'Жетоны' : 'Золото'}
                  </span>
                  {#if entry.isCompletionReward}
                    <span class="history-flag">🏆</span>
                  {/if}
                  {#if entry.completedNow}
                    <span class="history-flag">Коллекция</span>
                  {/if}
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </aside>
</div>

<style>
  .reactor-layout {
    display: grid;
    grid-template-columns: minmax(0, 2.2fr) minmax(320px, 1fr);
    gap: 2rem;
  }

  @media (max-width: 1100px) {
    .reactor-layout {
      grid-template-columns: 1fr;
    }

    .info-panel {
      order: -1;
    }
  }

  .reactor-stage {
    position: relative;
    padding: 2.25rem 2rem 2rem;
    border-radius: 28px;
    background: radial-gradient(circle at top, rgba(62, 84, 122, 0.35), transparent 60%),
      linear-gradient(145deg, rgba(14, 23, 42, 0.95), rgba(7, 11, 22, 0.95));
    border: 1px solid rgba(59, 130, 246, 0.25);
    box-shadow: 0 35px 70px rgba(5, 10, 20, 0.55);
    overflow: hidden;
  }

  .reactor-stage::after {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 26px;
    pointer-events: none;
    background: linear-gradient(160deg, rgba(148, 163, 184, 0.08), rgba(15, 23, 42, 0.6));
    mix-blend-mode: screen;
    opacity: 0.3;
  }

  .reactor-stage > * {
    position: relative;
    z-index: 1;
  }

  .stage-header {
    display: flex;
    justify-content: space-between;
    gap: 1.5rem;
    align-items: flex-start;
    color: #e2e8f0;
  }

  .stage-header h1 {
    margin: 0;
    font-size: 2.1rem;
    letter-spacing: 0.04em;
  }

  .stage-header p {
    margin: 0.35rem 0 0;
    color: #9fb7d3;
    font-size: 0.95rem;
  }

  .header-progress {
    min-width: 200px;
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .header-progress span {
    font-size: 0.9rem;
    color: #cbd5f5;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .header-meter {
    height: 10px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.2);
    overflow: hidden;
  }

  .header-fill {
    height: 100%;
    background: linear-gradient(90deg, #38bdf8, #6366f1);
    transition: width 0.3s ease;
  }

  .slot-track {
    --slot-gap: 1.4rem;
    margin: 2.5rem 0 2rem;
    padding-bottom: 0.75rem;
    display: flex;
    gap: var(--slot-gap);
    overflow: visible;
  }

  .slot-card {
    position: relative;
    flex: 0 0 calc((100% - (var(--slot-count, 1) - 1) * var(--slot-gap)) / var(--slot-count, 1));
    max-width: calc((100% - (var(--slot-count, 1) - 1) * var(--slot-gap)) / var(--slot-count, 1));
    min-width: 0;
    border-radius: 18px;
    background: linear-gradient(175deg, rgba(74, 222, 128, 0.75), rgba(59, 130, 246, 0.15));
    border: 1px solid rgba(148, 163, 184, 0.35);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
    overflow: hidden;
    transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
  }

  .slot-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(160deg, rgba(255, 255, 255, 0.25), transparent 60%);
    opacity: 0.45;
    pointer-events: none;
  }

  .slot-card.unlocked {
    border-color: rgba(34, 197, 94, 0.9);
    box-shadow: 0 20px 35px rgba(34, 197, 94, 0.25);
  }

  .slot-card.active {
    transform: translateY(-6px) scale(1.02);
    border-color: rgba(250, 204, 21, 0.9);
    box-shadow: 0 22px 40px rgba(250, 204, 21, 0.25);
    filter: saturate(1.1);
  }

  .slot-card.completion {
    background: linear-gradient(175deg, rgba(251, 191, 36, 0.85), rgba(253, 186, 116, 0.2));
    border-color: rgba(253, 224, 71, 0.6);
  }

  .slot-card.completion.unlocked {
    border-color: rgba(253, 224, 71, 0.95);
    box-shadow: 0 20px 35px rgba(253, 224, 71, 0.35);
  }

  @media (max-width: 1280px) {
    .slot-track {
      margin: 2rem -1.5rem 1.75rem;
      padding: 0 1.5rem 1rem;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      scroll-snap-type: x mandatory;
      gap: 1.5rem;
    }

    .slot-track::-webkit-scrollbar {
      display: none;
    }

    .slot-card {
      flex: 0 0 clamp(200px, 65vw, 240px);
      max-width: clamp(200px, 65vw, 240px);
      scroll-snap-align: start;
    }
  }

  @media (max-width: 720px) {
    .slot-track {
      margin: 1.75rem -1rem 1.5rem;
      padding: 0 1rem 0.75rem;
      gap: 1.2rem;
    }

    .slot-card {
      flex: 0 0 clamp(200px, 75vw, 240px);
      max-width: clamp(200px, 75vw, 240px);
    }
  }

  .slot-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.1rem 1rem 1.2rem;
    color: #0f172a;
  }

  .slot-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .slot-stars {
    height: 34px;
    filter: drop-shadow(0 3px 4px rgba(15, 23, 42, 0.45));
  }

  .slot-odds {
    font-size: 0.75rem;
    color: rgba(15, 23, 42, 0.7);
    background: rgba(255, 255, 255, 0.7);
    padding: 0.2rem 0.45rem;
    border-radius: 999px;
    font-weight: 600;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .completion-label {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(15, 23, 42, 0.8);
  }

  .slot-art {
    position: relative;
    height: 200px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.45);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    box-shadow: inset 0 0 12px rgba(15, 23, 42, 0.25);
  }

  .slot-art img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transform: translateY(6px);
  }

  .slot-placeholder {
    color: rgba(15, 23, 42, 0.45);
    font-size: 0.85rem;
    letter-spacing: 0.05em;
  }

  .slot-name {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .slot-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: auto;
  }

  .slot-status {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(15, 23, 42, 0.55);
  }

  .slot-status.is-unlocked {
    color: rgba(15, 118, 110, 0.95);
  }

  .slot-card.completion .slot-status.is-unlocked {
    color: rgba(217, 119, 6, 0.95);
  }

  .slot-check {
    position: absolute;
    top: 10px;
    right: 12px;
    font-size: 1.4rem;
    color: rgba(15, 23, 42, 0.75);
    text-shadow: 0 4px 6px rgba(255, 255, 255, 0.3);
  }

  .stage-controls {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .cost-line {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .cost-pill {
    background: linear-gradient(120deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.8));
    border: 1px solid rgba(148, 163, 184, 0.35);
    padding: 0.75rem 1.25rem;
    border-radius: 999px;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    color: #e2e8f0;
  }

  .pill-label {
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.9);
  }

  .cost-pill strong {
    font-size: 1.2rem;
    letter-spacing: 0.08em;
  }

  .spin-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .spin {
    flex: 1 1 220px;
    padding: 1.1rem 1.4rem;
    border-radius: 18px;
    border: none;
    cursor: pointer;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
    color: #0f172a;
  }

  .spin.token {
    background: linear-gradient(130deg, #34d399, #22d3ee);
    box-shadow: 0 18px 30px rgba(45, 212, 191, 0.35);
  }

  .spin.hc {
    background: linear-gradient(130deg, #facc15, #fb7185);
    box-shadow: 0 18px 30px rgba(248, 113, 113, 0.35);
  }

  .spin:hover {
    transform: translateY(-4px);
    filter: brightness(1.06);
  }

  .info-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .info-card {
    background: linear-gradient(150deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.85));
    border-radius: 22px;
    border: 1px solid rgba(59, 130, 246, 0.2);
    padding: 1.5rem;
    color: #e2e8f0;
    box-shadow: 0 25px 40px rgba(5, 12, 25, 0.4);
  }

  .progress-card header,
  .result-card header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .progress-card header h2,
  .result-card h3,
  .history-card h3 {
    margin: 0;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-size: 0.95rem;
    color: #bfdbfe;
  }

  .progress-card header span {
    font-size: 1rem;
    color: #facc15;
  }

  .progress-meter {
    height: 12px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.2);
    overflow: hidden;
    margin-top: 1rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #22d3ee, #38bdf8, #6366f1);
    transition: width 0.3s ease;
  }

  .info-text {
    margin: 0.75rem 0 0;
    color: #cbd5f5;
    font-size: 0.9rem;
  }

  .status-text {
    color: #93c5fd;
    margin-top: 0.35rem;
  }

  .completion-banner {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 14px;
    background: linear-gradient(120deg, rgba(253, 224, 71, 0.25), rgba(250, 204, 21, 0.15));
    border: 1px solid rgba(250, 204, 21, 0.4);
    color: #fde68a;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700;
    background: rgba(59, 130, 246, 0.15);
    color: #93c5fd;
  }

  .badge.token {
    background: rgba(45, 212, 191, 0.2);
    color: #5eead4;
  }

  .badge.hc {
    background: rgba(248, 113, 113, 0.2);
    color: #fca5a5;
  }

  .badge.completion {
    background: rgba(250, 204, 21, 0.25);
    color: #fde68a;
  }

  .result-body {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    align-items: center;
  }

  .result-art {
    width: 84px;
    height: 84px;
    object-fit: contain;
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.6);
    padding: 0.4rem;
  }

  .result-info h3 {
    margin: 0 0 0.35rem;
    font-size: 1.05rem;
    letter-spacing: 0.04em;
  }

  .result-info p {
    margin: 0.3rem 0 0;
    color: #cbd5f5;
    font-size: 0.9rem;
  }

  .result-star {
    height: 38px;
    margin-bottom: 0.3rem;
  }

  .result-complete {
    color: #facc15;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .history-card ul {
    margin: 1rem 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .history-card li {
    display: flex;
    align-items: center;
    gap: 0.9rem;
  }

  .history-art {
    width: 54px;
    height: 54px;
    object-fit: contain;
    border-radius: 14px;
    background: rgba(30, 41, 59, 0.7);
    padding: 0.3rem;
  }

  .history-main strong {
    display: block;
    font-size: 0.95rem;
    letter-spacing: 0.04em;
  }

  .history-meta {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 0.25rem;
  }

  .history-flag {
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #c4b5fd;
  }
</style>
