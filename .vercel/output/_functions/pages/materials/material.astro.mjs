import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_7drcn5tv.mjs';
import { $ as $$MaterialsTable, s as sourcesMap, m as materialData } from '../../chunks/sources_CnGg_g8O.mjs';
/* empty css                                       */
export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$Material = createComponent(($$result, $$props, $$slots) => {
  const rows = materialData;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B", "data-astro-cid-3nczckop": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="intro" data-astro-cid-3nczckop> <h1 data-astro-cid-3nczckop>Материалы</h1> <p data-astro-cid-3nczckop>Красивый каталог материалов с текстурами, описаниями и местами добычи. Данные берутся из <code data-astro-cid-3nczckop>src/data/materials/material.json</code>, пути к текстурам — из <code data-astro-cid-3nczckop>public</code> по ID, а источники — из <code data-astro-cid-3nczckop>src/data/materials/sources.json</code>.</p> </section> ${renderComponent($$result2, "MaterialsTable", $$MaterialsTable, { "rows": rows, "sourcesMap": sourcesMap, "title": "\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432", "texturePrefix": "/materials/", "textureExt": ".webp", "data-astro-cid-3nczckop": true })} ` })} `;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/materials/material.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/materials/material.astro";
const $$url = "/materials/material";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Material,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
