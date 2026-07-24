import type { APIRoute } from 'astro'
import { chromium } from 'playwright-core'

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin
  const renderUrl = `${origin}/rebalance`

  let browser
  try {
    const Chromium = (await import('@sparticuz/chromium')).default
    const execPath = await Chromium.executablePath()
    browser = await chromium.launch({
      executablePath: execPath,
      args: Chromium.args,
    })

    const page = await browser.newPage({
      deviceScaleFactor: 2,
      viewport: { width: 1000, height: 900 },
    })

    await page.goto(renderUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

    await Promise.all([
      page.waitForSelector('.rebalance-page', { timeout: 12000 }),
      page.evaluate(() => document.fonts.ready),
    ])

    await page
      .waitForFunction(
        () => {
          const imgs = Array.from(document.querySelectorAll('.rebalance-page img'))
          return imgs.length === 0 || imgs.every((i) => (i as HTMLImageElement).complete)
        },
        { timeout: 5000 },
      )
      .catch(() => {})

    await page.evaluate(() => {
      // Раскрываем все прогоны ребаланса - по умолчанию свёрнут только первый <details>
      document.querySelectorAll('.rebalance-page details.run').forEach((el) => {
        ;(el as HTMLDetailsElement).open = true
      })

      // Sticky header и футер попадают в кадр вырезки элемента - убираем их
      document.querySelectorAll('header, footer').forEach((el) => {
        ;(el as HTMLElement).style.display = 'none'
      })

      const page = document.querySelector('.rebalance-page') as HTMLElement | null
      if (page) {
        page.style.maxWidth = 'none'
        page.style.padding = '1.5rem'
        page.style.background = '#0d1117'
      }

      const wm = document.createElement('div')
      wm.innerText = 'ARCHIVIST-LIBRARY.COM'
      Object.assign(wm.style, {
        textAlign: 'center',
        fontSize: '12px',
        color: '#637083',
        marginTop: '20px',
        paddingTop: '14px',
        borderTop: '1px solid #3a475a',
        fontWeight: '700',
        letterSpacing: '2px',
        fontFamily: 'sans-serif',
      })
      page?.appendChild(wm)
    })
    await page.waitForTimeout(100)

    const target = await page.$('.rebalance-page')
    if (!target) {
      return new Response('Rebalance page not found', { status: 500 })
    }
    const buffer = (await target.screenshot({ type: 'png' })) as Buffer

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Screenshot Rebalance]', message)
    return new Response(`Screenshot error: ${message}`, { status: 500 })
  } finally {
    try {
      await browser?.close()
    } catch {}
  }
}
