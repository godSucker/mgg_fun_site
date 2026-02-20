import { f as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_Cdeq5Zjw.mjs';
import { d as attr_class, s as stringify, c as escape_html, b as attr, e as ensure_array_like } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';
import { m as mutantsRaw } from '../../chunks/mutants_CTe2pNBk.mjs';
import { n as normalizeSearch } from '../../chunks/search-normalize_BSnfnBuB.mjs';
/* empty css                                       */

const GENE_ORDER = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5
};
function readGenes(m) {
  if (Array.isArray(m?.genes)) {
    return m.genes.filter(Boolean).map((g) => String(g).toUpperCase()).join("");
  }
  return "";
}
function sortMutantsByGene(a, b) {
  const ga = readGenes(a);
  const gb = readGenes(b);
  const a1 = ga[0] ? GENE_ORDER[ga[0]] ?? 99 : 199;
  const b1 = gb[0] ? GENE_ORDER[gb[0]] ?? 99 : 199;
  if (a1 !== b1) return a1 - b1;
  const a2 = ga.length <= 1 ? 0 : (GENE_ORDER[ga[1]] ?? 99) + 1;
  const b2 = gb.length <= 1 ? 0 : (GENE_ORDER[gb[1]] ?? 99) + 1;
  if (a2 !== b2) return a2 - b2;
  const aid = String(a?.id ?? "");
  const bid = String(b?.id ?? "");
  return aid.localeCompare(bid);
}

const secretCombos = [
  // Страхолюдочка (Secret Recipe)
  { childName: "Страхолюдочка", parents: ["Ниндзябот", "Буши"] },
  { childName: "Страхолюдочка", parents: ["Драконежить", "Рептоид"] },
  // Гор (Horus) — Secret Recipe
  { childName: "Гор", parents: ["Ктулху", "Ксенос"] },
  { childName: "Гор", parents: ["Лорд Преисподней", "Благородный дракон"] },
  // Буши: два возможных рецепта
  { childName: "Буши", parents: ["Зомборг", "Ниндзябот"] },
  { childName: "Буши", parents: ["Прилипала", "Марсианский Воин"] },
  // Капитан Костьмилягу (Captain Bag O' Bones)
  { childName: "Капитан Костьмилягу", parents: ["Драконежить", "Кошмарыцарь Севера"] },
  { childName: "Капитан Костьмилягу", parents: ["Капитан Гаечный Ключ", "Темновзор"] },
  // Капитан Гаечный Ключ (Captain Wrenchfury)
  { childName: "Капитан Гаечный Ключ", parents: ["Буши", "Страхолюдочка"] },
  { childName: "Капитан Гаечный Ключ", parents: ["Андроид", "Марсианский Воин"] },
  // Мантидроид (Mantidruid)
  { childName: "Мантидроид", parents: ["Гор", "Перехватчица"] },
  { childName: "Мантидроид", parents: ["Ракшаса", "Ниндзябот"] },
  // Пожиратель (The Devourers)
  { childName: "Пожиратель", parents: ["Зомборг", "Опустошитель"] },
  { childName: "Пожиратель", parents: ["Астромаг", "Страхолюдочка"] },
  // Темновзор (The Darkseer)
  { childName: "Темновзор", parents: ["Капитан Гаечный Ключ", "Буши"] },
  { childName: "Темновзор", parents: ["Мрачная Жница", "Бог Машин"] },
  // Перехватчица (Interceptrix)
  { childName: "Перехватчица", parents: ["Страхолюдочка", "Капитан Костьмилягу"] },
  { childName: "Перехватчица", parents: ["Бог Машин", "Гэндолфус"] },
  // Киберслизень (CyberSlug)
  { childName: "Киберслизень", parents: ["Ктулху", "Колосс"] },
  { childName: "Киберслизень", parents: ["Темновзор", "Коммодор Акула"] },
  // Коммодор Акула (Commodore Le Shark)
  { childName: "Коммодор Акула", parents: ["Королева Банши", "Марсианский Воин"] },
  { childName: "Коммодор Акула", parents: ["Пожиратель", "Капитан Костьмилягу"] }
];

