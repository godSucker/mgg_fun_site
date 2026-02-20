import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Cdeq5Zjw.mjs';
import { $ as $$CardGrid } from '../chunks/CardGrid_C4vxRXkY.mjs';
/* empty css                                 */
export { r as renderers } from '../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Archivist-Library \u2014 \u0431\u0430\u0437\u0430 \u0437\u043D\u0430\u043D\u0438\u0439 \u043F\u043E \u0438\u0433\u0440\u0435 \u0438 \u0441\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u044B \u0441 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u043C\u0438 \u0448\u0430\u043D\u0441\u0430\u043C\u0438", "data-astro-cid-j7pv25f6": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="hero" data-astro-cid-j7pv25f6> <h1 data-astro-cid-j7pv25f6>Archivist-Library</h1> <p class="tagline" data-astro-cid-j7pv25f6>Все в одном месте.</p> <div class="hero-buttons" data-astro-cid-j7pv25f6> <a href="/mutants" class="btn" data-astro-cid-j7pv25f6>Перейти к мутантам</a> <a href="/simulators" class="btn btn-secondary" data-astro-cid-j7pv25f6>Симуляторы</a> </div> </section> ${renderComponent($$result2, "CardGrid", $$CardGrid, { "heading": "\u0420\u0430\u0437\u0434\u0435\u043B\u044B \u0441\u0430\u0439\u0442\u0430", "cards": [
    {
      title: "\u041C\u0443\u0442\u0430\u043D\u0442\u044B",
      desc: "\u0421\u043F\u0438\u0441\u043E\u043A \u043C\u0443\u0442\u0430\u043D\u0442\u043E\u0432 \u0438 \u0441\u043A\u0438\u043D\u043E\u0432",
      href: "/mutants"
    },
    {
      title: "\u041A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0442\u043E\u0440 \u0441\u0442\u0430\u0442\u043E\u0432 \u043C\u0443\u0442\u0430\u043D\u0442\u0430",
      desc: "\u0422\u043E\u0447\u043D\u044B\u0439 \u0440\u0430\u0441\u0441\u0447\u0435\u0442 \u0441\u0442\u0430\u0442\u043E\u0432 \u0432\u0430\u0448\u0438\u0445 \u043C\u0443\u0442\u0430\u043D\u0442\u043E\u0432",
      href: "/simulators/stats"
    },
    {
      title: "\u041A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0442\u043E\u0440 \u044D\u0432\u043E",
      desc: "\u0422\u043E\u0447\u043D\u044B\u0439 \u0440\u0430\u0441\u0441\u0447\u0435\u0442 \u0440\u0435\u0441\u0443\u0440\u0441\u043E\u0432 \u0434\u043B\u044F \u043F\u043E\u0434\u043D\u044F\u0442\u0438\u044F \u0443\u0440\u043E\u0432\u043D\u044F \u044D\u0432\u043E",
      href: "/evolution/evotech-calculator"
    },
    {
      title: "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B",
      desc: "\u0420\u0430\u0441\u0445\u043E\u0434\u043D\u0438\u043A\u0438, \u0436\u0435\u0442\u043E\u043D\u044B, \u0431\u0443\u0441\u0442\u0435\u0440\u044B, \u0441\u0444\u0435\u0440\u044B, \u0437\u0434\u0430\u043D\u0438\u044F \u0438 \u0437\u043E\u043D\u044B",
      href: "/materials"
    },
    {
      title: "\u0421\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u044B",
      desc: "\u0421\u0438\u043C\u0443\u043B\u044F\u0446\u0438\u044F \u0440\u0443\u043B\u0435\u0442\u043E\u043A, \u043A\u0440\u0430\u0444\u0442\u0430 \u0438 \u0440\u0435\u0430\u043A\u0442\u043E\u0440\u0430",
      href: "/simulators"
    },
    {
      title: "\u0411\u0438\u043D\u0433\u043E",
      desc: "\u0421\u043F\u0438\u0441\u043E\u043A \u0432\u0441\u0435\u0445 \u0431\u0438\u043D\u0433\u043E \u0432 \u0438\u0433\u0440\u0435",
      href: "/bingo"
    },
    {
      title: "\u041D\u0430\u0448\u0430 \u0433\u0440\u0443\u043F\u043F\u0430 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C\u043C!",
      desc: "\u041F\u0440\u0438\u044F\u0442\u043D\u043E\u0435 \u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0438 \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u044B\u0435 \u0430\u043D\u043E\u043D\u0441\u044B",
      href: "https://t.me/+lFZ3uhbPDGYxM2My"
    }
  ], "data-astro-cid-j7pv25f6": true })} ` })} `;
}, "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/index.astro", void 0);

const $$file = "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
