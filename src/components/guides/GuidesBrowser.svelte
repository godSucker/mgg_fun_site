<script lang="ts">
  import { textureUrl } from '@/lib/texture-cdn'
  import { getGeneIcon } from '@/lib/mutant-icons'

  interface MutantLite { id: string; name: string; genes: string[]; icon: string }
  interface ZodiacEntry extends MutantLite { sign: string; dateFrom: string; dateTo: string }
  interface FarmerRow {
    ids: string[]
    mutants: MutantLite[]
    breedable: 'yes' | 'no'
    price: string
    rating: number
    verdict: string
    silverPerHour: number
    relative: number
  }
  interface SpeedOrbRow { base: number; l3: number; l3pct: number; l4: number; l4pct: number; l5: number; l5pct: number }
  interface DivisionMap {
    mapId: string
    locationName: string
    lore: string
    reward: { label: string; mutant?: MutantLite }
    fightCount: number
    levelRange: [number, number]
    enemies: MutantLite[]
  }
  interface Division { id: string; name: string; recommendation: string; maps: DivisionMap[] }
  interface DungeonEntry {
    id: string
    name: string
    nameAuthored: boolean
    mutant: MutantLite | null
    fightCount: number
    bossCount: number
    categories: string[]
  }
  interface EventLadderEntry {
    id: string
    name: string
    mapCount: number
    mutant: MutantLite | null
    mutantAtMap: string | null
    categories: string[]
  }
  interface SpecialLadders { experiment: DungeonEntry[]; challenge: DungeonEntry[] }
  interface QuestReward { label: string; mutant?: MutantLite }
  interface Quest { id: string; title: string; caption: string; rewards: QuestReward[] }

  let {
    legendaries = [],
    zodiac = [],
    farmers = [],
    speedOrbs = [],
    divisions = [],
    quests = [],
    raids = [],
    eventLadders = [],
    specialLadders = { experiment: [], challenge: [] },
  }: {
    legendaries: MutantLite[]
    zodiac: ZodiacEntry[]
    farmers: FarmerRow[]
    speedOrbs: SpeedOrbRow[]
    divisions: Division[]
    quests: Quest[]
    raids: DungeonEntry[]
    eventLadders: EventLadderEntry[]
    specialLadders: SpecialLadders
  } = $props()

  let activeDivision = $state(0)

  const FEATURED_LEGENDARY = 'specimen_cc_02' // Бак Морис

  const TABS = [
    { key: 'legendaries', label: 'Выводимые легендарки', ready: true },
    { key: 'zodiac', label: 'Зодиакальные даты', ready: true },
    { key: 'tandem', label: 'Тандем', ready: true },
    { key: 'pvp-bug', label: 'PvP-фича', ready: true },
    { key: 'speed-orbs', label: 'Сферы скорости', ready: true },
    { key: 'quests', label: 'Квесты', ready: true },
    { key: 'farmers', label: 'Фармеры серебра', ready: true },
    { key: 'divisions', label: 'Дивизионы', ready: true },
    { key: 'event-ladders', label: 'Ивенты-лесенки', ready: true },
    { key: 'special-ladders', label: 'Ивентовые лесенки', ready: true },
    { key: 'raids', label: 'Рейды', ready: true },
    { key: 'pvp-seasons', label: 'ПВП-сезоны', ready: false },
  ]

  let activeTab = $state('legendaries')

  function openMutant(specimenId: string) {
    window.dispatchEvent(new CustomEvent('archivist:open-mutant', { detail: { specimenId } }))
  }

  function breedableLabel(b: 'yes' | 'no'): string {
    return b === 'yes' ? 'Выводится' : 'Не выводится'
  }

  function fmtSilver(n: number): string {
    return n.toLocaleString('ru-RU')
  }

  function fmtSpeed(n: number): string {
    return n.toFixed(2).replace('.', ',')
  }

  function fmtPct(n: number): string {
    return n.toFixed(1).replace('.', ',')
  }

  function fmtCats(cats: string[]): string {
    return cats.length ? cats.join(', ') : '—'
  }

  let activeSpecialSection = $state<'experiment' | 'challenge'>('experiment')

  let questSearch = $state('')
  let filteredQuests = $derived(
    questSearch.trim()
      ? quests.filter(
          (q) =>
            q.title.toLowerCase().includes(questSearch.trim().toLowerCase()) ||
            q.caption.toLowerCase().includes(questSearch.trim().toLowerCase()),
        )
      : quests,
  )