new Set([
  // Original legends (excluding secret/recipe mutants)
  "human",
  "dezinger",
  "mechanorog",
  "invadron",
  "cursedracer",
  "proklyatiygonshchik",
  // Проклятый Гонщик
  "touchdown",
  "grimteddy",
  "ragnar",
  "buckmaurice",
  "galaxyguard",
  "thor",
  "kobrakai",
  "cosmokong",
  "absolem",
  "longhorn",
  "startrooper",
  "wampaa",
  "masteryoda",
  "anubis",
  "raveneye",
  "hor",
  "gore",
  // NOTE: Secret/Recipe mutants removed:
  // bushi, captainbagobones, captainwrenchfury, mantidruid,
  // devourer, darkseer, interceptrix, cyberslug, commodoreshark
  // Russian names (normalized, excluding secret/recipe mutants)
  "человек",
  "дезингер",
  "механорог",
  "инвадрон",
  "проклятыйгонщик",
  "тачдаун",
  "мрачныймишка",
  "рагнар",
  "бакморис",
  "стражгалактики",
  "тор",
  "кобракай",
  "космоконг",
  "абсолем",
  "длиннорог",
  "штурмовик",
  "вампаа",
  "мастерйода",
  "анубис",
  "вороноглаз"
  // NOTE: Secret/Recipe mutants removed:
  // буши, капитанкостьмилягу, капитангаечныйключ, мантидроид,
  // пожиратель, темновзор, перехватчица, киберслизень, коммодоракула
].map(normalizeSearch));

