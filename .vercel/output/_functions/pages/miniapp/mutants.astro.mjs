export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';

function render({ slots: ___SLOTS___ }) {
		return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MGG Mutants Viewer</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 1rem;
      background-color: #f9f9f9;
    }
    h1 {
      font-size: 1.5rem;
    }
    .mutant {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 0.5rem 1rem;
      margin-bottom: 0.5rem;
    }
    .mutant h2 {
      margin: 0 0 0.25rem;
      font-size: 1.2rem;
    }
    .mutant p {
      margin: 0.25rem 0;
    }
    .mutant small {
      color: #666;
    }
  </style>
</head>
<body>
  <h1>Список мутантов</h1>
  <div id="content">Загрузка данных…</div>

  <script>
    // Синонимы для умений. Ключ – слово, которое может ввести
    // пользователь, значение – массив идентификаторов умений.
    const abilitySynonyms = {
      'щит': ['ability_shield', 'ability_shield_plus'],
      'shield': ['ability_shield', 'ability_shield_plus'],
      'реген': ['ability_regen', 'ability_regen_plus'],
      'регенерация': ['ability_regen', 'ability_regen_plus'],
      'вытягивание': ['ability_regen', 'ability_regen_plus'],
      'вытягивание жизни': ['ability_regen', 'ability_regen_plus'],
      'retaliate': ['ability_retaliate', 'ability_retaliate_plus'],
      'отражение': ['ability_retaliate', 'ability_retaliate_plus'],
      'slash': ['ability_slash', 'ability_slash_plus'],
      'рана': ['ability_slash', 'ability_slash_plus'],
      'кровоток': ['ability_slash', 'ability_slash_plus'],
      'strengthen': ['ability_strengthen', 'ability_strengthen_plus'],
      'усиление': ['ability_strengthen', 'ability_strengthen_plus'],
      'усил': ['ability_strengthen', 'ability_strengthen_plus'],
      'weaken': ['ability_weaken', 'ability_weaken_plus'],
      'проклятие': ['ability_weaken', 'ability_weaken_plus'],
    };
    /**
     * Получить параметры фильтра из строки запроса.
     * Поддерживаются параметры:
     *   filter – тип фильтра (all, star, speed, hp, atk, name, ability, gene, type, tier, bingo, skin).
     *   value – значение фильтра (строка).
     *   tol – допустимое отклонение для hp/atk.
     * Для обратной совместимости также читается параметр speed, который
     * трактуется как filter=speed и value=<число>.
     */
    function getFilterParams() {
      const params = new URLSearchParams(window.location.search);
      let filter = params.get('filter');
      let value = params.get('value');
      let tol = params.get('tol');
      // Поддержка старого формата ?speed=4
      if (!filter && params.get('speed')) {
        filter = 'speed';
        value = params.get('speed');
      }
      return {
        filter: filter || 'all',
        value: value,
        tol: tol ? parseFloat(tol) : undefined,
      };
    }

    /**
     * Загрузить данные о мутантах из нескольких JSON‑файлов.
     * Пытается загрузить normal_mutants.json и файлы для звёзд.
     */
    async function loadMutants() {
      const files = [
        '/normal_mutants.json',
        '/bronze_mutants.json',
        '/silver_mutants.json',
        '/gold_mutants.json',
        '/plat_mutants.json',
        '/skins.json', // файлы с альтернативными скинами
      ];
      const results = [];
      for (const file of files) {
        try {
          const resp = await fetch(file);
          if (!resp.ok) continue;
          const data = await resp.json();
          if (Array.isArray(data)) {
            results.push(...data);
          } else if (data && Array.isArray(data.specimens)) {
            // для файла skins.json
            results.push(...data.specimens);
          }
        } catch (err) {
          // пропускаем ошибку, если файл отсутствует
        }
      }
      return results;
    }

    /**
     * Проверка соответствия мутанта выбранному фильтру.
     */
    function matchesFilter(m, filter, value, tol) {
      try {
        if (filter === 'all') return true;
        if (filter === 'star') {
          return (m.star || '').toLowerCase() === String(value).toLowerCase();
        }
        if (filter === 'speed') {
          const spd = parseFloat(m.base_stats?.lvl1?.spd);
          return !Number.isNaN(spd) && Math.abs(spd - parseFloat(value)) < 1e-9;
        }
        if (filter === 'hp') {
          const hpVal = parseFloat(m.base_stats?.lvl1?.hp);
          return !Number.isNaN(hpVal) && Math.abs(hpVal - parseFloat(value)) <= (tol || 0);
        }
        if (filter === 'atk') {
          const atk1 = parseFloat(m.base_stats?.lvl1?.atk1);
          const atk2 = parseFloat(m.base_stats?.lvl1?.atk2);
          const target = parseFloat(value);
          return (
            (!Number.isNaN(atk1) && Math.abs(atk1 - target) <= (tol || 0)) ||
            (!Number.isNaN(atk2) && Math.abs(atk2 - target) <= (tol || 0))
          );
        }
        if (filter === 'name') {
          return String(m.name || '').toLowerCase().includes(String(value).toLowerCase());
        }
        if (filter === 'ability') {
          const abilities = m.abilities || [];
          // Преобразуем значение в список токенов
          const rawVal = String(value || '').trim();
          const tokens = rawVal.split(/\\s+/);
          let numericVal = null;
          const synonymTokens = [];
          for (const t of tokens) {
            const cand = t.replace('%', '').replace(',', '.');
            if (!isNaN(parseFloat(cand))) {
              numericVal = parseFloat(cand);
            } else {
              synonymTokens.push(t);
            }
          }
          const synonymsLower = synonymTokens.join(' ').trim().toLowerCase();
          const hasNumeric = numericVal !== null;
          return abilities.some((ab) => {
            if (!ab) return false;
            const abId = String(ab.id || '').toLowerCase();
            const abName = String(ab.name || '').toLowerCase();
            // Разбираем поиск по умению
            const synList = abilitySynonyms[synonymsLower];
            let matchSyn = false;
            if (synonymsLower) {
              if (synList) {
                for (const syn of synList) {
                  const synLow = syn.toLowerCase();
                  if (abId === synLow || abId.startsWith(synLow) || abId.includes(synLow) || abName.includes(synLow)) {
                    matchSyn = true;
                    break;
                  }
                }
              } else {
                // просто ищем подстроку
                if (abId.includes(synonymsLower) || abName.includes(synonymsLower)) {
                  matchSyn = true;
                }
              }
            }
            // Поиск по числу
            let matchNum = false;
            if (hasNumeric) {
              if (typeof ab === 'object') {
                // Возможные значения: само число и доля/процент
                const possibleVals = [];
                possibleVals.push(numericVal);
                if (numericVal > 1) {
                  possibleVals.push(numericVal / 100);
                } else {
                  possibleVals.push(numericVal * 100);
                }
                for (const key of Object.keys(ab)) {
                  const v = ab[key];
                  if (typeof v === 'number') {
                    for (const pv of possibleVals) {
                      if (Math.abs(v - pv) < 1e-6) {
                        matchNum = true;
                        break;
                      }
                    }
                    if (matchNum) break;
                  }
                }
              }
            }
            // Комбинируем логику:
            if (hasNumeric && synonymsLower) {
              return matchSyn && matchNum;
            } else if (hasNumeric) {
              return matchNum;
            } else if (synonymsLower) {
              return matchSyn;
            }
            return false;
          });
        }
        if (filter === 'gene') {
          const genes = m.genes || [];
          if (Array.isArray(genes)) {
            return genes.some((g) => String(g).toLowerCase() === String(value).toLowerCase());
          }
          return String(genes).toLowerCase() === String(value).toLowerCase();
        }
        if (filter === 'type') {
          return String(m.type || '').toLowerCase() === String(value).toLowerCase();
        }
        if (filter === 'tier') {
          return String(m.tier || '').toLowerCase() === String(value).toLowerCase();
        }
        if (filter === 'bingo') {
          const bingo = m.bingo || [];
          return Array.isArray(bingo) && bingo.some((b) => String(b).toLowerCase().includes(String(value).toLowerCase()));
        }
        if (filter === 'skin') {
          // Сначала ищем по полю skin (в skins.json это отдельный параметр)
          if (m.skin && String(m.skin).toLowerCase().includes(String(value).toLowerCase())) {
            return true;
          }
          // затем ищем по путям изображений
          const images = m.image || [];
          return Array.isArray(images) && images.some((img) => String(img).toLowerCase().includes(String(value).toLowerCase()));
        }
        return false;
      } catch (err) {
        return false;
      }
    }

    /**
     * Отрисовать список мутантов, соответствующих фильтру.
     */
    function renderMutants(mutants, filterParams) {
      const content = document.getElementById('content');
      content.innerHTML = '';
      const matching = mutants.filter((m) => matchesFilter(m, filterParams.filter, filterParams.value, filterParams.tol));
      if (!matching.length) {
          content.textContent = 'Нет мутантов, подходящих под выбранный фильтр.';
          return;
      }
      for (const m of matching) {
        const div = document.createElement('div');
        div.className = 'mutant';
        div.innerHTML = \`
          <h2>\${m.name}</h2>
          <p><strong>ID:</strong> \${m.id}</p>
          <p><strong>Гены:</strong> \${Array.isArray(m.genes) ? m.genes.join(', ') : m.genes || '-'}</p>
          <p><strong>Скорость:</strong> \${m.base_stats?.lvl1?.spd ?? '-'}</p>
          <p><strong>HP:</strong> \${m.base_stats?.lvl1?.hp ?? '-'}, <strong>Атака 1:</strong> \${m.base_stats?.lvl1?.atk1 ?? '-'}, <strong>Атака 2:</strong> \${m.base_stats?.lvl1?.atk2 ?? '-'}</p>
          <p><small>Тиер: \${m.tier || '-'}; Инкубация: \${m.incub_time || '-'} дн.; Звезда: \${m.star || '-'}</small></p>
        \`;
        content.appendChild(div);
      }
    }

    (async () => {
      const filterParams = getFilterParams();
      const mutants = await loadMutants();
      renderMutants(mutants, filterParams);
    })();
  </script>
</body>
</html>
`
	}
render["astro:html"] = true;

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: render
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
