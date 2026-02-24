import { e as createAstro, f as createComponent, m as maybeRenderHead, r as renderTemplate } from './astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import 'clsx';
/* empty css                          */

const $$Astro = createAstro("https://archivist-library.com");
const $$DataTable = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$DataTable;
  const { columns = [], rows = [], title } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<section class="data-table-wrapper" data-astro-cid-jcqriyoz> ${title && renderTemplate`<h2 class="table-title" data-astro-cid-jcqriyoz>${title}</h2>`} ${rows && rows.length > 0 ? renderTemplate`<table class="data-table" data-astro-cid-jcqriyoz> <thead data-astro-cid-jcqriyoz> <tr data-astro-cid-jcqriyoz> ${columns.map((col) => renderTemplate`<th data-astro-cid-jcqriyoz>${col.label}</th>`)} </tr> </thead> <tbody data-astro-cid-jcqriyoz> ${rows.map((row) => renderTemplate`<tr data-astro-cid-jcqriyoz> ${columns.map((col) => renderTemplate`<td data-astro-cid-jcqriyoz>${row[col.key]}</td>`)} </tr>`)} </tbody> </table>` : renderTemplate`<p data-astro-cid-jcqriyoz>Нет данных для отображения.</p>`} </section> `;
}, "C:/Users/Aberration/Downloads/mgg_fun_site/src/components/DataTable.astro", void 0);

export { $$DataTable as $ };
