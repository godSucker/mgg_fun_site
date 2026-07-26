import type { APIRoute } from 'astro'

// Vercel Webhooks (Account Settings -> Webhooks, НЕ то же самое, что Deploy
// Hooks) шлёт events типа "deployment.succeeded"/"deployment.error" на этот
// URL, подписывая тело HMAC-SHA1 секретом, который задаётся при создании
// вебхука в Vercel. Пересылаем результат в тот же Telegram-бот, что и
// остальные алерты (uptime-alert.ts, spend-alert.ts).
export const POST: APIRoute = async ({ request }) => {
  const BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN
  const CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID
  const WEBHOOK_SECRET = import.meta.env.VERCEL_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('VERCEL_WEBHOOK_SECRET is not configured — endpoint disabled')
    return new Response('Not configured', { status: 503 })
  }
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured')
    return new Response('Not configured', { status: 503 })
  }

  const rawBody = await request.text()

  const signature = request.headers.get('x-vercel-signature')
  const crypto = await import('node:crypto')
  const expected = crypto.createHmac('sha1', WEBHOOK_SECRET).update(rawBody).digest('hex')
  if (!signature || signature !== expected) {
    return new Response('Forbidden', { status: 403 })
  }

  let payload: {
    type?: string
    payload?: { deployment?: { url?: string; name?: string }; target?: string | null }
  } = {}
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const type = payload.type ?? ''
  // target лежит прямо в payload.payload.target, а НЕ в payload.payload.deployment.target -
  // так было изначально написано неверно, из-за чего фильтр всегда считал
  // деплой "не прод" и молча пропускал (без ошибки, 200 OK).
  const target = payload.payload?.target ?? ''
  // Превью-деплои (на каждый PR/пуш в ветку) не интересны — только прод.
  if (target !== 'production') {
    return new Response('OK (ignored, not production)', { status: 200 })
  }

  const icon = type === 'deployment.succeeded' ? '✅' : type === 'deployment.error' ? '🔴' : 'ℹ️'
  const label =
    type === 'deployment.succeeded'
      ? 'Деплой прода завершён успешно'
      : type === 'deployment.error'
        ? 'Деплой прода упал с ошибкой'
        : type

  if (type !== 'deployment.succeeded' && type !== 'deployment.error') {
    return new Response('OK (ignored event type)', { status: 200 })
  }

  const text = `[Vercel]\n${icon} ${label}`

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
  })

  return new Response('OK', { status: 200 })
}
