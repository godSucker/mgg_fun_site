import { f as createComponent, k as renderComponent, n as renderScript, r as renderTemplate, m as maybeRenderHead, h as addAttribute } from '../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Cdeq5Zjw.mjs';
import { s as sourcesMap, m as materialData, $ as $$MaterialsTable } from '../chunks/sources_BT6idcfy.mjs';
import { c as charmsData } from '../chunks/charms_CfAtwPUt.mjs';
import { o as orbsDataRaw } from '../chunks/orbs_Bs2vuxVS.mjs';
import { b as bingos } from '../chunks/bingos_CgDRSJf2.mjs';
import { b as bingoLabel } from '../chunks/mutant-dicts_cSjOMjg4.mjs';
import { g as getItemTexture } from '../chunks/craft-simulator_DNsOKbCx.mjs';
/* empty css                                 */
export { r as renderers } from '../chunks/_@astro-renderers_DtO3kaqa.mjs';

const buildingsData = [
	{
		id: "Building_Forge",
		name: "Кузня",
		description: "Приносит 5 золота раз в 12 часов",
		texture: "/buildings/gold_hc1.webp"
	},
	{
		id: "Building_Gold_Smelter",
		name: "Плавильня",
		description: "Приносит 50 золота раз в 2 суток",
		texture: "/buildings/gold_hc2.webp"
	},
	{
		id: "Building_Med_Lab",
		name: "Мед. Лаборатория",
		description: "Здание для крафта аптечек",
		texture: "/buildings/medlab.webp"
	},
	{
		id: "Building_Evo_Center",
		name: "Эво. Центр",
		description: "Здания для повышения уровня ЭВО",
		texture: "/buildings/evo.webp"
	},
	{
		id: "Building_Exchange",
		name: "Обменник",
		description: "Здание в котором можно обменивать жетоны джекпота",
		texture: "/buildings/jackpot.webp"
	},
	{
		id: "Building_Incubator",
		name: "Инкубатор",
		description: "Здание в котором выводятся мутанты",
		texture: "/buildings/incub.webp"
	},
	{
		id: "Building_Trial_Hall",
		name: "Зал Испытаний",
		description: "Здание в котором можно обменивать жетоны испытаний",
		texture: "/buildings/event.webp"
	},
	{
		id: "Building_Breeding_Center",
		name: "Центр Скрещивания",
		description: "Здание в котором можно скрещивать мутантов",
		texture: "/buildings/merge.webp"
	}
];

