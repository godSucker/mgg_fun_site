<script>
  import evotech from '../data/evotech-data.js';

  let mode = 'byLevels';          // byLevels | byResources
  let discount = 0;               // 0 | 60 | 70 | 80
  let priority = 'silver';        // 'silver' | 'gold' — приоритет валюты

  // поля пустые по умолчанию
  let current = '';
  let target = '';
  let haveGold = '';
  let haveSilver = '';

  let resultLevels = null;
  let resultResources = null;
  let errorMessage = '';

  const fmt = (n) => (n ?? 0).toLocaleString('ru-RU');
  const toNum = (v, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  // минимум применяется только при расчёте
  function clampLevel(v) {
    v = Number(v);
    if (!Number.isFinite(v)) return 5;
    return Math.max(5, Math.floor(v));
  }

  // после 328 стоимость фиксируется на 328-м уровне
  function getLevelCost(level) {
    const idx = Math.min(level, 328);
    const row = evotech[idx] || {};
    return { gold: row.gold || 0, silver: row.silver || 0 };
  }

  // суммарная стоимость между уровнями [a+1..b]
  function sumCostBetween(a, b) {
    if (b <= a) return { gold: 0, silver: 0, outOfRange: false };
    let gold = 0, silver = 0;
    for (let L = a + 1; L <= b; L++) {
      const cost = getLevelCost(L);
      gold += cost.gold;
      silver += cost.silver;
    }
    const factor = (100 - discount) / 100;
    return {
      gold: Math.round(gold * factor),
      silver: Math.round(silver * factor),
      outOfRange: false
    };
  }

  // расчёт по ресурсам: приоритетная валюта -> попытка оплатить ей; иначе — второй валютой.
  // За один уровень списывается только ОДНА валюта (без смешивания).
  function reachWithResources(start, goldBudget, silverBudget) {
    let level = start;
    const factor = (100 - discount) / 100;
    let steps = 0, MAX_STEPS = 1000000;

    while (steps < MAX_STEPS) {
      const nextLevel = level + 1;
      const cost = getLevelCost(nextLevel);
      const needGold   = Math.round((cost.gold   || 0) * factor);
      const needSilver = Math.round((cost.silver || 0) * factor);

      const trySilverFirst = (priority === 'silver');

      // helper: попытка списать выбранной валютой
      const canPaySilver = needSilver > 0 && silverBudget >= needSilver;
      const canPayGold   = needGold   > 0 && goldBudget   >= needGold;

      let paid = false;
      if (trySilverFirst) {
        if (canPaySilver) { silverBudget -= needSilver; paid = true; }
        else if (canPayGold) { goldBudget -= needGold; paid = true; }
      } else { // gold first
        if (canPayGold) { goldBudget -= needGold; paid = true; }
        else if (canPaySilver) { silverBudget -= needSilver; paid = true; }
      }

      if (!paid) break;

      level++;
      steps++;
    }

    return { level, goldLeft: goldBudget, silverLeft: silverBudget };
  }

  function validateInputs() {
    errorMessage = '';

    // фиксированный минимум 5 при расчёте
    current = clampLevel(current);
    target  = clampLevel(target);

    if (mode === 'byLevels' && target <= current) {
      errorMessage = 'Целевой уровень должен быть больше текущего.';
      return false;
    }

    // по ресурсам — можно вводить только одну валюту или обе; пустые = 0.
    return true;
  }

  function calculate() {
    if (!validateInputs()) {
      resultLevels = null;
      resultResources = null;
      return;
    }

    if (mode === 'byLevels') {
      resultLevels = sumCostBetween(toNum(current, 5), toNum(target, 5));
      resultResources = null;
    } else {
      resultResources = reachWithResources(
        toNum(current, 5),
        toNum(haveGold, 0),
        toNum(haveSilver, 0)
      );
      resultLevels = null;
    }
  }
</script>

<div class="evotech-calculator">
  <div class="tabs">
    <button class:active={mode === 'byLevels'} on:click={() => mode='byLevels'}>По уровням</button>
    <button class:active={mode === 'byResources'} on:click={() => mode='byResources'}>По ресурсам</button>
  </div>

  <div class="strategy">
    <label>Скидка</label>
    <div class="segmented">
      <button class:segActive={discount===0}  on:click={() => discount=0}>0%</button>
      <button class:segActive={discount===60} on:click={() => discount=60}>60%</button>
      <button class:segActive={discount===70} on:click={() => discount=70}>70%</button>
      <button class:segActive={discount===80} on:click={() => discount=80}>80%</button>
    </div>
  </div>

  {#if mode === 'byLevels'}
    <div class="panel">
      <div class="row">
        <div class="field">
          <label>Текущий уровень</label>
          <input type="number" min="5" bind:value={current} placeholder="Введите уровень…" />
        </div>
        <div class="field">
          <label>Целевой уровень</label>
          <input type="number" min="5" bind:value={target} placeholder="Введите уровень…" />
        </div>
      </div>

      <button class="calculate-btn" on:click={calculate}>Рассчитать</button>

      {#if errorMessage}
        <p class="note error">{errorMessage}</p>
      {/if}

      {#if resultLevels}
        <div class="result">
          <h3>Сумма затрат с {current} до {target}</h3>
          <ul>
            <li>Золото:  <strong>{fmt(resultLevels.gold)}</strong></li>
            <li>Серебро: <strong>{fmt(resultLevels.silver)}</strong></li>
          </ul>
        </div>
      {/if}
    </div>
  {:else}
    <div class="panel">
      <div class="row">
        <div class="field">
          <label>Текущий уровень</label>
          <input type="number" min="5" bind:value={current} placeholder="Введите уровень…" />
        </div>
        <div class="field">
          <label>Золото (есть)</label>
          <input type="number" min="0" bind:value={haveGold} placeholder="Введите золото…" />
        </div>
        <div class="field">
          <label>Серебро (есть)</label>
          <input type="number" min="0" bind:value={haveSilver} placeholder="Введите серебро…" />
        </div>
      </div>

      <div class="strategy">
        <label>Приоритет валюты</label>
        <div class="segmented">
          <button class:segActive={priority==='silver'} on:click={() => priority='silver'}>Серебро → Золото</button>
          <button class:segActive={priority==='gold'}   on:click={() => priority='gold'}>Золото → Серебро</button>
        </div>
        <p class="note">
          За уровень списывается только одна валюта. Сначала пытаемся оплатить приоритетной валютой,
          если не хватает — пробуем второй. Если ни одна не тянет цену следующего уровня — расчёт останавливается.
        </p>
      </div>

      <button class="calculate-btn" on:click={calculate}>Рассчитать</button>

      {#if errorMessage}
        <p class="note error">{errorMessage}</p>
      {/if}

      {#if resultResources}
        <div class="result">
          <h3>Максимальный уровень с ресурсами</h3>
          <p>Достигнете: <strong>{resultResources.level}</strong></p>
          <ul>
            <li>Остаток золота:  <strong>{fmt(resultResources.goldLeft)}</strong></li>
            <li>Остаток серебра: <strong>{fmt(resultResources.silverLeft)}</strong></li>
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .evotech-calculator { padding: 1rem; background:#0d1117; border:1px solid #30363d; border-radius:12px; }
  .tabs { display:flex; gap:.5rem; margin-bottom:1rem; }
  .tabs button { padding:.5rem .75rem; border:1px solid #30363d; background:#161b22; color:#c9d1d9; border-radius:8px; cursor:pointer; }
  .tabs button.active { background:#1f6feb; border-color:#1f6feb; color:#fff; }

  .strategy { display:grid; gap:.5rem; margin-bottom:1rem; }
  .segmented { display:inline-flex; border:1px solid #30363d; border-radius:10px; overflow:hidden; }
  .segmented button { padding:.4rem .7rem; background:transparent; color:#c9d1d9; border:none; border-right:1px solid #30363d; cursor:pointer; }
  .segmented button:last-child { border-right:none; }
  .segmented button.segActive { background:#1f6feb; color:#fff; }

  .panel { display:grid; gap:1rem; }
  .row { display:grid; gap:.75rem; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); }
  .field label { display:block; font-weight:600; margin-bottom:.25rem; }
  .field input { width:100%; padding:.55rem .6rem; border:1px solid #30363d; border-radius:10px; background:#0b0f14; color:#c9d1d9; }
  .result { border-top:1px dashed #30363d; padding-top:.75rem; }
  .result h3 { margin:0 0 .5rem; }
  .note { color:#8b949e; margin-top:.25rem; }
  .note.error { color:#f85149; font-weight:600; }
  .calculate-btn { padding:0.5rem 0.75rem; border:1px solid #30363d; border-radius:8px; background:#238636; color:#fff; cursor:pointer; }
  .calculate-btn:hover { background:#2ea043; }
</style>
