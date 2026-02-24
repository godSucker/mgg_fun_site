import { f as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_7drcn5tv.mjs';
import { c as escape_html, e as ensure_array_like, b as attr, d as attr_class, a as attr_style } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';
import { c as craftRecipesByCategory, i as incentiveRewards, t as translateItemId, f as formatDurationMinutes, a as calculateIncentiveChance, b as getBonusRange, g as getItemTexture, R as RECIPE_HEADER_TITLES, d as describeIngredientRegex, e as getFeaturedRewardIds } from '../../chunks/craft-simulator_DNsOKbCx.mjs';
/* empty css                                    */

function CraftSimulator($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let activeIncentive,
			activeFacility,
			// Рецепты для перемещения из "Рецепты" в "Крафты"
			regularRecipes,
			potPourriRecipes;

		const MAX_SIMULATIONS = 1000000;

		const allRecipes = [
			...craftRecipesByCategory.star,
			...craftRecipesByCategory.orb,
			...craftRecipesByCategory.lab,
			...craftRecipesByCategory.blackhole
		];

		const totalRecipes = allRecipes.length;
		const uniqueRewardIds = new Set(allRecipes.flatMap((recipe) => recipe.rewards.map((reward) => reward.id)));
		const maxBonus = Math.max(...allRecipes.map((recipe) => recipe.bonusPer1000));

		function buildFeaturedItems(recipes, limit = 4) {
			return getFeaturedRewardIds(recipes, limit).map((id) => ({ id, label: translateItemId(id), icon: getItemTexture(id) }));
		}

		const facilities = [
			{
				id: 'metal',
				name: 'Metal Factory',
				badge: 'Metal Factory',
				tagline: 'Переплавляем звёзды в следующий ранг',
				description: 'Пять одноранговых звёзд превращаются в новую — шанс доп. награды зависит от уровня.',
				accent: '#f59e0b',
				gradient: 'linear-gradient(135deg, rgba(63, 29, 7, 0.95), rgba(190, 108, 29, 0.82))',
				glow: 'rgba(252, 211, 77, 0.35)',
				category: 'star',
				recipes: craftRecipesByCategory.star,
				featuredRewards: buildFeaturedItems(craftRecipesByCategory.star)
			},

			{
				id: 'transformatron',
				name: 'Transformatron',
				badge: 'Transformatron',
				tagline: 'Сферы всех типов и уровней',
				description: 'Ранки и рероллы сфер. Каждый рецепт использует 7 сфер и возвращает продвинутую версию.',
				accent: '#38bdf8',
				gradient: 'linear-gradient(135deg, rgba(14, 41, 84, 0.95), rgba(14, 116, 214, 0.82))',
				glow: 'rgba(56, 189, 248, 0.35)',
				category: 'orb',
				recipes: craftRecipesByCategory.orb,
				featuredRewards: buildFeaturedItems(craftRecipesByCategory.orb)
			},

			{
				id: 'supplies',
				name: 'Supplies Lab',
				badge: 'Supplies Lab',
				tagline: 'Медикаменты, опыт и мутостерон',
				description: 'Конвертируй избыток ресурсов: апгрейд аптечек, XP-банок и мутостерона в пару кликов.',
				accent: '#f87171',
				gradient: 'linear-gradient(135deg, rgba(80, 16, 26, 0.92), rgba(220, 38, 38, 0.8))',
				glow: 'rgba(248, 113, 113, 0.32)',
				category: 'lab',
				recipes: craftRecipesByCategory.lab,
				featuredRewards: buildFeaturedItems(craftRecipesByCategory.lab)
			},

			{
				id: 'blackhole',
				name: 'Black Hole Experiment',
				badge: 'Black Hole',
				tagline: 'Комбинации всех предметов',
				description: 'Фиолетовое сердце лаборатории. Перекрафт любых ресурсов и шанс на бустеры высокого класса.',
				accent: '#c084fc',
				gradient: 'linear-gradient(135deg, rgba(52, 15, 75, 0.95), rgba(147, 51, 234, 0.82))',
				glow: 'rgba(192, 132, 252, 0.35)',
				category: 'blackhole',
				recipes: craftRecipesByCategory.blackhole,
				featuredRewards: buildFeaturedItems(craftRecipesByCategory.blackhole)
			}
		];

		let activeFacilityId = facilities[0]?.id ?? 'metal';
		let activeIncentiveId = incentiveRewards[0]?.id ?? '';

		let facilityStates = facilities.reduce(
			(acc, facility) => {
				acc[facility.id] = {
					selectedRecipeId: facility.recipes[0]?.id ?? '',
					craftCount: 10,
					result: null
				};

				return acc;
			},
			{}
		);

		function getRewardDisplay(recipe) {
			const totalOdds = recipe.rewards.reduce((sum, reward) => sum + reward.odds, 0);

			return recipe.rewards.map((reward) => ({
				...reward,
				chance: totalOdds > 0 ? reward.odds / totalOdds : 0
			}));
		}

		function formatPercent(value) {
			return `${(value * 100).toFixed(value * 100 < 1 ? 2 : 1)}%`;
		}

		// Рецепты для перемещения из "Рецепты" в "Крафты"
		const RECIPES_TO_MOVE = new Set(['little_rewards_01', 'big_rewards_01', 'big_rewards_02']);

		activeIncentive = activeIncentiveId === ''
			? null
			: incentiveRewards.find((reward) => reward.id === activeIncentiveId) ?? null;

		activeFacility = facilities.find((facility) => facility.id === activeFacilityId) ?? facilities[0] ?? null;

		regularRecipes = activeFacility.id === 'blackhole'
			? activeFacility.recipes.filter((r) => !r.id.startsWith('pot_pourri_') && !RECIPES_TO_MOVE.has(r.id))
			: activeFacility.recipes;

		potPourriRecipes = activeFacility.id === 'blackhole'
			? activeFacility.recipes.filter((r) => r.id.startsWith('pot_pourri_') || RECIPES_TO_MOVE.has(r.id))
			: [];

		$$renderer.push(`<section class="craft-hero svelte-pt66iz"><div class="craft-hero__card svelte-pt66iz"><span class="badge svelte-pt66iz">Sim • Black Hole Lab</span> <h1 class="svelte-pt66iz">Black Hole Craft Lab</h1> <p class="svelte-pt66iz">Четыре станции крафта на одной странице. Повторяет реальные рецепты Metal Factory,
      Transformatron, Supplies Lab и Black Hole: берём данные из игры, считаем шансы и бонусы.</p> <dl class="hero-stats svelte-pt66iz" aria-label="Основные показатели симулятора"><div><dt class="svelte-pt66iz">Рецептов</dt> <dd class="svelte-pt66iz">${escape_html(totalRecipes)}</dd></div> <div><dt class="svelte-pt66iz">Уникальных наград</dt> <dd class="svelte-pt66iz">${escape_html(uniqueRewardIds.size)}</dd></div> <div><dt class="svelte-pt66iz">Максимальный бонус за качество</dt> <dd class="svelte-pt66iz">${escape_html((maxBonus / 10).toFixed(1))}%</dd></div></dl></div></section> <section class="incentive-panel svelte-pt66iz"><div class="incentive-card svelte-pt66iz"><div class="incentive-card__info"><span class="badge badge--soft svelte-pt66iz">Доп. награды</span> <h2 class="svelte-pt66iz">Выбери активный бонус</h2> <p class="svelte-pt66iz">Симулятор учитывает шанс бонусной награды. Выбери бустер или предмет, который активен у тебя
        в игре. Можно отключить бонус для чистой математики.</p></div> <div class="incentive-card__controls svelte-pt66iz"><label for="incentive-select" class="svelte-pt66iz">Активный бонус</label> `);

		$$renderer.select(
			{
				id: 'incentive-select',
				value: activeIncentiveId,
				'aria-label': 'Активная дополнительная награда',
				class: ''
			},
			($$renderer) => {
				$$renderer.option({ value: '' }, ($$renderer) => {
					$$renderer.push(`Без бонуса`);
				});

				$$renderer.push(`<!--[-->`);

				const each_array = ensure_array_like(incentiveRewards);

				for (let index = 0, $$length = each_array.length; index < $$length; index++) {
					let incentive = each_array[index];

					$$renderer.option({ value: incentive.id }, ($$renderer) => {
						$$renderer.push(`${escape_html(translateItemId(incentive.id))} — ${escape_html((incentive.per1000 / 10).toFixed(1))}%`);
					});
				}

				$$renderer.push(`<!--]-->`);
			},
			'svelte-pt66iz'
		);

		$$renderer.push(`</div> `);

		if (activeIncentive) {
			$$renderer.push('<!--[-->');
			$$renderer.push(`<div class="incentive-card__stats svelte-pt66iz"><div><span class="metric-label svelte-pt66iz">Награда</span> <span class="metric-value svelte-pt66iz">${escape_html(translateItemId(activeIncentive.id))}</span></div> <div><span class="metric-label svelte-pt66iz">Шанс</span> <span class="metric-value svelte-pt66iz">${escape_html((activeIncentive.probability * 100).toFixed(1))}%</span></div> <div><span class="metric-label svelte-pt66iz">Длительность</span> <span class="metric-value svelte-pt66iz">${escape_html(formatDurationMinutes(activeIncentive.duration))}</span></div></div>`);
		} else {
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></div></section> <div class="facility-tabs svelte-pt66iz" role="tablist" aria-label="Станции крафта"><!--[-->`);

		const each_array_1 = ensure_array_like(facilities);

		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let facility = each_array_1[$$index_1];

			$$renderer.push(`<button type="button" role="tab"${attr('aria-selected', facility.id === activeFacilityId)}${attr_class('svelte-pt66iz', void 0, { 'active': facility.id === activeFacilityId })}><span class="facility-tabs__name svelte-pt66iz">${escape_html(facility.name)}</span> <span class="facility-tabs__tagline svelte-pt66iz">${escape_html(facility.tagline)}</span></button>`);
		}

		$$renderer.push(`<!--]--></div> `);

		if (activeFacility) {
			$$renderer.push('<!--[-->');

			const state = facilityStates[activeFacility.id];
			const currentRecipe = activeFacility.recipes.find((recipe) => recipe.id === state.selectedRecipeId) ?? activeFacility.recipes[0];
			const rewardDisplay = currentRecipe ? getRewardDisplay(currentRecipe) : [];
			const incentiveChance = calculateIncentiveChance(currentRecipe, activeIncentive);
			const bonusRange = getBonusRange(activeFacility.recipes);

			$$renderer.push(`<section class="facility svelte-pt66iz"${attr_style(`--accent: ${activeFacility.accent}; --glow: ${activeFacility.glow};`)}><div class="facility__background svelte-pt66iz"${attr_style(`background-image: ${activeFacility.gradient};`)}></div> <div class="facility__inner svelte-pt66iz"><aside class="facility__sidebar svelte-pt66iz"><div class="facility__header svelte-pt66iz"><span class="badge badge--outline svelte-pt66iz">${escape_html(activeFacility.badge)}</span> <h2 class="svelte-pt66iz">${escape_html(activeFacility.name)}</h2> <p class="svelte-pt66iz">${escape_html(activeFacility.description)}</p></div> <div class="facility__featured svelte-pt66iz" aria-label="Ключевые награды"><!--[-->`);

			const each_array_2 = ensure_array_like(activeFacility.featuredRewards);

			for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
				let item = each_array_2[$$index_2];

				$$renderer.push(`<div class="featured-item svelte-pt66iz">`);

				if (item.icon) {
					$$renderer.push('<!--[-->');
					$$renderer.push(`<img${attr('src', item.icon)}${attr('alt', item.label)} class="svelte-pt66iz"/>`);
				} else {
					$$renderer.push('<!--[!-->');
					$$renderer.push(`<span>${escape_html(item.label.slice(0, 1))}</span>`);
				}

				$$renderer.push(`<!--]--> <span class="featured-item__label svelte-pt66iz">${escape_html(item.label)}</span></div>`);
			}

			$$renderer.push(`<!--]--></div> <dl class="facility__stats svelte-pt66iz" aria-label="Статистика секции"><div><dt class="svelte-pt66iz">Рецептов</dt> <dd class="svelte-pt66iz">${escape_html(activeFacility.recipes.length)}</dd></div> <div><dt class="svelte-pt66iz">Бонус за качество материалов</dt> <dd class="svelte-pt66iz">${escape_html(bonusRange.min === bonusRange.max
				? `${(bonusRange.max / 10).toFixed(1)}%`
				: `${(bonusRange.min / 10).toFixed(1)}–${(bonusRange.max / 10).toFixed(1)}%`)}</dd></div></dl></aside> <div class="facility__content svelte-pt66iz">`);

			if (activeFacility.id === 'blackhole') {
				$$renderer.push('<!--[-->');
				$$renderer.push(`<div class="recipes-container svelte-pt66iz"><div class="recipes-group svelte-pt66iz"><h4 class="group-title svelte-pt66iz">Рецепты</h4> <div class="recipe-selector svelte-pt66iz"><!--[-->`);

				const each_array_3 = ensure_array_like(regularRecipes);

				for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
					let recipe = each_array_3[$$index_3];
					const displayReward = recipe.rewards[0];
					const isSpecialRecipe = recipe.id === 'orb_basic_1' || recipe.id === 'orb_basic_2' || recipe.id === 'orb_basic_3' || recipe.id === 'orb_basic_4' || recipe.id === 'orb_special_1' || recipe.id === 'orb_special_2' || recipe.id === 'orb_special_3' || recipe.id === 'orb_reroll_basic_1' || recipe.id === 'orb_reroll_special_1' || recipe.id === 'orb_reroll_basic_2' || recipe.id === 'orb_reroll_special_2' || recipe.id === 'orb_reroll_basic_3' || recipe.id === 'orb_reroll_special_3';

					const baseLabel = isSpecialRecipe
						? translateItemId(recipe.id)
						: displayReward ? translateItemId(displayReward.id) : 'Рецепт';

					const rewardIcon = isSpecialRecipe
						? getItemTexture(recipe.id)
						: displayReward ? getItemTexture(displayReward.id) : null;

					$$renderer.push(`<button type="button" role="tab"${attr('aria-selected', recipe.id === currentRecipe?.id)}${attr_class('svelte-pt66iz', void 0, { 'selected': recipe.id === currentRecipe?.id })}>`);

					if (rewardIcon) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<img${attr('src', rewardIcon)}${attr('alt', baseLabel)} class="svelte-pt66iz"/>`);
					} else {
						$$renderer.push('<!--[!-->');
					}

					$$renderer.push(`<!--]--> <span class="recipe-selector__title svelte-pt66iz">${escape_html(baseLabel)}</span></button>`);
				}

				$$renderer.push(`<!--]--></div></div> <div class="recipes-group svelte-pt66iz"><h4 class="group-title svelte-pt66iz">Крафты</h4> <div class="recipe-selector svelte-pt66iz"><!--[-->`);

				const each_array_4 = ensure_array_like(potPourriRecipes);

				for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
					let recipe = each_array_4[$$index_4];
					const displayReward = recipe.rewards[0];
					const isSpecialRecipe = recipe.id === 'orb_basic_1' || recipe.id === 'orb_basic_2' || recipe.id === 'orb_basic_3' || recipe.id === 'orb_basic_4' || recipe.id === 'orb_special_1' || recipe.id === 'orb_special_2' || recipe.id === 'orb_special_3' || recipe.id === 'orb_reroll_basic_1' || recipe.id === 'orb_reroll_special_1' || recipe.id === 'orb_reroll_basic_2' || recipe.id === 'orb_reroll_special_2' || recipe.id === 'orb_reroll_basic_3' || recipe.id === 'orb_reroll_special_3';
					const isMovedRecipe = RECIPES_TO_MOVE.has(recipe.id);
					const useRecipeIdLabel = isSpecialRecipe || isMovedRecipe;

					const baseLabel = useRecipeIdLabel
						? translateItemId(recipe.id)
						: displayReward ? translateItemId(displayReward.id) : 'Рецепт';

					const totalIngredients = recipe.ingredients.reduce((sum, ing) => sum + ing.amount, 0);
					const isPotPourriRecipe = recipe.id.startsWith('pot_pourri_');
					const isTokenSinkRecipe = recipe.id.startsWith('token_sink_');

					const rewardLabel = isPotPourriRecipe
						? `Средняя аптечка x${totalIngredients}`
						: isTokenSinkRecipe
							? baseLabel
							: useRecipeIdLabel
								? `${translateItemId(recipe.id)} ×${totalIngredients}`
								: `${baseLabel} ×${totalIngredients}`;

					const rewardIcon = useRecipeIdLabel
						? getItemTexture(recipe.id)
						: displayReward ? getItemTexture(displayReward.id) : null;

					$$renderer.push(`<button type="button" role="tab"${attr('aria-selected', recipe.id === currentRecipe?.id)}${attr_class('svelte-pt66iz', void 0, { 'selected': recipe.id === currentRecipe?.id })}>`);

					if (rewardIcon) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<img${attr('src', rewardIcon)}${attr('alt', rewardLabel)} class="svelte-pt66iz"/>`);
					} else {
						$$renderer.push('<!--[!-->');
					}

					$$renderer.push(`<!--]--> <span class="recipe-selector__title svelte-pt66iz">${escape_html(rewardLabel)}</span></button>`);
				}

				$$renderer.push(`<!--]--></div></div></div>`);
			} else {
				$$renderer.push('<!--[!-->');

				if (activeFacility.id === 'transformatron') {
					$$renderer.push('<!--[-->');

					const allRecipes = activeFacility.recipes;
					const level1Recipes = allRecipes.filter((recipe) => recipe.rewards.some((reward) => reward.id.includes('_01')) || recipe.id === 'orb_reroll_basic_1' || recipe.id === 'orb_reroll_special_1');
					const level2Recipes = allRecipes.filter((recipe) => recipe.rewards.some((reward) => reward.id.includes('_02')) || recipe.id === 'orb_reroll_basic_2' || recipe.id === 'orb_reroll_special_2');
					const level3Recipes = allRecipes.filter((recipe) => recipe.rewards.some((reward) => reward.id.includes('_03')) || recipe.id === 'orb_reroll_basic_3' || recipe.id === 'orb_reroll_special_3');
					const level4Recipes = allRecipes.filter((recipe) => recipe.rewards.some((reward) => reward.id.includes('_04')));
					const filteredLevel2Recipes = level2Recipes.filter((recipe) => !level1Recipes.includes(recipe));
					const filteredLevel3Recipes = level3Recipes.filter((recipe) => !level1Recipes.includes(recipe) && !filteredLevel2Recipes.includes(recipe));
					const filteredLevel4Recipes = level4Recipes.filter((recipe) => !level1Recipes.includes(recipe) && !filteredLevel2Recipes.includes(recipe) && !filteredLevel3Recipes.includes(recipe));

					$$renderer.push(`<div class="recipe-groups svelte-pt66iz">`);

					if (level1Recipes.length > 0) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<div class="recipes-group svelte-pt66iz"><h4 class="group-title svelte-pt66iz">КРАФТ СФЕР 1 УРОВНЯ</h4> <div class="recipe-selector grid-3-4 svelte-pt66iz"><!--[-->`);

						const each_array_5 = ensure_array_like(level1Recipes);

						for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
							let recipe = each_array_5[$$index_5];
							const displayReward = recipe.rewards[0];
							const isSpecialRecipe = recipe.id === 'orb_basic_1' || recipe.id === 'orb_basic_2' || recipe.id === 'orb_basic_3' || recipe.id === 'orb_basic_4' || recipe.id === 'orb_special_1' || recipe.id === 'orb_special_2' || recipe.id === 'orb_special_3' || recipe.id === 'orb_reroll_basic_1' || recipe.id === 'orb_reroll_special_1' || recipe.id === 'orb_reroll_basic_2' || recipe.id === 'orb_reroll_special_2' || recipe.id === 'orb_reroll_basic_3' || recipe.id === 'orb_reroll_special_3';

							const baseLabel = isSpecialRecipe
								? translateItemId(recipe.id)
								: displayReward ? translateItemId(displayReward.id) : 'Рецепт';

							const totalIngredients = recipe.ingredients.reduce((sum, ing) => sum + ing.amount, 0);
							const rewardLabel = recipe.id.startsWith('pot_pourri_') ? `Средняя аптечка x${totalIngredients}` : baseLabel;

							const rewardIcon = isSpecialRecipe
								? getItemTexture(recipe.id)
								: displayReward ? getItemTexture(displayReward.id) : null;

							$$renderer.push(`<button type="button" role="tab"${attr('aria-selected', recipe.id === currentRecipe?.id)}${attr_class('svelte-pt66iz', void 0, { 'selected': recipe.id === currentRecipe?.id })}>`);

							if (rewardIcon) {
								$$renderer.push('<!--[-->');
								$$renderer.push(`<img${attr('src', rewardIcon)}${attr('alt', rewardLabel)} class="svelte-pt66iz"/>`);
							} else {
								$$renderer.push('<!--[!-->');
							}

							$$renderer.push(`<!--]--> <span class="recipe-selector__title svelte-pt66iz">${escape_html(rewardLabel)}</span></button>`);
						}

						$$renderer.push(`<!--]--></div></div>`);
					} else {
						$$renderer.push('<!--[!-->');
					}

					$$renderer.push(`<!--]--> `);

					if (filteredLevel2Recipes.length > 0) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<div class="recipes-group svelte-pt66iz"><h4 class="group-title svelte-pt66iz">КРАФТ СФЕР 2 УРОВНЯ</h4> <div class="recipe-selector grid-3-4 svelte-pt66iz"><!--[-->`);

						const each_array_6 = ensure_array_like(filteredLevel2Recipes);

						for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
							let recipe = each_array_6[$$index_6];
							const displayReward = recipe.rewards[0];
							const isSpecialRecipe = recipe.id === 'orb_basic_1' || recipe.id === 'orb_basic_2' || recipe.id === 'orb_basic_3' || recipe.id === 'orb_basic_4' || recipe.id === 'orb_special_1' || recipe.id === 'orb_special_2' || recipe.id === 'orb_special_3' || recipe.id === 'orb_reroll_basic_1' || recipe.id === 'orb_reroll_special_1' || recipe.id === 'orb_reroll_basic_2' || recipe.id === 'orb_reroll_special_2' || recipe.id === 'orb_reroll_basic_3' || recipe.id === 'orb_reroll_special_3';

							const baseLabel = isSpecialRecipe
								? translateItemId(recipe.id)
								: displayReward ? translateItemId(displayReward.id) : 'Рецепт';

							const totalIngredients = recipe.ingredients.reduce((sum, ing) => sum + ing.amount, 0);
							const rewardLabel = recipe.id.startsWith('pot_pourri_') ? `Средняя аптечка x${totalIngredients}` : baseLabel;

							const rewardIcon = isSpecialRecipe
								? getItemTexture(recipe.id)
								: displayReward ? getItemTexture(displayReward.id) : null;

							$$renderer.push(`<button type="button" role="tab"${attr('aria-selected', recipe.id === currentRecipe?.id)}${attr_class('svelte-pt66iz', void 0, { 'selected': recipe.id === currentRecipe?.id })}>`);

							if (rewardIcon) {
								$$renderer.push('<!--[-->');
								$$renderer.push(`<img${attr('src', rewardIcon)}${attr('alt', rewardLabel)} class="svelte-pt66iz"/>`);
							} else {
								$$renderer.push('<!--[!-->');
							}

							$$renderer.push(`<!--]--> <span class="recipe-selector__title svelte-pt66iz">${escape_html(rewardLabel)}</span></button>`);
						}

						$$renderer.push(`<!--]--></div></div>`);
					} else {
						$$renderer.push('<!--[!-->');
					}

					$$renderer.push(`<!--]--> `);

					if (filteredLevel3Recipes.length > 0) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<div class="recipes-group svelte-pt66iz"><h4 class="group-title svelte-pt66iz">КРАФТ СФЕР 3 УРОВНЯ</h4> <div class="recipe-selector grid-3-4 svelte-pt66iz"><!--[-->`);

						const each_array_7 = ensure_array_like(filteredLevel3Recipes);

						for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
							let recipe = each_array_7[$$index_7];
							const displayReward = recipe.rewards[0];
							const isSpecialRecipe = recipe.id === 'orb_basic_1' || recipe.id === 'orb_basic_2' || recipe.id === 'orb_basic_3' || recipe.id === 'orb_basic_4' || recipe.id === 'orb_special_1' || recipe.id === 'orb_special_2' || recipe.id === 'orb_special_3' || recipe.id === 'orb_reroll_basic_1' || recipe.id === 'orb_reroll_special_1' || recipe.id === 'orb_reroll_basic_2' || recipe.id === 'orb_reroll_special_2' || recipe.id === 'orb_reroll_basic_3' || recipe.id === 'orb_reroll_special_3';

							const baseLabel = isSpecialRecipe
								? translateItemId(recipe.id)
								: displayReward ? translateItemId(displayReward.id) : 'Рецепт';

							const totalIngredients = recipe.ingredients.reduce((sum, ing) => sum + ing.amount, 0);
							const rewardLabel = recipe.id.startsWith('pot_pourri_') ? `Средняя аптечка x${totalIngredients}` : baseLabel;

							const rewardIcon = isSpecialRecipe
								? getItemTexture(recipe.id)
								: displayReward ? getItemTexture(displayReward.id) : null;

							$$renderer.push(`<button type="button" role="tab"${attr('aria-selected', recipe.id === currentRecipe?.id)}${attr_class('svelte-pt66iz', void 0, { 'selected': recipe.id === currentRecipe?.id })}>`);

							if (rewardIcon) {
								$$renderer.push('<!--[-->');
								$$renderer.push(`<img${attr('src', rewardIcon)}${attr('alt', rewardLabel)} class="svelte-pt66iz"/>`);
							} else {
								$$renderer.push('<!--[!-->');
							}

							$$renderer.push(`<!--]--> <span class="recipe-selector__title svelte-pt66iz">${escape_html(rewardLabel)}</span></button>`);
						}

						$$renderer.push(`<!--]--></div></div>`);
					} else {
						$$renderer.push('<!--[!-->');
					}

					$$renderer.push(`<!--]--> `);

					if (filteredLevel4Recipes.length > 0) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<div class="recipes-group svelte-pt66iz"><h4 class="group-title svelte-pt66iz">КРАФТ СФЕР 4 УРОВНЯ</h4> <div class="recipe-selector grid-3-4 svelte-pt66iz"><!--[-->`);

						const each_array_8 = ensure_array_like(filteredLevel4Recipes);

						for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
							let recipe = each_array_8[$$index_8];
							const displayReward = recipe.rewards[0];
							const isSpecialRecipe = recipe.id === 'orb_basic_1' || recipe.id === 'orb_basic_2' || recipe.id === 'orb_basic_3' || recipe.id === 'orb_basic_4' || recipe.id === 'orb_special_1' || recipe.id === 'orb_special_2' || recipe.id === 'orb_special_3' || recipe.id === 'orb_reroll_basic_1' || recipe.id === 'orb_reroll_special_1' || recipe.id === 'orb_reroll_basic_2' || recipe.id === 'orb_reroll_special_2' || recipe.id === 'orb_reroll_basic_3' || recipe.id === 'orb_reroll_special_3';

							const baseLabel = isSpecialRecipe
								? translateItemId(recipe.id)
								: displayReward ? translateItemId(displayReward.id) : 'Рецепт';

							const totalIngredients = recipe.ingredients.reduce((sum, ing) => sum + ing.amount, 0);
							const rewardLabel = recipe.id.startsWith('pot_pourri_') ? `Средняя аптечка x${totalIngredients}` : baseLabel;

							const rewardIcon = isSpecialRecipe
								? getItemTexture(recipe.id)
								: displayReward ? getItemTexture(displayReward.id) : null;

							$$renderer.push(`<button type="button" role="tab"${attr('aria-selected', recipe.id === currentRecipe?.id)}${attr_class('svelte-pt66iz', void 0, { 'selected': recipe.id === currentRecipe?.id })}>`);

							if (rewardIcon) {
								$$renderer.push('<!--[-->');
								$$renderer.push(`<img${attr('src', rewardIcon)}${attr('alt', rewardLabel)} class="svelte-pt66iz"/>`);
							} else {
								$$renderer.push('<!--[!-->');
							}

							$$renderer.push(`<!--]--> <span class="recipe-selector__title svelte-pt66iz">${escape_html(rewardLabel)}</span></button>`);
						}

						$$renderer.push(`<!--]--></div></div>`);
					} else {
						$$renderer.push('<!--[!-->');
					}

					$$renderer.push(`<!--]--></div>`);
				} else {
					$$renderer.push('<!--[!-->');

					if (activeFacility.id === 'blackhole') {
						$$renderer.push('<!--[-->');

						const craftRecipeIds = [
							'little_rewards_01',
							'big_rewards_01',
							'big_rewards_02',
							'token_sink_03',
							'token_sink_06'
						];

						const bhRecipes = activeFacility.recipes.filter((r) => !craftRecipeIds.includes(r.id));
						const bhCraft = activeFacility.recipes.filter((r) => craftRecipeIds.includes(r.id));

						$$renderer.push(`<div class="recipe-groups svelte-pt66iz"><div class="recipes-group svelte-pt66iz"><h4 class="group-title svelte-pt66iz">РЕЦЕПТЫ</h4> <div class="recipe-selector grid-3-4 svelte-pt66iz"><!--[-->`);

						const each_array_9 = ensure_array_like(bhRecipes);

						for (let $$index_9 = 0, $$length = each_array_9.length; $$index_9 < $$length; $$index_9++) {
							let recipe = each_array_9[$$index_9];
							const displayReward = recipe.rewards[0];
							const baseLabel = displayReward ? translateItemId(displayReward.id) : 'Рецепт';
							const totalIngredients = recipe.ingredients.reduce((sum, ing) => sum + ing.amount, 0);
							const rewardLabel = recipe.id.startsWith('pot_pourri_') ? `Средняя аптечка x${totalIngredients}` : baseLabel;
							const rewardIcon = displayReward ? getItemTexture(displayReward.id) : null;

							$$renderer.push(`<button type="button" role="tab"${attr('aria-selected', recipe.id === currentRecipe?.id)}${attr_class('svelte-pt66iz', void 0, { 'selected': recipe.id === currentRecipe?.id })}>`);

							if (rewardIcon) {
								$$renderer.push('<!--[-->');
								$$renderer.push(`<img${attr('src', rewardIcon)}${attr('alt', rewardLabel)} class="svelte-pt66iz"/>`);
							} else {
								$$renderer.push('<!--[!-->');
							}

							$$renderer.push(`<!--]--> <span class="recipe-selector__title svelte-pt66iz">${escape_html(rewardLabel)}</span></button>`);
						}

						$$renderer.push(`<!--]--></div></div> `);

						if (bhCraft.length > 0) {
							$$renderer.push('<!--[-->');
							$$renderer.push(`<div class="recipes-group svelte-pt66iz"><h4 class="group-title svelte-pt66iz">КРАФТ</h4> <div class="recipe-selector grid-3-4 svelte-pt66iz"><!--[-->`);

							const each_array_10 = ensure_array_like(bhCraft);

							for (let $$index_10 = 0,
								$$length = each_array_10.length; $$index_10 < $$length; $$index_10++) {
								let recipe = each_array_10[$$index_10];
								const displayReward = recipe.rewards[0];
								const baseLabel = displayReward ? translateItemId(displayReward.id) : 'Рецепт';
								const rewardLabel = baseLabel;
								const rewardIcon = displayReward ? getItemTexture(displayReward.id) : null;

								$$renderer.push(`<button type="button" role="tab"${attr('aria-selected', recipe.id === currentRecipe?.id)}${attr_class('svelte-pt66iz', void 0, { 'selected': recipe.id === currentRecipe?.id })}>`);

								if (rewardIcon) {
									$$renderer.push('<!--[-->');
									$$renderer.push(`<img${attr('src', rewardIcon)}${attr('alt', rewardLabel)} class="svelte-pt66iz"/>`);
								} else {
									$$renderer.push('<!--[!-->');
								}

								$$renderer.push(`<!--]--> <span class="recipe-selector__title svelte-pt66iz">${escape_html(rewardLabel)}</span></button>`);
							}

							$$renderer.push(`<!--]--></div></div>`);
						} else {
							$$renderer.push('<!--[!-->');
						}

						$$renderer.push(`<!--]--></div>`);
					} else {
						$$renderer.push('<!--[!-->');
						$$renderer.push(`<div${attr_class('recipe-selector svelte-pt66iz', void 0, { 'grid-3-4': activeFacility.id !== 'metal' })} role="tablist"${attr('aria-label', `Рецепты ${activeFacility.name}`)}><!--[-->`);

						const each_array_11 = ensure_array_like(activeFacility.recipes);

						for (let $$index_11 = 0,
							$$length = each_array_11.length; $$index_11 < $$length; $$index_11++) {
							let recipe = each_array_11[$$index_11];
							const displayReward = recipe.rewards[0];
							const isSpecialRecipe = recipe.id === 'orb_basic_1' || recipe.id === 'orb_basic_2' || recipe.id === 'orb_basic_3' || recipe.id === 'orb_basic_4' || recipe.id === 'orb_special_1' || recipe.id === 'orb_special_2' || recipe.id === 'orb_special_3' || recipe.id === 'orb_reroll_basic_1' || recipe.id === 'orb_reroll_special_1' || recipe.id === 'orb_reroll_basic_2' || recipe.id === 'orb_reroll_special_2' || recipe.id === 'orb_reroll_basic_3' || recipe.id === 'orb_reroll_special_3';

							const baseLabel = isSpecialRecipe
								? translateItemId(recipe.id)
								: displayReward ? translateItemId(displayReward.id) : 'Рецепт';

							const totalIngredients = recipe.ingredients.reduce((sum, ing) => sum + ing.amount, 0);
							const rewardLabel = recipe.id.startsWith('pot_pourri_') ? `Средняя аптечка x${totalIngredients}` : baseLabel;

							const rewardIcon = isSpecialRecipe
								? getItemTexture(recipe.id)
								: displayReward ? getItemTexture(displayReward.id) : null;

							$$renderer.push(`<button type="button" role="tab"${attr('aria-selected', recipe.id === currentRecipe?.id)}${attr_class('svelte-pt66iz', void 0, { 'selected': recipe.id === currentRecipe?.id })}>`);

							if (rewardIcon) {
								$$renderer.push('<!--[-->');
								$$renderer.push(`<img${attr('src', rewardIcon)}${attr('alt', rewardLabel)} class="svelte-pt66iz"/>`);
							} else {
								$$renderer.push('<!--[!-->');
							}

							$$renderer.push(`<!--]--> <span class="recipe-selector__title svelte-pt66iz">${escape_html(rewardLabel)}</span></button>`);
						}

						$$renderer.push(`<!--]--></div>`);
					}

					$$renderer.push(`<!--]-->`);
				}

				$$renderer.push(`<!--]-->`);
			}

			$$renderer.push(`<!--]--> `);

			if (currentRecipe) {
				$$renderer.push('<!--[-->');

				const totalIngredientPieces = currentRecipe
					? currentRecipe.ingredients.reduce((sum, ingredient) => sum + ingredient.amount, 0)
					: 0;

				$$renderer.push(`<div class="recipe-card svelte-pt66iz"><header class="recipe-card__header svelte-pt66iz"><div><h3 class="svelte-pt66iz">${escape_html(currentRecipe.rewards.length
					? RECIPE_HEADER_TITLES[currentRecipe.id] ?? translateItemId(currentRecipe.id)
					: 'Рецепт')}</h3> <p class="recipe-card__subtitle svelte-pt66iz">${escape_html(currentRecipe.ingredients.length)} типов ингредиентов • ${escape_html(totalIngredientPieces)} предметов</p></div> <div class="recipe-card__meta svelte-pt66iz">`);

				if (currentRecipe.bonusPer1000 > 0) {
					$$renderer.push('<!--[-->');
					$$renderer.push(`<span class="meta-pill svelte-pt66iz">Бонус за качество материалов: ${escape_html((currentRecipe.bonusPer1000 / 10).toFixed(1))}%</span>`);
				} else {
					$$renderer.push('<!--[!-->');
				}

				$$renderer.push(`<!--]--> `);

				if (incentiveChance > 0) {
					$$renderer.push('<!--[-->');
					$$renderer.push(`<span class="meta-pill meta-pill--accent svelte-pt66iz">Шанс доп. награды: ${escape_html(formatPercent(incentiveChance))}</span>`);
				} else {
					$$renderer.push('<!--[!-->');
				}

				$$renderer.push(`<!--]--></div></header> <div class="recipe-card__body svelte-pt66iz"><div class="recipe-section svelte-pt66iz"><h4 class="svelte-pt66iz">Ингредиенты</h4> <ul class="ingredient-list svelte-pt66iz"><!--[-->`);

				const each_array_12 = ensure_array_like(currentRecipe.ingredients);

				for (let index = 0, $$length = each_array_12.length; index < $$length; index++) {
					let ingredient = each_array_12[index];
					const label = describeIngredientRegex(ingredient.regex);
					const icon = getItemTexture(ingredient.regex);

					$$renderer.push(`<li class="svelte-pt66iz"><div class="item-icon svelte-pt66iz">`);

					if (icon) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<img${attr('src', icon)}${attr('alt', label)} class="svelte-pt66iz"/>`);
					} else {
						$$renderer.push('<!--[!-->');
						$$renderer.push(`<span>${escape_html(label.slice(0, 1))}</span>`);
					}

					$$renderer.push(`<!--]--></div> <div class="item-info svelte-pt66iz"><span class="item-title svelte-pt66iz">${escape_html(label)}</span> <span class="item-sub svelte-pt66iz">×${escape_html(ingredient.amount)}</span></div></li>`);
				}

				$$renderer.push(`<!--]--></ul></div> <div class="recipe-section svelte-pt66iz"><h4 class="svelte-pt66iz">Награды</h4> <div class="rewards-scroll svelte-pt66iz"><ul class="reward-list svelte-pt66iz"><!--[-->`);

				const each_array_13 = ensure_array_like(rewardDisplay);

				for (let index = 0, $$length = each_array_13.length; index < $$length; index++) {
					let reward = each_array_13[index];
					const label = translateItemId(reward.id);
					const icon = getItemTexture(reward.id);

					$$renderer.push(`<li class="svelte-pt66iz"><div class="item-icon svelte-pt66iz">`);

					if (icon) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<img${attr('src', icon)}${attr('alt', label)} class="svelte-pt66iz"/>`);
					} else {
						$$renderer.push('<!--[!-->');
						$$renderer.push(`<span>${escape_html(label.slice(0, 1))}</span>`);
					}

					$$renderer.push(`<!--]--></div> <div class="item-info svelte-pt66iz"><span class="item-title svelte-pt66iz">${escape_html(label)}</span> <span class="item-sub svelte-pt66iz">${escape_html(reward.amount > 1 ? `×${reward.amount}` : 'ед.')}</span></div> <div class="item-odds svelte-pt66iz"><span>${escape_html(formatPercent(reward.chance))}</span></div></li>`);
				}

				$$renderer.push(`<!--]--></ul></div></div></div> <div class="simulation-controls svelte-pt66iz"><div class="craft-input svelte-pt66iz"><label${attr('for', `craft-count-${activeFacility.id}`)} class="svelte-pt66iz">Количество крафтов</label> <input${attr('id', `craft-count-${activeFacility.id}`)} type="number" min="1"${attr('max', MAX_SIMULATIONS)}${attr('value', state.craftCount)} class="svelte-pt66iz"/></div> <button type="button" class="simulate-btn svelte-pt66iz">🎲 Симулировать</button></div> `);

				if (state.result) {
					$$renderer.push('<!--[-->');

					const rewardDetails = state.result.rewardDetails;
					const incentiveDetails = state.result.incentiveDetails;
					const totalMain = rewardDetails.reduce((sum, item) => sum + item.amount, 0);
					incentiveDetails.reduce((sum, item) => sum + item.amount, 0);

					$$renderer.push(`<div class="results-card svelte-pt66iz"><header><h4>Результаты ${escape_html(state.result.crafts)} крафтов</h4> `);

					if (state.result.expectedIncentiveChance > 0 && activeIncentive) {
						$$renderer.push('<!--[-->');

						$$renderer.push(`<span>Ожидалось доп. награды:
                      ${escape_html(formatPercent(state.result.expectedIncentiveChance))} за крафт</span>`);
					} else {
						$$renderer.push('<!--[!-->');
					}

					$$renderer.push(`<!--]--></header> <div class="results-grid svelte-pt66iz"><div><h5>Основные награды</h5> `);

					if (rewardDetails.length > 0) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<ul class="svelte-pt66iz"><!--[-->`);

						const each_array_14 = ensure_array_like(rewardDetails);

						for (let $$index_14 = 0,
							$$length = each_array_14.length; $$index_14 < $$length; $$index_14++) {
							let detail = each_array_14[$$index_14];
							const label = translateItemId(detail.id);
							const icon = getItemTexture(detail.id);

							$$renderer.push(`<li class="svelte-pt66iz"><div class="item-icon svelte-pt66iz">`);

							if (icon) {
								$$renderer.push('<!--[-->');
								$$renderer.push(`<img${attr('src', icon)}${attr('alt', label)} class="svelte-pt66iz"/>`);
							} else {
								$$renderer.push('<!--[!-->');
								$$renderer.push(`<span>${escape_html(label.slice(0, 1))}</span>`);
							}

							$$renderer.push(`<!--]--></div> <div class="item-info svelte-pt66iz"><span class="item-title svelte-pt66iz">${escape_html(label)}</span> <span class="item-sub svelte-pt66iz">${escape_html(detail.amount)} шт. • ${escape_html(formatPercent(detail.perCraft))} за крафт</span></div> <div class="item-odds svelte-pt66iz"><span>${escape_html(formatPercent(detail.perCraft))}</span> <span class="item-odds__raw svelte-pt66iz">${escape_html(totalMain > 0 ? formatPercent(detail.share) : '—')} от дропа</span></div></li>`);
						}

						$$renderer.push(`<!--]--></ul>`);
					} else {
						$$renderer.push('<!--[!-->');
						$$renderer.push(`<p class="empty svelte-pt66iz">Наград нет — попробуйте увеличить количество крафтов.</p>`);
					}

					$$renderer.push(`<!--]--></div> <div><h5>Дополнительные награды</h5> `);

					if (incentiveDetails.length > 0) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<ul class="svelte-pt66iz"><!--[-->`);

						const each_array_15 = ensure_array_like(incentiveDetails);

						for (let $$index_15 = 0,
							$$length = each_array_15.length; $$index_15 < $$length; $$index_15++) {
							let detail = each_array_15[$$index_15];
							const label = translateItemId(detail.id);
							const icon = getItemTexture(detail.id);

							$$renderer.push(`<li class="svelte-pt66iz"><div class="item-icon svelte-pt66iz">`);

							if (icon) {
								$$renderer.push('<!--[-->');
								$$renderer.push(`<img${attr('src', icon)}${attr('alt', label)} class="svelte-pt66iz"/>`);
							} else {
								$$renderer.push('<!--[!-->');
								$$renderer.push(`<span>${escape_html(label.slice(0, 1))}</span>`);
							}

							$$renderer.push(`<!--]--></div> <div class="item-info svelte-pt66iz"><span class="item-title svelte-pt66iz">${escape_html(label)}</span> <span class="item-sub svelte-pt66iz">${escape_html(detail.amount)} шт. • ${escape_html(formatPercent(detail.perCraft))} за крафт</span></div></li>`);
						}

						$$renderer.push(`<!--]--></ul>`);
					} else {
						$$renderer.push('<!--[!-->');
						$$renderer.push(`<p class="empty svelte-pt66iz">Дополнительные награды не выпали.</p>`);
					}

					$$renderer.push(`<!--]--></div></div> `);

					if (state.result.log.length > 0) {
						$$renderer.push('<!--[-->');
						$$renderer.push(`<div class="results-log svelte-pt66iz"><h5>Текстовый лог</h5> <ul class="svelte-pt66iz"><!--[-->`);

						const each_array_16 = ensure_array_like(state.result.log);

						for (let index = 0, $$length = each_array_16.length; index < $$length; index++) {
							let line = each_array_16[index];

							$$renderer.push(`<li class="svelte-pt66iz"><span class="results-log__index svelte-pt66iz">${escape_html(index + 1)}.</span> <span>${escape_html(line)}</span></li>`);
						}

						$$renderer.push(`<!--]--></ul></div>`);
					} else {
						$$renderer.push('<!--[!-->');
					}

					$$renderer.push(`<!--]--></div>`);
				} else {
					$$renderer.push('<!--[!-->');
				}

				$$renderer.push(`<!--]--></div>`);
			} else {
				$$renderer.push('<!--[!-->');
			}

			$$renderer.push(`<!--]--></div></div></section>`);
		} else {
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}

const $$Craft = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Black Hole Craft Lab \u2014 \u0441\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440 \u043A\u0440\u0430\u0444\u0442\u0430", "fullWidth": true, "viewport": "width=1024, user-scalable=yes" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "CraftSimulator", CraftSimulator, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/godbtw/site-workspace/mutants_site/src/components/simulators/craft/CraftSimulator.svelte", "client:component-export": "default" })} ` })}`;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/simulators/craft.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/simulators/craft.astro";
const $$url = "/simulators/craft";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Craft,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
