import type { APIRoute } from 'astro'
import crypto from 'node:crypto'

// Реле для Vercel Spend Management webhook (Settings -> Billing -> Spend
// Management -> Configure a webhook) - шлёт POST при 50/75/100% лимита трат
// и в конце биллинг-цикла. Тот же паттерн, что uptime-alert.ts для UptimeRobot:
// принимает вебхук стороннего сервиса, пересылает в тот же Telegram-чат.
// Секрет - тот, что Vercel показывает один раз при сохранении webhook URL
// в дашборде; подписывает HMAC-SHA256 сырого тела запроса (x-vercel-signature).
export const POST: APIRoute = async ({ request }) => {
  const BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN
  const CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID
  const WEBHOOK_SECRET = import.meta.env.VERCEL_SPEND_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('VERCEL_SPEND_WEBHOOK_SECRET is not configured — endpoint disabled')
    return new Response('Not configured', { status: 503 })
  }
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured')
    return new Response('Not configured', { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-vercel-signature') ?? ''
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')

  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)
  if (!valid) {
    return new Response('Forbidden', { status: 403 })
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const text =
    payload.type === 'endOfBillingCycle'
      ? '[Vercel]\nℹ️ Биллинг-цикл завершился (если пауза стояла - проекты нужно возобновить руками).'
      : `[Vercel]\n💸 Траты: ${payload.currentSpend}$ из ${payload.budgetAmount}$ (${payload.thresholdPercent}%)`

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
  })

  return new Response('OK', { status: 200 })
}
