import { e as createAstro, f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_7drcn5tv.mjs';
import { M as MutantsBrowser } from '../../chunks/MutantsBrowser_DTQXy4yo.mjs';
import { m as mutantsRaw } from '../../chunks/mutants_CTe2pNBk.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$Astro = createAstro("https://archivist-library.com");
function getStaticPaths() {
  const tiers = ["all", "normal", "bronze", "silver", "gold", "platinum"];
  return tiers.map((tier) => ({ params: { tier } }));
}
const $$tier = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$tier;
  const { tier } = Astro2.params;
  let rows = [];
  let pageTitle = "";
  if (tier === "all") {
    rows = mutantsRaw;
    pageTitle = "\u0412\u0441\u0435 \u043C\u0443\u0442\u0430\u043D\u0442\u044B";
  } else {
    rows = mutantsRaw.filter((m) => m.stars && m.stars[tier]);
    pageTitle = { normal: "\u041E\u0431\u044B\u0447\u043D\u044B\u0435 \u043C\u0443\u0442\u0430\u043D\u0442\u044B", bronze: "\u0411\u0440\u043E\u043D\u0437\u0430", silver: "\u0421\u0435\u0440\u0435\u0431\u0440\u043E", gold: "\u0417\u043E\u043B\u043E\u0442\u043E", platinum: "\u041F\u043B\u0430\u0442\u0438\u043D\u0430" }[tier];
    if (!pageTitle) throw new Error(`\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u043F\u0443\u0442\u044C: /mutants/${tier}`);
  }
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": pageTitle }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section style="display:grid;gap:12px"> <h1>${pageTitle}</h1> ${renderComponent($$result2, "MutantsBrowser", MutantsBrowser, { "client:load": true, "rows": rows, "initialTier": tier, "client:component-hydration": "load", "client:component-path": "@/components/MutantsBrowser.svelte", "client:component-export": "default" })} </section> ` })}`;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/mutants/[tier].astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/mutants/[tier].astro";
const $$url = "/mutants/[tier]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$tier,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
