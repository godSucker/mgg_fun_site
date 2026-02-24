import { r as renderers } from './chunks/_@astro-renderers_DtO3kaqa.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_DPvMWxQO.mjs';
import { manifest } from './manifest_EABbs2hF.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/404.astro.mjs');
const _page2 = () => import('./pages/api/telegram-webhook.astro.mjs');
const _page3 = () => import('./pages/bingo.astro.mjs');
const _page4 = () => import('./pages/credits.astro.mjs');
const _page5 = () => import('./pages/evolution/evotech-calculator.astro.mjs');
const _page6 = () => import('./pages/evotech-calculator.astro.mjs');
const _page7 = () => import('./pages/materials/charms.astro.mjs');
const _page8 = () => import('./pages/materials/material.astro.mjs');
const _page9 = () => import('./pages/materials/orbs.astro.mjs');
const _page10 = () => import('./pages/materials.astro.mjs');
const _page11 = () => import('./pages/miniapp/mutants.astro.mjs');
const _page12 = () => import('./pages/mutants/bronze.astro.mjs');
const _page13 = () => import('./pages/mutants/gold.astro.mjs');
const _page14 = () => import('./pages/mutants/normal.astro.mjs');
const _page15 = () => import('./pages/mutants/platinum.astro.mjs');
const _page16 = () => import('./pages/mutants/silver.astro.mjs');
const _page17 = () => import('./pages/mutants/_tier_.astro.mjs');
const _page18 = () => import('./pages/mutants.astro.mjs');
const _page19 = () => import('./pages/simulators/breeding.astro.mjs');
const _page20 = () => import('./pages/simulators/craft.astro.mjs');
const _page21 = () => import('./pages/simulators/reactor/_gachaid_.astro.mjs');
const _page22 = () => import('./pages/simulators/reactor.astro.mjs');
const _page23 = () => import('./pages/simulators/roulette/cash.astro.mjs');
const _page24 = () => import('./pages/simulators/roulette/lucky.astro.mjs');
const _page25 = () => import('./pages/simulators/roulette/madness.astro.mjs');
const _page26 = () => import('./pages/simulators/roulette.astro.mjs');
const _page27 = () => import('./pages/simulators/stats.astro.mjs');
const _page28 = () => import('./pages/simulators.astro.mjs');
const _page29 = () => import('./pages/top-evo.astro.mjs');
const _page30 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/api/telegram-webhook.ts", _page2],
    ["src/pages/bingo.astro", _page3],
    ["src/pages/credits.astro", _page4],
    ["src/pages/evolution/evotech-calculator.astro", _page5],
    ["src/pages/evotech-calculator.astro", _page6],
    ["src/pages/materials/charms.astro", _page7],
    ["src/pages/materials/material.astro", _page8],
    ["src/pages/materials/orbs.astro", _page9],
    ["src/pages/materials/index.astro", _page10],
    ["src/pages/miniapp/mutants.html", _page11],
    ["src/pages/mutants/bronze.astro", _page12],
    ["src/pages/mutants/gold.astro", _page13],
    ["src/pages/mutants/normal.astro", _page14],
    ["src/pages/mutants/platinum.astro", _page15],
    ["src/pages/mutants/silver.astro", _page16],
    ["src/pages/mutants/[tier].astro", _page17],
    ["src/pages/mutants/index.astro", _page18],
    ["src/pages/simulators/breeding.astro", _page19],
    ["src/pages/simulators/craft.astro", _page20],
    ["src/pages/simulators/reactor/[gachaId].astro", _page21],
    ["src/pages/simulators/reactor/index.astro", _page22],
    ["src/pages/simulators/roulette/cash.astro", _page23],
    ["src/pages/simulators/roulette/lucky.astro", _page24],
    ["src/pages/simulators/roulette/madness.astro", _page25],
    ["src/pages/simulators/roulette/index.astro", _page26],
    ["src/pages/simulators/stats.astro", _page27],
    ["src/pages/simulators/index.astro", _page28],
    ["src/pages/top-evo.astro", _page29],
    ["src/pages/index.astro", _page30]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "58e68df3-7d0d-40a2-b222-6840298b4d9c",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