const normal = [{"file":"habitat_a_1.webp","name":"Зона Киборг · вместимость 2","description":"Ген: Робот • Вместимость: 2"},{"file":"habitat_b_1.webp","name":"Зона Зомби · вместимость 2","description":"Ген: Зомби • Вместимость: 2"},{"file":"habitat_c_1.webp","name":"Зона Рубака · вместимость 2","description":"Ген: Рубака • Вместимость: 2"},{"file":"habitat_d_1.webp","name":"Зона Зверь · вместимость 2","description":"Ген: Зверь • Вместимость: 2"},{"file":"habitat_e_1.webp","name":"Зона Галактик · вместимость 2","description":"Ген: Галактик • Вместимость: 2"},{"file":"habitat_f_1.webp","name":"Зона Мифик · вместимость 2","description":"Ген: Мифик • Вместимость: 2"},{"file":"habitat_a_2.webp","name":"Зона Киборг · вместимость 3","description":"Ген: Робот • Вместимость: 3"},{"file":"habitat_b_2.webp","name":"Зона Зомби · вместимость 3","description":"Ген: Зомби • Вместимость: 3"},{"file":"habitat_c_2.webp","name":"Зона Рубака · вместимость 3","description":"Ген: Рубака • Вместимость: 3"},{"file":"habitat_d_2.webp","name":"Зона Зверь · вместимость 3","description":"Ген: Зверь • Вместимость: 3"},{"file":"habitat_e_2.webp","name":"Зона Галактик · вместимость 3","description":"Ген: Галактик • Вместимость: 3"},{"file":"habitat_f_2.webp","name":"Зона Мифик · вместимость 3","description":"Ген: Мифик • Вместимость: 3"},{"file":"habitat_a_3.webp","name":"Зона Киборг · вместимость 4","description":"Ген: Робот • Вместимость: 4"},{"file":"habitat_b_3.webp","name":"Зона Зомби · вместимость 4","description":"Ген: Зомби • Вместимость: 4"},{"file":"habitat_c_3.webp","name":"Зона Рубака · вместимость 4","description":"Ген: Рубака • Вместимость: 4"},{"file":"habitat_d_3.webp","name":"Зона Зверь · вместимость 4","description":"Ген: Зверь • Вместимость: 4"},{"file":"habitat_e_3.webp","name":"Зона Галактик · вместимость 4","description":"Ген: Галактик • Вместимость: 4"},{"file":"habitat_f_3.webp","name":"Зона Мифик · вместимость 4","description":"Ген: Мифик • Вместимость: 4"}];
const luxe = [{"file":"habitat_a_2_hc.webp","name":"Люкс · Киборг · вместимость 3","description":"Люкс-зона. Ген: Робот • Вместимость: 3"},{"file":"habitat_b_2_hc.webp","name":"Люкс · Зомби · вместимость 3","description":"Люкс-зона. Ген: Зомби • Вместимость: 3"},{"file":"habitat_c_2_hc.webp","name":"Люкс · Рубака · вместимость 3","description":"Люкс-зона. Ген: Рубака • Вместимость: 3"},{"file":"habitat_d_2_hc.webp","name":"Люкс · Зверь · вместимость 3","description":"Люкс-зона. Ген: Зверь • Вместимость: 3"},{"file":"habitat_e_2_hc.webp","name":"Люкс · Галактик · вместимость 3","description":"Люкс-зона. Ген: Галактик • Вместимость: 3"},{"file":"habitat_f_2_hc.webp","name":"Люкс · Мифик · вместимость 3","description":"Люкс-зона. Ген: Мифик • Вместимость: 3"},{"file":"habitat_a_3_hc.webp","name":"Люкс · Киборг · вместимость 4","description":"Люкс-зона. Ген: Робот • Вместимость: 4"},{"file":"habitat_b_3_hc.webp","name":"Люкс · Зомби · вместимость 4","description":"Люкс-зона. Ген: Зомби • Вместимость: 4"},{"file":"habitat_c_3_hc.webp","name":"Люкс · Рубака · вместимость 4","description":"Люкс-зона. Ген: Рубака • Вместимость: 4"},{"file":"habitat_d_3_hc.webp","name":"Люкс · Зверь · вместимость 4","description":"Люкс-зона. Ген: Зверь • Вместимость: 4"},{"file":"habitat_e_3_hc.webp","name":"Люкс · Галактик · вместимость 4","description":"Люкс-зона. Ген: Галактик • Вместимость: 4"},{"file":"habitat_f_3_hc.webp","name":"Люкс · Мифик · вместимость 4","description":"Люкс-зона. Ген: Мифик • Вместимость: 4"},{"file":"habitat_abcdef_2_hc.webp","name":"Люкс · Универсальная зона · вместимость 3","description":"Любые гены • Вместимость: 3"},{"file":"habitat_abcdef_3_hc.webp","name":"Люкс · Универсальная зона · вместимость 4","description":"Любые гены • Вместимость: 4"}];
const zonesData = {
  normal,
  luxe,
};

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const normRow = (item) => {
    const id = String(item?.id || "").trim();
    const name = item?.name || id;
    const description = item?.description || "";
    const percent = item?.percent ?? item?.pct ?? null;
    const value = item?.value ?? null;
    const rarity = item?.rarity ?? null;
    let texture = getItemTexture?.(id);
    const lname = String(name).trim().toLowerCase();
    if (!texture) {
      if (lname === "\u0431\u0430\u043D\u043E\u0447\u043A\u0430 \u043E\u043F\u044B\u0442\u0430") texture = "/materials/normal_xp.webp";
      if (lname === "\u0431\u0430\u043D\u043A\u0430 \u0441\u043F\u0438\u0440\u0442\u0430") texture = "/materials/bigbig_med.webp";
    }
    if (!texture) texture = `/materials/${id}.webp`;
    return { id, name, description, percent, value, rarity, texture };
  };
  function formatBingoTitle(title, id) {
    const labelById = bingoLabel(id);
    if (labelById && labelById !== id) return labelById;
    const labelByTitle = bingoLabel(title);
    if (labelByTitle && labelByTitle !== title) return labelByTitle;
    return title.replace(/^--------/, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
  }
  const REWARD_TO_BUILDING = {
    "Building_HC_1": "Building_Forge",
    "Building_HC_2": "Building_Gold_Smelter"
  };
  const buildingSources = {};
  (bingos || []).forEach((bingo) => {
    if (!bingo.rewards) return;
    bingo.rewards.forEach((reward) => {
      const targetId = REWARD_TO_BUILDING[reward.name];
      if (targetId) {
        if (!buildingSources[targetId]) buildingSources[targetId] = [];
        const title = formatBingoTitle(bingo.title, bingo.id);
        if (!buildingSources[targetId].some((s) => s.link === `/bingo?id=${bingo.id}`)) {
          buildingSources[targetId].push({
            type: "bingo",
            where: title,
            link: `/bingo?id=${bingo.id}`
          });
        }
      }
    });
  });
  Object.keys(buildingSources).forEach((id) => {
    const existing = (sourcesMap[id] || []).filter((s) => s.type !== "bingo");
    sourcesMap[id] = [...existing, ...buildingSources[id]];
  });
  const orbsData = (Array.isArray(orbsDataRaw) ? orbsDataRaw : []).filter((o) => {
    const id = String(o?.id || "").toLowerCase();
    return id && !id.includes("ephemeral");
  });
  const materialsRows = (Array.isArray(materialData) ? materialData : []).map(normRow);
  const charmsRows = (Array.isArray(charmsData) ? charmsData : []).map(normRow);
  const orbsRows = (Array.isArray(orbsData) ? orbsData : []).map(normRow);
  const buildingsRows = (Array.isArray(buildingsData) ? buildingsData : []).map((b) => ({
    id: String(b?.id || "").trim(),
    name: b?.name || (b?.id || ""),
    description: b?.description || "",
    texture: b?.texture || `/buildings/${b?.id}.webp`
  }));
  const geneMap = { a: "\u041A\u0438\u0431\u043E\u0440\u0433", b: "\u041D\u0435\u0436\u0438\u0442\u044C", c: "\u0420\u0443\u0431\u0430\u043A\u0430", d: "\u0417\u043E\u043E\u043C\u043E\u0440\u0444", e: "\u0413\u0430\u043B\u0430\u043A\u0442\u0438\u043A", f: "\u041C\u0438\u0444\u0438\u043A", abcdef: "\u041B\u044E\u0431\u044B\u0435 \u0433\u0435\u043D\u044B" };
  const capMap = { 1: 2, 2: 3, 3: 4 };
  function parseStem(stem) {
    const lux = /_hc$/i.test(stem);
    const m = /^habitat_([a-f]+|abcdef)_(\d)(?:_hc)?$/i.exec(stem);
    if (!m) return { geneKey: "", level: null, isLuxe: lux };
    return {
      geneKey: String(m[1] || "").toLowerCase(),
      level: Number(m[2]),
      isLuxe: lux
    };
  }
  function metaFromStem(stem) {
    const { geneKey, level, isLuxe } = parseStem(stem);
    const cap = capMap[level] ?? "?";
    const geneName = geneMap[geneKey] ?? (geneKey ? geneKey.toUpperCase() : "\u2014");
    const title = geneKey === "abcdef" ? `\u041E\u0431\u0449\u0430\u044F \u0437\u043E\u043D\u0430 \xB7 \u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C ${cap}` : `\u0417\u043E\u043D\u0430 ${geneName} \xB7 \u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C ${cap}`;
    const desc = geneKey ? `\u0413\u0435\u043D: ${geneKey === "abcdef" ? "\u041B\u044E\u0431\u044B\u0435 \u0433\u0435\u043D\u044B" : geneName} \u2022 \u0412\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C: ${cap}` : "";
    return { title, desc, geneKey, isLuxe };
  }
  function calcStorage(geneKey, isLuxe) {
    if (isLuxe) {
      return geneKey === "abcdef" ? 4e5 : 32e4;
    }
    if (geneKey === "a" || geneKey === "b" || geneKey === "c") return 9e3;
    if (geneKey === "d") return 3e4;
    if (geneKey === "e") return 8e4;
    if (geneKey === "f") return 16e4;
    return null;
  }
  const fmt = (n) => new Intl.NumberFormat("ru-RU").format(n ?? 0);
  function normalizeZone(list, base) {
    const rows = [];
    for (const it of list || []) {
      const file = typeof it === "string" ? it : it.file;
      if (!file) continue;
      const stem = file.replace(/\.[^.]+$/, "");
      const meta = metaFromStem(stem);
      const store = calcStorage(meta.geneKey, meta.isLuxe);
      rows.push({
        id: stem,
        name: typeof it === "object" && it.name ? it.name : meta.title,
        description: typeof it === "object" && it.description ? it.description : meta.desc,
        storage: store,
        texture: `${base}/${file}`
      });
    }
    const map = new Map(rows.map((r) => [r.id, r]));
    return Array.from(map.values());
  }
  const zonesCfg = zonesData && typeof zonesData === "object" ? zonesData : { normal: [], luxe: [] };
  const zonesNormal = normalizeZone(zonesCfg.normal || [], "/zones/normal");
  const zonesLuxe = normalizeZone(zonesCfg.luxe || [], "/zones/luxe");
  const TABS = [
    { key: "orbs", label: "\u0421\u0444\u0435\u0440\u044B" },
    { key: "charms", label: "\u0411\u0443\u0441\u0442\u0435\u0440\u044B" },
    { key: "materials", label: "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B" },
    { key: "buildings", label: "\u0417\u0434\u0430\u043D\u0438\u044F" },
    { key: "zones", label: "\u0417\u043E\u043D\u044B" }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0438 \u0440\u0435\u0441\u0443\u0440\u0441\u044B", "data-astro-cid-6gatyyx6": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="intro" data-astro-cid-6gatyyx6> <h1 data-astro-cid-6gatyyx6>Материалы и ресурсы</h1> <p data-astro-cid-6gatyyx6>Тут находятся все материалы, сферы, бустеры, здания и зоны.</p> </section> <nav class="tabs" aria-label="Разделы материалов" data-astro-cid-6gatyyx6> ${TABS.map((t) => renderTemplate`<button class="tab-btn" type="button"${addAttribute(t.key, "data-tab")}${addAttribute(`section-${t.key}`, "aria-controls")} data-astro-cid-6gatyyx6>${t.label}</button>`)} </nav> <section id="section-orbs" class="tab-section" data-tab="orbs" hidden data-astro-cid-6gatyyx6> ${renderComponent($$result2, "MaterialsTable", $$MaterialsTable, { "rows": orbsRows, "sourcesMap": sourcesMap, "title": "\u0421\u0444\u0435\u0440\u044B", "data-astro-cid-6gatyyx6": true })} </section> <section id="section-charms" class="tab-section" data-tab="charms" hidden data-astro-cid-6gatyyx6> ${renderComponent($$result2, "MaterialsTable", $$MaterialsTable, { "rows": charmsRows, "sourcesMap": sourcesMap, "title": "\u0411\u0443\u0441\u0442\u0435\u0440\u044B", "data-astro-cid-6gatyyx6": true })} </section> <section id="section-materials" class="tab-section" data-tab="materials" hidden data-astro-cid-6gatyyx6> ${renderComponent($$result2, "MaterialsTable", $$MaterialsTable, { "rows": materialsRows, "sourcesMap": sourcesMap, "title": "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B", "data-astro-cid-6gatyyx6": true })} </section> <section id="section-buildings" class="tab-section" data-tab="buildings" hidden data-astro-cid-6gatyyx6> ${renderComponent($$result2, "MaterialsTable", $$MaterialsTable, { "rows": buildingsRows, "sourcesMap": sourcesMap, "title": "\u0417\u0434\u0430\u043D\u0438\u044F", "texturePrefix": "/buildings/", "textureExt": ".webp", "data-astro-cid-6gatyyx6": true })} </section> <section id="section-zones" class="tab-section" data-tab="zones" hidden data-astro-cid-6gatyyx6> <div class="zone-toggle" role="tablist" aria-label="Тип зон" data-astro-cid-6gatyyx6> <button type="button" class="zbtn active" data-kind="normal" role="tab" aria-selected="true" data-astro-cid-6gatyyx6>Обычные</button> <button type="button" class="zbtn" data-kind="luxe" role="tab" aria-selected="false" data-astro-cid-6gatyyx6>Люкс</button> </div> <div id="zones-normal" class="zones-grid" data-kind="normal" data-astro-cid-6gatyyx6> ${zonesNormal.map((z) => renderTemplate`<div class="zone-card"${addAttribute(z.name, "aria-label")}${addAttribute(z.name, "title")} data-astro-cid-6gatyyx6> <div class="zone-cover" data-astro-cid-6gatyyx6><img${addAttribute(z.texture, "src")}${addAttribute(z.name, "alt")} loading="lazy" data-astro-cid-6gatyyx6></div> <div class="zone-title" data-astro-cid-6gatyyx6>${z.name}</div> ${z.description && renderTemplate`<div class="zone-desc" data-astro-cid-6gatyyx6>${z.description}</div>`} ${z.storage != null && renderTemplate`<div class="zone-cap" data-astro-cid-6gatyyx6><span data-astro-cid-6gatyyx6>Хранит до:</span> <strong data-astro-cid-6gatyyx6>${fmt(z.storage)}</strong> серебра</div>`} </div>`)} ${zonesNormal.length === 0 && renderTemplate`<div class="zone-empty" data-astro-cid-6gatyyx6>В <code data-astro-cid-6gatyyx6>zones.json</code> пока нет обычных зон.</div>`} </div> <div id="zones-luxe" class="zones-grid" data-kind="luxe" hidden data-astro-cid-6gatyyx6> ${zonesLuxe.map((z) => renderTemplate`<div class="zone-card"${addAttribute(z.name, "aria-label")}${addAttribute(z.name, "title")} data-astro-cid-6gatyyx6> <div class="zone-cover" data-astro-cid-6gatyyx6><img${addAttribute(z.texture, "src")}${addAttribute(z.name, "alt")} loading="lazy" data-astro-cid-6gatyyx6></div> <div class="zone-title" data-astro-cid-6gatyyx6>${z.name}</div> ${z.description && renderTemplate`<div class="zone-desc" data-astro-cid-6gatyyx6>${z.description}</div>`} ${z.storage != null && renderTemplate`<div class="zone-cap" data-astro-cid-6gatyyx6><span data-astro-cid-6gatyyx6>Хранит до:</span> <strong data-astro-cid-6gatyyx6>${fmt(z.storage)}</strong> серебра</div>`} </div>`)} ${zonesLuxe.length === 0 && renderTemplate`<div class="zone-empty" data-astro-cid-6gatyyx6>В <code data-astro-cid-6gatyyx6>zones.json</code> пока нет люкс‑зон.</div>`} </div> </section> ` })} ${renderScript($$result, "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/materials/index.astro?astro&type=script&index=0&lang.ts")} `;
}, "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/materials/index.astro", void 0);

const $$file = "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/materials/index.astro";
const $$url = "/materials";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
