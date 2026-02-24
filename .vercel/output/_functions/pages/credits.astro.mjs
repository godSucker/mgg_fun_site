import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_7drcn5tv.mjs';
import { e as ensure_array_like, a as attr_style, b as attr, c as escape_html } from '../chunks/_@astro-renderers_DtO3kaqa.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_DtO3kaqa.mjs';
/* empty css                                   */

function Developers($$renderer) {
	const teamMembers = [
		{
			name: "がらんの画眉丸",
			role: "Основатель & Главный разработчик",
			desc: "Каждый баг на сайте лежит на его совести(ее нет). По поводу найденных багов, предложений и пожеланий обращаться в телеграмм",
			color: "platinum",
			avatar: "avatars/my_avatar.jpg",
			socials: [
				{ name: "Telegram", url: "https://t.me/absolutely_poxuy" },
				{ name: "GitHub", url: "https://github.com/godSucker" }
			]
		},

		{
			name: "Евгений aka DonutSafe",
			role: "Спонсор и хранитель проекта",
			desc: "Настоящий архивариус информации и генератор идей, помогал на каждой стадии разработки, так же занимается донатом в игры(MGG, Genshin etc)",
			color: "blue",
			avatar: "avatars/jenya_avatar.jpg",
			socials: [
				{ name: "Telegram", url: "https://t.me/Donut_Safe" },
				{ name: "ВК", url: "https://vk.com/id187030288" }
			]
		},

		{
			name: "imashio",
			role: "Разработчик базовых версий симуляторов",
			desc: "Помогал в разработке каждого симулятора на этом сайте и невероятный трудяга",
			color: "gold",
			avatar: "avatars/blind_avatar.jpg",
			socials: [{ name: "Telegram", url: "https://t.me/blindpain" }]
		},

		{
			name: "ミーギー",
			role: "Контрибьютор",
			desc: "Невероятный мотиватор и просто хороший человек",
			color: "purple",
			avatar: "avatars/mege_avatar.jpg",
			socials: [{ name: "Telegram", url: "https://t.me/meeggee" }]
		},

		{
			name: "Ctrl+C Ctrl + V Master",
			role: "Контрибьютор",
			desc: "Оттарабанил клавиатуру во все щелочки между клавишами, чтобы работа сайта началась как можно скорее",
			color: "green",
			avatar: "avatars/german_avatar.jpg",
			socials: []
		},

		{
			name: "Егор",
			role: "Один из ведущих бета-тестеров",
			desc: "Человек который досконально проверял сайт и просто хороший помощник ",
			color: "red",
			avatar: "avatars/egor_avatar.jpg",
			socials: [{ name: "Telegram", url: "https://t.me/+79014144308" }]
		}
	];

	// Цвета для рангов (как в игре)
	const colors = {
		gold: "linear-gradient(135deg, #fbbf24, #d97706)",
		platinum: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
		purple: "linear-gradient(135deg, #c084fc, #7c3aed)",
		blue: "linear-gradient(135deg, #38bdf8, #2563eb)",
		green: "linear-gradient(135deg, #4ade80, #059669)",
		red: "linear-gradient(135deg, #f87171, #dc2626)"
	};

	const glowColors = {
		gold: "rgba(251, 191, 36, 0.5)",
		platinum: "rgba(226, 232, 240, 0.5)",
		purple: "rgba(167, 139, 250, 0.5)",
		blue: "rgba(56, 189, 248, 0.5)",
		green: "rgba(74, 222, 128, 0.5)",
		red: "rgba(248, 113, 113, 0.5)"
	};

	$$renderer.push(`<div class="dev-container svelte-1wega3d"><header class="hero svelte-1wega3d"><span class="badge svelte-1wega3d">Команда проекта</span> <h1 class="svelte-1wega3d">Архивариусы</h1> <p class="svelte-1wega3d">Люди, благодаря которым существует библиотека архивариуса.</p></header> <div class="grid svelte-1wega3d"><!--[-->`);

	const each_array = ensure_array_like(teamMembers);

	for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
		let member = each_array[$$index_1];

		$$renderer.push(`<div class="card svelte-1wega3d"${attr_style('', {
			'--border-gradient': colors[member.color] || colors.blue,
			'--glow-color': glowColors[member.color] || glowColors.blue
		})}><div class="card-content svelte-1wega3d"><div class="avatar-wrapper svelte-1wega3d">`);

		if (member.avatar) {
			$$renderer.push('<!--[-->');
			$$renderer.push(`<img${attr('src', member.avatar)}${attr('alt', member.name)} class="avatar svelte-1wega3d"/>`);
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push(`<div class="avatar-placeholder svelte-1wega3d">${escape_html(member.name[0])}</div>`);
		}

		$$renderer.push(`<!--]--> <div class="rank-badge svelte-1wega3d"${attr_style('', { background: colors[member.color] || colors.blue })}></div></div> <div class="info"><div class="role svelte-1wega3d">${escape_html(member.role)}</div> <h3 class="name svelte-1wega3d">${escape_html(member.name)}</h3> `);

		if (member.desc) {
			$$renderer.push('<!--[-->');
			$$renderer.push(`<p class="desc svelte-1wega3d">${escape_html(member.desc)}</p>`);
		} else {
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></div> `);

		if (member.socials.length > 0) {
			$$renderer.push('<!--[-->');
			$$renderer.push(`<div class="socials svelte-1wega3d"><!--[-->`);

			const each_array_1 = ensure_array_like(member.socials);

			for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
				let link = each_array_1[$$index];

				$$renderer.push(`<a${attr('href', link.url)} target="_blank" rel="noopener noreferrer" class="social-link svelte-1wega3d">${escape_html(link.name)} ↗</a>`);
			}

			$$renderer.push(`<!--]--></div>`);
		} else {
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></div></div>`);
	}

	$$renderer.push(`<!--]--></div></div>`);
}

const $$Credits = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u0421\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u0438 | Archivist-Library", "fullWidth": true, "viewport": "width=device-width, initial-scale=1", "data-astro-cid-cak72j2b": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="credits-page" data-astro-cid-cak72j2b> <!-- Кнопка назад --> <a class="back-link" href="/" data-astro-cid-cak72j2b> <span class="arrow" data-astro-cid-cak72j2b>←</span> На главную
</a> ${renderComponent($$result2, "Developers", Developers, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/godbtw/site-workspace/mutants_site/src/components/Developers.svelte", "client:component-export": "default", "data-astro-cid-cak72j2b": true })} </div> ` })} `;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/credits.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/credits.astro";
const $$url = "/credits";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Credits,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
