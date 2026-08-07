// Одноразовый тест-скрипт: гоняет ВСЕ шаблоны кросс-поста (scripts/
// telegram-cross-post.ts) на реальных существующих записях (не выдуманных id -
// иначе box/bingo лукапы по groups/mutants ничего не найдут), с меткой
// "🧪 ТЕСТ" (CROSS_POST_TEST_MODE=1) чтобы не спутать с настоящими анонсами.
// НЕ пишет в announcements.json/ledger - только шлёт в Telegram, ничего не
// коммитится. Запуск:
//   TELEGRAM_BOT_TOKEN=... TELEGRAM_CHANNEL_ID=... npx tsx scripts/simulate-announcements-test.ts
//
// "3 месяца" - не значит 3 месяца реального ожидания, а "полный прогон всех
// категорий разом, как будто это история за 3 месяца" - даты тут ни на что
// не влияют (Telegram не умеет постить задним числом), они только для
// логов/порядка отправки.

process.env.CROSS_POST_TEST_MODE = '1'

import {
  crossPostAnnouncement,
  postShopAndDailyNews,
  type CrossPostAnnouncement,
} from './telegram-cross-post'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// id самих Announcement (a.id) ДОЛЖНЫ совпадать с записями, реально лежащими
// в прод-announcements.json (scripts/simulate-announcements-page-data.ts,
// префикс "test-") - postGenericCard теперь скриншотит карточку с живого
// /announcements по data-announcement-id, а не строит текст сама. Если id не
// совпадёт с прод-данными, сработает фолбэк на текст (не сломается, но
// проверит не то, что нужно). id item[0] внутри - реальные id из репозитория,
// нужны box/bingo/exchange резолверам.
const SAMPLES: CrossPostAnnouncement[] = [
  {
    id: 'test-mutant-1',
    category: 'mutant',
    title: 'Робот',
    items: [{ id: 'specimen_a_01', name: 'Робот', image: null }],
  },
  {
    id: 'test-skin-1',
    category: 'skin',
    title: 'Робот — Япония',
    items: [{ id: 'Specimen_A_01|japan', name: 'Робот — Япония', image: null }],
  },
  {
    id: 'test-raid-1',
    category: 'raid',
    title: 'Рейд «Architecture»',
    items: [{ id: 'architecture', name: 'Рейд «Architecture» (300 боёв)', image: null }],
  },
  {
    id: 'test-ladder-1',
    category: 'ladder',
    title: 'Лесенка «Hellfire»',
    items: [{ id: 'hellfire_13', name: 'Лесенка «Hellfire» (150 боёв)', image: null }],
  },
  {
    id: 'test-reactor-1',
    category: 'reactor',
    title: 'Вестерн',
    items: [{ id: 'western', name: 'Вестерн', image: null }],
  },
  {
    id: 'test-token-1',
    category: 'token',
    title: 'Магнитный ключ',
    items: [{ id: 'Daily_Token', name: 'Магнитный ключ', image: null }],
  },
  {
    id: 'test-box-1',
    category: 'box',
    title: 'Золотой легендарный контейнер х2',
    items: [
      { id: 'LuckyBox_Legend_Gold_Duo', name: 'Золотой легендарный контейнер х2', image: null },
    ],
  },
  {
    id: 'test-bingo-1',
    category: 'bingo',
    title: 'Гекс-Сити: Юбилей',
    items: [{ id: 'anniversary_26', name: 'Гекс-Сити: Юбилей', image: null }],
  },
  {
    id: 'test-exchange-1',
    category: 'exchange',
    title: 'Обновление зала обмена',
    items: [
      { id: 'specimen_aa_04', name: 'Кобра — Зал обмена — 1300 жетонов Hexcity', image: null },
    ],
  },
]

async function main() {
  console.log(`[SIMULATE] ${SAMPLES.length} категорий + 1 комбо-пост (прогноз магазина/daily_news)`)

  for (const a of SAMPLES) {
    console.log(`[SIMULATE] -> ${a.category}`)
    await crossPostAnnouncement(a)
    await sleep(2000) // не флудить Telegram API (лимит ~30 msg/sec на бота, но и лишним не стоит)
  }

  // shopForecast/dailyNews - id ДОЛЖЕН совпадать с записью на прод-странице
  // (scripts/simulate-announcements-page-data.ts генерирует "test-shopForecast-<sprint>"/
  // "test-dailyNews-<sprint>" на том же живом спринте) - иначе скриншот карточки
  // не найдёт совпадение по data-announcement-id и упадёт на текстовый фолбэк.
  const { fetchShopForecast } = await import('./detect-shop-forecast')
  const { fetchDailyNewsForecast } = await import('./detect-daily-news')
  const [shop, daily] = await Promise.all([fetchShopForecast(), fetchDailyNewsForecast()])
  if (shop || daily) {
    console.log('[SIMULATE] -> shopForecast + dailyNews (комбо)')
    await postShopAndDailyNews(
      shop
        ? {
            id: `test-shopForecast-${shop.sprint}`,
            category: 'shopForecast',
            title: `Прогноз магазина (${shop.dateRangeLabel})`,
            items: shop.items.map((it) => ({
              id: `${shop.sprint}|${it.itemId}`,
              name: it.name,
              image: it.image,
            })),
          }
        : null,
      daily
        ? {
            id: `test-dailyNews-${daily.sprint}`,
            category: 'dailyNews',
            title: `Скоро в игре (${daily.dateRangeLabel})`,
            items: daily.items.map((it) => ({
              id: `${daily.sprint}|${it.filter}`,
              name: it.name,
              image: it.image ?? daily.coverImage,
            })),
          }
        : null,
    )
  }

  console.log('[SIMULATE] Готово.')
}

main().catch((err) => {
  console.error('[SIMULATE] Ошибка:', err instanceof Error ? err.message : err)
  process.exit(1)
})
