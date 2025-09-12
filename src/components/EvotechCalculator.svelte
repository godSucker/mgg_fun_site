<script>
  // ВАЖНО: Импорт без alias. Файл должен существовать: src/data/evotech-data.js
  // Формат ожидается как default export массива: [ null, {id:1,gold:...,silver:...}, ... ]
  import EvoRows from '../data/evotech-data.js';

  const MIN_LEVEL = 5;
  const MAX_LEVEL = 1_000_000;
  const PRICE_CONST_FROM_LEVEL = 328;

  // UI
  let startLevel = '';
  let silver = '';
  let gold = '';
  let discount = '70'; // 0 | 60 | 70 | 80

  let errorMsg = '';
  let hitCap = false;
  let busy = false;

  let endLevel = '—';
  let upgrades = '—';
  let spentSilver = '—';
  let spentGold = '—';
  let leftSilver = '—';
  let leftGold = '—';

  // ---------- helpers ----------
  const toBig = (v) => {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(Math.max(0, Math.floor(v || 0)));
    const s = String(v ?? '').trim().replace(/[^\d]/g, '');
    return s ? BigInt(s) : 0n;
  };
  const fmt = (big) => big.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const roundUpPct = (amountBig, pctBig) => {
    const hundred = 100n;
    // amount * (100 - pct), округление вверх
    const num = amountBig * (hundred - pctBig) + (hundred - 1n);
    return num / hundred;
  };

  // Достаём строку из твоего массива с fallback на последнюю ненулевую
  function getRow(level) {
    const rows = Array.isArray(EvoRows) ? EvoRows : null;
    if (!rows) return null;
    // твой массив обычно с null на [0], дальше 1..400 по индексу
    let row = rows[level] || null;
    if (row && typeof row.gold === 'number' && typeof row.silver === 'number') return row;

    // fallback: найти последнюю валидную строку ниже уровня
    for (let l = Math.min(level, rows.length - 1); l >= 1; l--) {
      const r = rows[l];
      if (r && typeof r.gold === 'number' && typeof r.silver === 'number') {
        return r;
      }
    }
    return null;
  }

  function costPairAt(level, discountPct) {
    const row = getRow(level);
    if (!row) return { s: 0n, g: 0n };
    const s0 = BigInt(Math.max(0, Math.floor(row.silver || 0)));
    const g0 = BigInt(Math.max(0, Math.floor(row.gold || 0)));
    const d  = BigInt(Math.max(0, Math.min(100, Number(discountPct || 0))));
    const s = roundUpPct(s0, d);
    const g = roundUpPct(g0, d);
    return { s, g };
  }

  function safeConstPair(discountPct) {
    let pair = costPairAt(PRICE_CONST_FROM_LEVEL, discountPct);
    if (pair.s > 0n || pair.g > 0n) return pair;
    // ищем ближайшую ненулевую пару вниз
    for (let l = PRICE_CONST_FROM_LEVEL - 1; l >= MIN_LEVEL + 1; l--) {
      pair = costPairAt(l, discountPct);
      if (pair.s > 0n || pair.g > 0n) return pair;
    }
    return { s: 0n, g: 0n };
  }

  function simulate({ startLevel, silver, gold, discountPct }) {
    let lvl = Number(startLevel ?? MIN_LEVEL);
    if (Number.isNaN(lvl)) lvl = MIN_LEVEL;
    lvl = Math.min(Math.max(lvl, MIN_LEVEL), MAX_LEVEL);

    let S = toBig(silver);
    let G = toBig(gold);
    const d = Number(discountPct || 0);

    let ups = 0;
    let spentS = 0n, spentG = 0n;

    // Проверка, есть ли вообще данные
    const constPair = safeConstPair(d);
    if (constPair.s === 0n && constPair.g === 0n) {
      return { error: 'Не найдены данные стоимости для калькулятора.', endLevel: lvl };
    }

    // --- До 328 уровня — поштучно ---
    while (lvl < Math.min(PRICE_CONST_FROM_LEVEL, MAX_LEVEL)) {
      const next = lvl + 1;
      const { s, g } = costPairAt(next, d);

      // Если обе валюты 0 → ап бесплатный
      if (s === 0n && g === 0n) {
        lvl = next; ups++;
        if (lvl >= MAX_LEVEL) break;
        continue;
      }

      // Пытаемся заплатить СНАЧАЛА серебром, потом золотом
      if (s > 0n && S >= s) {
        S -= s; spentS += s; lvl = next; ups++;
        if (lvl >= MAX_LEVEL) break;
        continue;
      }
      if (g > 0n && G >= g) {
        G -= g; spentG += g; lvl = next; ups++;
        if (lvl >= MAX_LEVEL) break;
        continue;
      }
      // не хватает ни той, ни другой — стоп
      break;
    }

    // --- После 328 — массово, по постоянной цене ---
    if (lvl < MAX_LEVEL) {
      const { s: sConst, g: gConst } = constPair;

      // если обе цены нулевые — данные некорректные (иначе бесконечный ап)
      if (sConst === 0n && gConst === 0n) {
        return { error: 'Данные стоимости некорректны (нулевая цена после 328).', endLevel: lvl };
      }

      const remainLevels = BigInt(MAX_LEVEL - lvl);

      // Сколько уровней можно купить серебром по sConst и золотом по gConst
      const canBySilver = sConst > 0n ? (S / sConst) : 0n;
      const canByGold   = gConst > 0n ? (G / gConst) : 0n;

      let buy = canBySilver + canByGold;
      if (buy > remainLevels) buy = remainLevels;

      if (buy > 0n) {
        // приоритет — серебро
        const useSilverLvls = sConst > 0n ? (buy <= canBySilver ? buy : canBySilver) : 0n;
        const useGoldLvls   = buy - useSilverLvls;

        const spendS = sConst * useSilverLvls;
        const spendG = gConst * useGoldLvls;

        S -= spendS; G -= spendG;
        spentS += spendS; spentG += spendG;

        const add = Number(buy > BigInt(Number.MAX_SAFE_INTEGER)
          ? BigInt(Number.MAX_SAFE_INTEGER)
          : buy);
        lvl += add; ups += add;
      }
    }

    return {
      endLevel: lvl,
      upgrades: ups,
      spentSilver: spentS,
      spentGold: spentG,
      leftSilver: S,
      leftGold: G,
      hitCap: lvl >= MAX_LEVEL
    };
  }

  function calculate() {
    errorMsg = '';
    hitCap = false;
    busy = true;

    let sLevel = Number(startLevel || MIN_LEVEL);
    if (Number.isNaN(sLevel)) sLevel = MIN_LEVEL;
    if (sLevel < MIN_LEVEL) sLevel = MIN_LEVEL;
    if (sLevel > MAX_LEVEL) sLevel = MAX_LEVEL;

    const res = simulate({
      startLevel: sLevel,
      silver,
      gold,
      discountPct: Number(discount || 0),
    });

    if (res.error) {
      errorMsg = res.error;
      endLevel = upgrades = spentSilver = spentGold = leftSilver = leftGold = '—';
      busy = false;
      return;
    }

    endLevel     = res.endLevel.toLocaleString('ru-RU');
    upgrades     = res.upgrades.toLocaleString('ru-RU');
    spentSilver  = fmt(res.spentSilver);
    spentGold    = fmt(res.spentGold);
    leftSilver   = fmt(res.leftSilver);
    leftGold     = fmt(res.leftGold);
    hitCap       = res.hitCap;

    if (res.hitCap && (res.leftSilver > 0n || res.leftGold > 0n)) {
      errorMsg = 'Достигнут максимум 1 000 000 уровня. Остаток ресурсов не израсходован.';
    }

    busy = false;
  }

  function resetForm() {
    startLevel = '';
    silver = '';
    gold = '';
    discount = '70';
    errorMsg = '';
    hitCap = false;
    endLevel = upgrades = spentSilver = spentGold = leftSilver = leftGold = '—';
  }
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
  <h1 class="text-2xl sm:text-3xl font-extrabold text-sky-50">ЭвоТех — калькулятор</h1>
  <p class="mt-1 text-sky-200/80">
    Максимальный уровень — <b>1 000 000</b>.
    Приоритет — серебро. Скидки: 0/60/70/80%.
  </p>

  <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div class="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 backdrop-blur">
      <h2 class="text-sky-100 font-bold mb-3">Ввод данных</h2>
      <div class="space-y-3">
        <label class="block">
          <span class="text-sky-300/80 text-sm">Стартовый уровень (≥ 5)</span>
          <input bind:value={startLevel} inputmode="numeric" placeholder="например, 120"
                 class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sky-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/60"/>
        </label>

        <label class="block">
          <span class="text-sky-300/80 text-sm">Серебро</span>
          <input bind:value={silver} inputmode="numeric" placeholder="можно пусто"
                 class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sky-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/60"/>
        </label>

        <label class="block">
          <span class="text-sky-300/80 text-sm">Золото</span>
          <input bind:value={gold} inputmode="numeric" placeholder="можно пусто"
                 class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sky-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/60"/>
        </label>

        <label class="block">
          <span class="text-sky-300/80 text-sm">Скидка</span>
          <select bind:value={discount}
                  class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sky-100 outline-none focus:ring-2 focus:ring-sky-500/60">
            <option value="0">0%</option>
            <option value="60">60%</option>
            <option value="70">70%</option>
            <option value="80">80%</option>
          </select>
        </label>

        <div class="flex items-center gap-3 pt-2">
          <button type="button" on:click={calculate} disabled={busy}
                  class="inline-flex items-center justify-center rounded-xl border border-sky-600/60 bg-sky-700/30 px-4 py-2 font-semibold text-sky-100 hover:bg-sky-700/50 disabled:opacity-60">
            {#if busy} Считаю… {:else} Рассчитать {/if}
          </button>
          <button type="button" on:click={resetForm}
                  class="inline-flex items-center justify-center rounded-xl border border-slate-600/60 bg-slate-800/40 px-4 py-2 font-semibold text-sky-100 hover:bg-slate-800/60">
            Сброс
          </button>
        </div>

        {#if errorMsg}
          <div class="mt-2 rounded-xl border border-rose-800/60 bg-rose-900/40 px-3 py-2 text-rose-100">
            {errorMsg}
          </div>
        {/if}

        {#if hitCap}
          <div class="mt-2 inline-block rounded-full border border-emerald-700/60 bg-emerald-900/40 px-3 py-1 text-emerald-100 text-sm">
            Достигнут предел: 1 000 000 уровня
          </div>
        {/if}
      </div>
    </div>

    <div class="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 backdrop-blur">
      <h2 class="text-sky-100 font-bold mb-3">Результат</h2>
      <div class="space-y-2 text-sky-100">
        <div class="flex justify-between gap-2"><span class="text-sky-300/80">Финальный уровень:</span><strong>{endLevel}</strong></div>
        <div class="flex justify-between gap-2"><span class="text-sky-300/80">Сделано апов:</span><strong>{upgrades}</strong></div>
        <hr class="my-2 border-slate-700/70" />
        <div class="flex justify-between gap-2"><span class="text-sky-300/80">Потрачено серебра:</span><strong>{spentSilver}</strong></div>
        <div class="flex justify-between gap-2"><span class="text-sky-300/80">Потрачено золота:</span><strong>{spentGold}</strong></div>
        <div class="flex justify-between gap-2"><span class="text-sky-300/80">Остаток серебра:</span><strong>{leftSilver}</strong></div>
        <div class="flex justify-between gap-2"><span class="text-sky-300/80">Остаток золота:</span><strong>{leftGold}</strong></div>
      </div>
      <p class="mt-3 text-sky-200/70 text-sm">
        Можно вводить только золото или только серебро — калькулятор сам поймёт.
      </p>
    </div>
  </div>
</div>
