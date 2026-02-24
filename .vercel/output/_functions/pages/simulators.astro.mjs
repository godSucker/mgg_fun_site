import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_7drcn5tv.mjs';
import { $ as $$CardGrid } from '../chunks/CardGrid_Cq3Onxlw.mjs';
/* empty css                                 */
export { r as renderers } from '../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u0421\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u044B", "data-astro-cid-iwihbyqo": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 data-astro-cid-iwihbyqo>Симуляторы</h1> <p data-astro-cid-iwihbyqo>Выберите симулятор, чтобы протестировать его работу. Каждый симулятор
  рассчитывает награды и шансы в реальном времени.</p> <div class="sim-grid-wrapper" data-astro-cid-iwihbyqo> ${renderComponent($$result2, "CardGrid", $$CardGrid, { "cards": [
    {
      title: "\u0421\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440 \u0441\u043A\u0440\u0435\u0449\u0438\u0432\u0430\u043D\u0438\u044F",
      desc: "\u0422\u0432\u043E\u0439 \u0433\u0438\u0434 \u043F\u043E \u0441\u043A\u0440\u0435\u0449\u0438\u0432\u0430\u043D\u0438\u044E",
      href: "simulators/breeding",
      icon: "/sims/larva.webp"
    },
    {
      title: "\u0421\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440 \u0440\u0435\u0430\u043A\u0442\u043E\u0440\u0430",
      desc: "\u0412\u0441\u0435 \u0433\u0435\u043D\u0435\u0440\u0430\u0442\u043E\u0440\u044B \u0438 \u0448\u0430\u043D\u0441\u044B \u0432\u044B\u043F\u0430\u0434\u0435\u043D\u0438\u044F \u043C\u0443\u0442\u0430\u043D\u0442\u043E\u0432",
      href: "simulators/reactor",
      icon: "/sims/reactor.webp"
    },
    {
      title: "\u0421\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440 \u0440\u0443\u043B\u0435\u0442\u043E\u043A",
      desc: "\u0420\u0443\u043B\u0435\u0442\u043A\u0438 \u0441 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u043C\u0438 \u0448\u0430\u043D\u0441\u0430\u043C\u0438",
      href: "simulators/roulette",
      icon: "/sims/roulette.webp"
    },
    {
      title: "\u0421\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440 \u043A\u0440\u0430\u0444\u0442\u0430",
      desc: "\u041C\u0435\u0442\u0430\u043B\u043B\u0437\u0430\u0432\u043E\u0434, \u0422\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0430\u0442\u0440\u043E\u043D, \u041B\u0430\u0431\u043E\u0440\u0430\u0442\u043E\u0440\u0438\u044F & \u0427\u0435\u0440\u043D\u0430\u044F \u0414\u044B\u0440\u0430",
      href: "simulators/craft",
      icon: "/sims/black_hole.webp"
    }
  ], "data-astro-cid-iwihbyqo": true })} </div>  ` })}`;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/simulators/index.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/simulators/index.astro";
const $$url = "/simulators";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
