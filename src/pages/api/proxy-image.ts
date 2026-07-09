import type { APIRoute } from 'astro';

const ALLOWED_PREFIXES = [
  'https://cdn.archivist-library.com/',
  'https://s-ak.kobojo.com/',
  'https://s-beta.kobojo.com/',
];

export const GET: APIRoute = async ({ url }) => {
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return new Response('Missing url param', { status: 400 });
  }

  if (!ALLOWED_PREFIXES.some((p) => targetUrl.startsWith(p))) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const resp = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!resp.ok) {
      return new Response(`Upstream ${resp.status}`, { status: resp.status });
    }

    const data = await resp.arrayBuffer();
    const contentType = resp.headers.get('content-type') || 'image/png';

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Proxy error', { status: 502 });
  }
};
