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

// Реальные id, взятые прямо из данных репозитория (иначе резолверы box/bingo/
// exchange не найдут запись и упадут на пустой текст).
const SAMPLES: CrossPostAnnouncement[] = [
  {
    category: 'mutant',
    title: 'Робот',
    items: [{ id: 'specimen_a_01', name: 'Робот', image: null }],
  },
  {
    category: 'skin',
    title: 'Робот — Япония',
    items: [{ id: 'Specimen_A_01|japan', name: 'Робот — Япония', image: null }],
  },
  {
    category: 'raid',
    title: 'Рейд «Architecture»',
    items: [{ id: 'architecture', name: 'Рейд «Architecture» (300 боёв)', image: null }],
  },
  {
    category: 'ladder',
    title: 'Лесенка «Hellfire»',
    items: [{ id: 'hellfire_13', name: 'Лесенка «Hellfire» (150 боёв)', image: null }],
  },
  {
    category: 'reactor',
    title: 'Вестерн',
    items: [{ id: 'western', name: 'Вестерн', image: null }],
  },
  {
    category: 'token',
    title: 'Магнитный ключ',
    items: [{ id: 'Daily_Token', name: 'Магнитный ключ', image: null }],
  },
  {
    category: 'box',
    title: 'Золотой легендарный контейнер х2',
    items: [
      { id: 'LuckyBox_Legend_Gold_Duo', name: 'Золотой легендарный контейнер х2', image: null },
    ],
  },
  {
    category: 'bingo',
    title: 'Гекс-Сити: Юбилей',
    items: [{ id: 'anniversary_26', name: 'Гекс-Сити: Юбилей', image: null }],
  },
  {
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

  // shopForecast/dailyNews - реальный тянущийся прогноз (следующий спринт),
  // тестируем комбо-формат на живых текущих данных, не на выдумке.
  const { fetchShopForecast } = await import('./detect-shop-forecast')
  const { fetchDailyNewsForecast } = await import('./detect-daily-news')
  const [shop, daily] = await Promise.all([fetchShopForecast(), fetchDailyNewsForecast()])
  if (shop || daily) {
    console.log('[SIMULATE] -> shopForecast + dailyNews (комбо)')
    await postShopAndDailyNews(
      shop
        ? {
            category: 'shopForecast',
            title: 'shopForecast',
            items: [
              {
                id: String(shop.sprint),
                name: `Прогноз магазина (${shop.dateRangeLabel}): ${shop.items.length} предложений`,
                image: shop.items[0]?.image ?? null,
              },
            ],
          }
        : null,
      daily
        ? {
            category: 'dailyNews',
            title: 'dailyNews',
            items: [
              {
                id: String(daily.sprint),
                name: `Скоро в игре (${daily.dateRangeLabel}): ${daily.items.length} событий`,
                image: daily.coverImage,
              },
            ],
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