</script>

<div class="tab-bar" role="tablist">
  {#each TABS as t (t.key)}
    <button class="tab-btn" class:active={activeTab === t.key} class:soon={!t.ready} onclick={() => (activeTab = t.key)}>
      {t.label}{#if !t.ready}<span class="soon-badge">скоро</span>{/if}
    </button>
  {/each}
</div>

<div class="tab-content">
  {#if activeTab === 'legendaries'}
    <div class="text-block">
      <p>
        Эти мутанты могут получиться у вас в результате скрещивания вообще любых мутантов с подходящими генами
        (например, Воин + Воин = Бак Моррис). Чем выше уровень вашего центра разведений, тем выше шанс на выпадение
        легендарного мутанта со скрещивания.
      </p>
      <p>
        Среди этих мутантов стоит внимания в основном только <strong>Бак Моррис</strong>, его определённо стоит
        выводить. Но в случае нехватки сильных мутантов на старте, можно вывести Звёздного Десантника и Дезингера,
        либо же любого моногена из списка, ибо у них слегка завышены статы. Но в целом, чаще всего найдутся варианты
        получше даже среди секретных.
      </p>
    </div>
    <div class="mutant-grid">
      {#each legendaries as m (m.id)}
        <button class="mutant-card" class:featured={m.id === FEATURED_LEGENDARY} onclick={() => openMutant(m.id)}>
          <span class="mutant-card-genes">
            {#each (m.genes.length ? m.genes : ['neutro']) as g}
              {#if getGeneIcon(g)}<img src={textureUrl(getGeneIcon(g))} alt={g} loading="lazy" decoding="async" />{/if}
            {/each}
          </span>
          <span class="mutant-card-icon">
            {#if m.icon}<img src={textureUrl(m.icon)} alt="" loading="lazy" decoding="async" />{/if}
          </span>
          <span class="mutant-card-name">{m.name}</span>
        </button>
      {/each}
    </div>
  {:else if activeTab === 'zodiac'}
    <div class="text-block">
      <p>
        Все мутанты распределены относительно знаков зодиака и появляются в точно те же даты, что и их аналоги из
        реального мира. Брать их рекомендуем преимущественно ради коллекции и бинго.
      </p>
    </div>
    <div class="zodiac-grid">
      {#each zodiac as z (z.id)}
        <button class="zodiac-card" onclick={() => openMutant(z.id)}>
          <span class="zodiac-card-icon">
            {#if z.icon}<img src={textureUrl(z.icon)} alt="" loading="lazy" decoding="async" />{/if}
          </span>
          <span class="zodiac-card-body">
            <span class="zodiac-card-name">{z.name}</span>
            <span class="zodiac-card-sign">{z.sign}</span>
            <span class="zodiac-card-dates">{z.dateFrom} — {z.dateTo}</span>
          </span>
        </button>
      {/each}
    </div>
  {:else if activeTab === 'tandem'}
    <div class="text-block prose">
      <h2>Как работает тандем?</h2>
      <p>
        В тандем становится последний помещённый в инкубатор мутант, прокаченный на максимум опыта. Иначе говоря,
        существует 2 приоритета, по которым мутант становится в тандем.
      </p>
      <ol>
        <li>
          <strong>Уровень мутанта</strong> — в тандеме всегда будет один из ваших мутантов с наивысшим уровнем Эво, а
          в случае максимального уровня нужно добирать полоску опыта до конца.
        </li>
        <li>
          <strong>Порядок выведения</strong> — если мутант А был помещён в инкубатор раньше мутанта Б, то на
          максимальном уровне обоих в тандем станет именно мутант Б.
        </li>
      </ol>
      <p>
        Причём дальнейший порядок прокачки мутантов никак на это не влияет. Даже если вы сразу заморозите мутанта А
        на 1 уровне и захотите его потом докачать и поставить в тандем, в случае прокачки мутанта Б на максимум,
        мутант А туда уже никак не станет. Тут поможет только прокачка Эво и оставление мутанта Б на уровне пониже.
        Но с такими заморочками лучше просто вывести в тандем нового мутанта.
      </p>
      <div class="note">
        Важно: тандем выбирать нельзя. Как и просто прокачать любого другого на максимум — только через помещение
        мутанта в инкубатор.
      </div>
    </div>
  {:else if activeTab === 'pvp-bug'}
    <div class="text-block prose">
      <h2>Гайд на баг (или фичу) в PvP</h2>
      <p>
        Можете не переживать — бан за это точно не дают. Вы не используете никакой сторонний софт, а всего лишь
        небольшую игровую махинацию, которая существует уже много лет.
      </p>
      <h3>О самом баге</h3>
      <p>
        К самому концу сезона нужно набрать минимум 50 атак (столько требуется по условию попадания в 1%. Можно
        набрать и 30 для 3%, но скорее всего всё равно получится больше) и как можно лучше % в PvP — минимум 10–11%
        (на практике, возможно, и 11–15%, но есть сомнения). Вы должны запомнить, сколько % у вас было в конце
        сезона перед началом нового. Лучше всего проверять свой окончательный % утром перед стартом нового PvP или
        хотя бы ночью в последний день сезона, так как именно на этот показатель вам придётся ориентироваться.
      </p>
      <p>
        Допустим, вы набрали 10%. Как только начнётся новый сезон, вам просто нужно не заходить в PvP-режим (вообще
        не открывать сам раздел при выборе режима боя, то есть даже не собирать награду за прошлое PvP). Не заходить
        нужно столько дней (предположительно), сколько процентов вы набрали в прошлом PvP. Тогда вы получите все
        награды. Пример: у вас было 10%. После старта нового сезона не заходите в PvP 10 дней, после этого туда можно
        зайти и вам выдадут все награды, включая мутанта.
      </p>
      <h3>Как это работает?</h3>
      <p>
        Точный механизм неизвестен, но есть предположение, что со стартом нового PvP игроки, которые забирают
        награды за прошлый сезон, пропадают из рейтинга старого PvP, а люди, которые награды не забрали, — там
        остаются. Так и получается, что по чуть-чуть рейтинг опустевает: большинство игроков с верхушки топа забирает
        награды в первые дни, и люди с низов начинают в этом рейтинге подниматься и оказываться всё ближе к 1%.
        Поэтому точные цифры тут, увы, никак не выявить. Но примерная закономерность есть — каждый день с результата
        прошлого сезона у вас снимается по ≈1%, пока он не достигнет 1% — тогда вы сможете забрать награды.
      </p>
      <h3>Примерный процесс</h3>
      <ul>
        <li>Вы набрали 10% в прошлом сезоне.</li>
        <li>Начался новый сезон — ваш прошлый результат всё ещё учитывается как 10%.</li>
        <li>Уже где-то через пару часов достаточно людей с вершины топа начнёт PvP и заберёт награды за старый сезон — теперь результат учитывается уже как ≈9% (а то и меньше).</li>
        <li>Во вторник — ≈8%, в среду — ≈7%, и так далее.</li>
        <li>Наступает следующий вторник — ваш результат прошлого сезона теперь ≈1%, и вы можете зайти в режим и забрать награды.</li>
      </ul>
      <div class="note">
        Небольшая рекомендация — лучше подождать с запасом 1–2 дня, чтобы точно забрать награды. Если мутант вам не
        нужен, можно ждать до 3% — в этом случае можно сократить ожидание на пару дней. Также можно набирать не
        только 10%, но и 9%, 8% и даже меньше — баг всё равно будет работать, просто время ожидания сократится.
      </div>
      <p>Тут конечно могут быть неточности, но на данный момент игроки ориентируются на указанную выше схему.</p>
    </div>
  {:else if activeTab === 'farmers'}
    <div class="text-block">
      <p>
        Таблица мутантов с нестандартным доходом серебра. Большинство из них — ивентовые мутанты, которых можно
        назвать около мусором в плане фарма, но решили добавить сюда вообще всех.
      </p>
      <p>
        Из достойных новых мутантов можно отметить Даба и Загама, хоть второй и стоит слишком дорого. Оценки
        субъективные, но приближены к реальности — учитывались доход/час, возможность выведения (и комфорт
        выведения), возможность фарма вне люкс-зон и лёгкость получения.
      </p>
      <p>
        Мидасов, Охотников и ДАБов не обязательно выводить в звёзды для фарма — в любой звезде они принесут
        одинаковое количество серебра.
      </p>
    </div>
    <div class="farmers-table-wrap">
      <table class="farmers-table">
        <thead>
          <tr>
            <th>Мутант(ы)</th>
            <th>Фарм серебра/час</th>
            <th>Относительно обычных</th>
            <th>Разведение</th>
            <th>Цена / способ получения</th>
            <th>Оценка</th>
            <th>Итог</th>
          </tr>
        </thead>
        <tbody>
          {#each farmers as row, i (i)}
            <tr>
              <td class="farmers-mutants">
                {#each row.mutants as m (m.id)}
                  <button class="farmer-chip" onclick={() => openMutant(m.id)}>
                    {#if m.icon}<img src={textureUrl(m.icon)} alt="" loading="lazy" decoding="async" />{/if}
                    <span>{m.name}</span>
                  </button>
                {/each}
              </td>
              <td class="num">{fmtSilver(row.silverPerHour)}</td>
              <td class="num">x{row.relative}</td>
              <td class:breedable-yes={row.breedable === 'yes'} class:breedable-no={row.breedable === 'no'}>
                {breedableLabel(row.breedable)}
              </td>
              <td class="price-cell">{row.price}</td>
              <td class="num rating-cell">{row.rating}/10</td>
              <td class="verdict-cell">{row.verdict}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if activeTab === 'speed-orbs'}
    <div class="text-block">
      <p>
        Таблица точного прироста от сфер скорости 3–5 уровня. Когда даёшь мутанту ту или иную сферу скорости, %
        прироста не всегда соответствует указанным на самой сфере 15%, 18% и 20% — в скобках указан реальный прирост
        для каждой конкретной базовой скорости.
      </p>
      <p>
        Как можно заметить, почти везде прирост от сферы выше номинала, особенно на больших скоростях, где может
        набегать по 1–2 лишних процента. Похоже, что каждая прибавка со сферы прописывалась разработчиками вручную, а
        не считалась по единой формуле — скорость с той или иной сферой у части мутантов совпадает с чужой стоковой
        скоростью или скоростью с другим уровнем сферы.
      </p>
    </div>
    <div class="speed-table-wrap">
      <table class="speed-table">
        <thead>
          <tr>
            <th>Скорость</th>
            <th>Сфера 3 (+15%)</th>
            <th>Сфера 4 (+18%)</th>
            <th>Сфера 5 (+20%)</th>
          </tr>
        </thead>
        <tbody>
          {#each speedOrbs as row, i (i)}
            <tr>
              <td class="num base-speed">{fmtSpeed(row.base)}</td>
              <td class="num">{fmtSpeed(row.l3)} <span class="pct">(+{fmtPct(row.l3pct)}%)</span></td>
              <td class="num">{fmtSpeed(row.l4)} <span class="pct">(+{fmtPct(row.l4pct)}%)</span></td>
              <td class="num">{fmtSpeed(row.l5)} <span class="pct">(+{fmtPct(row.l5pct)}%)</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if activeTab === 'quests'}
    <div class="text-block">
      <p>
        Основные (не ивентовые) квесты игры с наградой — ачивки, сюжетные патчи и системные задания. Игра хранит
        5300+ миссий, но у большинства сюжетных/обучающих реплик нет ни названия, ни отдельной награды — сюда попали
        только те, что реально выглядят как квест: название → условие → награда.
      </p>
    </div>
    <input class="quest-search" type="search" placeholder="Поиск по названию или условию…" bind:value={questSearch} />
    <div class="farmers-table-wrap">
      <table class="farmers-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Условие</th>
            <th>Награда</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredQuests as q (q.id)}
            <tr>
              <td class="quest-title">{q.title}</td>
              <td class="verdict-cell">{q.caption}</td>
              <td class="quest-rewards">
                {#each q.rewards as r, i (i)}
                  {#if r.mutant}
                    <button class="farmer-chip" onclick={() => openMutant(r.mutant.id)}>
                      {#if r.mutant.icon}<img src={textureUrl(r.mutant.icon)} alt="" loading="lazy" decoding="async" />{/if}
                      <span>{r.mutant.name}</span>
                    </button>
                  {:else}
                    <span>{r.label}</span>
                  {/if}
                {/each}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if !filteredQuests.length}
        <p class="soon-block">Ничего не найдено.</p>
      {/if}
    </div>
  {:else if activeTab === 'divisions'}
    <div class="text-block">
      <p>
        7 дивизионов кампании (Альфа → Гига), в каждом по 9 карт — одни и те же 9 локаций, но с растущим уровнем
        противников и наградами. Рекомендации по эво-уровню и составу команды — наша оценка, в игре таких подсказок нет.
      </p>
    </div>
    <div class="division-switcher">
      {#each divisions as d, i (d.id)}
        <button class="division-btn" class:active={activeDivision === i} onclick={() => (activeDivision = i)}>{d.name}</button>
      {/each}
    </div>
    {#if divisions[activeDivision]}
      <div class="division-rec">{divisions[activeDivision].recommendation}</div>
      <div class="division-maps">
        {#each divisions[activeDivision].maps as m, i (m.mapId)}
          <div class="division-map-card">
            <div class="division-map-head">
              <span class="division-map-num">Карта {i + 1}</span>
              <span class="division-map-title">{m.locationName}</span>
            </div>
            <p class="division-map-lore">{m.lore}</p>
            <div class="division-map-meta">
              <span>Боёв: <strong>{m.fightCount}</strong></span>
              <span>Уровни врагов: <strong>{m.levelRange[0]}–{m.levelRange[1]}</strong></span>
            </div>
            <div class="division-map-reward">
              Награда за прохождение:
              {#if m.reward.mutant}
                <button class="farmer-chip" onclick={() => openMutant(m.reward.mutant.id)}>
                  {#if m.reward.mutant.icon}<img src={textureUrl(m.reward.mutant.icon)} alt="" loading="lazy" decoding="async" />{/if}
                  <span>{m.reward.mutant.name}</span>
                </button>
              {:else}
                <strong>{m.reward.label}</strong>
              {/if}
            </div>
            {#if m.enemies.length}
              <div class="division-enemies">
                {#each m.enemies as e (e.id)}
                  <button class="enemy-icon" onclick={() => openMutant(e.id)} title={e.name}>
                    {#if e.icon}<img src={textureUrl(e.icon)} alt={e.name} loading="lazy" decoding="async" />{/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {:else if activeTab === 'raids'}
    <div class="text-block">
      <p>
        Рейды (внутриигровая категория «Рейд») — самые долгие забеги в игре (200–300 боёв), но зато каждый
        ГАРАНТИРОВАННО даёт уникального мутанта на одном из боссов по пути. У части рейдов в игре нет отдельного
        текстового названия — такие названия придуманы нами по тематике арта и помечены курсивом.
      </p>
    </div>
    <div class="farmers-table-wrap">
      <table class="farmers-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Мутант-награда</th>
            <th>Боёв / боссов</th>
            <th>Прочие награды</th>
          </tr>
        </thead>
        <tbody>
          {#each raids as r (r.id)}
            <tr>
              <td class:authored-name={r.nameAuthored}>{r.name}</td>
              <td>
                {#if r.mutant}
                  <button class="farmer-chip" onclick={() => openMutant(r.mutant.id)}>
                    {#if r.mutant.icon}<img src={textureUrl(r.mutant.icon)} alt="" loading="lazy" decoding="async" />{/if}
                    <span>{r.mutant.name}</span>
                  </button>
                {:else}
                  —
                {/if}
              </td>
              <td class="num">{r.fightCount} / {r.bossCount}</td>
              <td class="verdict-cell">{fmtCats(r.categories)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if activeTab === 'event-ladders'}
    <div class="text-block">
      <p>
        Ивенты-лесенки (внутриигровая категория pve-event) — сезонные забеги по нескольким картам с растущей
        сложностью. Почти все дают уникального мутанта за прохождение одной из карт (не обязательно последней).
      </p>
    </div>
    <div class="farmers-table-wrap">
      <table class="farmers-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Карт</th>
            <th>Мутант-награда</th>
            <th>Прочие награды</th>
          </tr>
        </thead>
        <tbody>
          {#each eventLadders as e (e.id)}
            <tr>
              <td>{e.name}</td>
              <td class="num">{e.mapCount}</td>
              <td>
                {#if e.mutant}
                  <button class="farmer-chip" onclick={() => openMutant(e.mutant.id)}>
                    {#if e.mutant.icon}<img src={textureUrl(e.mutant.icon)} alt="" loading="lazy" decoding="async" />{/if}
                    <span>{e.mutant.name}</span>
                  </button>
                  <span class="pct">(карта №{Number(e.mutantAtMap) + 1})</span>
                {:else}
                  —
                {/if}
              </td>
              <td class="verdict-cell">{fmtCats(e.categories)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if activeTab === 'special-ladders'}
    <div class="text-block">
      <p>
        Ивентовые лесенки (внутриигровая категория «Эксперимент») — доп. хардкорные забеги (100–150 боёв) на тему тех
        же ивентов, что и обычные лесенки. Часть из них (гейт по гену, «Ямы») даёт уникального мутанта, у остальных —
        чистый фарм жетонов/орб/звёзд. Отдельно показаны «Испытания» — более короткие мини-забеги; большинство тоже
        не даёт мутантов, но есть исключения (Хэллоуин и Jungle Bells старых лет).
      </p>
    </div>
    <div class="division-switcher">
      <button class="division-btn" class:active={activeSpecialSection === 'experiment'} onclick={() => (activeSpecialSection = 'experiment')}>
        Эксперименты ({specialLadders.experiment.length})
      </button>
      <button class="division-btn" class:active={activeSpecialSection === 'challenge'} onclick={() => (activeSpecialSection = 'challenge')}>
        Испытания ({specialLadders.challenge.length})
      </button>
    </div>
    <div class="farmers-table-wrap">
      <table class="farmers-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Мутант-награда</th>
            <th>Боёв / боссов</th>
            <th>Прочие награды</th>
          </tr>
        </thead>
        <tbody>
          {#each specialLadders[activeSpecialSection] as d (d.id)}
            <tr>
              <td class:authored-name={d.nameAuthored}>{d.name}</td>
              <td>
                {#if d.mutant}
                  <button class="farmer-chip" onclick={() => openMutant(d.mutant.id)}>
                    {#if d.mutant.icon}<img src={textureUrl(d.mutant.icon)} alt="" loading="lazy" decoding="async" />{/if}
                    <span>{d.mutant.name}</span>
                  </button>
                {:else}
                  —
                {/if}
              </td>
              <td class="num">{d.fightCount} / {d.bossCount}</td>
              <td class="verdict-cell">{fmtCats(d.categories)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="soon-block">
      <p>Этот раздел ещё в разработке — данные вытаскиваются из игры.</p>
    </div>
  {/if}
</div>

<style>
  .tab-bar { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1.1rem; }
  .tab-btn {
    appearance: none; border: 1px solid rgba(48, 54, 61, 0.6); background: rgba(22, 27, 34, 0.9);
    color: #94a3b8; border-radius: 8px; padding: 0.45rem 0.85rem; font-size: 0.82rem; font-weight: 600; cursor: pointer;
    display: inline-flex; align-items: center; gap: 0.35rem;
  }
  .tab-btn:hover { background: rgba(30, 58, 138, 0.2); color: #fff; }
  .tab-btn.active { background: rgba(30, 58, 138, 0.4); color: #60a5fa; border-color: rgba(96,165,250,0.4); }
  .tab-btn.soon { opacity: 0.7; }
  .soon-badge { font-size: 9px; text-transform: uppercase; background: rgba(148,163,184,0.2); color: #94a3b8; border-radius: 4px; padding: 1px 4px; }

  .text-block { color: #cbd5f5; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.25rem; max-width: 900px; }
  .text-block p { margin: 0 0 0.75rem; }
  .prose h2 { font-size: 1.15rem; color: #e2e8f0; margin: 0 0 0.6rem; }
  .prose h3 { font-size: 1rem; color: #e2e8f0; margin: 1.1rem 0 0.5rem; }
  .prose ol, .prose ul { margin: 0 0 0.75rem; padding-left: 1.3rem; }
  .prose li { margin-bottom: 0.4rem; }
  .note { background: rgba(96,165,250,0.08); border: 1px solid rgba(96,165,250,0.25); border-radius: 8px; padding: 0.75rem 1rem; margin: 0.75rem 0; font-size: 0.87rem; color: #bfdbfe; }

  .mutant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.7rem; }
  .mutant-card { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; padding: 0.6rem 0.4rem; border-radius: 10px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; text-align: center; }
  .mutant-card:hover { background: rgba(30, 41, 59, 0.85); border-color: rgba(96,165,250,0.3); }
  .mutant-card.featured { border-color: rgba(250,204,21,0.6); box-shadow: 0 0 12px rgba(250,204,21,0.25); }
  .mutant-card-genes { display: flex; gap: 3px; }
  .mutant-card-genes img { width: 16px; height: 16px; }
  .mutant-card-icon { width: 52px; height: 52px; border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.25); }
  .mutant-card-icon img { width: 100%; height: 100%; object-fit: cover; }
  .mutant-card-name { font-size: 11.5px; font-weight: 600; color: #e2e8f0; line-height: 1.2; }

  .zodiac-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.65rem; }
  .zodiac-card { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.7rem; border-radius: 10px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; text-align: left; }
  .zodiac-card:hover { background: rgba(30, 41, 59, 0.85); border-color: rgba(96,165,250,0.3); }
  .zodiac-card-icon { width: 44px; height: 44px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.25); }
  .zodiac-card-icon img { width: 100%; height: 100%; object-fit: cover; }
  .zodiac-card-body { display: flex; flex-direction: column; }
  .zodiac-card-name { font-size: 12.5px; font-weight: 700; color: #e2e8f0; }
  .zodiac-card-sign { font-size: 11px; color: #60a5fa; }
  .zodiac-card-dates { font-size: 10.5px; color: #94a3b8; }

  .farmers-table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; }
  .farmers-table { border-collapse: collapse; width: 100%; font-size: 0.78rem; min-width: 900px; }
  .farmers-table th { position: sticky; top: 0; background: #161b22; color: #94a3b8; text-align: left; padding: 0.4rem 0.5rem; font-weight: 700; white-space: nowrap; border-bottom: 1px solid rgba(255,255,255,0.12); }
  .farmers-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: top; color: #cbd5f5; }
  .farmers-mutants { display: flex; flex-direction: column; gap: 3px; min-width: 160px; }
  .farmer-chip { display: inline-flex; align-items: center; gap: 0.35rem; background: transparent; border: none; color: #e2e8f0; font-size: 0.78rem; font-weight: 600; cursor: pointer; padding: 1px 0; text-align: left; }
  .farmer-chip:hover { color: #60a5fa; }
  .farmer-chip img { width: 20px; height: 20px; border-radius: 4px; object-fit: cover; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .rating-cell { font-weight: 700; color: #86efac; }
  .price-cell { min-width: 160px; font-size: 0.76rem; color: #94a3b8; }
  .verdict-cell { min-width: 260px; font-size: 0.76rem; color: #94a3b8; line-height: 1.4; }
  .breedable-yes { color: #86efac; font-weight: 600; white-space: nowrap; }
  .breedable-no { color: #fca5a5; font-weight: 600; white-space: nowrap; }
  .authored-name { font-style: italic; }
  .quest-search {
    display: block; width: 100%; max-width: 360px; margin-bottom: 0.75rem; padding: 0.45rem 0.7rem;
    background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
    color: #e2e8f0; font-size: 0.85rem;
  }
  .quest-search:focus { outline: none; border-color: rgba(96,165,250,0.4); }
  .quest-title { font-weight: 700; color: #e2e8f0; min-width: 180px; }
  .quest-rewards { display: flex; flex-direction: column; gap: 3px; min-width: 160px; }
  .quest-rewards span { font-size: 0.78rem; color: #94a3b8; }

  .speed-table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; max-height: 640px; overflow-y: auto; }
  .speed-table { border-collapse: collapse; width: 100%; font-size: 0.8rem; min-width: 560px; }
  .speed-table th { position: sticky; top: 0; background: #161b22; color: #94a3b8; text-align: right; padding: 0.4rem 0.6rem; font-weight: 700; white-space: nowrap; border-bottom: 1px solid rgba(255,255,255,0.12); }
  .speed-table th:first-child { text-align: left; }
  .speed-table td { padding: 0.32rem 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.04); color: #cbd5f5; }
  .speed-table .base-speed { font-weight: 700; color: #e2e8f0; text-align: left; }
  .speed-table .pct { color: #64748b; font-size: 0.72rem; }

  .division-switcher { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
  .division-btn { appearance: none; border: 1px solid rgba(48, 54, 61, 0.6); background: rgba(15, 23, 42, 0.6); color: #94a3b8; border-radius: 8px; padding: 0.4rem 0.8rem; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
  .division-btn:hover { color: #e2e8f0; border-color: rgba(96,165,250,0.3); }
  .division-btn.active { background: rgba(30, 58, 138, 0.4); color: #60a5fa; border-color: rgba(96,165,250,0.4); }
  .division-rec { background: rgba(96,165,250,0.08); border: 1px solid rgba(96,165,250,0.25); border-radius: 8px; padding: 0.65rem 0.9rem; margin-bottom: 1rem; font-size: 0.85rem; color: #bfdbfe; }
  .division-maps { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
  .division-map-card { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 0.75rem 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .division-map-head { display: flex; align-items: baseline; gap: 0.5rem; }
  .division-map-num { font-size: 10.5px; text-transform: uppercase; color: #64748b; font-weight: 700; }
  .division-map-title { font-size: 0.92rem; font-weight: 800; color: #e2e8f0; }
  .division-map-lore { margin: 0; font-size: 0.76rem; color: #94a3b8; line-height: 1.45; }
  .division-map-meta { display: flex; gap: 0.9rem; font-size: 0.76rem; color: #94a3b8; }
  .division-map-meta strong { color: #cbd5f5; }
  .division-map-reward { font-size: 0.78rem; color: #94a3b8; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
  .division-map-reward strong { color: #86efac; }
  .division-enemies { display: flex; flex-wrap: wrap; gap: 4px; max-height: 84px; overflow-y: auto; }
  .enemy-icon { width: 26px; height: 26px; border-radius: 6px; overflow: hidden; background: rgba(0,0,0,0.3); border: none; padding: 0; cursor: pointer; }
  .enemy-icon img { width: 100%; height: 100%; object-fit: cover; }
  .enemy-icon:hover { outline: 2px solid rgba(96,165,250,0.5); }

  .soon-block { color: #64748b; padding: 2rem 0; text-align: center; font-size: 0.9rem; }

  @media (max-width: 767px) {
    .mutant-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); }
    .zodiac-grid { grid-template-columns: 1fr; }
  }
</style>
