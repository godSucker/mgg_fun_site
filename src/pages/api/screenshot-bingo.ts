import type { APIRoute } from 'astro'
import { chromium, type Browser } from 'playwright-core'

// Отдельный singleton-браузер (тот же паттерн, что screenshot.ts) - модульный
// scope не шарится между разными API-роутами Astro, дублирование намеренное
// (тот же приём уже используется в screenshot-rebalance.ts).
let browserPromise: Promise<Browser> | null = null

async function launchBrowser(): Promise<Browser> {
  const Chromium = (await import('@sparticuz/chromium')).default
  const execPath = await Chromium.executablePath()
  const browser = await chromium.launch({
    executablePath: execPath,
    args: Chromium.args,
  })
  browser.on('disconnected', () => {
    if (browserPromise === launchingPromise) browserPromise = null
  })
  return browser
}

let launchingPromise: Promise<Browser> | null = null

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const existing = await browserPromise
      if (existing.isConnected()) return existing
    } catch {
      // предыдущий запуск упал - пересоздаём ниже
    }
    browserPromise = null
  }
  launchingPromise = launchBrowser()
  browserPromise = launchingPromise
  return browserPromise
}

export const GET: APIRoute = async ({ url }) => {
  const boardId = url.searchParams.get('board')
  if (!boardId) {
    return new Response('Missing board param', { status: 400 })
  }

  const origin = url.origin
  const pageUrl = `${origin}/bingo?board=${encodeURIComponent(boardId)}`

  for (let attempt = 0; attempt < 2; attempt++) {
    let page
    try {
      const browser = await getBrowser()
      page = await browser.newPage({
        deviceScaleFactor: 2,
        viewport: { width: 1200, height: 1000 },
      })

      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

      const selector = `.bingo-panel[data-bingo-id="${boardId}"] .bingo-card`
      await Promise.all([
        page.waitForSelector(selector, { timeout: 12000, state: 'visible' }),
        page.evaluate(() => document.fonts.ready),
      ])

      // .mutant-img использует loading="lazy" (нужен для реальных посетителей,
      // не трогаем разметку) - без scroll/intersection браузер их не грузит
      // вообще, скриншот ловил пустые ячейки. Форсим eager именно для захвата.
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
          { timeout: 10000 },
        )
        .catch(() => {})

      await page.waitForTimeout(200)

      const card = await page.$(selector)
      if (!card) {
        return new Response('Bingo card not found', { status: 404 })
      }
      const buffer = (await card.screenshot({ type: 'png' })) as Buffer

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          // Встраивается как обычная <img> на /announcements - без кэша
          // каждый визит гонял бы Chromium заново. Доска меняется редко.
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const browserDied = /has been closed|disconnected|Target closed/i.test(message)
      if (browserDied && attempt === 0) {
        browserPromise = null
        continue
      }
      console.error('[Screenshot-Bingo]', message)
      return new Response(`Screenshot error: ${message}`, { status: 500 })
    } finally {
      try {
        await page?.close()
      } catch {}
    }
  }
  return new Response('Screenshot error: browser unavailable after retry', { status: 500 })
}
