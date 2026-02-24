import { f as createComponent, r as renderTemplate, k as renderComponent, m as maybeRenderHead, h as addAttribute, l as Fragment } from '../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_7drcn5tv.mjs';
import { b as bingos } from '../chunks/bingos_CgDRSJf2.mjs';
import { t as translateItemId, g as getItemTexture, m as mutantNamesData } from '../chunks/craft-simulator_DNsOKbCx.mjs';
import { m as mutantTexturesJson, s as skinTexturesJson, g as getSkinTexture, a as getMutantTexture } from '../chunks/mutant-textures_Bhc-5wuY.mjs';
import { n as normalizeSearch } from '../chunks/search-normalize_BSnfnBuB.mjs';
import { b as bingoLabel } from '../chunks/mutant-dicts_cSjOMjg4.mjs';
/* empty css                                 */
export { r as renderers } from '../chunks/_@astro-renderers_DtO3kaqa.mjs';

new Map(Object.entries(mutantTexturesJson));
new Map(Object.entries(skinTexturesJson));
function normalizeMutantId(specimenId) {
  if (!specimenId) return { folder: "", fileId: "", baseId: "" };
  let base = String(specimenId).trim();
  base = base.replace(/^specimen[_-]/i, "");
  base = base.replace(/_(normal|bronze|silver|gold|platinum)$/i, "");
  base = base.replace(/_(plat|platinum)$/i, "");
  return {
    folder: base.toLowerCase(),
    fileId: base.toUpperCase(),
    baseId: base
  };
}
function getMutantTexturePath(specimenId, skin = "_any", variant = "normal") {
  if (!specimenId) return "";
  const rarities = ["bronze", "silver", "gold", "platinum"];
  let effectiveVariant = variant;
  let effectiveSkin = skin;
  if (skin && rarities.includes(skin.toLowerCase())) {
    effectiveVariant = skin.toLowerCase();
    effectiveSkin = "_any";
  }
  if (effectiveSkin && effectiveSkin !== "_any" && effectiveSkin.trim() !== "") {
    const skinPath = getSkinTexture(specimenId);
    if (skinPath) {
      const skinName = effectiveSkin.toLowerCase();
      if (skinPath.toLowerCase().includes(skinName)) {
        return skinPath;
      }
    }
  }
  if (effectiveVariant === "normal") {
    const mutantPath = getMutantTexture(specimenId);
    if (mutantPath) {
      return mutantPath;
    }
  }
  const { folder, fileId } = normalizeMutantId(specimenId);
  if (!folder || !fileId) return "";
  const suffix = effectiveVariant === "normal" ? "normal" : effectiveVariant;
  return `/textures_by_mutant/${folder}/${fileId}_${suffix}.webp`;
}
function getRewardTexturePath(reward) {
  if (reward.type === "entity") {
    const name = reward.name;
    if (name.startsWith("Specimen_") || name.startsWith("specimen_")) {
      const skin = reward.skin || "_any";
      const mutantTex = getMutantTexturePath(name, skin);
      if (mutantTex) return mutantTex;
      const normalizedName = normalizeSearch(name);
      if (normalizedName && normalizedName !== name.toLowerCase()) {
        const normTex = getMutantTexturePath(normalizedName, skin);
        if (normTex) return normTex;
      }
    }
    if (name.toLowerCase().includes("orb_")) {
      if (name.includes("special")) {
        return `/orbs/special/${name}.webp`;
      }
      if (name.includes("basic")) {
        return `/orbs/basic/${name}.webp`;
      }
      return `/orbs/${name}.webp`;
    }
    if (name.toLowerCase().includes("charm_") || name.toLowerCase().includes("booster_")) {
      return `/boosters/${name.toLowerCase()}.webp`;
    }
    const texture = getItemTexture(name);
    if (texture) return texture;
    if (name === "Star_Bronze") return "/stars/star_bronze.webp";
    if (name === "Star_Silver") return "/stars/star_silver.webp";
    if (name === "Star_Gold") return "/stars/star_gold.webp";
    if (name === "Star_Platinum") return "/stars/star_platinum.webp";
    if (name === "Material_Energy25") return "/materials/icon_ticket.webp";
    if (name === "Material_XP1000") return "/materials/normal_xp.webp";
    if (name === "Building_HC_1") return "/buildings/gold_hc1.webp";
    if (name === "Building_HC_2") return "/buildings/gold_hc2.webp";
    if (name.toLowerCase().includes("habitat_") && name.toLowerCase().includes("_hc")) {
      return `/zones/luxe/${name.toLowerCase()}.webp`;
    }
    if (name.includes("Token") || name.includes("token")) {
      return `/materials/${name.toLowerCase()}.webp`;
    }
    return `/materials/${name}.webp`;
  }
  if (reward.type === "hardcurrency") {
    const amount = reward.amount || 0;
    if (amount >= 5e3) return "/cash/g5000.webp";
    if (amount >= 2e3) return "/cash/g2000.webp";
    if (amount >= 1e3) return "/cash/g1000.webp";
    if (amount >= 500) return "/cash/g500.webp";
    if (amount >= 200) return "/cash/g200.webp";
    if (amount >= 100) return "/cash/g100.webp";
    if (amount >= 80) return "/cash/g80.webp";
    if (amount >= 50) return "/cash/g50.webp";
    if (amount >= 40) return "/cash/g40.webp";
    if (amount >= 30) return "/cash/g30.webp";
    if (amount >= 20) return "/cash/g20.webp";
    if (amount >= 10) return "/cash/g10.webp";
    return "/cash/hardcurrency.webp";
  }
  if (reward.type === "softcurrency") {
    const amount = reward.amount || 0;
    if (amount >= 1e10) return "/cash/s10000000000.webp";
    if (amount >= 1e9) return "/cash/s5000000000.webp";
    if (amount >= 1e8) return "/cash/s10000000000.webp";
    if (amount >= 1e7) return "/cash/s10000000.webp";
    if (amount >= 1e6) return "/cash/s1000000.webp";
    if (amount >= 1e5) return "/cash/s100000.webp";
    if (amount >= 75e3) return "/cash/s75000.webp";
    if (amount >= 5e4) return "/cash/s50000.webp";
    if (amount >= 1e4) return "/cash/s10000.webp";
    if (amount >= 1e3) return "/cash/s1000.webp";
    if (amount >= 500) return "/cash/s500.webp";
    if (amount >= 100) return "/cash/s100.webp";
    return "/cash/softcurrency.webp";
  }
  return null;
}
function getRewardLabel(reward) {
  if (reward.type === "hardcurrency") {
    return `${reward.amount?.toLocaleString("ru-RU") || 0} золота`;
  }
  if (reward.type === "softcurrency") {
    return `${reward.amount?.toLocaleString("ru-RU") || 0} серебра`;
  }
  const translated = translateItemId(reward.name);
  if (reward.amount && reward.amount > 1) {
    return `${translated} ×${reward.amount}`;
  }
  return translated;
}

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Bingo = createComponent(($$result, $$props, $$slots) => {
  const bingos$1 = bingos;
  const GENE_ICONS = {
    A: "/genes/icon_gene_a.webp",
    B: "/genes/icon_gene_b.webp",
    C: "/genes/icon_gene_c.webp",
    D: "/genes/icon_gene_d.webp",
    E: "/genes/icon_gene_e.webp",
    F: "/genes/icon_gene_f.webp"
  };
  function formatBingoTitle(title, id) {
    const labelById = bingoLabel(id);
    if (labelById && labelById !== id) return labelById;
    const labelByTitle = bingoLabel(title);
    if (labelByTitle && labelByTitle !== title) return labelByTitle;
    return title.replace(/^--------/, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
  }
  function getMutantName(specimenId) {
    const mutantNames = mutantNamesData;
    return mutantNames[specimenId] || specimenId;
  }
  function getBingoLayout(bingo) {
    const count = bingo.mutants.length;
    let cols = bingo.columns || Math.ceil(Math.sqrt(count));
    if (count === 12 && !bingo.columns) cols = 4;
    const rows = Math.ceil(count / cols);
    const hasHeaders = [
      "Starter",
      "2025_skins",
      "2025_mutants",
      "2025_events",
      "2026_events",
      "2026_skins",
      "2026_mutants",
      "anniversary_25",
      "cross_mutation",
      "research_1",
      "research_2",
      "research_3",
      "research_4",
      "research_5",
      "research_6",
      "research_7",
      "research_8",
      "research_9",
      "research_10",
      "research_11",
      "reactor",
      "legend",
      "bingo_bronze",
      "bingo_silver",
      "bingo_gold",
      "bingo_plat",
      "zodiac",
      "zodiac_silver",
      "events",
      "amazons",
      "rumble",
      "starter_plat",
      "heroic",
      "event_2019",
      "event_2020",
      "event_2021",
      "event_2022",
      "event_2024"
    ].includes(bingo.id);
    const topHeaders = Array(cols).fill("");
    const sideHeaders = Array(rows).fill("");
    if (bingo.id === "Starter") {
      topHeaders[1] = GENE_ICONS.A;
      topHeaders[2] = GENE_ICONS.B;
      topHeaders[3] = GENE_ICONS.C;
    } else if (["2025_skins", "2025_mutants", "2025_events", "2026_skins", "2026_mutants", "2026_events"].includes(bingo.id)) {
      for (let i = 0; i < cols; i++) topHeaders[i] = `/bingo/up_${i + 1}.webp`;
      for (let i = 0; i < rows; i++) sideHeaders[i] = `/bingo/up_${i + 1}.webp`;
    } else if (bingo.id === "anniversary_25") {
      for (let i = 0; i < cols && i < 4; i++) topHeaders[i] = `/bingo/up_${i + 1}.webp`;
      for (let i = 0; i < rows && i < 4; i++) sideHeaders[i] = `/bingo/up_${i + 1}.webp`;
    } else if (["zodiac", "zodiac_silver"].includes(bingo.id)) {
      for (let i = 0; i < cols; i++) topHeaders[i] = `/bingo/bingo_zodiac_up_${i + 1}.webp`;
      for (let i = 0; i < rows; i++) sideHeaders[i] = `/bingo/bingo_zodiac_${i + 1}.webp`;
    } else if (bingo.id === "events") {
      for (let i = 0; i < cols; i++) topHeaders[i] = `/bingo/events_up_${i + 1}.webp`;
      for (let i = 0; i < rows; i++) sideHeaders[i] = `/bingo/bingo_events_${i + 1}.webp`;
    } else if (bingo.id === "amazons") {
      for (let i = 0; i < cols; i++) topHeaders[i] = `/bingo/multi_up_${i + 1}.webp`;
      for (let i = 0; i < rows; i++) sideHeaders[i] = `/bingo/bingo_amazons_${i + 1}.webp`;
    } else if (bingo.id === "rumble") {
      for (let i = 0; i < cols; i++) topHeaders[i] = `/bingo/multi_up_${i + 1}.webp`;
      for (let i = 0; i < rows; i++) sideHeaders[i] = `/bingo/events_left_${i + 1}.webp`;
    } else if (bingo.id === "starter_plat") {
      topHeaders[1] = GENE_ICONS.A;
      topHeaders[2] = GENE_ICONS.B;
      topHeaders[3] = GENE_ICONS.C;
    } else if (bingo.id === "heroic") {
      for (let i = 0; i < cols; i++) topHeaders[i] = `/bingo/multi_up_${i + 1}.webp`;
      for (let i = 0; i < rows; i++) sideHeaders[i] = `/bingo/events_left_${i + 1}.webp`;
    } else if (bingo.id === "event_2019") {
      for (let i = 0; i < cols; i++) topHeaders[i] = `/bingo/events_up_${i + 1}.webp`;
      for (let i = 0; i < rows; i++) sideHeaders[i] = `/bingo/bingo_events_${i + 1}.webp`;
    } else if (bingo.id === "event_2020") {
      for (let i = 0; i < cols; i++) topHeaders[i] = `/bingo/events_up_${i + 1}.webp`;
      for (let i = 0; i < rows; i++) sideHeaders[i] = `/bingo/events_left_${i + 1}.webp`;
    } else if (["event_2021", "event_2022", "event_2024"].includes(bingo.id)) {
      for (let i = 0; i < cols; i++) topHeaders[i] = `/bingo/multi_up_${i + 1}.webp`;
      for (let i = 0; i < rows; i++) sideHeaders[i] = `/bingo/events_left_${i + 1}.webp`;
    } else if ([
      "cross_mutation",
      "research_1",
      "research_2",
      "research_3",
      "research_4",
      "research_5",
      "research_6",
      "research_7",
      "research_8",
      "research_9",
      "research_10",
      "research_11",
      "reactor",
      "legend",
      "bingo_bronze",
      "bingo_silver",
      "bingo_gold",
      "bingo_plat"
    ].includes(bingo.id)) {
      const genes = [GENE_ICONS.A, GENE_ICONS.B, GENE_ICONS.C, GENE_ICONS.D, GENE_ICONS.E, GENE_ICONS.F];
      for (let i = 0; i < cols; i++) topHeaders[i] = genes[i] || "";
      for (let i = 0; i < rows; i++) sideHeaders[i] = genes[i] || "";
    }
    const expectedWithCompletion = rows + cols + 1;
    const expectedNoCompletion = rows + cols;
    const hasCompletion = bingo.rewards.length === expectedWithCompletion;
    const hasLineRewards = hasCompletion || bingo.rewards.length === expectedNoCompletion;
    let rowRewards = [];
    let colRewards = [];
    let completionReward = null;
    let otherRewards = [];
    if (hasLineRewards) {
      rowRewards = bingo.rewards.slice(0, rows);
      colRewards = bingo.rewards.slice(rows, rows + cols);
      if (hasCompletion) {
        completionReward = bingo.rewards[bingo.rewards.length - 1];
      }
    } else {
      otherRewards = bingo.rewards;
    }
    return { rows, cols, hasLineRewards, rowRewards, colRewards, completionReward, otherRewards, hasHeaders, topHeaders, sideHeaders };
  }
  function getSubBingos(bingo) {
    if (bingo.mutants.length === 32 && bingo.rewards.length === 18) {
      return [
        {
          ...bingo,
          id: `${bingo.id}_part1`,
          title: `${bingo.title} 1`,
          mutants: bingo.mutants.slice(0, 16),
          rewards: bingo.rewards.slice(0, 9)
        },
        {
          ...bingo,
          id: `${bingo.id}_part2`,
          title: `${bingo.title} 2`,
          mutants: bingo.mutants.slice(16, 32),
          rewards: bingo.rewards.slice(9, 18)
        }
      ];
    }
    return [bingo];
  }
  return renderTemplate(_a || (_a = __template(["", ' <script>\n  document.addEventListener("DOMContentLoaded", () => {\n    const tabs = document.querySelectorAll(".bingo-tab");\n    tabs.forEach(tab => {\n      tab.addEventListener("click", (e) => {\n        const btn = e.currentTarget;\n        const idx = btn.dataset.bingoIndex;\n        document.querySelectorAll(".bingo-panel").forEach(p => p.hidden = true);\n        const panel = document.querySelector(`.bingo-panel[data-bingo-index="${idx}"]`);\n        if (panel) panel.hidden = false;\n        tabs.forEach(t => t.setAttribute("aria-selected", "false"));\n        btn.setAttribute("aria-selected", "true");\n        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });\n      });\n    });\n  });\n<\/script> '], ["", ' <script>\n  document.addEventListener("DOMContentLoaded", () => {\n    const tabs = document.querySelectorAll(".bingo-tab");\n    tabs.forEach(tab => {\n      tab.addEventListener("click", (e) => {\n        const btn = e.currentTarget;\n        const idx = btn.dataset.bingoIndex;\n        document.querySelectorAll(".bingo-panel").forEach(p => p.hidden = true);\n        const panel = document.querySelector(\\`.bingo-panel[data-bingo-index="\\${idx}"]\\`);\n        if (panel) panel.hidden = false;\n        tabs.forEach(t => t.setAttribute("aria-selected", "false"));\n        btn.setAttribute("aria-selected", "true");\n        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });\n      });\n    });\n  });\n<\/script> '])), renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "\u0411\u0438\u043D\u0433\u043E \u2014 Archivist-Library", "data-astro-cid-fszlimxo": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="intro" data-astro-cid-fszlimxo> <div class="intro-header" data-astro-cid-fszlimxo> <img src="/etc/icon_bingo.webp" alt="Бинго" class="bingo-icon" data-astro-cid-fszlimxo> <div data-astro-cid-fszlimxo> <h1 data-astro-cid-fszlimxo>Бинго</h1> <p data-astro-cid-fszlimxo>Все доступные бинго с мутантами и наградами</p> </div> </div> </section> <div class="bingo-tabs" data-astro-cid-fszlimxo> ${bingos$1.map((bingo, idx) => renderTemplate`<button class="bingo-tab" type="button"${addAttribute(idx, "data-bingo-index")}${addAttribute(bingo.id, "data-bingo-id")}${addAttribute(idx === 0, "aria-selected")} data-astro-cid-fszlimxo> <span${addAttribute(`bingo-icon-span icon-${bingo.id}`, "class")} data-astro-cid-fszlimxo></span> ${formatBingoTitle(bingo.title, bingo.id)} </button>`)} </div> <div class="bingo-content" data-astro-cid-fszlimxo> ${bingos$1.map((originalBingo, bingoIdx) => {
    const subBingos = getSubBingos(originalBingo);
    return renderTemplate`<div class="bingo-panel"${addAttribute(bingoIdx, "data-bingo-index")}${addAttribute(bingoIdx !== 0, "hidden")} data-astro-cid-fszlimxo> <div class="bingo-card" data-astro-cid-fszlimxo> <div class="bingo-card-header" data-astro-cid-fszlimxo> <div class="bingo-card-title-wrapper" data-astro-cid-fszlimxo> <span${addAttribute(`bingo-header-icon icon-${originalBingo.id}`, "class")} data-astro-cid-fszlimxo></span> <h2 class="bingo-card-title" data-astro-cid-fszlimxo>${formatBingoTitle(originalBingo.title, originalBingo.id)}</h2> </div> </div> <div class="bingo-sub-grids" data-astro-cid-fszlimxo> ${subBingos.map((bingo, subIdx) => {
      const layout = getBingoLayout(bingo);
      const {
        rows,
        cols,
        hasLineRewards,
        rowRewards,
        colRewards,
        completionReward,
        otherRewards,
        hasHeaders,
        topHeaders,
        sideHeaders
      } = layout;
      const headerOffset = hasHeaders ? 1 : 0;
      const rewardOffset = hasLineRewards ? 1 : 0;
      const totalCols = cols + headerOffset + rewardOffset;
      return renderTemplate`<div${addAttribute(`bingo-sub-grid-wrapper ${subBingos.length > 1 ? "has-separator" : ""}`, "class")} data-astro-cid-fszlimxo> ${subBingos.length > 1 && renderTemplate`<h3 class="sub-bingo-title" data-astro-cid-fszlimxo>Часть ${subIdx + 1}</h3>`} <div class="bingo-board-wrapper" data-astro-cid-fszlimxo> <div class="bingo-grid"${addAttribute(`
                          grid-template-columns: repeat(${totalCols}, 1fr);
                          --total-cols: ${totalCols};
                        `, "style")} data-astro-cid-fszlimxo> ${hasHeaders && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-fszlimxo": true }, { "default": ($$result3) => renderTemplate` <div class="grid-cell empty" data-astro-cid-fszlimxo></div> ${topHeaders.map((icon) => renderTemplate`<div class="grid-cell header-cell top" data-astro-cid-fszlimxo> ${icon && renderTemplate`<img${addAttribute(icon, "src")} alt="" class="header-icon-img" data-astro-cid-fszlimxo>`} </div>`)}${hasLineRewards && renderTemplate`<div class="grid-cell empty" data-astro-cid-fszlimxo></div>`}` })}`} ${Array.from({ length: rows }).map((_, r) => renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-fszlimxo": true }, { "default": ($$result3) => renderTemplate`${hasHeaders && renderTemplate`<div class="grid-cell header-cell side" data-astro-cid-fszlimxo> ${sideHeaders[r] && renderTemplate`<img${addAttribute(sideHeaders[r], "src")} alt="" class="header-icon-img" data-astro-cid-fszlimxo>`} </div>`}${Array.from({ length: cols }).map((_2, c) => {
        const idx = r * cols + c;
        const mutant = bingo.mutants[idx];
        if (!mutant) return renderTemplate`<div class="grid-cell empty" data-astro-cid-fszlimxo></div>`;
        const isMissing = mutant.specimenId === "Specimen_FF_98";
        const texturePath = isMissing ? "/bingo/not_now.png" : getMutantTexturePath(mutant.specimenId, mutant.skin);
        const hasSkin = !isMissing && mutant.skin && mutant.skin !== "_any" && mutant.skin.trim() !== "";
        return renderTemplate`<div class="grid-cell mutant-cell"${addAttribute(isMissing, "class:missing-mutant")}${addAttribute(getMutantName(mutant.specimenId), "title")} data-astro-cid-fszlimxo> <div class="mutant-content" data-astro-cid-fszlimxo> <img${addAttribute(texturePath, "src")} alt="" loading="lazy" class="mutant-img" data-astro-cid-fszlimxo> ${hasSkin && renderTemplate`<span class="skin-badge" data-astro-cid-fszlimxo>✦</span>`} <span class="cell-index" data-astro-cid-fszlimxo>${idx + 1}</span> <div class="cell-check" data-astro-cid-fszlimxo>✓</div> </div> </div>`;
      })}${hasLineRewards && renderTemplate`<div class="grid-cell reward-cell row-reward"${addAttribute(getRewardLabel(rowRewards[r]), "title")} data-astro-cid-fszlimxo> <div class="reward-content" data-astro-cid-fszlimxo> <img${addAttribute(getRewardTexturePath(rowRewards[r]), "src")} alt="" class="reward-img" data-astro-cid-fszlimxo> <span class="reward-val" data-astro-cid-fszlimxo>x${rowRewards[r].amount}</span> </div> </div>`}` })}`)} ${hasLineRewards && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-fszlimxo": true }, { "default": ($$result3) => renderTemplate`${hasHeaders && renderTemplate`<div class="grid-cell empty" data-astro-cid-fszlimxo></div>`}${colRewards.map((reward) => renderTemplate`<div class="grid-cell reward-cell col-reward"${addAttribute(getRewardLabel(reward), "title")} data-astro-cid-fszlimxo> <div class="reward-content" data-astro-cid-fszlimxo> <img${addAttribute(getRewardTexturePath(reward), "src")} alt="" class="reward-img" data-astro-cid-fszlimxo> <span class="reward-val" data-astro-cid-fszlimxo>x${reward.amount}</span> </div> </div>`)}${completionReward && renderTemplate`<div class="grid-cell reward-cell completion-cell"${addAttribute(getRewardLabel(completionReward), "title")} data-astro-cid-fszlimxo> <div class="reward-content" data-astro-cid-fszlimxo> <img${addAttribute(getRewardTexturePath(completionReward), "src")} alt="" class="reward-img" data-astro-cid-fszlimxo> <span class="reward-val main" data-astro-cid-fszlimxo>x${completionReward.amount}</span> <span class="completion-star" data-astro-cid-fszlimxo>★</span> </div> </div>`}` })}`} </div> </div> ${(!hasLineRewards || otherRewards && otherRewards.length > 0) && renderTemplate`<div class="rewards-fallback" data-astro-cid-fszlimxo> <h3 data-astro-cid-fszlimxo>Награды</h3> <div class="rewards-grid-list" data-astro-cid-fszlimxo> ${(hasLineRewards ? otherRewards : bingo.rewards).map((reward) => renderTemplate`<div class="reward-card-simple" data-astro-cid-fszlimxo> <img${addAttribute(getRewardTexturePath(reward), "src")} alt="" data-astro-cid-fszlimxo> <span data-astro-cid-fszlimxo>${getRewardLabel(reward)}</span> </div>`)} </div> </div>`} </div>`;
    })} </div> </div> </div>`;
  })} </div> ` }));
}, "/home/godbtw/site-workspace/mutants_site/src/pages/bingo.astro", void 0);

const $$file = "/home/godbtw/site-workspace/mutants_site/src/pages/bingo.astro";
const $$url = "/bingo";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Bingo,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
