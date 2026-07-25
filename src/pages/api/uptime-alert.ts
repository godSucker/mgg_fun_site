import type { APIRoute } from 'astro'

// Бесплатный обход платной Telegram-интеграции UptimeRobot: их Webhook Alert
// Contact бесплатен на любом тарифе, просто шлёт кастомный JSON на любой URL.
// Этот эндпоинт принимает такой вебхук и пересылает сообщение в тот же
// Telegram-бот, что уже используется для tier-webhook (единая точка алертов).
export const POST: APIRoute = async ({ request, url }) => {
  const BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN
  const CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID
  const ALERT_SECRET = import.meta.env.UPTIME_ALERT_SECRET

  if (!ALERT_SECRET) {
    console.error('UPTIME_ALERT_SECRET is not configured — endpoint disabled')
    return new Response('Not configured', { status: 503 })
  }
  if (url.searchParams.get('secret') !== ALERT_SECRET) {
    return new Response('Forbidden', { status: 403 })
  }
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured')
    return new Response('Not configured', { status: 503 })
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = await request.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const monitor = String(payload.monitorFriendlyName ?? 'archivist-library.com')
  const alertType = String(payload.alertTypeFriendlyName ?? 'Alert')
  const monitorUrl = String(payload.monitorURL ?? '')
  const details = String(payload.alertDetails ?? '')

  const isUp = /up/i.test(alertType)
  const icon = isUp ? '✅' : '🔴'
  const text = [
    `[UptimeRobot]`,
    `${icon} ${monitor}`,
    `Статус: ${alertType}`,
    details ? `Детали: ${details}` : null,
    monitorUrl ? monitorUrl : null,
  ]
    .filter(Boolean)
    .join('\n')

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
  })

  return new Response('OK', { status: 200 })
}
