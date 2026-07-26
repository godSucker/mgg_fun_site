import type { APIRoute } from 'astro'

const VALID_TIERS = ['1', '1+', '1-', '2', '2+', '2-', '3', '3+', '3-', '4', 'un-tired']

// В группе (несколько людей, файлы шлют не только для тиров) нужен явный
// триггер в подписи/тексте сообщения, иначе любой присланный файл будет
// пытаться распарситься как тиры.
const TIER_TRIGGER = '.тир'

// Кнопки статуса/синка/напоминалки: раньше были inline-кнопками, которые
// появлялись только под ответом на /start - нужно было каждый раз печатать
// команду, чтобы их снова увидеть. Reply-keyboard же остаётся приколотой в
// интерфейсе Telegram (над полем ввода) постоянно, после первой отправки -
// не команда, а обычная часть интерфейса чата.
const STATUS_LABEL = '📊 Статус сайта'
const LASTSYNC_LABEL = '🔄 Последний синк'
const PAYMENTS_LABEL = '💳 Напоминалка'
const YANDEX_BALANCE_LABEL = '💰 Баланс Яндекс'
const REPLY_KEYBOARD = {
  keyboard: [
    [{ text: STATUS_LABEL }, { text: LASTSYNC_LABEL }],
    [{ text: PAYMENTS_LABEL }, { text: YANDEX_BALANCE_LABEL }],
  ],
  resize_keyboard: true,
  is_persistent: true,
}

const YANDEX_BILLING_ACCOUNT_ID = 'dn28giqm4gc781aj82ca'

// Живой баланс биллинг-аккаунта Yandex Cloud - тот же JWT-flow, что и в
// payments-reminder.yml (там для крона, здесь - для кнопки по требованию).
// Публичный billing API не отдаёт "потрачено в этом цикле", только текущий
// баланс счёта - см. комментарий в payments-reminder.yml.
async function getYandexBalance(saKeyJson: string): Promise<string> {
  const key = JSON.parse(saKeyJson) as {
    id: string
    service_account_id: string
    private_key: string
  }
  const b64url = (buf: Buffer) =>
    buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'PS256', typ: 'JWT', kid: key.id }
  const payload = {
    iss: key.service_account_id,
    aud: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(Buffer.from(JSON.stringify(payload)))}`
  const crypto = await import('node:crypto')
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), {
    key: key.private_key,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  })
  const jwt = `${unsigned}.${b64url(signature)}`

  const tokenRes = await fetch('https://iam.api.cloud.yandex.net/iam/v1/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jwt }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.iamToken) throw new Error('no iamToken in IAM response')

  const acctRes = await fetch(
    `https://billing.api.cloud.yandex.net/billing/v1/billingAccounts/${YANDEX_BILLING_ACCOUNT_ID}`,
    { headers: { Authorization: `Bearer ${tokenData.iamToken}` } },
  )
  const acct = await acctRes.json()
  const balance = Number(acct.balance).toFixed(2)
  return `💰 Баланс Yandex Cloud: ${balance} ${acct.currency}`
}

// Команда пометки оплаты: ".оплатил <id>" — переводит nextDue на следующий
// цикл (месяц/год) и коммитит payments.json, чтобы напоминание не срабатывало
// вечно на уже оплаченную дату.
const PAID_TRIGGER = '.оплатил'

interface PaymentService {
  id: string
  name: string
  amount: number | null
  currency: string
  period: 'monthly' | 'yearly'
  nextDue: string
}
interface PaymentsData {
  reminderThresholdDays: number
  services: PaymentService[]
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

// Продвигает дату на один цикл вперёд (месяц/год), сохраняя число месяца -
// в отличие от "+30 дней", не уезжает от исходного дня (20-е) со временем.
function advanceOneCycle(dateStr: string, period: PaymentService['period']): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  if (period === 'yearly') {
    d.setFullYear(d.getFullYear() + 1)
  } else {
    // setMonth() переполняется в следующий месяц для 29-31 числа, если в
    // целевом месяце столько дней нет (31 янв -> 3 марта вместо 28 фев) -
    // ставим 1-е число перед сдвигом, потом клэмпим обратно на последний
    // день месяца, если исходное число больше, чем дней в целевом месяце.
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    const daysInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, daysInTargetMonth))
  }
  return d.toISOString().slice(0, 10)
}

