<script lang="ts">
  import {
    craftRecipesByCategory,
    incentiveRewards,
    translateItemId,
    describeIngredientRegex,
    getItemTexture,
    simulateRecipe,
    calculateIncentiveChance,
    formatDurationMinutes,
    getBonusRange,
    getOkhcRange,
    getFeaturedRewardIds,
    type CraftRecipe,
    type DetailedSimulationResult,
    type IncentiveReward,
  } from '@/lib/craft-simulator';

  type FacilityId = 'metal' | 'transformatron' | 'supplies' | 'blackhole';

  interface FeaturedItem {
    id: string;
    label: string;
    icon: string | null;
  }

  interface FacilityDefinition {
    id: FacilityId;
    name: string;
    badge: string;
    tagline: string;
    description: string;
    accent: string;
    gradient: string;
    glow: string;
    category: keyof typeof craftRecipesByCategory;
    recipes: CraftRecipe[];
    featuredRewards: FeaturedItem[];
  }

  interface FacilityState {
    selectedRecipeId: string;
    craftCount: number;
    result: DetailedSimulationResult | null;
  }

  const MAX_SIMULATIONS = 10000;

  const allRecipes: CraftRecipe[] = [
    ...craftRecipesByCategory.star,
    ...craftRecipesByCategory.orb,
    ...craftRecipesByCategory.lab,
    ...craftRecipesByCategory.blackhole,
  ];

  const totalRecipes = allRecipes.length;
  const uniqueRewardIds = new Set(
    allRecipes.flatMap((recipe) => recipe.rewards.map((reward) => reward.id)),
  );
  const maxBonus = Math.max(...allRecipes.map((recipe) => recipe.bonusPer1000));

  function buildFeaturedItems(recipes: CraftRecipe[], limit = 4): FeaturedItem[] {
    return getFeaturedRewardIds(recipes, limit).map((id) => ({
      id,
      label: translateItemId(id),
      icon: getItemTexture(id),
    }));
  }

  const facilities: FacilityDefinition[] = [
    {
      id: 'metal',
      name: 'Metal Factory',
      badge: 'Metal Factory',
      tagline: 'Переплавляем звёзды в следующий ранг',
      description:
        'Пять одноранговых звёзд превращаются в новую — шанс доп. награды зависит от уровня.',
      accent: '#f59e0b',
      gradient: 'linear-gradient(135deg, rgba(63, 29, 7, 0.95), rgba(190, 108, 29, 0.82))',
      glow: 'rgba(252, 211, 77, 0.35)',
      category: 'star',
      recipes: craftRecipesByCategory.star,
      featuredRewards: buildFeaturedItems(craftRecipesByCategory.star),
    },
    {
      id: 'transformatron',
      name: 'Transformatron',
      badge: 'Transformatron',
      tagline: 'Сферы всех типов и уровней',
      description:
        'Ранки и рероллы сфер. Каждый рецепт использует 7 сфер и возвращает продвинутую версию.',
      accent: '#38bdf8',
      gradient: 'linear-gradient(135deg, rgba(14, 41, 84, 0.95), rgba(14, 116, 214, 0.82))',
      glow: 'rgba(56, 189, 248, 0.35)',
      category: 'orb',
      recipes: craftRecipesByCategory.orb,
      featuredRewards: buildFeaturedItems(craftRecipesByCategory.orb),
    },
    {
      id: 'supplies',
      name: 'Supplies Lab',
      badge: 'Supplies Lab',
      tagline: 'Медикаменты, опыт и мутостерон',
      description:
        'Конвертируй избыток ресурсов: апгрейд аптечек, XP-банок и мутостерона в пару кликов.',
      accent: '#f87171',
      gradient: 'linear-gradient(135deg, rgba(80, 16, 26, 0.92), rgba(220, 38, 38, 0.8))',
      glow: 'rgba(248, 113, 113, 0.32)',
      category: 'lab',
      recipes: craftRecipesByCategory.lab,
      featuredRewards: buildFeaturedItems(craftRecipesByCategory.lab),
    },
    {
      id: 'blackhole',
      name: 'Black Hole Experiment',
      badge: 'Black Hole',
      tagline: 'Комбинации всех предметов',
      description:
        'Фиолетовое сердце лаборатории. Перекрафт любых ресурсов и шанс на бустеры высокого класса.',
      accent: '#c084fc',
      gradient: 'linear-gradient(135deg, rgba(52, 15, 75, 0.95), rgba(147, 51, 234, 0.82))',
      glow: 'rgba(192, 132, 252, 0.35)',
      category: 'blackhole',
      recipes: craftRecipesByCategory.blackhole,
      featuredRewards: buildFeaturedItems(craftRecipesByCategory.blackhole),
    },
  ];

  let activeFacilityId: FacilityId = facilities[0]?.id ?? 'metal';

  let activeIncentiveId: string = incentiveRewards[0]?.id ?? '';
  $: activeIncentive =
    activeIncentiveId === ''
      ? null
      : incentiveRewards.find((reward) => reward.id === activeIncentiveId) ?? null;
  $: activeFacility =
    facilities.find((facility) => facility.id === activeFacilityId) ?? facilities[0] ?? null;

  let facilityStates: Record<FacilityId, FacilityState> = facilities.reduce(
    (acc, facility) => {
      acc[facility.id] = {
        selectedRecipeId: facility.recipes[0]?.id ?? '',
        craftCount: 10,
        result: null,
      } satisfies FacilityState;
      return acc;
    },
    {} as Record<FacilityId, FacilityState>,
  );

  function setActiveFacility(id: FacilityId) {
    activeFacilityId = id;
  }

  function selectRecipe(facilityId: FacilityId, recipeId: string) {
    const state = facilityStates[facilityId];
    facilityStates = {
      ...facilityStates,
      [facilityId]: {
        ...state,
        selectedRecipeId: recipeId,
        result: null,
      },
    };
  }

  function updateCraftCount(facilityId: FacilityId, value: number) {
    const safeValue = Number.isFinite(value)
      ? Math.min(Math.max(Math.floor(value), 1), MAX_SIMULATIONS)
      : 1;
    facilityStates = {
      ...facilityStates,
      [facilityId]: {
        ...facilityStates[facilityId],
        craftCount: safeValue,
      },
    };
  }

  function runSimulation(facilityId: FacilityId) {
    const facility = facilities.find((item) => item.id === facilityId);
    if (!facility) return;

    const state = facilityStates[facilityId];
    const recipe = facility.recipes.find((item) => item.id === state.selectedRecipeId);
    if (!recipe) return;

    const crafts = Math.min(Math.max(Math.floor(state.craftCount), 1), MAX_SIMULATIONS);
    const result = simulateRecipe(recipe, crafts, activeIncentive);

    facilityStates = {
      ...facilityStates,
      [facilityId]: {
        ...state,
        craftCount: crafts,
        result,
      },
    };
  }

  function getRewardDisplay(recipe: CraftRecipe) {
    const totalOdds = recipe.rewards.reduce((sum, reward) => sum + reward.odds, 0);
    return recipe.rewards.map((reward) => ({
      ...reward,
      chance: totalOdds > 0 ? reward.odds / totalOdds : 0,
    }));
  }

  function formatPercent(value: number): string {
    return `${(value * 100).toFixed(value * 100 < 1 ? 2 : 1)}%`;
  }
