import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_7drcn5tv.mjs';
/* empty css                               */
export { r as renderers } from '../chunks/_@astro-renderers_DtO3kaqa.mjs';

const $$404 = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u041E\u0448\u0438\u0431\u043A\u0430 404 | Bio-Lab", "data-astro-cid-zetdm5md": true }, { "default": ($$result2) => renderTemplate`  ${maybeRenderHead()}<div class="relative flex flex-col items-center justify-center min-h-[80vh] w-full overflow-hidden text-center py-20" data-astro-cid-zetdm5md> <!-- ФОНОВЫЕ ЭФФЕКТЫ --> <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 40px 40px;" data-astro-cid-zetdm5md></div> <!-- Пятно света сзади --> <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" data-astro-cid-zetdm5md></div> <!-- ОСНОВНОЙ КОНТЕНТ --> <div class="relative z-10 flex flex-col items-center" data-astro-cid-zetdm5md> <!-- 404 GLITCH --> <div class="relative mb-6" data-astro-cid-zetdm5md> <!-- Основной слой --> <h1 class="text-[100px] md:text-[180px] leading-[0.8] font-black text-slate-800 select-none glitch-text" data-text="404" data-astro-cid-zetdm5md>
404
</h1> <!-- Слой поверх для эффекта свечения --> <div class="absolute inset-0 flex items-center justify-center pointer-events-none" data-astro-cid-zetdm5md> <span class="text-[100px] md:text-[180px] leading-[0.8] font-black text-white/5 blur-sm" data-astro-cid-zetdm5md>404</span> </div> </div> <!-- ТЕКСТ ОШИБКИ --> <div class="flex flex-col items-center gap-4 max-w-lg px-4" data-astro-cid-zetdm5md> <div class="px-4 py-1 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-xs md:text-sm font-mono font-bold tracking-[0.2em] animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]" data-astro-cid-zetdm5md>
CRITICAL ERROR
</div> <h2 class="text-3xl md:text-5xl font-black text-white uppercase tracking-wide drop-shadow-lg" data-astro-cid-zetdm5md>
Объект не найден
</h2> <p class="text-slate-400 text-sm md:text-base font-medium leading-relaxed" data-astro-cid-zetdm5md>
Запрашиваемая последовательность ДНК повреждена<br class="hidden md:block" data-astro-cid-zetdm5md> или была удалена из базы данных MGG.
</p> <!-- КНОПКА --> <a href="/" class="group relative mt-8 px-10 py-4 bg-slate-900 border border-slate-700 hover:border-lime-500 text-slate-300 hover:text-black font-black uppercase tracking-widest text-xs rounded transition-all duration-300 overflow-hidden" data-astro-cid-zetdm5md> <span class="relative z-10 flex items-center gap-3 group-hover:text-lime-400" data-astro-cid-zetdm5md> <span data-astro-cid-zetdm5md>⬅</span> ВЕРНУТЬСЯ В БИБЛИОТЕКУ
</span> </a> </div> </div> <!-- ТЕХНИЧЕСКИЙ ТЕКСТ (ВНИЗУ) --> <div class="absolute bottom-0 left-0 w-full p-6 flex justify-between items-end text-[10px] font-mono text-slate-700 pointer-events-none opacity-60" data-astro-cid-zetdm5md> <div class="text-left" data-astro-cid-zetdm5md>
SYS_ERR_CODE: 0x404<br data-astro-cid-zetdm5md>
TERMINAL: MGG_LAB_01
</div> <div class="hidden md:block text-right" data-astro-cid-zetdm5md>
MEMORY_DUMP: FAILURE<br data-astro-cid-zetdm5md>
REBOOT_REQUIRED
</div> </div> <!-- ДЕКОР УГЛОВ --> <div class="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-white/5 rounded-tl-3xl pointer-events-none" data-astro-cid-zetdm5md></div> <div class="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-white/5 rounded-br-3xl pointer-events-none" data-astro-cid-zetdm5md></div> </div> ` })} `;
}, "/home/godbtw/site-workspace/mutants_site/src/pages/404.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/404.astro";
const $$url = "/404";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$404,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
