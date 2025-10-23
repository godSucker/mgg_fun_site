<script lang="ts">
  // ДАННЫЕ
  import mutantsRaw from "@/data/mutants/normal.json";
  import orbsRaw from "@/data/materials/orbs.json";

  // ──────────────────────────────────────────────────────────────────────────────
  // УТИЛИТЫ

  type GeneLetter = "a" | "b" | "c" | "d" | "e" | "f";
  const GENE_LABEL: Record<GeneLetter, string> = {
    a: "Кибер",
    b: "Зомби",
    c: "Зверь",
    d: "Рубака",
    e: "Галактик",
    f: "Мифик"
  };

  const geneOrder: GeneLetter[] = ["a", "b", "c", "d", "e", "f"];
  const geneIcon = (g: GeneLetter) => `/genes/icon_gene_${g}.png`;

  // вытащим удобный вид мутантов
  type Ability = {
    name: string; // ability_* ключ из JSON
    pct: number;  // ±%
    value_atk1_lvl1: number;
    value_atk2_lvl1: number;
    value_atk1_lvl30: number;
    value_atk2_lvl30: number;
  };

  type Mutant = {
    id: string;
    name: string;
    genes: string[]; // e.g. ["DD"]
    type: string;
    image: string[];
    base_stats: {
      lvl1: { hp: number; atk1: number; atk2: number; spd: number; atk1_gene: GeneLetter; atk1_AOE: boolean };
      lvl30: { hp: number; atk1: number; atk2: number; spd: number; atk1_gene: GeneLetter; atk1_AOE: boolean; atk2_gene: GeneLetter; atk2_AOE: boolean };
    };
    abilities: Ability[];
    orbs: { normal: number; special: number };
  };

  // безопасная выборка "иконки" мутанта
  function specimenIcon(m: Mutant): string {
    const s = m.image?.find(p => p.toLowerCase().includes("specimen_")) ?? m.image?.[0] ?? "";
    return s ? "/" + s : "";
  }

  // звёздность — отображаем как 0..3 (бронза/серебро/золото/платина)
  const STAR_LIST = [
    { key: "bronze",    mult: 1.0,  icon: "/stars/star_bronze.png",    label: "Bronze"    },
    { key: "silver",    mult: 1.3,  icon: "/stars/star_silver.png",    label: "Silver"    },
    { key: "gold",      mult: 1.6,  icon: "/stars/star_gold.png",      label: "Gold"      },
    { key: "platinum",  mult: 2.0,  icon: "/stars/star_platinum.png",  label: "Platinum"  },
  ];
  // Примечание: если в твоих звёздных JSON есть свои мультипликаторы — можно подставить их тут вместо дефолтов.

  // Орбы: сгруппируем по типу, а эффекты читаем «по ключевым словам»
  type Orb = { id: string; name: string; type: "basic" | "special"; effects?: Record<string, number> };
  const allOrbs: Orb[] = (orbsRaw as any[]).map(o => ({
    id: o.id ?? o.name ?? "",
    name: o.name ?? o.id ?? "",
    type: (o.type === "special" ? "special" : "basic") as "basic" | "special",
    effects: o.effects ?? o // часто эффекты лежат прямо в объекте
  }));

  function extractPct(effects: Record<string, number> | undefined, what: "hp" | "atk" | "ability"): number {
    if (!effects) return 0;
    // собираем любые поля, где встречается ключевое слово
    let sum = 0;
    for (const [k, v] of Object.entries(effects)) {
      const kk = k.toLowerCase();
      if (what === "hp"      && kk.includes("hp"))      sum += Number(v) || 0;
      if (what === "atk"     && (kk.includes("atk") || kk.includes("attack"))) sum += Number(v) || 0;
      if (what === "ability" && kk.includes("ability")) sum += Number(v) || 0;
    }
    return sum; // это ПРоценты, их будем делить на 100
  }

  // Формулы из ТЗ:
  // Атака: x * (y/10 + 0.9), где x — на 1-м уровне (обычная/усиленная по порогам)
  function attackAtLevel(level: number, atk1: number, atk1p: number): number {
    const x = level < 10 ? atk1 : (atk1p || atk1);
    return x * (level / 10 + 0.9);
  }
  function attack2AtLevel(level: number, atk2: number, atk2p: number): number {
    const x = level < 15 ? atk2 : (atk2p || atk2);
    return x * (level / 10 + 0.9);
  }
  // HP: x * (level/10 + 0.9)
  const hpAtLevel = (level: number, hp1: number) => hp1 * (level / 10 + 0.9);

  // Применение орбов (суммарные %)
  function applyOrbs(stat: number, hpPct: number, atkPct: number, what: "hp" | "atk") {
    const addPct = what === "hp" ? hpPct : atkPct;
    return stat * (1 + addPct / 100);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // СОСТОЯНИЕ UI

  const mutants: Mutant[] = (mutantsRaw as any[]).map(m => m as Mutant);
  let search = "";
  let geneFilters: Set<GeneLetter> = new Set(); // пусто = показывать все
  let sortBy: "name" | "gene" = "name";

  let selected: Mutant | null = mutants[0] ?? null;

  // управление карточкой
  let levelInput = 30;              // уровень вводом
  let starIndex = 3;                // 0..3
  // слоты сфер
  type Slot = { type: "basic" | "special"; orbId: string | null };
  let slots: Slot[] = [];

  $: if (selected) {
    // наполнить слоты под текущего мутанта
    const arr: Slot[] = [];
    for (let i = 0; i < (selected.orbs?.normal ?? 0); i++) arr.push({ type: "basic",   orbId: null });
    for (let i = 0; i < (selected.orbs?.special ?? 0); i++) arr.push({ type: "special", orbId: null });
    slots = arr;
  }

  // каталог с фильтрами и поиском
  function fitsGeneFilter(m: Mutant) {
    if (geneFilters.size === 0) return true;
    // проверим обе буквы гена
    const letters = (m.genes?.[0] ?? "").toLowerCase().split("") as GeneLetter[];
    return letters.some(l => geneFilters.has(l));
  }

  function visibleList() {
    const q = search.trim().toLowerCase();
    let list = mutants.filter(m => fitsGeneFilter(m) && (q === "" || m.name.toLowerCase().includes(q)));
    if (sortBy === "name") {
      list = list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    } else {
      list = list.sort((a, b) => {
        const ga = (a.genes?.[0] ?? ""), gb = (b.genes?.[0] ?? "");
        return ga.localeCompare(gb) || a.name.localeCompare(b.name, "ru");
      });
    }
    return list;
  }

  function pick(m: Mutant) {
    selected = m;
    levelInput = 30;
    starIndex = 3;
  }

  // соберём суммарные бонусы сфер
  function sumOrbPcts() {
    let hp = 0, atk = 0, ab = 0;
    for (const s of slots) {
      if (!s.orbId) continue;
      const orb = allOrbs.find(o => o.id === s.orbId);
      if (!orb) continue;
      hp += extractPct(orb.effects, "hp");
      atk += extractPct(orb.effects, "atk");
      ab += extractPct(orb.effects, "ability");
    }
    return { hp, atk, ab };
  }

  // вычисление отображаемых статов
  function derivedStats() {
    if (!selected) return null;
    const lvl1 = selected.base_stats.lvl1;
    const lvl30 = selected.base_stats.lvl30;

    const starMult = STAR_LIST[starIndex]?.mult ?? 1;

    const { hp: orbHpPct, atk: orbAtkPct } = sumOrbPcts();

    const hpRaw = hpAtLevel(levelInput, lvl1.hp);
    const atk1Raw = attackAtLevel(levelInput, lvl1.atk1, lvl30.atk1);
    const atk2Raw = attack2AtLevel(levelInput, lvl1.atk2, lvl30.atk2);

    const hp = Math.round(applyOrbs(hpRaw * starMult, orbHpPct, 0, "hp"));
    const atk1 = Math.round(applyOrbs(atk1Raw * starMult, 0, orbAtkPct, "atk"));
    const atk2 = Math.round(applyOrbs(atk2Raw * starMult, 0, orbAtkPct, "atk"));

    return { hp, atk1, atk2, spd: lvl30.spd }; // скорость не масштабируем
  }

  function abilityLabel(key: string): string {
    // показываем как в JSON — без «кривых» синонимов
    // при желании сюда можно добавить карту перевода в «красиво по-русски»
    return key.replace(/^ability_/, "").replace(/_/g, " ");
  }

  // красивый текст типа мутанта
  function typeLabel(t: string) {
    const m = t?.toUpperCase?.() ?? "";
    if (m === "LEGEND") return "Legendary";
    if (m === "HEROIC") return "Heroic";
    if (m === "DEFAULT") return "Default";
    return t;
  }
</script>

<style>
  /* лёгкие стили без привязки к tailwind, чтобы не ломать твою тему */
  .wrap { display: grid; grid-template-columns: 360px 1fr; gap: 24px; }
  .panel { background: #2b2f3a; border-radius: 12px; padding: 16px; box-shadow: 0 0 0 1px rgba(255,255,255,.06) inset; }
  .catalog { height: calc(100vh - 220px); display: grid; grid-template-rows: auto auto auto 1fr; gap: 12px; }
  .list { overflow: auto; border-radius: 8px; }
  .item { display:flex; gap:12px; align-items:center; padding:8px 10px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,.05); }
  .item:hover { background: rgba(255,255,255,.06); }
  .item.active { outline:2px solid #7c5cff; background: rgba(124,92,255,.08); }
  .mutthumb { width:42px; height:42px; object-fit:cover; border-radius:8px; background:#111; }
  .genes { display:flex; gap:6px; }
  .genes img { width:18px; height:18px; }
  .sort { display:flex; gap:8px; align-items:center; }
  .sort button { background:#3a3f4b; padding:6px 10px; border-radius:6px; border:1px solid rgba(255,255,255,.06); }
  .sort button.active { background:#7c5cff; }
  .orbsRow { display:flex; gap:10px; justify-content:center; margin-top:6px; }
  .orbslot { width:36px; height:36px; position:relative; cursor:pointer; }
  .orbslot > img { width:100%; height:100%; object-fit:contain; }
  .orbBadge { position:absolute; inset:0; display:grid; place-items:center; font-size:10px; }
  .stars { display:flex; gap:10px; justify-content:center; align-items:center; }
  .stars img { width:22px; height:22px; cursor:pointer; filter: drop-shadow(0 0 1px black); }
  .card { display:grid; gap:12px; }
  .bigname { font-size:22px; font-weight:800; text-align:center; }
  .kv { display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:center; padding:10px; border-radius:8px; background:#1f232c; }
  .kv .val { font-weight:700; }
  .levelRow { display:flex; gap:8px; align-items:center; justify-content:center; }
  input[type="number"] { width:78px; background:#1e212a; border:1px solid rgba(255,255,255,.08); color:#fff; border-radius:6px; padding:6px 8px; }
  select { width:100%; background:#1e212a; border:1px solid rgba(255,255,255,.08); color:#fff; border-radius:6px; padding:6px 8px; }
</style>

<div class="wrap">
  <!-- КАТАЛОГ -->
  <div class="panel catalog">
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:space-between">
      <div class="genes">
        {#each geneOrder as g}
          <img alt={GENE_LABEL[g]} title={GENE_LABEL[g]} src={geneIcon(g)}
               class:activeGene={geneFilters.has(g)}
               on:click={() => {
                 const s = new Set(geneFilters);
                 s.has(g) ? s.delete(g) : s.add(g);
                 geneFilters = s;
               }} />
        {/each}
      </div>

      <div class="sort">
        <button class:active={sortBy==='name'} on:click={() => sortBy='name'}>Имя [A–Я]</button>
        <button class:active={sortBy==='gene'} on:click={() => sortBy='gene'}>Ген</button>
      </div>
    </div>

    <input placeholder="Введите имя мутанта" bind:value={search} />

    <div class="list panel" style="padding:0">
      {#each visibleList() as m (m.id)}
        <div class="item {selected?.id===m.id?'active':''}" on:click={() => pick(m)}>
          <img class="mutthumb" src={specimenIcon(m)} alt={m.name} />
          <div style="min-width:0; flex:1">
            <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">{m.name}</div>
            <div class="genes">
              {#each (m.genes?.[0]?.toLowerCase().split("") ?? []) as gl}
                <img src={geneIcon(gl)} alt={GENE_LABEL[gl]} title={GENE_LABEL[gl]} />
              {/each}
            </div>
          </div>
          <small style="opacity:.7">{typeLabel(m.type)}</small>
        </div>
      {/each}
    </div>
  </div>

  <!-- КАРТОЧКА -->
  <div class="panel card">
    {#if selected}
      <div style="display:grid; gap:8px; justify-items:center">
        <div class="bigname">{selected.name}</div>
        <img src={specimenIcon(selected)} alt={selected.name} style="width:126px; height:126px; object-fit:cover; border-radius:12px; background:#111" />

        <div class="orbsRow">
          {#each slots as s, i}
            <div class="orbslot" title="Выбрать сферу">
              <img src={s.type === 'basic' ? '/orbs/basic/orb_slot.png' : '/orbs/special/orb_slot_spe.png'} alt="slot" />
              {#if s.orbId}
                <div class="orbBadge">
                  <img src={`/orbs/${s.type}/${s.orbId}.png`} alt={s.orbId} style="width:80%; height:80%; object-fit:contain" />
                </div>
              {/if}
              <select on:change={(e: any) => { slots[i].orbId = e.target.value || null; }}>
                <option value="">— нет —</option>
                {#each allOrbs.filter(o => o.type === s.type) as o}
                  <option value={o.id} selected={o.id===s.orbId}>{o.name}</option>
                {/each}
              </select>
            </div>
          {/each}
        </div>

        <div class="levelRow">
          <span>Уровень:</span>
          <input type="number" min="1" max="100" bind:value={levelInput} />
          <span>Звёздность:</span>
          <div class="stars">
            {#each STAR_LIST as st, idx}
              <img src={st.icon} alt={st.label} title={st.label}
                   on:click={() => starIndex = idx}
                   style="opacity:{idx<=starIndex?1:.35}" />
            {/each}
          </div>
        </div>
      </div>

      <div class="kv"><div>Редкость</div><div class="val">{typeLabel(selected.type)}</div></div>

      {#await Promise.resolve(derivedStats()) then S}
        <div class="kv"><div>HP</div><div class="val">{S.hp.toLocaleString("ru-RU")}</div></div>
        <div class="kv"><div>Атака 1</div><div class="val">{S.atk1.toLocaleString("ru-RU")}</div></div>
        <div class="kv"><div>Атака 2</div><div class="val">{S.atk2.toLocaleString("ru-RU")}</div></div>
        <div class="kv"><div>Скорость</div><div class="val">{S.spd}</div></div>
      {/await}

      <div class="panel" style="padding:12px">
        <div style="font-weight:800; margin-bottom:8px">Способности</div>
        <div style="display:grid; gap:6px">
          {#each selected.abilities as ab}
            <div class="kv">
              <div>{abilityLabel(ab.name)}</div>
              <div class="val">{ab.pct > 0 ? "+" : ""}{ab.pct}%</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