function advanceUntilFuture(dateStr: string, period: PaymentService['period']): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = dateStr
  while (new Date(next).getTime() <= today.getTime()) {
    next = advanceOneCycle(next, period)
  }
  return next
}

function formatPaymentsList(data: PaymentsData): string {
  if (data.services.length === 0) return '📋 Список платежей пуст.'
  const lines = data.services.map((s) => {
    const d = daysUntil(s.nextDue)
    const icon = d < 0 ? '🔴' : d <= data.reminderThresholdDays ? '🟡' : '🟢'
    const when =
      d < 0 ? `просрочено на ${Math.abs(d)} дн.` : d === 0 ? 'сегодня!' : `через ${d} дн.`
    const sum = s.amount == null ? '— сумма плавает, см. биллинг' : `— ${s.amount} ${s.currency}`
    return `${icon}  *${s.name}*\n     ${sum}\n     📅 ${s.nextDue} · ${when}`
  })
  return `📋 *Ближайшие платежи*\n\n${lines.join('\n\n')}`
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number | string,
  text: string,
  replyMarkup?: unknown,
  parseMode?: 'Markdown',
) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        ...(parseMode ? { parse_mode: parseMode } : {}),
      }),
    })
  } catch {
    // Ответ в чат — best effort, не роняем обработку
  }
}

