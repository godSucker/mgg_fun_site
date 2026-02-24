import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_7drcn5tv.mjs';
import { $ as $$DataTable } from '../../chunks/DataTable_BD3oYzIh.mjs';
import { o as orbsDataRaw } from '../../chunks/orbs_Bs2vuxVS.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$Orbs = createComponent(($$result, $$props, $$slots) => {
  const orbsColumns = orbsDataRaw && orbsDataRaw.length > 0 ? Object.keys(orbsDataRaw[0]).map((key) => ({ key, label: key })) : [];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u0421\u0444\u0435\u0440\u044B (Orbs)" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1>Сферы</h1> <p>Сферы дают уникальные бонусы при установке на мутантов.</p> ${renderComponent($$result2, "DataTable", $$DataTable, { "columns": orbsColumns, "rows": orbsDataRaw, "title": "\u0421\u043F\u0438\u0441\u043E\u043A \u0441\u0444\u0435\u0440" })} ` })}`;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/materials/orbs.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/materials/orbs.astro";
const $$url = "/materials/orbs";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Orbs,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
