import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_7drcn5tv.mjs';
import { $ as $$DataTable } from '../../chunks/DataTable_BD3oYzIh.mjs';
import { c as charmsData } from '../../chunks/charms_CfAtwPUt.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$Charms = createComponent(($$result, $$props, $$slots) => {
  const charmsColumns = charmsData && charmsData.length > 0 ? Object.keys(charmsData[0]).map((key) => ({ key, label: key })) : [];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u0427\u0430\u0440\u044B (Charms)" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1>Чары</h1> <p>Бустеры, увеличивающие статы и возможности мутантов.</p> ${renderComponent($$result2, "DataTable", $$DataTable, { "columns": charmsColumns, "rows": charmsData, "title": "\u0421\u043F\u0438\u0441\u043E\u043A \u0447\u0430\u0440\u043E\u0432" })} ` })}`;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/materials/charms.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/materials/charms.astro";
const $$url = "/materials/charms";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Charms,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
