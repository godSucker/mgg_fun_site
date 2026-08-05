// Эндпоинт для /sferovki: батчем пишет собранные сферовки в orbing.json на
// main (тот же файл, что правит ".сфера" в telegram-webhook.ts). Живёт за
// Vercel Deployment Protection превью-домена - без своего секрета, тот же
// паттерн, что и api/tier-table.ts (см. память tier-table-preview-pipeline).

import type { APIRoute } from 'astro'
import { baseMutantId } from '@/lib/utils'

const ORBING_PATH = 'src/data/mutants/orbing.json'
const BRANCH = 'main'

type OrbCell = string | [string, string]
type OrbingData = { rows: OrbCell[][] }

async function fetchGithubJsonFile(
  githubToken: string,
  owner: string,
  repo: string,
  path: string,
): Promise<{ json: unknown; sha: string } | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `Bearer ${githubToken}` } },
  )
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
    body: JSON.stringify({ message, content, sha, branch: BRANCH }),
  })
  return res.ok
}

// orbing.json исторически ключуется не единообразно по регистру (см.
// orbing-map.ts: там при чтении лукап идёт case-insensitive + по baseId).
// При записи переиспользуем УЖЕ существующий ключ для мутанта, если он есть -
// иначе со временем накопятся дубли, различающиеся только регистром.
function resolveExistingKey(orbingData: Record<string, OrbingData>, mutantId: string): string {
  if (mutantId in orbingData) return mutantId
  const lower = mutantId.toLowerCase()
  const exact = Object.keys(orbingData).find((k) => k.toLowerCase() === lower)
  if (exact) return exact
  const base = baseMutantId(mutantId)
  const byBase = Object.keys(orbingData).find((k) => baseMutantId(k) === base)
  if (byBase) return byBase
  return mutantId
}

export const POST: APIRoute = async ({ request }) => {
  const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN
  const REPO_OWNER = import.meta.env.REPO_OWNER
  const REPO_NAME = import.meta.env.REPO_NAME
  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    return new Response(
      JSON.stringify({ error: 'Сервер не настроен (нет GITHUB_TOKEN/REPO_OWNER/REPO_NAME)' }),
      { status: 500 },
    )
  }

  let body: { action?: string; changes?: Record<string, OrbCell[][]> }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Некорректный JSON' }), { status: 400 })
  }

  if (body.action !== 'save' || !body.changes || Object.keys(body.changes).length === 0) {
    return new Response(JSON.stringify({ error: 'Нет изменений для отправки' }), { status: 400 })
  }

  const file = await fetchGithubJsonFile(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, ORBING_PATH)
  if (!file) {
    return new Response(JSON.stringify({ error: 'Не удалось прочитать orbing.json из main' }), {
      status: 502,
    })
  }
  const orbingData = file.json as Record<string, OrbingData>

  let count = 0
  for (const [mutantId, rows] of Object.entries(body.changes)) {
    const key = resolveExistingKey(orbingData, mutantId)
    if (rows.length === 0) {
      delete orbingData[key]
    } else {
      orbingData[key] = { rows }
    }
    count++
  }

  const ok = await putGithubJsonFile(
    GITHUB_TOKEN,
    REPO_OWNER,
    REPO_NAME,
    ORBING_PATH,
    file.sha,
    orbingData,
    `🔮 Сферовки: обновлено ${count} мутантов из /sferovki`,
  )
  if (!ok) {
    return new Response(
      JSON.stringify({ error: 'Коммит не прошёл (устаревший sha? перезагрузи страницу)' }),
      { status: 409 },
    )
  }
  return new Response(JSON.stringify({ ok: true, count }), { status: 200 })
}
