import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead, h as addAttribute } from '../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_7drcn5tv.mjs';
/* empty css                                    */
export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const roulettes = [
    {
      id: "cash",
      name: "Cash Frenzy",
      description: "\u0417\u043E\u043B\u043E\u0442\u0430\u044F \u0440\u0443\u043B\u0435\u0442\u043A\u0430 \u0441 \u043A\u0440\u0443\u043F\u043D\u044B\u043C\u0438 \u043D\u0430\u0433\u0440\u0430\u0434\u0430\u043C\u0438 \u0438 \u0441\u0443\u043F\u0435\u0440\u0434\u0436\u0435\u043A\u043F\u043E\u0442\u043E\u043C.",
      href: "/simulators/roulette/cash",
      accent: "#ffca28",
      status: "available",
      tag: "\u0413\u043E\u0442\u043E\u0432\u043E",
      highlights: ["20 \u0437\u043E\u043B\u043E\u0442\u0430 \u0437\u0430 \u043F\u0440\u043E\u043A\u0440\u0443\u0442", "12 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0445 \u043F\u0440\u0438\u0437\u043E\u0432", "\u0428\u0430\u043D\u0441 \u043D\u0430 \u0441\u0443\u043F\u0435\u0440\u0434\u0436\u0435\u043A\u043F\u043E\u0442"]
    },
    {
      id: "lucky",
      name: "Lucky Slots",
      description: "\u0417\u0432\u0451\u0437\u0434\u044B, \u0436\u0435\u0442\u043E\u043D\u044B \u0434\u0436\u0435\u043A\u043F\u043E\u0442\u0430, \u0441\u0444\u0435\u0440\u044B \u0438 \u0440\u0435\u0434\u043A\u0438\u0435 \u043C\u0443\u0442\u0430\u043D\u0442\u044B \u0441 \u0448\u0430\u043D\u0441\u043E\u043C \u043D\u0430 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0435 \u043F\u0440\u043E\u043A\u0440\u0443\u0442\u044B.",
      href: "/simulators/roulette/lucky",
      accent: "#7c4dff",
      status: "available",
      tag: "\u0413\u043E\u0442\u043E\u0432\u043E",
      highlights: ["\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0435 \u043F\u0440\u043E\u043A\u0440\u0443\u0442\u044B", "\u041A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u044F \u0440\u0435\u0434\u043A\u0438\u0445 \u043C\u0443\u0442\u0430\u043D\u0442\u043E\u0432", "\u0421\u0444\u0435\u0440\u044B \u0438 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B"]
    },
    {
      id: "madness",
      name: "Mutants Madness",
      description: "\u042D\u043A\u0441\u043A\u043B\u044E\u0437\u0438\u0432\u043D\u044B\u0435 \u043C\u0443\u0442\u0430\u043D\u0442\u044B. \u0421\u0430\u043C\u0430\u044F \u0434\u043E\u0440\u043E\u0433\u0430\u044F \u0440\u0443\u043B\u0435\u0442\u043A\u0430.",
      href: "/simulators/roulette/madness",
      accent: "#f06292",
      status: "available",
      tag: "\u0413\u043E\u0442\u043E\u0432\u043E",
      highlights: ["350 \u0437\u043E\u043B\u043E\u0442\u0430 \u0438 100 \u0436\u0435\u0442\u043E\u043D\u043E\u0432 \u0434\u0436\u0435\u043A\u043F\u043E\u0442\u0430", "\u041A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u044F \u0442\u0435\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u043C\u0443\u0442\u0430\u043D\u0442\u043E\u0432", "\u0420\u0430\u0441\u0447\u0451\u0442 \u0448\u0430\u043D\u0441\u043E\u0432 \u043F\u043E \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u044F\u043C"]
    }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u0420\u0443\u043B\u0435\u0442\u043A\u0438 \u2014 \u0432\u044B\u0431\u043E\u0440 \u0441\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430", "data-astro-cid-c4cneqjl": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="intro" data-astro-cid-c4cneqjl> <span class="eyebrow" data-astro-cid-c4cneqjl>Casino Zone</span> <h1 data-astro-cid-c4cneqjl>Выберите рулетку</h1> <p data-astro-cid-c4cneqjl>
Здесь собраны все рулетки, доступные в игре. Каждый симулятор
      повторяет настоящие шансы из игры, так что вы можете заранее оценить, сколько золота или
      серебра, или жетонов джекпота потребуется для желаемого приза.
</p> </section> <section class="roulette-grid" aria-label="Список рулеток" data-astro-cid-c4cneqjl> <div class="grid" data-astro-cid-c4cneqjl> ${roulettes.map((roulette) => renderTemplate`<a${addAttribute(`roulette-card ${roulette.status === "soon" ? "disabled" : ""}`, "class")}${addAttribute(roulette.status === "available" ? roulette.href : "#", "href")}${addAttribute(roulette.status === "soon", "aria-disabled")}${addAttribute({ "--accent": roulette.accent }, "style")} data-astro-cid-c4cneqjl> <header data-astro-cid-c4cneqjl> <span class="tag" data-astro-cid-c4cneqjl>${roulette.tag}</span> <h2 data-astro-cid-c4cneqjl>${roulette.name}</h2> <p data-astro-cid-c4cneqjl>${roulette.description}</p> </header> <ul class="highlights" data-astro-cid-c4cneqjl> ${roulette.highlights.map((text) => renderTemplate`<li data-astro-cid-c4cneqjl>${text}</li>`)} </ul> <footer data-astro-cid-c4cneqjl> ${roulette.status === "available" ? renderTemplate`<span class="cta" data-astro-cid-c4cneqjl>Открыть симулятор →</span>` : renderTemplate`<span class="cta muted" data-astro-cid-c4cneqjl>Скоро на сайте</span>`} </footer> </a>`)} </div> </section> ` })} `;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/simulators/roulette/index.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/simulators/roulette/index.astro";
const $$url = "/simulators/roulette";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
