import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_7drcn5tv.mjs';
import { f as fallback, b as attr, e as ensure_array_like, d as attr_class, s as stringify, c as escape_html, h as bind_props } from '../chunks/_@astro-renderers_DtO3kaqa.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_DtO3kaqa.mjs';
import { n as normalizeSearch } from '../chunks/search-normalize_BSnfnBuB.mjs';
/* empty css                                   */
import { m as mutantsRaw } from '../chunks/mutants_CTe2pNBk.mjs';

function EvoLeaderboard($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let filteredPlayers, visiblePlayers;
		let players = fallback($$props['players'], () => [], true);
		let mutantsDb = fallback($$props['mutantsDb'], () => [], true);
		let query = '';
		let displayCount = 50;

		function getRankIcon(rank) {
			if (rank === 1) return '🥇';
			if (rank === 2) return '🥈';
			if (rank === 3) return '🥉';

			return `#${rank}`;
		}

		function getRankClass(rank) {
			if (rank === 1) return 'rank-gold';
			if (rank === 2) return 'rank-silver';
			if (rank === 3) return 'rank-bronze';

			return 'rank-normal';
		}

		filteredPlayers = players.filter((p) => {
			const normalizedQuery = normalizeSearch(query);
			const normalizedName = normalizeSearch(p.name);

			return normalizedName.includes(normalizedQuery);
		});

		visiblePlayers = filteredPlayers.slice(0, displayCount);

		$$renderer.push(`<div class="cta-banner svelte-yjakpd"><a href="https://t.me/absolutely_poxuy" target="_blank" rel="noopener noreferrer" class="svelte-yjakpd"><span class="cta-icon">🚀</span> <span class="cta-text">Хочешь попасть в ТОП? <span class="cta-link svelte-yjakpd">Напиши сюда (ТЫК)</span></span></a></div> <div class="leaderboard-container svelte-yjakpd"><div class="search-bar svelte-yjakpd"><div class="search-icon svelte-yjakpd">🔍</div> <input type="text" placeholder="Найти игрока..."${attr(
			'value',
			// --- ПОИСК КАРТИНКИ И СКОРОСТИ ---
			// Проверка на пустую строку или null/undefined
			// Ищем в базе только ради картинки и скорости
			// Пробуем несколько вариантов поиска
			// Извлекаем картинку из stars.*.images - пробуем все редкости
			// Ищем картинку со specimen или portrait
			// Fallback: проверяем старые поля
			// Достаем скорость из базы
			// Округляем скорость
			query
		)} class="svelte-yjakpd"/></div> <div class="list svelte-yjakpd"><div class="list-header mobile-hidden svelte-yjakpd"><span class="col-rank">Ранг</span> <span class="col-name">Игрок</span> <span class="col-tandem">Тандем</span> <span class="col-lvl svelte-yjakpd">Уровень Эво</span></div> <!--[-->`);

		const each_array = ensure_array_like(visiblePlayers);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let player = each_array[$$index];

			$$renderer.push(`<div${attr_class(`row ${stringify(getRankClass(player.rank))}`, 'svelte-yjakpd')} role="button" tabindex="0"><div class="cell rank svelte-yjakpd">`);

			if (player.rank <= 3) {
				$$renderer.push('<!--[-->');
				$$renderer.push(`<div class="rank-badge svelte-yjakpd">${escape_html(getRankIcon(player.rank))}</div>`);
			} else {
				$$renderer.push('<!--[!-->');
				$$renderer.push(`<span class="svelte-yjakpd">${escape_html(getRankIcon(player.rank))}</span>`);
			}

			$$renderer.push(`<!--]--></div> <div class="cell name svelte-yjakpd">${escape_html(player.name)}</div> <div class="cell tandem mobile-hidden svelte-yjakpd">${escape_html(player.tandem || '—')}</div> <div class="cell level svelte-yjakpd"><span class="lvl-label mobile-only svelte-yjakpd">Evo:</span> <span class="lvl-value svelte-yjakpd">${escape_html(player.level)}</span></div></div>`);
		}

		$$renderer.push(`<!--]--> `);

		if (filteredPlayers.length === 0) {
			$$renderer.push('<!--[-->');
			$$renderer.push(`<div class="empty-state svelte-yjakpd">Игроки не найдены...</div>`);
		} else {
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></div> `);

		if (visiblePlayers.length < filteredPlayers.length) {
			$$renderer.push('<!--[-->');
			$$renderer.push(`<button class="load-more svelte-yjakpd">Показать еще</button>`);
		} else {
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></div> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]-->`);
		bind_props($$props, { players, mutantsDb });
	});
}

