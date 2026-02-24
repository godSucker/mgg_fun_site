import { f as fallback, c as escape_html, d as attr_class, b as attr, e as ensure_array_like, g as clsx, h as bind_props } from './_@astro-renderers_DtO3kaqa.mjs';
import { g as geneLabel, T as TYPE_RU, b as bingoLabel } from './mutant-dicts_cSjOMjg4.mjs';
/* empty css                          */
import { n as normalizeSearch } from './search-normalize_BSnfnBuB.mjs';

function MutantsBrowser($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let // Alias for backward compatibility
			// Пропсы
			// unified mutants.json
			// skins.json -> specimens[]
			// bingos.json
			// Мемо-кэш для фильтрации/сортировки
			// =========================
			// НОРМАЛИЗАЦИЯ ДАННЫХ
			// =========================
			// Для базовой карты предпочитаем normal версию, но сохраняем все версии по id для быстрого доступа
			// Кэшируем enriched данные - пересчитываем только при изменении items/skins
			// При изменении items пересоздаем preparedMutants
			// Очищаем кэш фильтрации
			normalizedSkins,
			// При изменении normalizedSkins пересоздаем preparedSkins
			// Очищаем кэш фильтрации
			// ===========
			// КОНТРОЛЫ UI
			// ===========
			// Gene2 is blocked when Gene1 is "Все" (empty)
			typeOptions,
			bingoOptions,
			// =================
			// ПОМОЩНИКИ ФИЛЬТРОВ
			// =================
			// Secondary gene weight (for sorting)
			// Регистронезависимый тип
			// Генерирует ключ кэша на основе параметров фильтрации
			// МЕГА-БЫСТРАЯ ФИЛЬТРАЦИЯ С КЭШИРОВАНИЕМ
			filteredMutants,
			// Если есть поисковый запрос, игнорируем фильтры звезд/атрибутов
			// Объединяем map + filter в один проход для оптимизации
			// Фильтр поиска
			// Если ищем по имени, пропускаем остальные фильтры
			// Фильтр генов: Gene1 = first gene strictly, Gene2 = second gene strictly
			// Single-gene only: exactly one gene
			// Поиск по типу (с учетом синонимов для Реактора)
			// Фильтр бинго и звезд
			// Определяем принудительный скин
			// --- МАГИЯ ПОДМЕНЫ ВЕРСИЙ ДЛЯ БИНГО ---
			// Если выбрано звездное Бинго, подменяем мутанта на его звездную версию из starMap
			// Sort using pre-computed ranks from _meta
			// МЕГА-БЫСТРАЯ ФИЛЬТРАЦИЯ СКИНОВ С КЭШИРОВАНИЕМ
			filteredSkins,
			// Strict gene filter: Gene1 = first gene, Gene2 = second gene
			// Single-gene only: exactly one gene
			// Sort using pre-computed ranks from _meta
			pageSize,
			endIndex,
			shownMutants;

		const normalizeForSearch = normalizeSearch;
		let items = fallback($$props['items'], () => [], true);
		let skins = fallback($$props['skins'], () => [], true);
		let bingos = fallback($$props['bingos'], () => [], true);
		let title = fallback($$props['title'], '');
		let bingoIndex = fallback($$props['bingoIndex'], () => [], true);
		let star = fallback($$props['star'], '');
		const _cache = new Map();

		function memo(key, calc) {
			if (_cache.has(key)) return _cache.get(key);

			const v = calc();

			_cache.set(key, v);

			return v;
		}

		// =========================
		// НОРМАЛИЗАЦИЯ ДАННЫХ
		// =========================
		const baseId = (id) => String(id ?? '').toLowerCase().replace(/_+(?:normal|bronze|silver|gold|platinum|plat).*$/i, '');

		function buildBaseMap(list) {
			const map = new Map();

			for (const item of Array.isArray(list) ? list : []) {
				const key = baseId(item?.id);

				if (!key) continue;

				const id = String(item?.id ?? '').toLowerCase();

				// Для базовой карты предпочитаем normal версию, но сохраняем все версии по id для быстрого доступа
				const isNormal = !(/_+(?:bronze|silver|gold|platinum|plat)\b/).test(id);

				if (!map.has(key) || isNormal) {
					map.set(key, item);
				}
			}

			return map;
		}

		function hasBingo(val) {
			if (!val) return false;
			if (Array.isArray(val)) return val.length > 0;
			if (typeof val === 'object') return Object.keys(val).length > 0;

			return false;
		}

		function mergeBaseStats(baseStats, override) {
			if (!baseStats && !override) return undefined;

			const result = { ...baseStats ?? {} };

			if (baseStats?.lvl1 || override?.lvl1) {
				result.lvl1 = { ...baseStats?.lvl1 ?? {}, ...override?.lvl1 ?? {} };
			}

			if (baseStats?.lvl30 || override?.lvl30) {
				result.lvl30 = { ...baseStats?.lvl30 ?? {}, ...override?.lvl30 ?? {} };
			}

			for (const key of Object.keys(override ?? {})) {
				if (key === 'lvl1' || key === 'lvl30') continue;

				result[key] = override[key];
			}

			return result;
		}

		function pickImage(preferred, fallback) {
			if (Array.isArray(preferred)) return preferred.slice();
			if (preferred != null) return preferred;
			if (Array.isArray(fallback)) return fallback.slice();

			return fallback ?? [];
		}

		function mapSkin(s, lookup, index) {
			const key = baseId(s?.id);
			const base = key ? lookup.get(key) : undefined;

			const merged = {
				...base ?? {},
				...s ?? {},
				id: s?.id ?? base?.id,
				name: s?.name ?? base?.name,
				genes: Array.isArray(s?.genes) && s.genes.length ? s.genes : base?.genes,
				base_stats: mergeBaseStats(base?.base_stats, s?.base_stats),
				image: pickImage(s?.image, base?.image),
				type: s?.type ?? base?.type ?? 'default',
				star: !s?.star || s.star === 'none' ? 'normal' : String(s.star).toLowerCase(),
				bingo: hasBingo(s?.bingo) ? s.bingo : base?.bingo,
				abilities: Array.isArray(s?.abilities) && s.abilities.length ? s.abilities : base?.abilities,
				name_attack1: s?.name_attack1 ?? base?.name_attack1,
				name_attack2: s?.name_attack2 ?? base?.name_attack2,
				name_lore: s?.name_lore ?? base?.name_lore,
				incub_time: s?.incub_time ?? s?.incubation ?? s?.incubation_time ?? s?.incubationTime ?? s?.incubation_hours ?? s?.hatch_time ?? base?.incub_time ?? base?.incubation ?? base?.incubation_time ?? base?.incubationTime ?? base?.incubation_hours ?? base?.hatch_time,
				chance: s?.chance ?? s?.chance_percent ?? base?.chance ?? base?.chance_percent,
				tier: s?.tier ?? base?.tier,
				skin: s?.skin ?? base?.skin ?? true,
				__source: 'skin',
				__skinIndex: index,
				__skinKey: `${key || 'skin'}::${String(s?.skin ?? '')}::${index}`
			};

			return merged;
		}

		let baseMap = new Map();

		// Кэшируем enriched данные - пересчитываем только при изменении items/skins
		let preparedMutants = [];

		let preparedSkins = [];

		// При изменении items пересоздаем preparedMutants
		// Очищаем кэш фильтрации
		// При изменении normalizedSkins пересоздаем preparedSkins
		// Очищаем кэш фильтрации
		// ===========
		// КОНТРОЛЫ UI
		// ===========
		let mode = 'mutants';

		let viewMode = 'full';
		let query = '';
		let gene1Sel = '';
		let gene2Sel = '';

		// Gene2 is blocked when Gene1 is "Все" (empty)
		let typeSel = '';

		function collectBingoKeys(it) {
			const b = it?.bingo;

			if (!b) return [];
			if (Array.isArray(b)) return b.map((x) => typeof x === 'string' ? x : x?.key ?? '').filter(Boolean);
			if (typeof b === 'object') return Object.keys(b);

			return [];
		}

		function flatten(arr) {
			const out = [];

			for (let i = 0; i < arr.length; i++) out.push(...arr[i]);

			return out;
		}

		let bingoSel = '';

		const starSelMutants = 'normal';
		let starSelSkins = 'any';

		const geneList = [
			{ key: '', label: 'Ген 1: ВСЕ', icon: '/genes/gene_all.webp' },
			{
				key: 'A',
				label: geneLabel?.('A') ?? 'A',
				icon: '/genes/gene_a.webp'
			},

			{
				key: 'B',
				label: geneLabel?.('B') ?? 'B',
				icon: '/genes/gene_b.webp'
			},

			{
				key: 'C',
				label: geneLabel?.('C') ?? 'C',
				icon: '/genes/gene_c.webp'
			},

			{
				key: 'D',
				label: geneLabel?.('D') ?? 'D',
				icon: '/genes/gene_d.webp'
			},

			{
				key: 'E',
				label: geneLabel?.('E') ?? 'E',
				icon: '/genes/gene_e.webp'
			},

			{
				key: 'F',
				label: geneLabel?.('F') ?? 'F',
				icon: '/genes/gene_f.webp'
			}
		];

		const geneList2 = [
			{ key: '', label: 'Ген 2: ВСЕ', icon: '/genes/gene_all.webp' },
			{
				key: 'neutral',
				label: 'Нейтральный',
				icon: '/genes/gene_all.webp'
			},

			{
				key: 'A',
				label: geneLabel?.('A') ?? 'A',
				icon: '/genes/gene_a.webp'
			},

			{
				key: 'B',
				label: geneLabel?.('B') ?? 'B',
				icon: '/genes/gene_b.webp'
			},

			{
				key: 'C',
				label: geneLabel?.('C') ?? 'C',
				icon: '/genes/gene_c.webp'
			},

			{
				key: 'D',
				label: geneLabel?.('D') ?? 'D',
				icon: '/genes/gene_d.webp'
			},

			{
				key: 'E',
				label: geneLabel?.('E') ?? 'E',
				icon: '/genes/gene_e.webp'
			},

			{
				key: 'F',
				label: geneLabel?.('F') ?? 'F',
				icon: '/genes/gene_f.webp'
			}
		];

		const geneButtonClass = (selected, disabled = false) => 'p-1 rounded-lg ring-1 ' + (disabled
			? 'bg-slate-900 ring-white/5 opacity-30 cursor-not-allowed'
			: selected
				? 'bg-cyan-700 ring-cyan-400'
				: 'bg-slate-800 ring-white/10');

		const geneChipClass = (selected, disabled = false) => 'h-9 px-3 rounded-lg ring-1 flex items-center justify-center ' + (disabled
			? 'bg-slate-900 ring-white/5 opacity-30 cursor-not-allowed'
			: selected
				? 'bg-cyan-700 ring-cyan-400 text-white'
				: 'bg-slate-800 ring-white/10 text-slate-200');

		// =================
		// ПОМОЩНИКИ ФИЛЬТРОВ
		// =================
		const normalizeGene = (s) => (s ?? '').toUpperCase();

		const starOf = (it) => String(it?.star ?? 'normal').toLowerCase();

		function readGeneCode(it) {
			if (Array.isArray(it?.genes)) {
				return it.genes.filter(Boolean).map((g) => String(g).toUpperCase()).join('');
			}

			if (typeof it?.gene === 'string') return it.gene;
			if (typeof it?.gene_code === 'string') return it.gene_code;

			return '';
		}

		const geneOrder = new Map([['A', 0], ['B', 1], ['C', 2], ['D', 3], ['E', 4], ['F', 5]]);

		function enrichItem(it) {
			const searchName = normalizeForSearch(String(it?.name ?? ''));
			const rawCode = readGeneCode(it);
			const code = normalizeGene(rawCode);
			const first = code?.[0] ?? '';
			const rank = first ? geneOrder.get(first) ?? 99 : 199;

			// Secondary gene weight (for sorting)
			const secondaryWeight = code.length <= 1 ? 0 : (geneOrder.get(code[1]) ?? 99) + 1;

			// Регистронезависимый тип
			const typeKey = String(it?.type ?? '').toLowerCase();

			const starKey = starOf(it);
			const bingoKeys = new Set(collectBingoKeys(it).map(String));

			return {
				...it,
				_meta: {
					searchName,
					code,
					rank,
					secondaryWeight,
					typeKey,
					starKey,
					bingoKeys,
					id: String(it?.id ?? '')
				}
			};
		}

		function uniq(arr) {
			return Array.from(new Set(arr));
		}

		// Генерирует ключ кэша на основе параметров фильтрации
		function getCacheKey(q, gene, type, bingo, star) {
			return `${q}|${gene}|${type}|${bingo}|${star}`;
		}

		// МЕГА-БЫСТРАЯ ФИЛЬТРАЦИЯ С КЭШИРОВАНИЕМ
		// Если есть поисковый запрос, игнорируем фильтры звезд/атрибутов
		// Объединяем map + filter в один проход для оптимизации
		// Фильтр поиска
		// Если ищем по имени, пропускаем остальные фильтры
		// Фильтр генов: Gene1 = first gene strictly, Gene2 = second gene strictly
		// Single-gene only: exactly one gene
		// Поиск по типу (с учетом синонимов для Реактора)
		// Фильтр бинго и звезд
		// Определяем принудительный скин
		// --- МАГИЯ ПОДМЕНЫ ВЕРСИЙ ДЛЯ БИНГО ---
		// Если выбрано звездное Бинго, подменяем мутанта на его звездную версию из starMap
		// Sort using pre-computed ranks from _meta
		// МЕГА-БЫСТРАЯ ФИЛЬТРАЦИЯ СКИНОВ С КЭШИРОВАНИЕМ
		// Strict gene filter: Gene1 = first gene, Gene2 = second gene
		// Single-gene only: exactly one gene
		// Sort using pre-computed ranks from _meta
		let currentPage = 1;

		function pickTexture(it, headsMode = false) {
			const bid = baseId(it.id);

			// Если есть принудительный скин
			if (it?.forceSkin) {
				const skinTag = String(it.forceSkin).toLowerCase();

				// Ищем в глобальном списке скинов (skins.json)
				if (skins && skins.length > 0) {
					const skinEntry = skins.find((s) => {
						const sId = baseId(s.id);
						const sSkin = String(s.skin ?? '').toLowerCase();

						return sId === bid && (sSkin.includes(skinTag) || skinTag.includes(sSkin));
					});

					if (skinEntry && skinEntry.image) {
						const skinImages = Array.isArray(skinEntry.image) ? skinEntry.image : [skinEntry.image];
						const fullChar = skinImages.find((p) => String(p).includes('full-char'));

						if (fullChar) return fullChar;

						const semiFull = skinImages.find((p) => String(p).includes('semi-full'));

						if (semiFull) return semiFull;

						return skinImages[0];
					}
				}
			}

			// Unified mutants: use stars object
			if (it?.stars) {
				const displayStar = it._displayStar || starSelMutants;
				const starKeys = Object.keys(it.stars);
				const starData = it.stars[displayStar] || it.stars[starKeys[0]];

				if (starData?.images?.length) {
					const imgs = starData.images;

					if (headsMode) {
						const specimen = imgs.find((p) => p.includes('specimen'));

						if (specimen) return specimen;
					}

					const pick = imgs.find((p) => p.includes('textures_by_mutant/') && !p.includes('specimen') && !p.includes('larva')) || imgs[0];

					return pick;
				}
			}

			// Fallback for skins (old image field)
			const list = Array.isArray(it?.image) ? it.image : it?.image ? [it.image] : [];

			const star = String(it?.star ?? 'normal').toLowerCase();

			let pick = list.find((p) => {
				const path = p.toLowerCase();

				if (star === 'normal') return path.includes('normal') || !path.includes('bronze') && !path.includes('silver') && !path.includes('gold') && !path.includes('platinum') && !path.includes('plat');
				if (star === 'platinum') return path.includes('platinum') || path.includes('plat');

				return path.includes(star);
			});

			if (!pick) {
				pick = list.find((p) => p.includes('textures_by_mutant/') && !p.includes('specimen') && !p.includes('larva')) || list[0];
			}

			return pick ?? 'placeholder-mutant.webp';
		}

		baseMap = buildBaseMap(items ?? []);

		{
			// При изменении items пересоздаем preparedMutants
			preparedMutants = (items || []).map(enrichItem);

			_cache.clear(); // Очищаем кэш фильтрации
		}

		normalizedSkins = (Array.isArray(skins) ? skins : []).map((skin, index) => mapSkin(skin, baseMap, index));

		{
			// При изменении normalizedSkins пересоздаем preparedSkins
			preparedSkins = (normalizedSkins || []).map(enrichItem);

			_cache.clear(); // Очищаем кэш фильтрации
		}

		// ===========
		// КОНТРОЛЫ UI
		// ===========
		// Gene2 is blocked when Gene1 is "Все" (empty)
		gene2Sel = '';

		typeOptions = uniq(items.map((it) => it?.type).filter(Boolean)).sort((a, b) => String(TYPE_RU?.[a] ?? a).localeCompare(String(TYPE_RU?.[b] ?? b), 'ru'));

		bingoOptions = (bingoIndex?.length
			? [...bingoIndex]
			: uniq(flatten(items.map(collectBingoKeys)))).sort((a, b) => String(bingoLabel?.(a) ?? a).localeCompare(String(bingoLabel?.(b) ?? b), 'ru'));

		// =================
		// ПОМОЩНИКИ ФИЛЬТРОВ
		// =================
		// Secondary gene weight (for sorting)
		// Регистронезависимый тип
		// Генерирует ключ кэша на основе параметров фильтрации
		// МЕГА-БЫСТРАЯ ФИЛЬТРАЦИЯ С КЭШИРОВАНИЕМ
		filteredMutants = memo(getCacheKey(query, `${gene1Sel},${gene2Sel}`, typeSel, bingoSel, starSelMutants), () => {
			return (() => {

				// Объединяем map + filter в один проход для оптимизации
				const res = [];

				for (const it of preparedMutants) {
					it._meta;

					res.push(it);
				}

				// Sort using pre-computed ranks from _meta
				return res.sort((a, b) => {
					const rankA = a._meta?.rank ?? 199;
					const rankB = b._meta?.rank ?? 199;

					if (rankA !== rankB) return rankA - rankB;

					const weight2A = a._meta?.secondaryWeight ?? 0;
					const weight2B = b._meta?.secondaryWeight ?? 0;

					if (weight2A !== weight2B) return weight2A - weight2B;

					return (a._meta?.id || '').localeCompare(b._meta?.id || '');
				});
			})();
		});

		// МЕГА-БЫСТРАЯ ФИЛЬТРАЦИЯ СКИНОВ С КЭШИРОВАНИЕМ
		filteredSkins = memo(getCacheKey(query, `${gene1Sel},${gene2Sel}`, typeSel, '', starSelSkins), () => {
			return (() => {
				const res = [];

				for (const it of preparedSkins) {
					it._meta;

					res.push(it);
				}

				// Sort using pre-computed ranks from _meta
				return res.sort((a, b) => {
					const rankA = a._meta?.rank ?? 199;
					const rankB = b._meta?.rank ?? 199;

					if (rankA !== rankB) return rankA - rankB;

					const weight2A = a._meta?.secondaryWeight ?? 0;
					const weight2B = b._meta?.secondaryWeight ?? 0;

					if (weight2A !== weight2B) return weight2A - weight2B;

					return (a._meta?.id || '').localeCompare(b._meta?.id || '');
				});
			})();
		});

		pageSize = 20;

		{
			currentPage = 1;
		}

		endIndex = pageSize * currentPage;
		shownMutants = filteredMutants.slice(0, endIndex);
		filteredSkins.slice(0, endIndex);

		$$renderer.push(`<div class="mx-auto max-w-[1400px] px-4 py-6 page-2k svelte-1s78gb4">`);

		if (// Если есть принудительный скин
		// Ищем в глобальном списке скинов (skins.json)
		// Unified mutants: use stars object
		// Fallback for skins (old image field)
		title) {
			$$renderer.push('<!--[-->');
			$$renderer.push(`<h1 class="text-2xl md:text-3xl font-bold text-slate-100 mb-4">${escape_html(title)}</h1>`);
		} else {
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--> <div class="mb-4 flex flex-wrap gap-2 items-center"><button type="button"${attr_class(
			'px-3 rounded-lg ring-1 h-8 text-[11px] uppercase tracking-wider ' + ('bg-cyan-700 ring-cyan-400 text-white'
				),
			'svelte-1s78gb4'
		)}${attr('aria-pressed', mode === 'mutants')}>MUTANTS</button> <button type="button"${attr_class(
			'px-3 rounded-lg ring-1 h-8 text-[11px] uppercase tracking-wider ' + ('bg-slate-800 ring-white/10 text-slate-200'),
			'svelte-1s78gb4'
		)}${attr('aria-pressed', mode === 'skins')}>SKINS</button> <span class="w-px h-6 bg-white/10 mx-1"></span> <button type="button"${attr_class(
			'px-3 rounded-lg ring-1 h-8 text-[11px] uppercase tracking-wider ' + ('bg-cyan-700 ring-cyan-400 text-white'
				),
			'svelte-1s78gb4'
		)}${attr('aria-pressed', viewMode === 'full')} title="Полные карточки">FULL</button> <button type="button"${attr_class(
			'px-3 rounded-lg ring-1 h-8 text-[11px] uppercase tracking-wider ' + ('bg-slate-800 ring-white/10 text-slate-200'),
			'svelte-1s78gb4'
		)}${attr('aria-pressed', viewMode === 'heads')} title="Режим голов">HEADS</button></div> <div class="mb-3"><input class="w-full px-4 py-3 rounded-lg ring-1 transition outline-none bg-slate-900 text-slate-100 placeholder-slate-400 ring-white/10 focus:ring-2 focus:ring-cyan-400" placeholder="Введите имя мутанта…"${attr('value', query)}/></div> <div class="mb-2 rounded-xl bg-slate-900/60 ring-1 ring-white/10 p-2 shadow-sm md:shadow"><div class="flex flex-col gap-2"><div class="flex flex-wrap gap-2"><!--[-->`);

		const each_array = ensure_array_like(geneList);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let g = each_array[$$index];

			if (g.key === '') {
				$$renderer.push('<!--[-->');
				$$renderer.push(`<button type="button"${attr_class(clsx(geneChipClass(gene1Sel === g.key)), 'svelte-1s78gb4')}${attr('title', g.label)}${attr('aria-pressed', gene1Sel === g.key)}><span class="text-xs">${escape_html(g.label)}</span></button>`);
			} else {
				$$renderer.push('<!--[!-->');
				$$renderer.push(`<button type="button"${attr_class(clsx(geneButtonClass(gene1Sel === g.key)), 'svelte-1s78gb4')}${attr('title', g.label)}${attr('aria-pressed', gene1Sel === g.key)}><img${attr('src', g.icon)}${attr('alt', g.label)} class="h-8 w-8 object-contain"/></button>`);
			}

			$$renderer.push(`<!--]-->`);
		}

		$$renderer.push(`<!--]--></div> <div class="flex flex-wrap gap-2"><!--[-->`);

		const each_array_1 = ensure_array_like(geneList2);

		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let g = each_array_1[$$index_1];

			if (g.key === '') {
				$$renderer.push('<!--[-->');
				$$renderer.push(`<button type="button"${attr_class(clsx(geneChipClass(gene2Sel === g.key && gene1Sel, !gene1Sel)), 'svelte-1s78gb4')}${attr('title', g.label)}${attr('aria-pressed', gene2Sel === g.key)}${attr('disabled', !gene1Sel, true)}><span class="text-xs">${escape_html(g.label)}</span></button>`);
			} else {
				$$renderer.push('<!--[!-->');

				if (g.key === 'neutral') {
					$$renderer.push('<!--[-->');
					$$renderer.push(`<button type="button"${attr_class(clsx(geneButtonClass(gene2Sel === g.key, !gene1Sel)), 'svelte-1s78gb4')}${attr('title', g.label)}${attr('aria-pressed', gene2Sel === g.key)}${attr('disabled', !gene1Sel, true)}><img${attr('src', g.icon)}${attr('alt', g.label)} class="h-8 w-8 object-contain"/></button>`);
				} else {
					$$renderer.push('<!--[!-->');
					$$renderer.push(`<button type="button"${attr_class(clsx(geneButtonClass(gene2Sel === g.key, !gene1Sel)), 'svelte-1s78gb4')}${attr('title', g.label)}${attr('aria-pressed', gene2Sel === g.key)}${attr('disabled', !gene1Sel, true)}><img${attr('src', g.icon)}${attr('alt', g.label)} class="h-8 w-8 object-contain"/></button>`);
				}

				$$renderer.push(`<!--]-->`);
			}

			$$renderer.push(`<!--]-->`);
		}

		$$renderer.push(`<!--]--></div></div></div> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--> <div class="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl"><label class="flex flex-col gap-1"><span class="text-xs text-slate-300">Тип</span> `);

		$$renderer.select(
			{
				class: 'px-3 py-2 rounded-lg ring-1 ' + ('bg-slate-900 text-slate-100 ring-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400'
					),
				value: typeSel,
				disabled: mode !== 'mutants'
			},
			($$renderer) => {
				$$renderer.option({ value: '' }, ($$renderer) => {
					$$renderer.push(`Любой`);
				});

				$$renderer.push(`<!--[-->`);

				const each_array_3 = ensure_array_like(typeOptions);

				for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
					let t = each_array_3[$$index_3];

					$$renderer.option({ value: t }, ($$renderer) => {
						$$renderer.push(`${escape_html(TYPE_RU?.[t] ?? t)}`);
					});
				}

				$$renderer.push(`<!--]-->`);
			},
			'svelte-1s78gb4'
		);

		$$renderer.push(`</label> <label class="flex flex-col gap-1"><span class="text-xs text-slate-300">Бинго</span> `);

		$$renderer.select(
			{
				class: 'px-3 py-2 rounded-lg ring-1 ' + ('bg-slate-900 text-slate-100 ring-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400'
					),
				value: bingoSel,
				disabled: mode !== 'mutants'
			},
			($$renderer) => {
				$$renderer.option({ value: '' }, ($$renderer) => {
					$$renderer.push(`Любое`);
				});

				$$renderer.push(`<!--[-->`);

				const each_array_4 = ensure_array_like(bingoOptions);

				for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
					let b = each_array_4[$$index_4];

					$$renderer.option({ value: b }, ($$renderer) => {
						$$renderer.push(`${escape_html(bingoLabel?.(b) ?? b)}`);
					});
				}

				$$renderer.push(`<!--]-->`);
			},
			'svelte-1s78gb4'
		);

		$$renderer.push(`</label></div> <div${attr_class(clsx('grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 [content-visibility:auto]'))} style="contain-intrinsic-size: 1200px;">`);

		{
			$$renderer.push('<!--[-->');
			$$renderer.push(`<!--[-->`);

			const each_array_5 = ensure_array_like(shownMutants);

			for (let i = 0, $$length = each_array_5.length; i < $$length; i++) {
				let it = each_array_5[i];

				$$renderer.push(`<div role="button" tabindex="0" class="cursor-pointer">`);

				{
					$$renderer.push('<!--[!-->');
					$$renderer.push(`<div class="relative rounded-xl overflow-hidden bg-slate-800 ring-1 ring-white/10" style="content-visibility:auto; contain-intrinsic-size: 260px 340px;"><img class="w-full object-contain bg-slate-900" style="height: 195px;"${attr('src', '/' + pickTexture(it))}${attr('alt', it.name)} loading="lazy" decoding="async" width="512" height="512"/> <div class="px-3 pt-2 pb-3"><div class="text-slate-100 font-semibold text-sm truncate">${escape_html(it.name)}</div></div></div>`);
				}

				$$renderer.push(`<!--]--></div>`);
			}

			$$renderer.push(`<!--]-->`);
		}

		$$renderer.push(`<!--]--></div> `);

		{
			$$renderer.push('<!--[-->');

			if (shownMutants.length < filteredMutants.length) {
				$$renderer.push('<!--[-->');
				$$renderer.push(`<div class="mt-3 flex justify-center"><button class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 ring-1 ring-white/10 text-white">Показать ещё</button></div>`);
			} else {
				$$renderer.push('<!--[!-->');
			}

			$$renderer.push(`<!--]-->`);
		}

		$$renderer.push(`<!--]--> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></div>`);
		bind_props($$props, { items, skins, bingos, title, bingoIndex, star });
	});
}

export { MutantsBrowser as M };
