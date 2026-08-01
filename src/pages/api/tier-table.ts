// Эндпоинт для /tier-table: сохраняет/сбрасывает src/data/mutants/tier-table.json
// через GitHub Contents API (тот же паттерн, что telegram-webhook.ts использует
// для правки mutants.json) - НЕ трогает mutants.json, полностью изолирован.
//
// Защита: сама страница/эндпоинт рассчитаны на то, что живут за Vercel
// Deployment Protection превью-домена (решение принято явно, не auth-less
// по умолчанию) - см. память tier-table-pipeline.

import type { APIRoute } from 'astro'
import mutantsData from '@/data/mutants/mutants.json'

const TIER_TABLE_PATH = 'src/data/mutants/tier-table.json'
const VALID_TIERS = new Set(['1+', '1', '1-', '2+', '2', '2-', '3+', '3', '3-', '4', '-'])

interface Mutant {
  id: string
  tier?: string | null
}
type TierTable = Record<string, { before: string; after: string }>

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

export const POST: APIRoute = async ({ request }) => {
  const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN
  const REPO_OWNER = import.meta.env.REPO_OWNER
  const REPO_NAME = import.meta.env.REPO_NAME
  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    return new Response(
      JSON.stringify({ error: 'Сервер не настроен (нет GITHUB_TOKEN/REPO_OWNER/REPO_NAME)' }),
      {
        status: 500,
      },
    )
  }

  let body: { action?: string; changes?: Record<string, { before?: string; after?: string }> }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Некорректный JSON' }), { status: 400 })
  }

  const file = await fetchGithubJsonFile(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, TIER_TABLE_PATH)
  if (!file) {
    return new Response(
      JSON.stringify({ error: 'Не удалось прочитать tier-table.json из репозитория' }),
      {
        status: 502,
      },
    )
  }
  const table = file.json as TierTable

  if (body.action === 'refresh') {
    // "Обновить тиры" - жёсткий пересинк ОБЕИХ колонок из актуального тир-листа
    // (mutants.json.tier), затирая ручные правки. Поведение специально такое,
    // см. prompt_tablica_mutantov.md раздел 3.
    const mutants = mutantsData as Mutant[]
    const fresh: TierTable = {}
    for (const m of mutants) {
      const tier = String(m.tier ?? '').trim() || '-'
      fresh[m.id] = { before: tier, after: tier }
    }
    const ok = await putGithubJsonFile(
      GITHUB_TOKEN,
      REPO_OWNER,
      REPO_NAME,
      TIER_TABLE_PATH,
      file.sha,
      fresh,
      '🛠️ Tier Table: пересинк тиров из тир-листа',
    )
    if (!ok)
      return new Response(JSON.stringify({ error: 'Коммит не прошёл (устаревший sha?)' }), {
        status: 409,
      })
    return new Response(JSON.stringify({ ok: true, table: fresh }), { status: 200 })
  }

  if (body.action === 'save' && body.changes) {
    for (const [id, change] of Object.entries(body.changes)) {
      const existing = table[id] ?? { before: '-', after: '-' }
      const before =
        change.before != null && VALID_TIERS.has(change.before) ? change.before : existing.before
      const after =
        change.after != null && VALID_TIERS.has(change.after) ? change.after : existing.after
      table[id] = { before, after }
    }
    const ok = await putGithubJsonFile(
      GITHUB_TOKEN,
      REPO_OWNER,
      REPO_NAME,
      TIER_TABLE_PATH,
      file.sha,
      table,
      `🛠️ Tier Table: ручная правка (${Object.keys(body.changes).length} мутантов)`,
    )
    if (!ok)
      return new Response(
        JSON.stringify({ error: 'Коммит не прошёл (устаревший sha? перезагрузи страницу)' }),
        { status: 409 },
      )
    return new Response(JSON.stringify({ ok: true, table }), { status: 200 })
  }

  return new Response(JSON.stringify({ error: 'Неизвестное action' }), { status: 400 })
}
