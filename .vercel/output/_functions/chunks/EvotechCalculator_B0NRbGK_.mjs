import { b as attr, c as escape_html } from './_@astro-renderers_DtO3kaqa.mjs';
/* empty css                                      */

function EvotechCalculator($$renderer, $$props) {
	$$renderer.component(($$renderer) => {

		// UI
		let startLevel = '';

		let silver = '';
		let gold = '';
		let discount = '70'; // 0 | 60 | 70 | 80
		let busy = false;

		// Результаты
		let endLevel = '—';

		let upgrades = '—';
		let spentSilver = '—';
		let spentGold = '—';
		let leftSilver = '—';
		let leftGold = '—';

		$$renderer.push(`<div class="max-w-5xl mx-auto p-4"><h1 class="text-2xl md:text-3xl font-bold text-sky-100">Калькулятор эво</h1> <p class="text-sky-200/80 mt-1">Введите стартовый уровень и ресурсы — калькулятор посчитает финальный уровень.</p> <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4"><div class="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 backdrop-blur"><h2 class="text-sky-100 font-bold mb-3">Ввод данных</h2> <div class="space-y-3"><label class="block"><span class="text-sky-300/80 text-sm">Стартовый уровень (≥ 5)</span> <input type="text"${attr('value', startLevel)} inputmode="numeric" placeholder="Например, 120" class="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/60 text-sky-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/60 evo-pad svelte-33uaic"/></label> <label class="block"><span class="text-sky-300/80 text-sm">Серебро</span> <input type="text"${attr('value', silver)} inputmode="numeric" placeholder="Можно оставить пустым" class="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/60 text-sky-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/60 evo-pad svelte-33uaic"/></label> <label class="block"><span class="text-sky-300/80 text-sm">Золото</span> <input type="text"${attr('value', gold)} inputmode="numeric" placeholder="Можно оставить пустым" class="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/60 text-sky-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/60 evo-pad svelte-33uaic"/></label> <label class="block"><span class="text-sky-300/80 text-sm">Скидка</span> `);

		$$renderer.select(
			{
				value: discount,
				class: 'mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/60 text-sky-100 outline-none focus:ring-2 focus:ring-sky-500/60 evo-pad'
			},
			($$renderer) => {
				$$renderer.option({ value: '0' }, ($$renderer) => {
					$$renderer.push(`0%`);
				});

				$$renderer.option({ value: '60' }, ($$renderer) => {
					$$renderer.push(`60%`);
				});

				$$renderer.option({ value: '70' }, ($$renderer) => {
					$$renderer.push(`70%`);
				});

				$$renderer.option({ value: '80' }, ($$renderer) => {
					$$renderer.push(`80%`);
				});
			},
			'svelte-33uaic'
		);

		$$renderer.push(`</label> <div class="pt-2"><button class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white ring-1 ring-white/10 disabled:opacity-60"${attr('disabled', busy, true)}>${escape_html('Рассчитать')}</button></div></div></div> <div class="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 backdrop-blur"><h2 class="text-sky-100 font-bold mb-3">Результат</h2> `);

		{
			$$renderer.push('<!--[!-->');
			$$renderer.push(`<div class="space-y-1.5"><div class="flex justify-between gap-2"><span class="text-sky-300/80">Финальный уровень:</span><strong>${escape_html(endLevel)}</strong></div> <div class="flex justify-between gap-2"><span class="text-sky-300/80">Поднятно уровней:</span><strong>${escape_html(upgrades)}</strong></div> <hr class="my-2 border-slate-700/70"/> <div class="flex justify-between gap-2"><span class="text-sky-300/80">Потрачено серебра:</span><strong>${escape_html(spentSilver)}</strong></div> <div class="flex justify-between gap-2"><span class="text-sky-300/80">Потрачено золота:</span><strong>${escape_html(spentGold)}</strong></div> <div class="flex justify-between gap-2"><span class="text-sky-300/80">Остаток серебра:</span><strong>${escape_html(leftSilver)}</strong></div> <div class="flex justify-between gap-2"><span class="text-sky-300/80">Остаток золота:</span><strong>${escape_html(leftGold)}</strong></div></div> <p class="mt-3 text-sky-200/70 text-sm">Можно вводить только золото или только серебро — калькулятор сам поймёт.</p> `);

			{
				$$renderer.push('<!--[!-->');
			}

			$$renderer.push(`<!--]-->`);
		}

		$$renderer.push(`<!--]--></div></div></div>`);
	});
}

export { EvotechCalculator as E };
