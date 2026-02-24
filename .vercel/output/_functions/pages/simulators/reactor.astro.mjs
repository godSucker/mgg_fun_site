import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead, h as addAttribute } from '../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_Cdeq5Zjw.mjs';
import { l as listGachas } from '../../chunks/reactor-gacha_CK6DjgoK.mjs';
/* empty css                                    */
export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const gachas = listGachas();
  const PRIORITY_GACHAS = ["\u0428\u0430\u0445\u043C\u0430\u0442\u044B", "\u041A\u0440\u043E\u0432\u0430\u0432\u044B\u0435 \u0438\u0433\u0440\u044B", "\u0411\u043E\u0433\u0438 \u0410\u0440\u0435\u043D\u044B", "\u0424\u043E\u0442\u043E\u0441\u0438\u043D\u0442\u0435\u0437"];
  const sortedGachas = [...gachas].sort((a, b) => {
    const nameA = a.name || "";
    const nameB = b.name || "";
    const indexA = PRIORITY_GACHAS.indexOf(nameA);
    const indexB = PRIORITY_GACHAS.indexOf(nameB);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0;
  });
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u0420\u0435\u0430\u043A\u0442\u043E\u0440 \u2014 \u0432\u044B\u0431\u043E\u0440 \u0433\u0435\u043D\u0435\u0440\u0430\u0442\u043E\u0440\u0430", "data-astro-cid-sesbdgsq": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="intro" data-astro-cid-sesbdgsq> <h1 data-astro-cid-sesbdgsq>Реактор: выберите генератор</h1> <p data-astro-cid-sesbdgsq>Клик по обложке — мгновенно в симулятор.</p> </section> <section class="gacha-list" aria-label="Генераторы реактора" data-astro-cid-sesbdgsq> <div class="list-grid" data-astro-cid-sesbdgsq> ${sortedGachas.map((gacha) => renderTemplate`<a class="gacha-card"${addAttribute(`/simulators/reactor/${gacha.id}`, "href")}${addAttribute(gacha.name, "aria-label")} data-astro-cid-sesbdgsq> ${gacha.cover ? renderTemplate`<div class="card-cover" data-astro-cid-sesbdgsq> <img class="cover"${addAttribute(gacha.cover, "src")} alt="" loading="lazy" data-astro-cid-sesbdgsq> </div>` : renderTemplate`<div class="card-cover no-cover" aria-hidden="true" data-astro-cid-sesbdgsq></div>`} </a>`)} </div> </section> ` })} `;
}, "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/simulators/reactor/index.astro", void 0);

const $$file = "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/simulators/reactor/index.astro";
const $$url = "/simulators/reactor";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
