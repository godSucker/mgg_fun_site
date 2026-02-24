import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../../chunks/BaseLayout_7drcn5tv.mjs';
import { c as escape_html, b as attr, d as attr_class, h as bind_props } from '../../../chunks/_@astro-renderers_DtO3kaqa.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_DtO3kaqa.mjs';
import { o as onDestroy } from '../../../chunks/index-server_D1p8GlmT.mjs';
/* empty css                                      */

const id = "cash";
const title = "Cash Frenzy";
const cost = 20;
const tokenCost = 0;
const rewards = [{"rewardId":1,"amount":1,"odds":1,"type":"entity","id":null,"picture":"thumbnails/jackpot.webp","isBigwin":true,"isSuperJackpot":true},{"rewardId":2,"amount":30,"odds":42000,"type":"hardcurrency","id":null,"picture":"thumbnails/jackpot_gold_x30.webp","isBigwin":false,"isSuperJackpot":false},{"rewardId":3,"amount":40,"odds":22000,"type":"hardcurrency","id":null,"picture":"thumbnails/jackpot_gold_x40.webp","isBigwin":false,"isSuperJackpot":false},{"rewardId":4,"amount":50,"odds":10400,"type":"hardcurrency","id":null,"picture":"thumbnails/jackpot_gold_x50.webp","isBigwin":false,"isSuperJackpot":false},{"rewardId":5,"amount":80,"odds":3900,"type":"hardcurrency","id":null,"picture":"thumbnails/jackpot_gold_x80.webp","isBigwin":false,"isSuperJackpot":false},{"rewardId":6,"amount":100,"odds":1300,"type":"hardcurrency","id":null,"picture":"thumbnails/jackpot_gold_x100.webp","isBigwin":false,"isSuperJackpot":false},{"rewardId":7,"amount":200,"odds":500,"type":"hardcurrency","id":null,"picture":"thumbnails/jackpot_gold_x200.webp","isBigwin":false,"isSuperJackpot":false},{"rewardId":8,"amount":500,"odds":170,"type":"hardcurrency","id":null,"picture":"thumbnails/jackpot_gold_x500.webp","isBigwin":false,"isSuperJackpot":false},{"rewardId":9,"amount":1000,"odds":75,"type":"hardcurrency","id":null,"picture":"thumbnails/jackpot_gold_x1000.webp","isBigwin":false,"isSuperJackpot":false},{"rewardId":10,"amount":2000,"odds":40,"type":"hardcurrency","id":null,"picture":"thumbnails/jackpot_gold_x2000.webp","isBigwin":false,"isSuperJackpot":false},{"rewardId":11,"amount":5000,"odds":10,"type":"hardcurrency","id":null,"picture":"thumbnails/jackpot_gold_x5000.webp","isBigwin":false,"isSuperJackpot":false},{"rewardId":12,"amount":50000,"odds":270000,"type":"softcurrency","id":null,"picture":"thumbnails/sc10000.webp","isBigwin":false,"isSuperJackpot":false}];
const rawMachine = {
  id,
  title,
  cost,
  tokenCost,
  rewards,
};

const cashMachine = rawMachine;
function getValidRewards(machine = cashMachine) {
  return machine.rewards.filter((reward) => reward.odds > 0);
}
function getTotalWeight(machine = cashMachine) {
  return getValidRewards(machine).reduce((sum, reward) => sum + reward.odds, 0);
}
function formatNumber(value) {
  return value.toLocaleString("ru-RU");
}
function getRewardLabel(reward) {
  if (reward.type === "hardcurrency") {
    return `${formatNumber(reward.amount)} золота`;
  }
  if (reward.type === "softcurrency") {
    return `${formatNumber(reward.amount)} серебра`;
  }
  if (reward.picture && reward.picture.includes("jackpot")) {
    return "Джекпот";
  }
  return "Неизвестная награда";
}
const GOLD_REWARD_AMOUNTS = /* @__PURE__ */ new Set([
  30,
  40,
  50,
  80,
  100,
  200,
  500,
  1e3,
  2e3,
  5e3
]);
const SILVER_REWARD_AMOUNTS = /* @__PURE__ */ new Set([5e4]);
function buildCashIcon(prefix, amount) {
  return `/cash/${prefix}${amount}.webp`;
}
function getGoldRewardIcon(amount) {
  if (GOLD_REWARD_AMOUNTS.has(amount)) {
    return buildCashIcon("g", amount);
  }
  return getCurrencyIcon("hardcurrency");
}
function getSilverRewardIcon(amount) {
  if (SILVER_REWARD_AMOUNTS.has(amount)) {
    return buildCashIcon("s", amount);
  }
  return getCurrencyIcon("softcurrency");
}
function getCurrencyIcon(currency) {
  return currency === "hardcurrency" ? "/cash/hardcurrency.webp" : "/cash/softcurrency.webp";
}
function getRewardIcon(reward) {
  if (reward.type === "hardcurrency") {
    return getGoldRewardIcon(reward.amount);
  }
  if (reward.type === "softcurrency") {
    return getSilverRewardIcon(reward.amount);
  }
  if (reward.type === "entity") {
    return "/cash/jackpot.webp";
  }
  return "/cash/unknown.webp";
}
function getRewardChance(reward, machine = cashMachine) {
  const weight = getTotalWeight(machine);
  if (!weight) return 0;
  return reward.odds / weight;
}
function getRewardWithChance(reward, machine = cashMachine) {
  return {
    ...reward,
    label: getRewardLabel(reward),
    chance: getRewardChance(reward, machine),
    icon: getRewardIcon(reward)
  };
}

