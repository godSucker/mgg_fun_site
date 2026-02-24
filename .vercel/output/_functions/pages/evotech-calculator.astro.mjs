import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_7drcn5tv.mjs';
import { E as EvotechCalculator } from '../chunks/EvotechCalculator_B0NRbGK_.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$EvotechCalculator = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u041A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0442\u043E\u0440 \u0443\u0440\u043E\u0432\u043D\u044F \u044D\u0432\u043E| Mutants Fan Site" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="text-3xl font-bold mb-4">Калькулятор эво</h1> ${renderComponent($$result2, "EvotechCalculator", EvotechCalculator, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/godbtw/site-workspace/mutants_site/src/components/EvotechCalculator.svelte", "client:component-export": "default" })} ` })}`;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/evotech-calculator.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/evotech-calculator.astro";
const $$url = "/evotech-calculator";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$EvotechCalculator,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