</script>

<section class="craft-hero">
  <div class="craft-hero__card">
    <span class="badge">Sim • Black Hole Lab</span>
    <h1>Black Hole Craft Lab</h1>
    <p>
      Четыре станции крафта на одной странице. Повторяет реальные рецепты Metal Factory,
      Transformatron, Supplies Lab и Black Hole: берём данные из игры, считаем шансы и бонусы.
    </p>
    <dl class="hero-stats" aria-label="Основные показатели симулятора">
      <div>
        <dt>Рецептов</dt>
        <dd>{totalRecipes}</dd>
      </div>
      <div>
        <dt>Уникальных наград</dt>
        <dd>{uniqueRewardIds.size}</dd>
      </div>
      <div>
        <dt>Максимальный бонус</dt>
        <dd>{(maxBonus / 10).toFixed(1)}%</dd>
      </div>
    </dl>
  </div>
</section>

<section class="incentive-panel">
  <div class="incentive-card">
    <div class="incentive-card__info">
      <span class="badge badge--soft">Доп. награды</span>
      <h2>Выбери активный бонус</h2>
      <p>
        Симулятор учитывает шанс бонусной награды. Выбери бустер или предмет, который активен у тебя
        в игре. Можно отключить бонус для чистой математики.
      </p>
    </div>
    <div class="incentive-card__controls">
      <label for="incentive-select">Активный бонус</label>
      <select
        id="incentive-select"
        bind:value={activeIncentiveId}
        aria-label="Активная дополнительная награда"
      >
        <option value="">Без бонуса</option>
        {#each incentiveRewards as incentive, index (index)}
          <option value={incentive.id}>
            {translateItemId(incentive.id)} — {(incentive.per1000 / 10).toFixed(1)}%
          </option>
        {/each}
      </select>
    </div>
    {#if activeIncentive}
      <div class="incentive-card__stats">
        <div>
          <span class="metric-label">Награда</span>
          <span class="metric-value">{translateItemId(activeIncentive.id)}</span>
        </div>
        <div>
          <span class="metric-label">Шанс</span>
          <span class="metric-value">{(activeIncentive.probability * 100).toFixed(1)}%</span>
        </div>
        <div>
          <span class="metric-label">Длительность</span>
          <span class="metric-value">{formatDurationMinutes(activeIncentive.duration)}</span>
        </div>
      </div>
    {/if}
  </div>
</section>

<div
  class="facility-tabs"
  role="tablist"
  aria-label="Станции крафта"
>
  {#each facilities as facility (facility.id)}
    <button
      type="button"
      class:active={facility.id === activeFacilityId}
      on:click={() => setActiveFacility(facility.id)}
      role="tab"
      aria-selected={facility.id === activeFacilityId}
    >
      <span class="facility-tabs__name">{facility.name}</span>
      <span class="facility-tabs__tagline">{facility.tagline}</span>
    </button>
  {/each}
</div>

{#if activeFacility}
  {@const state = facilityStates[activeFacility.id]}
  {@const currentRecipe =
    activeFacility.recipes.find((recipe) => recipe.id === state.selectedRecipeId) ??
    activeFacility.recipes[0]}
  {@const rewardDisplay = currentRecipe ? getRewardDisplay(currentRecipe) : []}
  {@const incentiveChance = calculateIncentiveChance(currentRecipe, activeIncentive)}
  {@const bonusRange = getBonusRange(activeFacility.recipes)}
  {@const okhcRange = getOkhcRange(activeFacility.recipes)}

  <section
    class="facility"
    style={`--accent: ${activeFacility.accent}; --glow: ${activeFacility.glow};`}
  >
    <div
      class="facility__background"
      style={`background-image: ${activeFacility.gradient};`}
    ></div>
    <div class="facility__inner">
      <aside class="facility__sidebar">
        <div class="facility__header">
          <span class="badge badge--outline">{activeFacility.badge}</span>
          <h2>{activeFacility.name}</h2>
          <p>{activeFacility.description}</p>
        </div>
        <div class="facility__featured" aria-label="Ключевые награды">
          {#each activeFacility.featuredRewards as item (item.id)}
            <div class="featured-item">
              {#if item.icon}
                <img src={item.icon} alt={item.label} />
              {:else}
                <span>{item.label.slice(0, 1)}</span>
              {/if}
              <span class="featured-item__label">{item.label}</span>
            </div>
          {/each}
        </div>
        <dl class="facility__stats" aria-label="Статистика секции">
          <div>
            <dt>Рецептов</dt>
            <dd>{activeFacility.recipes.length}</dd>
          </div>
          <div>
            <dt>Бонус доп. награды</dt>
            <dd>
              {bonusRange.min === bonusRange.max
                ? `${(bonusRange.max / 10).toFixed(1)}%`
                : `${(bonusRange.min / 10).toFixed(1)}–${(bonusRange.max / 10).toFixed(1)}%`}
            </dd>
          </div>
          {#if okhcRange}
            <div>
              <dt>okHC</dt>
              <dd>
                {okhcRange.min === okhcRange.max
                  ? okhcRange.max
                  : `${okhcRange.min}–${okhcRange.max}`}
              </dd>
            </div>
          {/if}
        </dl>
      </aside>

      <div class="facility__content">
        <div class="recipe-selector" role="tablist" aria-label={`Рецепты ${activeFacility.name}`}>
          {#each activeFacility.recipes as recipe (recipe.id)}
            {@const displayReward = recipe.rewards[0]}
            {@const rewardLabel = displayReward
              ? translateItemId(displayReward.id)
              : 'Рецепт'}
            {@const rewardIcon = displayReward ? getItemTexture(displayReward.id) : null}
            <button
              type="button"
              class:selected={recipe.id === currentRecipe?.id}
              on:click={() => selectRecipe(activeFacility.id, recipe.id)}
              role="tab"
              aria-selected={recipe.id === currentRecipe?.id}
            >
              {#if rewardIcon}
                <img src={rewardIcon} alt={rewardLabel} />
              {/if}
              <span class="recipe-selector__title">{rewardLabel}</span>
            </button>
          {/each}
        </div>

        {#if currentRecipe}
          {@const totalIngredientPieces = currentRecipe
            ? currentRecipe.ingredients.reduce((sum, ingredient) => sum + ingredient.amount, 0)
            : 0}
          <div class="recipe-card">
            <header class="recipe-card__header">
              <div>
                <h3>
                  {currentRecipe.rewards.length
                    ? translateItemId(currentRecipe.rewards[0].id)
                    : 'Рецепт'}
                </h3>
                <p class="recipe-card__subtitle">
                  {currentRecipe.ingredients.length} типов ингредиентов • {totalIngredientPieces} предметов
                </p>
              </div>
              <div class="recipe-card__meta">
                {#if currentRecipe.bonusPer1000 > 0}
                  <span class="meta-pill">
                    Бонус: {(currentRecipe.bonusPer1000 / 10).toFixed(1)}%
                  </span>
                {/if}
                {#if currentRecipe.okHC > 0}
                  <span class="meta-pill">okHC: {currentRecipe.okHC}</span>
                {/if}
                {#if incentiveChance > 0}
                  <span class="meta-pill meta-pill--accent">
                    Доп. награда: {formatPercent(incentiveChance)}
                  </span>
                {/if}
              </div>
            </header>

            <div class="recipe-card__body">
              <div class="recipe-section">
                <h4>Ингредиенты</h4>
                <ul class="ingredient-list">
                  {#each currentRecipe.ingredients as ingredient, index (ingredient.regex + index)}
                    {@const label = describeIngredientRegex(ingredient.regex)}
                    {@const icon = getItemTexture(ingredient.regex)}
                    <li>
                      <div class="item-icon">
                        {#if icon}
                          <img src={icon} alt={label} />
                        {:else}
                          <span>{label.slice(0, 1)}</span>
                        {/if}
                      </div>
                      <div class="item-info">
                        <span class="item-title">{label}</span>
                        <span class="item-sub">×{ingredient.amount}</span>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>

              <div class="recipe-section">
                <h4>Награды</h4>
                <ul class="reward-list">
                  {#each rewardDisplay as reward, index (index)}
                    {@const label = translateItemId(reward.id)}
                    {@const icon = getItemTexture(reward.id)}
                    <li>
                      <div class="item-icon">
                        {#if icon}
                          <img src={icon} alt={label} />
                        {:else}
                          <span>{label.slice(0, 1)}</span>
                        {/if}
                      </div>
                      <div class="item-info">
                        <span class="item-title">{label}</span>
                        <span class="item-sub">
                          {reward.amount > 1 ? `×${reward.amount}` : 'ед.'}
                        </span>
                      </div>
                      <div class="item-odds">
                        <span>{formatPercent(reward.chance)}</span>
                        <span class="item-odds__raw">{reward.odds}/1000</span>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>

            <footer class="recipe-card__footer">
              <div class="craft-input">
                <label for={`craft-count-${activeFacility.id}`}>Количество крафтов</label>
                <input
                  id={`craft-count-${activeFacility.id}`}
                  type="number"
                  min="1"
                  max={MAX_SIMULATIONS}
                  value={state.craftCount}
                  on:input={(event) =>
                    updateCraftCount(activeFacility.id, Number(event.currentTarget.value))}
                />
              </div>
              <button
                type="button"
                class="simulate-btn"
                on:click={() => runSimulation(activeFacility.id)}
              >
                🎲 Симулировать
              </button>
            </footer>

            {#if state.result}
              {@const rewardDetails = state.result.rewardDetails}
              {@const incentiveDetails = state.result.incentiveDetails}
              {@const totalMain = rewardDetails.reduce((sum, item) => sum + item.amount, 0)}
              {@const totalIncentive = incentiveDetails.reduce((sum, item) => sum + item.amount, 0)}
              <div class="results-card">
                <header>
                  <h4>Результаты {state.result.crafts} крафтов</h4>
                  {#if state.result.expectedIncentiveChance > 0 && activeIncentive}
                    <span>
                      Ожидалось доп. награды:
                      {formatPercent(state.result.expectedIncentiveChance)} за крафт
                    </span>
                  {/if}
                </header>

                <div class="results-grid">
                  <div>
                    <h5>Основные награды</h5>
                    {#if rewardDetails.length > 0}
                      <ul>
                        {#each rewardDetails as detail (detail.id)}
                          {@const label = translateItemId(detail.id)}
                          {@const icon = getItemTexture(detail.id)}
                          <li>
                            <div class="item-icon">
                              {#if icon}
                                <img src={icon} alt={label} />
                              {:else}
                                <span>{label.slice(0, 1)}</span>
                              {/if}
                            </div>
                            <div class="item-info">
                              <span class="item-title">{label}</span>
                              <span class="item-sub">
                                {detail.amount} шт. • {formatPercent(detail.perCraft)} за крафт
                              </span>
                            </div>
                            <div class="item-odds">
                              <span>{formatPercent(detail.perCraft)}</span>
                              <span class="item-odds__raw">
                                {totalMain > 0 ? formatPercent(detail.share) : '—'} от дропа
                              </span>
                            </div>
                          </li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="empty">Наград нет — попробуйте увеличить количество крафтов.</p>
                    {/if}
                  </div>

                  <div>
                    <h5>Дополнительные награды</h5>
                    {#if incentiveDetails.length > 0}
                      <ul>
                        {#each incentiveDetails as detail (detail.id)}
                          {@const label = translateItemId(detail.id)}
                          {@const icon = getItemTexture(detail.id)}
                          <li>
                            <div class="item-icon">
                              {#if icon}
                                <img src={icon} alt={label} />
                              {:else}
                                <span>{label.slice(0, 1)}</span>
                              {/if}
                            </div>
                            <div class="item-info">
                              <span class="item-title">{label}</span>
                              <span class="item-sub">
                                {detail.amount} шт. • {formatPercent(detail.perCraft)} за крафт
                              </span>
                            </div>
                          </li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="empty">Дополнительные награды не выпали.</p>
                    {/if}
                  </div>
                </div>

                {#if state.result.log.length > 0}
                  <div class="results-log">
                    <h5>Текстовый лог</h5>
                    <ul>
                      {#each state.result.log as line, index}
                        <li>
                          <span class="results-log__index">{index + 1}.</span>
                          <span>{line}</span>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </section>
{/if}

<style>
  :global(body) {
    background: radial-gradient(circle at top left, rgba(15, 23, 42, 0.8), rgba(2, 6, 23, 0.95));
  }

  section + section {
    margin-top: 3rem;
  }

  .craft-hero {
    margin-bottom: 2.5rem;
  }

  .craft-hero__card {
    position: relative;
    padding: 3rem;
    border-radius: 36px;
    background: radial-gradient(circle at 20% 20%, rgba(147, 51, 234, 0.25), rgba(17, 24, 39, 0.95));
    border: 1px solid rgba(192, 132, 252, 0.35);
    box-shadow: 0 32px 60px rgba(76, 29, 149, 0.35);
    overflow: hidden;
  }

  .craft-hero__card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 80% -10%, rgba(255, 255, 255, 0.2), transparent 60%);
    pointer-events: none;
    mix-blend-mode: screen;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 1.1rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    color: rgba(226, 232, 240, 0.9);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .badge--soft {
    background: rgba(139, 92, 246, 0.15);
    color: #c4b5fd;
  }

  .badge--outline {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(226, 232, 240, 0.85);
  }

  h1 {
    margin: 1rem 0 0.8rem;
    font-size: clamp(2.4rem, 5vw, 3.4rem);
    color: #ede9fe;
  }

  h2 {
    margin: 0.75rem 0;
    font-size: clamp(1.9rem, 4vw, 2.4rem);
    color: rgba(248, 250, 252, 0.95);
  }

  h3 {
    margin: 0.35rem 0 0;
    font-size: clamp(1.45rem, 3vw, 1.9rem);
    color: rgba(248, 250, 252, 0.92);
  }

  p {
    margin: 0;
    color: rgba(226, 232, 240, 0.78);
    line-height: 1.7;
    max-width: 720px;
  }

  .hero-stats {
    margin: 2.2rem 0 0;
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  dt {
    margin: 0 0 0.35rem;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(226, 232, 240, 0.55);
  }

  dd {
    margin: 0;
    font-size: 1.35rem;
    color: rgba(248, 250, 252, 0.95);
    font-weight: 600;
  }

  .incentive-panel {
    display: flex;
    justify-content: center;
  }

  .incentive-card {
    position: relative;
    width: 100%;
    display: grid;
    gap: 1.75rem;
    padding: 2.5rem;
    border-radius: 28px;
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(17, 24, 39, 0.92));
    border: 1px solid rgba(99, 102, 241, 0.25);
    box-shadow: 0 20px 40px rgba(30, 64, 175, 0.35);
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    align-items: start;
  }

  .incentive-card__controls select {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(15, 23, 42, 0.8);
    color: rgba(226, 232, 240, 0.95);
    font-size: 1rem;
  }

  .incentive-card__controls label {
    display: block;
    margin-bottom: 0.65rem;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.75);
  }

  .incentive-card__stats {
    display: grid;
    gap: 1rem;
    padding: 1rem 1.4rem;
    border-radius: 20px;
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(96, 165, 250, 0.25);
  }

  .metric-label {
    display: block;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.75);
    margin-bottom: 0.35rem;
  }

  .metric-value {
    font-size: 1.05rem;
    font-weight: 600;
    color: rgba(248, 250, 252, 0.92);
  }

  .facility-tabs {
    margin: 3rem 0 2rem;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
  }

  .facility-tabs button {
    display: grid;
    gap: 0.25rem;
    padding: 1rem 1.4rem;
    border-radius: 18px;
    border: 1px solid rgba(99, 102, 241, 0.25);
    background: rgba(30, 41, 59, 0.65);
    color: rgba(226, 232, 240, 0.82);
    text-align: left;
    cursor: pointer;
    min-width: 220px;
    transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }

  .facility-tabs button.active {
    border-color: rgba(192, 132, 252, 0.45);
    background: rgba(76, 29, 149, 0.35);
    box-shadow: 0 18px 30px rgba(76, 29, 149, 0.25);
    color: rgba(248, 250, 252, 0.95);
  }

  .facility-tabs button:hover,
  .facility-tabs button:focus-visible {
    transform: translateY(-2px);
    border-color: rgba(129, 140, 248, 0.5);
  }

  .facility-tabs__name {
    font-weight: 600;
    font-size: 1.05rem;
  }

  .facility-tabs__tagline {
    font-size: 0.85rem;
    color: rgba(148, 163, 184, 0.75);
  }

  .facility {
    position: relative;
    border-radius: 40px;
    overflow: hidden;
    box-shadow: 0 28px 60px rgba(0, 0, 0, 0.35);
  }

  .facility__background {
    position: absolute;
    inset: 0;
    opacity: 0.92;
    pointer-events: none;
  }

  .facility__inner {
    position: relative;
    display: grid;
    grid-template-columns: minmax(240px, 320px) 1fr;
    gap: 0;
  }

  .facility__sidebar {
    position: relative;
    padding: 2.8rem 2.4rem;
    background: linear-gradient(160deg, rgba(15, 23, 42, 0.85), rgba(15, 15, 18, 0.85));
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    display: grid;
    gap: 2rem;
    align-content: start;
  }

  .facility__sidebar::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top, var(--glow), transparent 65%);
    opacity: 0.7;
    pointer-events: none;
  }

  .facility__header h2 {
    margin-bottom: 0.4rem;
  }

  .facility__header p {
    color: rgba(226, 232, 240, 0.75);
  }

  .facility__featured {
    display: grid;
    gap: 1.1rem;
  }

  .featured-item {
    display: grid;
    grid-template-columns: 48px 1fr;
    gap: 0.75rem;
    align-items: center;
    padding: 0.6rem 0.8rem;
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(148, 163, 184, 0.15);
  }

  .featured-item img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
  }

  .featured-item span {
    color: rgba(226, 232, 240, 0.95);
  }

  .featured-item__label {
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .facility__stats {
    display: grid;
    gap: 1.2rem;
  }

  .facility__content {
    position: relative;
    padding: 2.8rem;
    display: grid;
    gap: 2rem;
  }

  .recipe-selector {
    display: grid;
    gap: 0.85rem;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  }

  .recipe-selector button {
    position: relative;
    display: grid;
    gap: 0.35rem;
    align-content: center;
    justify-items: center;
    padding: 1rem;
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(15, 23, 42, 0.78);
    color: rgba(226, 232, 240, 0.85);
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }

  .recipe-selector button img {
    width: 46px;
    height: 46px;
    object-fit: contain;
    filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
  }

  .recipe-selector button:hover,
  .recipe-selector button:focus-visible {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.28);
  }

  .recipe-selector button.selected {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.35);
    box-shadow: 0 16px 28px rgba(0, 0, 0, 0.35);
  }

  .recipe-selector__title {
    font-weight: 600;
    text-align: center;
    color: rgba(248, 250, 252, 0.92);
  }

  .recipe-card {
    position: relative;
    border-radius: 28px;
    background: rgba(15, 23, 42, 0.82);
    border: 1px solid rgba(148, 163, 184, 0.18);
    box-shadow: 0 18px 32px rgba(0, 0, 0, 0.35);
    display: grid;
    gap: 1.75rem;
    padding: 2.2rem;
  }

  .recipe-card__header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
  }

  .recipe-card__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    justify-content: flex-end;
  }

  .recipe-card__subtitle {
    margin: 0.3rem 0 0;
    color: rgba(148, 163, 184, 0.7);
    font-size: 0.95rem;
  }

  .meta-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.45rem 0.9rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(226, 232, 240, 0.85);
    font-size: 0.85rem;
  }

  .meta-pill--accent {
    background: rgba(34, 197, 94, 0.15);
    color: rgba(134, 239, 172, 0.95);
  }

  .recipe-card__body {
    display: grid;
    gap: 1.8rem;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .recipe-section h4 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: rgba(248, 250, 252, 0.92);
  }

  .ingredient-list,
  .reward-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.9rem;
  }

  .ingredient-list li,
  .reward-list li {
    display: grid;
    grid-template-columns: 52px 1fr auto;
    align-items: center;
    gap: 0.9rem;
    padding: 0.75rem 1rem;
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(148, 163, 184, 0.15);
  }

  .reward-list li .item-odds {
    justify-self: end;
  }

  .item-icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }

  .item-icon img {
    width: 44px;
    height: 44px;
    object-fit: contain;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
  }

  .item-icon span {
    font-size: 1.2rem;
    font-weight: 600;
    color: rgba(226, 232, 240, 0.85);
  }

  .item-info {
    display: grid;
    gap: 0.25rem;
  }

  .item-title {
    font-weight: 600;
    color: rgba(248, 250, 252, 0.92);
  }

  .item-sub {
    font-size: 0.85rem;
    color: rgba(148, 163, 184, 0.75);
  }

  .item-odds {
    text-align: right;
    color: rgba(226, 232, 240, 0.9);
    font-weight: 600;
  }

  .item-odds__raw {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.75rem;
    color: rgba(148, 163, 184, 0.65);
  }

  .recipe-card__footer {
    display: flex;
    flex-wrap: wrap;
    gap: 1.2rem;
    align-items: center;
    justify-content: space-between;
  }

  .craft-input {
    display: grid;
    gap: 0.45rem;
  }

  .craft-input label {
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.75);
  }

  .craft-input input {
    width: 140px;
    padding: 0.65rem 0.9rem;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(15, 23, 42, 0.85);
    color: rgba(226, 232, 240, 0.95);
    font-size: 1rem;
  }

  .simulate-btn {
    padding: 0.8rem 1.8rem;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(56, 189, 248, 0.35));
    color: rgba(248, 250, 252, 0.95);
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .simulate-btn:hover,
  .simulate-btn:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 14px 32px rgba(56, 189, 248, 0.35);
  }

  .results-card {
    border-radius: 24px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(15, 23, 42, 0.7);
    padding: 1.8rem;
    display: grid;
    gap: 1.6rem;
  }

  .results-card header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
    color: rgba(226, 232, 240, 0.78);
  }

  .results-grid {
    display: grid;
    gap: 1.4rem;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .results-grid ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.9rem;
  }

  .results-grid li {
    display: grid;
    grid-template-columns: 52px 1fr auto;
    gap: 0.9rem;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(148, 163, 184, 0.15);
  }

  .results-grid li .item-odds {
    justify-self: end;
    display: grid;
    gap: 0.25rem;
    text-align: right;
    color: rgba(226, 232, 240, 0.7);
    font-size: 0.9rem;
  }

  .results-log {
    padding-top: 1.2rem;
    border-top: 1px solid rgba(148, 163, 184, 0.15);
  }

  .results-log ul {
    margin: 0.8rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
    list-style: none;
  }

  .results-log li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.6rem;
    color: rgba(226, 232, 240, 0.75);
    font-size: 0.92rem;
  }

  .results-log__index {
    color: rgba(148, 163, 184, 0.65);
    font-variant-numeric: tabular-nums;
  }

  .results-grid li .item-odds__raw {
    justify-self: end;
    opacity: 0.7;
  }

  .empty {
    margin: 0;
    color: rgba(148, 163, 184, 0.7);
  }

  /* Responsive overrides removed to keep desktop layout across devices */
</style>
