import type { APIRoute } from 'astro'
import { chromium, type Browser } from 'playwright-core'

// Тот же паттерн, что screenshot-bingo.ts/screenshot-rebalance.ts - отдельный
// singleton-браузер на модуль, дублирование намеренное. Генерирует скриншот
// ЛЮБОЙ карточки анонса по её data-announcement-id, чтобы бот-кросспост не
// держал отдельный текстовый шаблон под каждую категорию - карточка на сайте
// (announcements.astro) единственный источник правды по виду.
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
  const id = url.searchParams.get('id')
  if (!id) {
    return new Response('Missing id param', { status: 400 })
  }

  const origin = url.origin
  const pageUrl = `${origin}/announcements`

  for (let attempt = 0; attempt < 2; attempt++) {
    let page
    try {
      const browser = await getBrowser()
      page = await browser.newPage({
        deviceScaleFactor: 2,
        viewport: { width: 700, height: 1000 },
      })

      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

      const selector = `article.card[data-announcement-id="${id}"]`
      await Promise.all([
        page.waitForSelector(selector, { timeout: 12000, state: 'attached' }),
        page.evaluate(() => document.fonts.ready),
      ])

      // Карточки используют loading="lazy" (нужно для реальных посетителей
      // ленты, не трогаем разметку) - без scroll/intersection браузер их не
      // грузит, скриншот ловил бы пустые ячейки. Форсим eager для захвата.
      // Скриншот бинго-карточки НЕ идёт через этот эндпоинт (она сама
      // встраивает <img src="/api/screenshot-bingo">, второй проход тут
      // вызвал бы Chromium-в-Chromium) - бот берёт её отдельным путём.
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
      const browserDied = /has been closed|disconnected|Target closed/i.test(message)
      if (browserDied && attempt === 0) {
        browserPromise = null
        continue
      }
      console.error('[Screenshot-Announcement]', message)
      return new Response(`Screenshot error: ${message}`, { status: 500 })
    } finally {
      try {
        await page?.close()
      } catch {}
    }
  }
  return new Response('Screenshot error: browser unavailable after retry', { status: 500 })
}
