import { f as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_7drcn5tv.mjs';
import { M as MutantsBrowser } from '../../chunks/MutantsBrowser_CQD8f4XU.mjs';
import { m as mutantsRaw } from '../../chunks/mutants_CTe2pNBk.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$Normal = createComponent(($$result, $$props, $$slots) => {
  const data = mutantsRaw.filter((m) => m.stars?.normal);
  const title = "\u041E\u0431\u044B\u0447\u043D\u044B\u0435 \u043C\u0443\u0442\u0430\u043D\u0442\u044B";
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": title }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "MutantsBrowser", MutantsBrowser, { "client:load": true, "items": data, "star": "normal", "title": title, "client:component-hydration": "load", "client:component-path": "@/components/MutantsBrowser.svelte", "client:component-export": "default" })} ` })}`;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/mutants/normal.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/mutants/normal.astro";
const $$url = "/mutants/normal";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Normal,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
