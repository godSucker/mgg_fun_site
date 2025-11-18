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
      <div class="header-info">
        <h1>{gachaName}</h1>
        <p>Соберите коллекцию из {baseRewards.length} мутантов.</p>
      </div>
      <div class="header-progress">
        <span>{progressSummary}</span>
        <div class="header-meter">
          <div class="header-fill" style={`width: ${progressPercent}%`}></div>
        </div>
      </div>
    </div>

    <!--
      ИЗМЕНЕНИЕ: Добавлен класс grid-view для мобилок в CSS
    -->
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
                />
              {/if}
              <span class="slot-odds">{formatPercent(reward)}</span>
            </div>
            <div class="slot-art">
              {#if reward.texture}
                <img src={reward.texture} alt={reward.name} loading="lazy" />
              {:else}
                <span class="slot-placeholder">?</span>
              {/if}
            </div>
            <div class="slot-name">{reward.name}</div>

            <div class="slot-footer mobile-hidden">
              <span class={`slot-status ${unlocked.has(reward.specimen) ? 'is-unlocked' : ''}`}>
                {unlocked.has(reward.specimen) ? 'Получен' : 'В пуле'}
              </span>
            </div>
          </div>
          {#if unlocked.has(reward.specimen)}
            <div class="slot-overlay-check">
              <span class="check-icon">✔</span>
            </div>
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
              <span class="completion-label">Награда</span>
              <span class="slot-odds">{completed ? formatPercent(completionReward) : ''}</span>
            </div>
            <div class="slot-art">
              {#if completionReward.texture}
                <img src={completionReward.texture} alt={completionReward.name} loading="lazy" />
              {:else}
                <span class="slot-placeholder">?</span>
              {/if}
            </div>
            <div class="slot-name">{completionReward.name}</div>
            <div class="slot-footer mobile-hidden">
              <span class={`slot-status ${completed ? 'is-unlocked' : ''}`}>
                {completed ? 'Получен' : 'Locked'}
              </span>
            </div>
          </div>
          {#if completed}
            <div class="slot-overlay-check">
              <span class="check-icon">★</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="stage-controls">
      <div class="cost-line">
        <div class="cost-pill">
          <span class="pill-label">Жетоны</span>
          <strong>{gacha.token_cost}</strong>
        </div>
        <div class="cost-pill">
          <span class="pill-label">Золото</span>
          <strong>{gacha.hc_cost}</strong>
        </div>
      </div>
      <div class="spin-buttons">
        <button class="spin token" on:click={() => spin('token')}>
          Крутить (Жетоны)
        </button>
        <button class="spin hc" on:click={() => spin('hc')}>
          Крутить (Золото)
        </button>
      </div>
    </div>
  </div>

  <aside class="info-panel">
    {#if lastResult}
      <div class="info-card result-card">
        <header>
          <span class={`badge ${lastResult.costType === 'token' ? 'token' : 'hc'}`}>
            {lastResult.costType === 'token' ? 'Жетон' : 'Золото'}
          </span>
          {#if lastResult.isCompletionReward}
            <span class="badge completion">🏆</span>
          {/if}
        </header>
        <div class="result-body">
          {#if getRewardTexture(lastResult.item.specimen)}
            <div class="result-art-wrapper">
               <img
                 class="result-art"
                 src={getRewardTexture(lastResult.item.specimen) ?? ''}
                 alt={getRewardName(lastResult.item.specimen)}
               />
            </div>
          {/if}
          <div class="result-info">
            <h3>{getRewardName(lastResult.item.specimen)}</h3>
            <p>Шанс: {formatPercent(lastResult.item)}</p>
            {#if lastResult.completedNow}
              <p class="result-complete">Собрано!</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    {#if history.length}
      <div class="info-card history-card">
        <h3>История</h3>
        <ul>
          {#each history as entry}
            <li>
              <div class="history-thumb">
                {#if getRewardTexture(entry.item.specimen)}
                  <img
                    src={getRewardTexture(entry.item.specimen) ?? ''}
                    alt={getRewardName(entry.item.specimen)}
                  />
                {/if}
              </div>
              <div class="history-main">
                <div class="history-name">{getRewardName(entry.item.specimen)}</div>
                <div class="history-meta">
                  <span class={`mini-badge ${entry.costType === 'token' ? 'token' : 'hc'}`}>
                    {entry.costType === 'token' ? 'Ж' : 'З'}
                  </span>
                  {#if entry.isCompletionReward}
                    <span class="history-flag">🏆</span>
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
  /* --- DESKTOP LAYOUT --- */
  .reactor-layout {
    display: grid;
    /*
       БЫЛО: minmax(0, 2.5fr)
       СТАЛО: minmax(0, 4fr)
       Мы даем левой колонке в 4 раза больше веса, чем правой.
       Теперь она растянется вправо и все влезет без скролла.
    */
    grid-template-columns: minmax(0, 5fr) minmax(225px, 1fr);
    gap: 2rem;
    align-items: start;
  }

  .reactor-stage {
    padding: 2rem;
    border-radius: 24px;
    background: radial-gradient(circle at top, rgba(62, 84, 122, 0.35), transparent 60%),
      linear-gradient(145deg, rgba(14, 23, 42, 0.95), rgba(7, 11, 22, 0.95));
    border: 1px solid rgba(59, 130, 246, 0.25);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  }

  .stage-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }
  .stage-header h1 { margin: 0; font-size: 1.8rem; color: #f1f5f9; }
  .stage-header p { margin: 0.25rem 0 0; color: #94a3b8; font-size: 0.9rem; }

  .header-progress {
    min-width: 160px;
    text-align: right;
  }
  .header-progress span { color: #cbd5f5; font-size: 0.85rem; display: block; margin-bottom: 4px; }
  .header-meter { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.1); overflow: hidden; }
  .header-fill { height: 100%; background: #3b82f6; transition: width 0.3s; }

  /* SLOTS - Horizontal on Desktop */
  .slot-track {
    display: flex;
    gap: 1rem;
    padding-bottom: 10px;
    overflow-x: auto;
  }

  .slot-card {
    /* Desktop sizing */
    flex: 0 0 130px;
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    position: relative;
    transition: all 0.2s;
  }

  .slot-card.unlocked {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.5);
  }

  .slot-card.active {
    transform: translateY(-4px);
    border-color: #facc15;
    box-shadow: 0 0 15px rgba(250, 204, 21, 0.3);
  }

  .slot-inner {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    height: 100%;
  }

  .slot-top {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 6px;
    font-size: 0.7rem;
    color: #94a3b8;
  }
  .slot-stars { height: 16px; }
  .slot-odds { font-weight: 600; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 4px; }

  .slot-art {
    width: 100%;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
  }

  .slot-art img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 4px 4px rgba(0,0,0,0.5));
  }

  .slot-placeholder { color: #475569; font-size: 1.5rem; }

  .slot-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: #e2e8f0;
    line-height: 1.2;
    margin-bottom: auto;
  }

  .slot-footer { margin-top: 6px; font-size: 0.7rem; text-transform: uppercase; color: #64748b; }
  .slot-status.is-unlocked { color: #34d399; font-weight: 700; }

  .slot-overlay-check {
    position: absolute;
    inset: 0;
    background: rgba(16, 185, 129, 0.1);
    border-radius: 12px;
    pointer-events: none;
    display: flex;
    align-items: start;
    justify-content: end;
    padding: 6px;
  }
  .check-icon {
    background: #10b981;
    color: #fff;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  /* Special style for completion reward on Desktop */
  .slot-card.completion {
    border-color: #eab308;
    background: rgba(234, 179, 8, 0.1);
  }

  .stage-controls { margin-top: 2rem; }
  .cost-line { display: flex; gap: 1rem; margin-bottom: 1rem; }
  .cost-pill {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255,255,255,0.1);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    color: #cbd5f5;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .cost-pill strong { color: #fff; font-size: 1rem; }

  .spin-buttons { display: flex; gap: 1rem; }
  .spin {
    flex: 1;
    padding: 0.85rem;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    color: #0f172a;
    transition: filter 0.2s;
  }
  .spin.token { background: #22d3ee; }
  .spin.hc { background: #fbbf24; }
  .spin:hover { filter: brightness(1.1); }

  /* INFO SIDEBAR */
  .info-panel { display: flex; flex-direction: column; gap: 1rem; }
  .info-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 16px;
    padding: 1rem;
  }
  .info-card h2, .info-card h3 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }

  .result-card { background: rgba(15, 23, 42, 0.8); border-color: #3b82f6; }
  .result-body { display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem; }
  .result-art-wrapper {
    width: 60px; height: 60px;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .result-art { max-width: 90%; max-height: 90%; }
  .result-info h3 { color: #fff; font-size: 1rem; margin-bottom: 0.2rem; }
  .result-info p { margin: 0; font-size: 0.85rem; color: #cbd5f5; }
  .badge { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: #334155; color: #94a3b8; margin-right: 6px; }

  .history-card ul { list-style: none; padding: 0; margin: 0; }
  .history-card li {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .history-card li:last-child { border-bottom: none; }

  .history-thumb {
    width: 40px; height: 40px;
    background: rgba(0,0,0,0.2);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .history-thumb img { max-width: 80%; max-height: 80%; }
  .history-name { font-size: 0.85rem; color: #e2e8f0; font-weight: 500; }
  .history-meta { display: flex; gap: 0.5rem; font-size: 0.75rem; color: #64748b; }
  .mini-badge { font-size: 0.7rem; font-weight: bold; }
  .mini-badge.token { color: #22d3ee; }
  .mini-badge.hc { color: #fbbf24; }

  /* --- MOBILE GRID LAYOUT (KEY CHANGES) --- */
  @media (max-width: 1023px) {
    .reactor-layout {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    /* Move history to top */
    .info-panel { order: -1; }

    .reactor-stage { padding: 1rem; }

    .stage-header {
      flex-direction: column;
      gap: 0.75rem;
    }
    .header-progress { width: 100%; text-align: left; }

    /* --- THE GRID! --- */
    .slot-track {
      display: grid;
      /* 2 columns, auto rows */
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin: 1.5rem 0;
      overflow: visible; /* Show everything */
      padding-bottom: 0;
    }

    /* Make cards fit the grid */
    .slot-card {
      flex: none;
      max-width: none;
      width: auto; /* Let grid control width */
    }

    /* Make the final reward span full width */
    .slot-card.completion {
      grid-column: 1 / -1;
      background: rgba(234, 179, 8, 0.15);
    }

    .slot-inner { padding: 0.5rem; }

    /* Hide text "Received" on mobile to save space */
    .mobile-hidden { display: none; }

    .slot-name {
      font-size: 0.75rem;
      margin-top: 4px;
    }

    .slot-art {
      height: 80px; /* Slightly shorter */
    }

    /* Controls */
    .spin-buttons { flex-direction: column; gap: 0.75rem; }
    .spin { padding: 1rem; }
  }
</style>
