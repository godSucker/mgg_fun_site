<script>
  // Импортируем заранее распарсенные данные. Массив costs индексирован по id: costs[id] содержит { id, gold, silver }
  import costs from '../data/evotech-data.js';

  // Текущий уровень пользователя
  let currentLevel = 1;
  // Доступное золото и серебро (как строки, чтобы привязка к input работала)
  let availableGold = '';
  let availableSilver = '';
  // Скидка (0, 60, 70, 80) как строка
  let discount = '0';
  /**
   * Режим оплаты:
   * - 'both' – можно платить и золотом, и серебром. На каждом уровне выбирается лучший вариант.
   * - 'gold' – только золото.
   * - 'silver' – только серебро.
   */
  // Режим оплаты: 'both' (золото + серебро), 'gold' (только золото) или 'silver' (только серебро)
  let currencyMode = 'both';

  // Итоговый уровень после трат
  let resultLevel = currentLevel;

  /**
   * Вычисляет стоимость апгрейда до заданного уровня с учётом скидки.
   * @param level уровень, на который совершается переход
   * @returns {gold: number, silver: number} округлённые стоимости золота и серебра
   */
  function computeCosts(level) {
    // Берём запись о стоимости текущего уровня или 328‑го, если уровень больше
    const record = costs[level <= 328 ? level : 328];
    // вычисляем коэффициент скидки
    const disc = parseInt(discount);
    let factor = 1;
    if (disc === 60) factor = 0.4;
    else if (disc === 70) factor = 0.3;
    else if (disc === 80) factor = 0.2;
    // умножаем и округляем
    const goldCost = Math.round(record.gold * factor);
    const silverCost = Math.round(record.silver * factor);
    return { gold: goldCost, silver: silverCost };
  }

  /**
   * Выполняет апгрейды, используя только золото (без серебра).
   * Возвращает конечный уровень и оставшееся золото. После 328‑го уровня
   * стоимость уровня фиксирована, поэтому применяем деление вместо
   * посчёта каждого уровня.
   */
  function upgradeWithGold(startLevel, gold) {
    let level = startLevel;
    let remainGold = gold;
    // Оплачиваем уровни до 328‑го по одному
    while (level < 328) {
      const next = level + 1;
      const { gold: costGold } = computeCosts(next);
      if (costGold <= remainGold) {
        remainGold -= costGold;
        level = next;
      } else {
        break;
      }
    }
    // После 328‑го стоимость фиксированная — можно поднять несколько уровней сразу
    if (level >= 328 && remainGold > 0) {
      const constantCost = computeCosts(level + 1).gold;
      if (constantCost > 0) {
        const additional = Math.floor(remainGold / constantCost);
        level += additional;
        remainGold -= additional * constantCost;
      }
    }
    return { level, goldLeft: remainGold };
  }

  /**
   * Выполняет апгрейды, используя только серебро. Аналогично upgradeWithGold,
   * после 328‑го стоимость фиксирована, поэтому используем деление.
   */
  function upgradeWithSilver(startLevel, silver) {
    let level = startLevel;
    let remainSilver = silver;
    while (level < 328) {
      const next = level + 1;
      const { silver: costSilver } = computeCosts(next);
      if (costSilver <= remainSilver) {
        remainSilver -= costSilver;
        level = next;
      } else {
        break;
      }
    }
    if (level >= 328 && remainSilver > 0) {
      const constantCost = computeCosts(level + 1).silver;
      if (constantCost > 0) {
        const additional = Math.floor(remainSilver / constantCost);
        level += additional;
        remainSilver -= additional * constantCost;
      }
    }
    return { level, silverLeft: remainSilver };
  }

  /**
   * Основная функция расчёта уровня, до которого можно прокачаться.
   * В режиме 'gold' и 'silver' используются соответствующие функции.
   * В режиме 'both' ищется оптимальная стратегия: сколько уровней взять за одну валюту, затем за другую.
   */
  function calculate() {
    // преобразуем входные ресурсы в числа
    const startLevel = Number(currentLevel) || 1;
    const gold = parseFloat(availableGold || '0');
    const silver = parseFloat(availableSilver || '0');

    // если входные значения некорректны
    if (startLevel < 1) {
      resultLevel = 1;
      return;
    }

    // однотипные валютные режимы — просто вызываем соответствующую функцию
    if (currencyMode === 'gold') {
      const { level } = upgradeWithGold(startLevel, gold);
      resultLevel = level;
      return;
    }
    if (currencyMode === 'silver') {
      const { level } = upgradeWithSilver(startLevel, silver);
      resultLevel = level;
      return;
    }

    // режим both: пробуем оплату за счёт золота, затем серебра, и наоборот. выбираем максимум
    let best = startLevel;

    // 1) сперва платим некоторое количество уровней только золотом, потом — сколько сможем только серебром
    {
      // массив вариантов после каждого числа оплат золотом
      let levelGold = startLevel;
      let remainGold = gold;
      // вариация i=0: без оплат золота
      {
        const { level: finalSilver } = upgradeWithSilver(levelGold, silver);
        if (finalSilver > best) best = finalSilver;
      }
      // i от 1, пока хватает золота
      while (true) {
        const next = levelGold + 1;
        const { gold: costG } = computeCosts(next);
        if (costG <= remainGold) {
          remainGold -= costG;
          levelGold = next;
          // теперь платим серебром
          const { level: finalSilver } = upgradeWithSilver(levelGold, silver);
          if (finalSilver > best) best = finalSilver;
        } else {
          break;
        }
      }
    }

    // 2) сперва платим некоторое количество уровней только серебром, потом — золото
    {
      let levelSilver = startLevel;
      let remainSilver = silver;
      // вариация i=0: без оплат серебром
      {
        const { level: finalGold } = upgradeWithGold(levelSilver, gold);
        if (finalGold > best) best = finalGold;
      }
      while (true) {
        const next = levelSilver + 1;
        const { silver: costS } = computeCosts(next);
        if (costS <= remainSilver) {
          remainSilver -= costS;
          levelSilver = next;
          // теперь платим золотом
          const { level: finalGold } = upgradeWithGold(levelSilver, gold);
          if (finalGold > best) best = finalGold;
        } else {
          break;
        }
      }
    }

    resultLevel = best;
  }

  // пересчитываем автоматически при изменении входов
  $: calculate();
