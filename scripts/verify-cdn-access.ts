// Verify CDN referer-allowlist behaviour BEFORE and AFTER applying
// infra/cdn-bucket-policy.json.
//
//   npx tsx scripts/verify-cdn-access.ts
//
// Run it BEFORE applying the policy to capture a baseline (everything 200),
// then AFTER: allowed referers must stay 200, foreign/absent referer must be 403.
// Any "MUST" row failing after apply = something on the site is broken.

const CDN = 'https://cdn.archivist-library.com'
const SITE = 'https://archivist-library.com/'

// Representative assets: a mutant texture, a skin full texture, a skin icon,
// the font stylesheet and a font file it references (the font is the subtle one -
// its Referer is the CDN itself, not the site).
const ASSETS = {
  mutantTexture: `${CDN}/textures_by_mutant/a_01/specimen_a_01_normal.webp`,
  skinFull: `${CDN}/textures_by_skins/textures_by_skin/full/FULL_a_01_japan.png`,
  skinIcon: `${CDN}/skins/icon_japan.webp`,
  fontCss: `${CDN}/fonts/tt-supermolot-neue/tt-supermolot-neue.css`,
  fontFile: `${CDN}/fonts/tt-supermolot-neue/TTSupermolotNeue-Regular.woff2`,
}

type Check = { name: string; url: string; referer?: string; expect: number; must: boolean }

const checks: Check[] = [
  // MUST pass - these are real page loads. Breaking any of these breaks the site.
  {
    name: 'texture    + referer сайта',
    url: ASSETS.mutantTexture,
    referer: SITE,
    expect: 200,
    must: true,
  },
  {
    name: 'skin full  + referer сайта',
    url: ASSETS.skinFull,
    referer: SITE,
    expect: 200,
    must: true,
  },
  {
    name: 'skin icon  + referer сайта',
    url: ASSETS.skinIcon,
    referer: SITE,
    expect: 200,
    must: true,
  },
  {
    name: 'font CSS   + referer сайта',
    url: ASSETS.fontCss,
    referer: SITE,
    expect: 200,
    must: true,
  },
  // Fonts inside the CDN stylesheet carry the CDN origin as Referer, not the site.
  {
    name: 'font woff2 + referer CDN  ',
    url: ASSETS.fontFile,
    referer: `${CDN}/`,
    expect: 200,
    must: true,
  },
  // SHOULD be blocked once the policy is on - this is the actual protection.
  { name: 'texture    БЕЗ referer    ', url: ASSETS.mutantTexture, expect: 403, must: false },
  { name: 'skin full  БЕЗ referer    ', url: ASSETS.skinFull, expect: 403, must: false },
  {
    name: 'texture    чужой referer  ',
    url: ASSETS.mutantTexture,
    referer: 'https://example.com/',
    expect: 403,
    must: false,
  },
]

async function probe(c: Check): Promise<number> {
  const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0' }
  if (c.referer) headers.Referer = c.referer
  try {
    const res = await fetch(c.url, { method: 'GET', headers, redirect: 'manual' })
    return res.status
  } catch {
    return 0
  }
}

async function main() {
  console.log('Проверка доступа к CDN (referer-allowlist)\n')
  const results: { c: Check; got: number }[] = []
  for (const c of checks) results.push({ c, got: await probe(c) })

  const blocked = results.filter((r) => !r.c.must && r.got === 403).length
  const enforced = blocked > 0
  console.log(
    enforced
      ? 'РЕЖИМ: политика ПРИМЕНЕНА (есть 403 без referer)\n'
      : 'РЕЖИМ: политика НЕ применена (базовый замер)\n',
  )

  let brokenMust = 0
  for (const { c, got } of results) {
    const ok = c.must ? got === 200 : enforced ? got === c.expect : got === 200
    if (c.must && got !== 200) brokenMust++
    const tag = c.must ? 'ДОЛЖНО РАБОТАТЬ' : 'ДОЛЖНО БЛОКИРОВАТЬСЯ'
    console.log(`${ok ? 'OK  ' : 'FAIL'}  ${c.name}  -> ${got || 'нет ответа'}   [${tag}]`)
  }

  console.log('')
  if (brokenMust > 0) {
    console.log(
      `❌ СЛОМАНО ${brokenMust} обязательных путей — сайт пострадает. Проверь allowlist в infra/cdn-bucket-policy.json.`,
    )
    process.exit(1)
  }
  if (!enforced) {
    console.log('ℹ️  Базовый замер снят. Применяй политику, затем запусти скрипт снова.')
  } else {
    console.log('✅ Все обязательные пути живы, перебор без referer заблокирован.')
  }
}

main()
