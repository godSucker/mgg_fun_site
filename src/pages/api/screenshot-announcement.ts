import type { APIRoute } from 'astro'
import { chromium } from 'playwright-core'
import { cleanupStalePlaywrightProfiles } from '@/lib/chromium-tmp-cleanup'

// Генерирует скриншот ЛЮБОЙ карточки анонса по её data-announcement-id, чтобы
// бот-кросспост не держал отдельный текстовый шаблон под каждую категорию -
// карточка на сайте (announcements.astro) единственный источник правды по виду.
//
// НЕ держим browser-singleton между запросами (в отличие от старой ревизии
// этого файла и screenshot-bingo.ts) - на живом прогоне 2026-08-07 (7 вызовов
// подряд с интервалом ~2с из cross-post батча) singleton копил свежий
// user-data-dir на КАЖДЫЙ запуск (реального переиспользования тёплого браузера
// не происходило - Vercel логи показали новый launch с новым профилем на
// каждый вызов), эти профили не удалялись и за несколько таких прогонов
// забили /tmp контейнера до 0 байт свободного места -> Chromium падал на
// "Less than 64MB of free space" / "AllocateRingBuffer() failed" - ЛЮБОЙ
// следующий скриншот (включая уже год как работающий screenshot-bingo в том
// же контейнере) падал вместе с ним. Полный launch+close на каждый запрос
// медленнее на холодный старт, но не копит мусор между вызовами.
export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id')
  if (!id) {
    return new Response('Missing id param', { status: 400 })
  }

  const origin = url.origin
  const pageUrl = `${origin}/announcements`

  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  try {
    await cleanupStalePlaywrightProfiles()
    const Chromium = (await import('@sparticuz/chromium')).default
    const execPath = await Chromium.executablePath()
    browser = await chromium.launch({
      executablePath: execPath,
      args: Chromium.args,
    })
    const page = await browser.newPage({
      deviceScaleFactor: 2,
      viewport: { width: 700, height: 1000 },
    })

    // Бинго-карточка на /announcements сама встраивает
    // <img src="/api/screenshot-bingo"> - если она попадёт в 700x1000
    // вьюпорт, браузер запросит её и словит Chromium-в-Chromium. Обрезаем эти
    // запросы: бот берёт скриншот бинго отдельным путём (screenshot-bingo.ts).
    await page.route('**/api/screenshot-bingo*', (route) => route.abort())

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

    const selector = `article.card[data-announcement-id="${id}"]`
    await Promise.all([
      page.waitForSelector(selector, { timeout: 12000, state: 'attached' }),
      page.evaluate(() => document.fonts.ready),
    ])

    // Карточки используют loading="lazy" (нужно для реальных посетителей
    // ленты, не трогаем разметку) - без scroll/intersection браузер их не
    // грузит, скриншот ловил бы пустые ячейки. Форсим eager для захвата.
    await page.evaluate((sel) => {
      document
        .querySelectorAll(`${sel} img[loading="lazy"]`)
        .forEach((img) => img.setAttribute('loading', 'eager'))
    }, selector)

    await page
      .waitForFunction(
        (sel) => {
          const imgs = Array.from(document.querySelectorAll(`${sel} img`))
          return imgs.length === 0 || imgs.every((i) => (i as HTMLImageElement).complete)
        },
        selector,
        { timeout: 12000 },
      )
      .catch(() => {})

    await page.waitForTimeout(200)

    const card = await page.$(selector)
    if (!card) {
      return new Response('Announcement card not found', { status: 404 })
    }
    const buffer = (await card.screenshot({ type: 'png' })) as Buffer

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Screenshot-Announcement]', message)
    return new Response(`Screenshot error: ${message}`, { status: 500 })
  } finally {
    try {
      await browser?.close()
    } catch {}
  }
}