function BreedingUI($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let // --- DATA ---
		// --- HELPERS ---
		// --- SORTING (using unified sort) ---
		// --- STATE ---
		// Added second gene filter
		// Вспомогательная функция для получения массива генов
		// Получить все гены для отображения (показываем все, включая дубликаты)
		// Для Single (A) - показываем один раз
		// Для Mono (AA) - показываем ОБА (AA)
		// Для Hybrid (AB) - показываем оба (AB)
		// Возвращаем все гены, включая дубликаты
		// Auto-reset Gene2 when Gene1 is "all"
		filteredList;

		const allMutants = mutantsRaw.map((m) => ({
			id: String(m.id),
			name: m.name,
			genes: m.genes,
			odds: Number(m.odds) || 0,
			type: m.type || 'default',
			star: 'normal',
			incub_time: Number(m.incub_time) || 0,
			image: (() => {
				const s = m.stars;

				if (s) {
					const k = Object.keys(s);

					if (k.length) return s[k[0]]?.images ?? [];
				}

				return m.image ?? [];
			})()
		}));

		const normalize = normalizeSearch;
		const secretNames = new Set(secretCombos.map((s) => normalize(s.childName)));

		// --- HELPERS ---
		const getName = (m) => m.name || m.id;

		function getImageSrc(m) {
			const img = m.image;
			const path = Array.isArray(img) ? img[0] ?? img[1] : img;

			if (!path) return '/preview.jpg';

			return path.startsWith('/') ? path : '/' + path;
		}

		function getGeneIcon(geneChar) {
			const char = geneChar.toLowerCase().charAt(0);

			if (['a', 'b', 'c', 'd', 'e', 'f'].includes(char)) {
				return `/genes/gene_${char}.webp`;
			}

			return '/genes/gene_all.webp';
		}

		function getTypeIcon(m) {
			const t = (m.type ?? '').toLowerCase();

			if (t === 'legend') return '/mut_icons/icon_legendary.webp';
			if (t === 'recipe') return '/mut_icons/icon_recipe.webp';
			if (t === 'community') return '/mut_icons/icon_special.webp';
			if (!t || t === 'default') return '/mut_icons/icon_morphology.webp';

			return `/mut_icons/icon_${t}.webp`;
		}
		let search = '';
		let filterGene = 'all';
		let filterGene2 = 'all'; // Added second gene filter

		// Вспомогательная функция для получения массива генов
		const getGenesArray = (m) => {
			const gStr = Array.isArray(m.genes) ? m.genes.join('') : m.genes;

			return (gStr || '').toUpperCase().split('');
		};

		filterGene2 = 'all';

		filteredList = allMutants.filter((m) => {

			const normalizedSearch = normalizeSearch(search);
			const nameMatch = !normalizedSearch || normalizeSearch(getName(m)).includes(normalizedSearch);
			getGenesArray(m);

			return nameMatch;
		}).sort(sortMutantsByGene);

		$$renderer.push(`<div class="main-wrapper svelte-v5npuz"><div${attr_class(
			`panel lab-panel ${stringify(
				// Allow same mutant for both parents
				'active' 
			)}`,
			'svelte-v5npuz'
		)}><div class="panel-header svelte-v5npuz"><div class="logo-area svelte-v5npuz"><div class="logo-icon svelte-v5npuz">🧬</div> <div class="svelte-v5npuz"><h1 class="svelte-v5npuz">MGG <span class="highlight svelte-v5npuz">Breeder</span></h1> <div class="subtitle svelte-v5npuz">Genetics Simulator</div></div></div> <div class="mode-switch-desktop svelte-v5npuz"><button${attr_class(`mode-btn ${stringify('active' )}`, 'svelte-v5npuz')}>Инкубатор</button> <button class="mode-btn disabled svelte-v5npuz" title="Справочник временно закрыт">Справочник 🔒</button></div> <button class="mode-switch-mobile svelte-v5npuz">${escape_html(
			// Справочник закрыт - показываем уведомление
			'Справочник 🔒' 
		)}</button></div> <div class="workspace custom-scroll svelte-v5npuz">`);

		{
			$$renderer.push('<!--[-->');
			$$renderer.push(`<div class="calc-container svelte-v5npuz"><div class="slots-area svelte-v5npuz"><div class="parent-slot-wrapper svelte-v5npuz"><button${attr_class(`slot ${stringify('empty')}`, 'svelte-v5npuz')}>`);

			{
				$$renderer.push('<!--[!-->');
				$$renderer.push(`<div class="plus svelte-v5npuz">+</div> <span class="label svelte-v5npuz">Нажмите для выбора</span>`);
			}

			$$renderer.push(`<!--]--></button> `);

			{
				$$renderer.push('<!--[!-->');
			}

			$$renderer.push(`<!--]--></div> <div class="cross-icon svelte-v5npuz">✕</div> <div class="parent-slot-wrapper svelte-v5npuz"><button${attr_class(`slot ${stringify('empty')}`, 'svelte-v5npuz')}>`);

			{
				$$renderer.push('<!--[!-->');
				$$renderer.push(`<div class="plus svelte-v5npuz">+</div> <span class="label svelte-v5npuz">Нажмите для выбора</span>`);
			}

			$$renderer.push(`<!--]--></button> `);

			{
				$$renderer.push('<!--[!-->');
			}

			$$renderer.push(`<!--]--></div></div> `);

			{
				$$renderer.push('<!--[!-->');
				$$renderer.push(`<div class="instruction svelte-v5npuz"><div class="icon svelte-v5npuz">👆</div> <p class="svelte-v5npuz">Нажмите на слот выше, чтобы выбрать мутанта из Базы ДНК (справа на ПК / снизу на моб.)</p></div>`);
			}

			$$renderer.push(`<!--]--></div>`);
		}

		$$renderer.push(`<!--]--></div></div> <div${attr_class(`panel list-panel ${stringify('')}`, 'svelte-v5npuz')}><div class="list-header svelte-v5npuz"><div class="search-box svelte-v5npuz"><input type="text"${attr('value', search)} placeholder="Поиск мутанта..." class="svelte-v5npuz"/> <span class="icon svelte-v5npuz">🔍</span></div> <div class="filters svelte-v5npuz"><div class="gene-line svelte-v5npuz"><button${attr_class(`filter-chip ${stringify('active' )}`, 'svelte-v5npuz')}><span class="svelte-v5npuz">Ген 1: ВСЕ</span></button> <!--[-->`);

		const each_array_4 = ensure_array_like(['A', 'B', 'C', 'D', 'E', 'F']);

		for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
			let g = each_array_4[$$index_4];

			$$renderer.push(`<button${attr_class(`filter-chip gene-chip ${stringify(filterGene === g ? 'active' : '')}`, 'svelte-v5npuz')}><img${attr('src', getGeneIcon(g))}${attr('alt', g)} class="svelte-v5npuz"/></button>`);
		}

		$$renderer.push(`<!--]--></div> <div${attr_class('gene-line svelte-v5npuz', void 0, { 'disabled': filterGene === 'all' })}><button${attr_class(`filter-chip ${stringify(filterGene2 === 'all' ? 'active' : '')}`, 'svelte-v5npuz')}${attr('disabled', filterGene === 'all', true)}><span class="svelte-v5npuz">Ген 2: ВСЕ</span></button> <button${attr_class(`filter-chip gene-chip ${stringify(filterGene2 === 'neutral' ? 'active' : '')}`, 'svelte-v5npuz')}${attr('disabled', filterGene === 'all', true)}><img src="/genes/gene_all.webp" alt="Нейтральный" class="svelte-v5npuz"/></button> <!--[-->`);

		const each_array_5 = ensure_array_like(['A', 'B', 'C', 'D', 'E', 'F']);

		for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
			let g = each_array_5[$$index_5];

			$$renderer.push(`<button${attr_class(`filter-chip gene-chip ${stringify(filterGene2 === g ? 'active' : '')}`, 'svelte-v5npuz')}${attr('disabled', filterGene === 'all', true)}><img${attr('src', getGeneIcon(g))}${attr('alt', g)} class="svelte-v5npuz"/></button>`);
		}

		$$renderer.push(`<!--]--></div> <button${attr_class(`filter-chip secret-chip ${stringify('')}`, 'svelte-v5npuz')}><span class="star svelte-v5npuz">★</span> <span class="svelte-v5npuz">Секреты</span></button></div></div> <div class="list-grid custom-scroll svelte-v5npuz"><!--[-->`);

		const each_array_6 = ensure_array_like(filteredList);

		for (let $$index_7 = 0, $$length = each_array_6.length; $$index_7 < $$length; $$index_7++) {
			let m = each_array_6[$$index_7];

			$$renderer.push(`<button class="grid-item svelte-v5npuz"${attr('title', getName(m))}><div class="card-badges svelte-v5npuz"><img${attr('src', getTypeIcon(m))} alt="Значок типа мутанта" class="type-icon svelte-v5npuz"/> <div class="gene-icons svelte-v5npuz"><!--[-->`);

			const each_array_7 = ensure_array_like(Array.isArray(m.genes) ? m.genes : [m.genes]);

			for (let $$index_6 = 0, $$length = each_array_7.length; $$index_6 < $$length; $$index_6++) {
				let g = each_array_7[$$index_6];

				$$renderer.push(`<img${attr('src', getGeneIcon(g))}${attr('alt', g)} class="gene-icon svelte-v5npuz"/>`);
			}

			$$renderer.push(`<!--]--></div></div> <div class="img-wrapper svelte-v5npuz"><img class="mutant-texture svelte-v5npuz" loading="lazy"${attr('src', getImageSrc(m))} alt="Текстура мутанта"/></div> <div class="item-info-row svelte-v5npuz"><div class="item-name svelte-v5npuz">${escape_html(getName(m))}</div></div> `);

			if (secretNames.has(normalize(getName(m)))) {
				$$renderer.push('<!--[-->');
				$$renderer.push(`<div class="secret-badge svelte-v5npuz">★</div>`);
			} else {
				$$renderer.push('<!--[!-->');
			}

			$$renderer.push(`<!--]--></button>`);
		}

		$$renderer.push(`<!--]--></div></div> <nav class="mobile-nav svelte-v5npuz"><button${attr_class(`nav-item ${stringify('active' )}`, 'svelte-v5npuz')}><span class="icon svelte-v5npuz">${escape_html('🧬' )}</span> <span class="label svelte-v5npuz">Лаборатория</span></button> <div class="divider svelte-v5npuz"></div> <button${attr_class(`nav-item ${stringify('')}`, 'svelte-v5npuz')}><span class="icon svelte-v5npuz">📋</span> <span class="label svelte-v5npuz">База ДНК</span></button></nav></div>`);
	});
}

const $$Breeding = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u0421\u043A\u0440\u0435\u0449\u0438\u0432\u0430\u043D\u0438\u044F \u2014 \u0441\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440", "fullWidth": true }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "BreedingUI", BreedingUI, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/breeding/BreedingUI.svelte", "client:component-export": "default" })} ` })}`;
}, "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/simulators/breeding.astro", void 0);

const $$file = "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/simulators/breeding.astro";
const $$url = "/simulators/breeding";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Breeding,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
