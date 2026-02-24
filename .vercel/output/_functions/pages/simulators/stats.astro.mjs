import { f as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_7drcn5tv.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$Stats = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u041A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0442\u043E\u0440 \u0441\u0442\u0430\u0442\u043E\u0432" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "StatsCalculator", null, { "client:only": "svelte", "client:component-hydration": "only", "client:component-path": "@/components/StatsCalculator.svelte", "client:component-export": "default" })} ` })}`;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/simulators/stats.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/simulators/stats.astro";
const $$url = "/simulators/stats";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Stats,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