function CashMachineSimulator($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let machine = $$props['machine'];
		const costPerSpin = machine.cost;
		const rewardChances = machine.rewards.filter((reward) => reward.odds > 0).map((reward) => getRewardWithChance(reward, machine)).sort((a, b) => b.chance - a.chance);
		let budget = 1000;
		let isSimulating = false;

		onDestroy(() => {
		});

		$$renderer.push(`<div class="machine-shell svelte-nxslby"><div class="machine-body svelte-nxslby"><div class="machine-header svelte-nxslby"><span class="machine-tag svelte-nxslby">Золотая рулетка</span> <h2 class="svelte-nxslby">${escape_html(machine.title)}</h2> <p class="svelte-nxslby">Стоимость прокрута — ${escape_html(costPerSpin)} золота. Выберите бюджет и посмотрите, какие призы можно собрать.</p></div> <form class="control-panel svelte-nxslby" style="order: -1;"><label class="input-group svelte-nxslby"><span class="svelte-nxslby">Бюджет золота</span> <div class="input-wrapper svelte-nxslby"><input type="number"${attr('min', costPerSpin)}${attr('value', budget)} aria-describedby="budget-hint" class="svelte-nxslby"/> <span class="suffix svelte-nxslby">золота</span></div> <small id="budget-hint" class="svelte-nxslby">Минимум ${escape_html(costPerSpin)} — стоимость одного прокрута.</small></label> <div class="actions svelte-nxslby"><button type="submit" class="primary svelte-nxslby"${attr('disabled', isSimulating, true)}>${escape_html('Запустить симуляцию')}</button> <button type="button"${attr_class(`ghost ${''}`, 'svelte-nxslby')}>${escape_html('Очистить')}</button></div> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></form> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></div> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--> <aside${attr_class('odds-panel svelte-nxslby', void 0, { 'collapsed': true })}><button class="odds-toggle svelte-nxslby"><div class="odds-toggle__title svelte-nxslby"><h3 class="svelte-nxslby">Теоретические шансы</h3> <span class="badge badge--small svelte-nxslby">${escape_html(rewardChances.length)} призов</span></div> <span class="chevron svelte-nxslby">${escape_html('▲')}</span></button> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></aside></div>`);
		bind_props($$props, { machine });
	});
}

const $$Cash = createComponent(($$result, $$props, $$slots) => {
  const jackpotReward = cashMachine.rewards.find((reward) => reward.isSuperJackpot) ?? cashMachine.rewards[0];
  const jackpotChance = jackpotReward ? getRewardChance(jackpotReward, cashMachine) : 0;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Cash Frenzy \u2014 \u0441\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440 \u0440\u0443\u043B\u0435\u0442\u043A\u0438", "fullWidth": true, "data-astro-cid-2xosagr2": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="back-nav" data-astro-cid-2xosagr2> <a href="/simulators/roulette" class="back-button" data-astro-cid-2xosagr2> <span class="icon" data-astro-cid-2xosagr2>←</span> <span class="text" data-astro-cid-2xosagr2>Назад к рулеткам</span> </a> </div> <section class="hero" data-astro-cid-2xosagr2> <div class="hero-card" data-astro-cid-2xosagr2> <span class="badge" data-astro-cid-2xosagr2>Sim • Cash Machine</span> <h1 data-astro-cid-2xosagr2>Cash Frenzy</h1> <p data-astro-cid-2xosagr2>
Золотая рулетка. Симулятор повторяет реальные шансы
        выпадения призов и позволяет быстро проверить, окупается ли вложенное золото.
</p> <dl class="quick-stats" aria-label="Основные параметры машины" data-astro-cid-2xosagr2> <div data-astro-cid-2xosagr2> <dt data-astro-cid-2xosagr2>Стоимость прокрута</dt> <dd data-astro-cid-2xosagr2>${cashMachine.cost} золота</dd> </div> <div data-astro-cid-2xosagr2> <dt data-astro-cid-2xosagr2>Количество призов</dt> <dd data-astro-cid-2xosagr2>${cashMachine.rewards.length}</dd> </div> <div data-astro-cid-2xosagr2> <dt data-astro-cid-2xosagr2>Суперджекпот</dt> <dd data-astro-cid-2xosagr2>${(jackpotChance * 100).toFixed(6)}%</dd> </div> </dl> </div> </section> ${renderComponent($$result2, "CashMachineSimulator", CashMachineSimulator, { "client:load": true, "machine": cashMachine, "client:component-hydration": "load", "client:component-path": "/home/godbtw/site-workspace/mutants_site/src/components/simulators/cash/CashMachineSimulator.svelte", "client:component-export": "default", "data-astro-cid-2xosagr2": true })} ` })} `;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/simulators/roulette/cash.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/simulators/roulette/cash.astro";
const $$url = "/simulators/roulette/cash";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Cash,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