</script>

<div class="p-4 rounded-2xl bg-gray-800 text-white shadow-xl max-w-md mx-auto">
  <h2 class="text-xl font-bold mb-4">ЭвоTech калькулятор</h2>
  <div class="space-y-3">
    <label class="block">
      <span class="text-sm">Текущий уровень:</span>
      <input type="number" min="1" bind:value={currentLevel} class="w-full bg-gray-700 p-2 rounded" />
    </label>
    <label class="block">
      <span class="text-sm">Скидка:</span>
      <select bind:value={discount} class="w-full bg-gray-700 p-2 rounded">
        <option value="0">0 %</option>
        <option value="60">60 %</option>
        <option value="70">70 %</option>
        <option value="80">80 %</option>
      </select>
    </label>
    <label class="block">
      <span class="text-sm">Тип валюты:</span>
      <select bind:value={currencyMode} class="w-full bg-gray-700 p-2 rounded">
        <option value="both">Золото + серебро</option>
        <option value="gold">Только золото</option>
        <option value="silver">Только серебро</option>
      </select>
    </label>
    {#if currencyMode !== 'silver'}
      <label class="block">
        <span class="text-sm">Доступное золото:</span>
        <input type="number" min="0" bind:value={availableGold} class="w-full bg-gray-700 p-2 rounded" />
      </label>
    {/if}
    {#if currencyMode !== 'gold'}
      <label class="block">
        <span class="text-sm">Доступное серебро:</span>
        <input type="number" min="0" bind:value={availableSilver} class="w-full bg-gray-700 p-2 rounded" />
      </label>
    {/if}
    <div class="mt-4 p-2 bg-gray-700 rounded space-y-2">
      <!-- Кнопка вручную вызывает перерасчёт -->
      <button type="button" on:click={calculate} class="bg-blue-500 text-white px-4 py-2 rounded">
        Рассчитать
      </button>
      <p>
        После траты вы достигнете уровня:
        <strong>{resultLevel}</strong>
      </p>
    </div>
  </div>
</div>