const SHEET_ID = "10hJePm-VDoM-fywzgHx8bPMcGfMoOJKQ2aFy99t0NKs";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
let cachedData = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1e3;
function parseCSV(text) {
  const rows = [];
  const lines = text.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ""));
    rows.push(values);
  }
  return rows;
}
async function loadEvoTop() {
  const now = Date.now();
  if (cachedData && now - cacheTime < CACHE_DURATION) {
    return cachedData;
  }
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) {
      if (cachedData) return cachedData;
      return [];
    }
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const players = rows.slice(1).map((row, index) => {
      const name = row[2];
      const level = row[3];
      const tandem = row[5];
      const formatNum = (val) => {
        if (!val) return "???";
        if (!isNaN(Number(val))) return Number(val).toLocaleString("ru-RU");
        return String(val).trim();
      };
      const atk1 = formatNum(row[6]);
      const atk2 = formatNum(row[7]);
      const socialRaw1 = String(row[8] || "").trim();
      const socialRaw2 = String(row[9] || "").trim();
      const socials = [];
      const addSocial = (raw) => {
        if (!raw || ["undefined", "-", "нет", "net", "—", "0"].includes(raw.toLowerCase())) return;
        let type = "link";
        let label = "Ссылка";
        let url = raw;
        if (raw.includes("http")) {
          url = raw.substring(raw.indexOf("http"));
        } else {
          url = raw.replace(/^[\wа-яА-ЯёЁ]+\s*[-–—:]\s*/i, "").trim();
        }
        const lower = url.toLowerCase();
        if (lower.includes("vk.com") || lower.includes("vk.cc")) {
          type = "vk";
          label = "VKontakte";
        } else if (lower.includes("facebook") || lower.includes("fb.com")) {
          type = "fb";
          label = "Facebook";
        } else if (lower.includes("t.me") || lower.includes("tg") || raw.toLowerCase().includes("тг")) {
          type = "tg";
          label = "Telegram";
          if (!url.includes("http") && !url.includes("t.me")) {
            let nick = url.replace("@", "").trim().split(" ")[0];
            url = `https://t.me/${nick}`;
          }
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) url = `https://${url}`;
        socials.push({ type, url, label });
      };
      addSocial(socialRaw1);
      addSocial(socialRaw2);
      const cleanName = String(name || "").trim();
      const cleanLvl = Number(String(level).replace(/[^0-9]/g, ""));
      const cleanTandem = String(tandem || "").trim();
      return {
        rank: 0,
        name: cleanName,
        level: cleanLvl || 0,
        tandem: cleanTandem === "undefined" ? "" : cleanTandem,
        atk1,
        atk2,
        socials,
        id: `p-${index}`
      };
    }).filter((p) => p.name && p.level > 0 && p.name !== "Имя/Ник").sort((a, b) => b.level - a.level);
    const result = players.map((p, i) => ({ ...p, rank: i + 1 }));
    cachedData = result;
    cacheTime = Date.now();
    return result;
  } catch (e) {
    if (cachedData) return cachedData;
    return [];
  }
}

const prerender = false;
const $$TopEvo = createComponent(async ($$result, $$props, $$slots) => {
  const players = await loadEvoTop();
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u0422\u043E\u043F \u043F\u043E \u042D\u0432\u043E | Archivist-Library", "fullWidth": true, "viewport": "width=device-width, initial-scale=1", "data-astro-cid-frq4m24r": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="top-page" data-astro-cid-frq4m24r> <div class="header-section" data-astro-cid-frq4m24r> <a class="back-link" href="/" data-astro-cid-frq4m24r>← На главную</a> <h1 data-astro-cid-frq4m24r>Топ по эво</h1> <p data-astro-cid-frq4m24r>Игроки с самым высоким эво.</p> </div> <!-- Передаем игроков И базу мутантов --> ${renderComponent($$result2, "EvoLeaderboard", EvoLeaderboard, { "client:load": true, "players": players, "mutantsDb": mutantsRaw, "client:component-hydration": "load", "client:component-path": "/home/godbtw/site-workspace/mutants_site/src/components/EvoLeaderboard.svelte", "client:component-export": "default", "data-astro-cid-frq4m24r": true })} </div> ` })} `;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/top-evo.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/top-evo.astro";
const $$url = "/top-evo";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$TopEvo,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