async function checkSiteHealth(): Promise<string> {
  try {
    const res = await fetch('https://archivist-library.com', {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      return `🔴 HTTP ${res.status} вместо 200`
    }
    const body = await res.text()
    if (!body.includes('Archivist-Library')) {
      return '🔴 Код 200, но ожидаемый контент не найден (битая страница)'
    }
    return '✅ Сайт отвечает нормально (200 OK)'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return `🔴 Не удалось достучаться: ${message}`
  }
}

async function getLastSyncInfo(githubToken: string, owner: string, repo: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/sync-cron.yml/runs?per_page=1`,
      { headers: { Authorization: `Bearer ${githubToken}` } },
    )
    if (!res.ok) {
      return `🔴 Не удалось получить данные (GitHub API: ${res.status})`
    }
    const data = await res.json()
    const run = data.workflow_runs?.[0]
    if (!run) {
      return 'ℹ️ Прогонов sync-cron ещё не было'
    }
    const statusIcon =
      run.conclusion === 'success' ? '✅' : run.conclusion === 'failure' ? '🔴' : '⏳'
    const when = new Date(run.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
    return `${statusIcon} Последний прогон: ${when} МСК — ${run.conclusion ?? run.status}\n${run.html_url}`
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return `🔴 Ошибка запроса к GitHub: ${message}`
  }
}

const PAYMENTS_PATH = 'src/data/payments.json'

// GitHub Contents API возвращает content пустым для больших файлов - тот же
// download_url-фолбэк, что и для mutants.json в обработчике тиров ниже.
async function fetchGithubJsonFile(
  githubToken: string,
  owner: string,
  repo: string,
  path: string,
): Promise<{ json: unknown; sha: string } | null> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${githubToken}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  let text: string
  if (data.content && data.content.length > 0) {
    text = Buffer.from(data.content, 'base64').toString('utf-8')
  } else if (data.download_url) {
    const downloadRes = await fetch(data.download_url)
    if (!downloadRes.ok) return null
    text = await downloadRes.text()
  } else {
    return null
  }
  return { json: JSON.parse(text), sha: data.sha }
}

async function putGithubJsonFile(
  githubToken: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  json: unknown,
  message: string,
): Promise<boolean> {
  const content = Buffer.from(JSON.stringify(json, null, 2) + '\n', 'utf-8').toString('base64')
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content, sha, branch: 'main' }),
  })
  return res.ok
}

async function getPaymentsMessage(
  githubToken: string,
  owner: string,
  repo: string,
): Promise<string> {
  const file = await fetchGithubJsonFile(githubToken, owner, repo, PAYMENTS_PATH)
  if (!file) return '🔴 Не удалось загрузить список платежей'
  return formatPaymentsList(file.json as PaymentsData)
}

// ".оплатил <id>" - сдвигает nextDue на periodDays вперёд и коммитит,
// чтобы напоминание не срабатывало вечно на уже оплаченную дату.
async function markPaymentPaid(
  githubToken: string,
  owner: string,
  repo: string,
  serviceId: string,
): Promise<string> {
  const file = await fetchGithubJsonFile(githubToken, owner, repo, PAYMENTS_PATH)
  if (!file) return '🔴 Не удалось загрузить список платежей'
  const data = file.json as PaymentsData
  const service = data.services.find((s) => s.id === serviceId)
  if (!service) {
    const ids = data.services.map((s) => s.id).join(', ')
    return `🔴 Не найден сервис "${serviceId}". Доступные id: ${ids}`
  }
  service.nextDue = advanceUntilFuture(service.nextDue, service.period)
  const ok = await putGithubJsonFile(
    githubToken,
    owner,
    repo,
    PAYMENTS_PATH,
    file.sha,
    data,
    `Payments: отметить "${service.name}" оплаченным`,
  )
  if (!ok) return '🔴 Не удалось сохранить изменения'
  return `✅ ${service.name}: следующий платёж — ${service.nextDue}`
}

export const POST: APIRoute = async ({ request }) => {
  const BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN
  const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN
  const REPO_OWNER = import.meta.env.REPO_OWNER
  const REPO_NAME = import.meta.env.REPO_NAME
  const WEBHOOK_SECRET = import.meta.env.TELEGRAM_WEBHOOK_SECRET

  // Секрет обязателен: без него эндпоинт, умеющий коммитить в main, не работает.
  // Раньше отсутствие переменной молча ОТКЛЮЧАЛО проверку.
  if (!WEBHOOK_SECRET) {
    console.error('TELEGRAM_WEBHOOK_SECRET is not configured — webhook disabled')
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
  if (secretToken !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let chatId: number | string | null = null

  try {
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)

    chatId = body.message?.chat?.id ?? null
    const text: string = body.message?.text ?? ''

    if (chatId != null && BOT_TOKEN) {
      if (text === '/start' || text === '/menu') {
        await sendTelegramMessage(
          BOT_TOKEN,
          chatId,
          'Готово — кнопки теперь всегда под полем ввода, команды печатать не нужно.',
          REPLY_KEYBOARD,
        )
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (text === '/status' || text === STATUS_LABEL) {
        const health = await checkSiteHealth()
        await sendTelegramMessage(BOT_TOKEN, chatId, `[Статус]\n${health}`)
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (text === '/lastsync' || text === LASTSYNC_LABEL) {
        if (GITHUB_TOKEN && REPO_OWNER && REPO_NAME) {
          const info = await getLastSyncInfo(GITHUB_TOKEN, REPO_OWNER, REPO_NAME)
          await sendTelegramMessage(BOT_TOKEN, chatId, `[Синк]\n${info}`)
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (text === '/payments' || text === PAYMENTS_LABEL) {
        if (GITHUB_TOKEN && REPO_OWNER && REPO_NAME) {
          const info = await getPaymentsMessage(GITHUB_TOKEN, REPO_OWNER, REPO_NAME)
          await sendTelegramMessage(BOT_TOKEN, chatId, info, undefined, 'Markdown')
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (text === '/yandex' || text === YANDEX_BALANCE_LABEL) {
        const YC_SA_KEY_JSON = import.meta.env.YC_SA_KEY_JSON
        if (!YC_SA_KEY_JSON) {
          await sendTelegramMessage(
            BOT_TOKEN,
            chatId,
            '🔴 YC_SA_KEY_JSON не настроен в переменных окружения Vercel.',
          )
        } else {
          try {
            const info = await getYandexBalance(YC_SA_KEY_JSON)
            await sendTelegramMessage(BOT_TOKEN, chatId, info)
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            await sendTelegramMessage(
              BOT_TOKEN,
              chatId,
              `🔴 Не удалось получить баланс: ${message}`,
            )
          }
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      // ".оплатил <id>" - сдвинуть дату следующего платежа вперёд
      if (text.toLowerCase().startsWith(PAID_TRIGGER)) {
        const serviceId = text.slice(PAID_TRIGGER.length).trim()
        if (GITHUB_TOKEN && REPO_OWNER && REPO_NAME && serviceId) {
          const result = await markPaymentPaid(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, serviceId)
          await sendTelegramMessage(BOT_TOKEN, chatId, `[Напоминалка]\n${result}`)
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    if (body.message && body.message.document) {
      // В группе — обрабатываем файл, только если в тексте/подписи явно
      // указан триггер (иначе любой скинутый в чат файл будет пытаться
      // распарситься как тиры).
      const caption: string = body.message.caption ?? ''
      const trigger = `${text} ${caption}`.toLowerCase()
      if (!trigger.includes(TIER_TRIGGER)) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const fileId = body.message.document.file_id
      const fileName = body.message.document.file_name

      console.log(`Received file: ${fileName}`)

      if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
        throw new Error('GitHub credentials are not configured')
      }

      // Get file from Telegram
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`,
      )
      const fileInfo = await fileResponse.json()

      if (!fileInfo.ok) {
        throw new Error('Failed to get file from Telegram')
      }

      // Download file content
      const filePath = fileInfo.result.file_path
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`
      const fileContent = await (await fetch(fileUrl)).text()

      // Load mutants.json from GitHub — ОДИН раз; sha из этого же ответа
      // используется для последующего PUT (раньше файл качался дважды).
      const mutantsRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } },
      )

      console.log(`Mutants API response: ${mutantsRes.status}`)

      if (!mutantsRes.ok) {
        console.error(`GitHub API error: ${mutantsRes.status}`)
        throw new Error('Failed to load mutants data')
      }

      const mutantsData = await mutantsRes.json()

      // For large files, GitHub returns empty content - use download_url instead
      let mutantsJson: string
      if (mutantsData.content && mutantsData.content.length > 0) {
        // atob() returns a binary string and mangles UTF-8 -> Russian names break.
        mutantsJson = Buffer.from(mutantsData.content, 'base64').toString('utf-8')
      } else if (mutantsData.download_url) {
        const downloadRes = await fetch(mutantsData.download_url)
        if (!downloadRes.ok) {
          throw new Error('Failed to download mutants data')
        }
        mutantsJson = await downloadRes.text()
      } else {
        throw new Error('No content available for mutants.json')
      }

      // Parse tiers
      const { parseTierData } = await import('../../lib/tier-parser')
      const parsedTiers = parseTierData(fileContent, mutantsJson)

      // Validate
      for (const tier of Object.values(parsedTiers)) {
        if (!VALID_TIERS.includes(tier as string)) {
          return new Response(JSON.stringify({ error: 'Invalid tier data' }), { status: 400 })
        }
      }

      // Update via GitHub API
      const currentMutants = JSON.parse(mutantsJson)

      let count = 0
      for (const [mutantId, newTier] of Object.entries(parsedTiers)) {
        const idx = currentMutants.findIndex((m: { id?: string }) => m.id === mutantId)
        if (idx !== -1) {
          currentMutants[idx].tier = newTier
          count++
        }
      }

      const updatedContent = JSON.stringify(currentMutants, null, 2)
      const encoded = Buffer.from(updatedContent, 'utf-8').toString('base64')

      const updateRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Update: ${count} tiers from Telegram`,
            content: encoded,
            sha: mutantsData.sha,
            branch: 'main',
          }),
        },
      )

      if (!updateRes.ok) {
        throw new Error('Failed to update file')
      }

      console.log(`Updated ${count} tiers`)

      if (chatId != null && BOT_TOKEN) {
        await sendTelegramMessage(
          BOT_TOKEN,
          chatId,
          `[Тиры]\n✅ Успех! Обновлено ${count} тиров мутантов.`,
        )
      }

      return new Response(
        JSON.stringify({ success: true, count: Object.keys(parsedTiers).length }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ message: 'OK' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    // Сообщаем отправителю файла об ошибке, иначе он не узнает о проблеме
    // (сервер молча 500-ил, а Telegram бесконечно ретраил).
    if (chatId != null && BOT_TOKEN) {
      await sendTelegramMessage(
        BOT_TOKEN,
        chatId,
        '[Тиры]\n❌ Ошибка обработки файла тиров. Попробуйте позже.',
      )
    }
    // 200, а не 500: иначе Telegram ретраит апдейт и дублирует ❌-сообщения.
    return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
