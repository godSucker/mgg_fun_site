import { e as createAstro, f as createComponent, m as maybeRenderHead, h as addAttribute, r as renderTemplate, k as renderComponent } from './astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import 'clsx';
/* empty css                         */

const $$Astro$1 = createAstro("https://archivist-library.com");
const $$Card = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Card;
  const { title, desc, href, icon } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<a${addAttribute(href, "href")} class="card" data-astro-cid-dohjnao5> ${icon ? renderTemplate`<div class="card-icon" data-astro-cid-dohjnao5> <img${addAttribute(icon, "src")} alt="" data-astro-cid-dohjnao5> </div>` : null} <h3 class="card-title" data-astro-cid-dohjnao5>${title}</h3> <p class="card-desc" data-astro-cid-dohjnao5>${desc}</p> </a> `;
}, "C:/Users/Aberration/Downloads/mgg_fun_site/src/components/Card.astro", void 0);

const $$Astro = createAstro("https://archivist-library.com");
const $$CardGrid = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$CardGrid;
  const { cards, heading } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<section class="card-grid-section" data-astro-cid-zwuirr5b> ${heading && renderTemplate`<h2 class="grid-heading" data-astro-cid-zwuirr5b>${heading}</h2>`} <div class="card-grid" data-astro-cid-zwuirr5b> ${cards.map((card) => renderTemplate`${renderComponent($$result, "Card", $$Card, { ...card, "data-astro-cid-zwuirr5b": true })}`)} </div> </section> `;
}, "C:/Users/Aberration/Downloads/mgg_fun_site/src/components/CardGrid.astro", void 0);

export { $$CardGrid as $ };
