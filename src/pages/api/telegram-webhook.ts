import type { APIRoute } from 'astro'

const VALID_TIERS = ['1', '1+', '1-', '2', '2+', '2-', '3', '3+', '3-', '4', 'un-tired']

async function sendTelegramMessage(botToken: string, chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch {
    // Ответ в чат — best effort, не роняем обработку
  }
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

    if (body.message && body.message.document) {
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
        const idx = currentMutants.findIndex((m: any) => m.id === mutantId)
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
        await sendTelegramMessage(BOT_TOKEN, chatId, `✅ Успех! Обновлено ${count} тиров мутантов.`)
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
        '❌ Ошибка обработки файла тиров. Попробуйте позже.',
      )
    }
    // 200, а не 500: иначе Telegram ретраит апдейт и дублирует ❌-сообщения.
    return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
