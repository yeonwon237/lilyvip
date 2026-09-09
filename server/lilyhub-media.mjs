const MEDIA_ORIGIN = 'https://media.lilyhub.top';
const ALLOWED_KEY = /^(?:snapshots\/[a-zA-Z0-9._-]+\.json|chapters\/[a-zA-Z0-9._-]+\.txt)$/;

export default async function lilyHubMediaProxy(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end();
    return;
  }

  try {
    const key = new URL(req.url || '/', 'https://lily.invalid').searchParams.get('key') || '';
    if (!ALLOWED_KEY.test(key)) {
      res.statusCode = 400;
      res.end('Invalid LilyHub media key.');
      return;
    }

    const upstream = await fetch(`${MEDIA_ORIGIN}/${key}`, {
      headers: { Accept: key.endsWith('.json') ? 'application/json' : 'text/plain' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.end('LilyHub media is unavailable.');
      return;
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    if (body.byteLength > 8 * 1024 * 1024) {
      res.statusCode = 413;
      res.end('LilyHub media is too large.');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', key.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', key.endsWith('novels-pointer.json')
      ? 'public, max-age=30, s-maxage=30, stale-while-revalidate=120'
      : 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    res.end(body);
  } catch {
    res.statusCode = 502;
    res.end('LilyHub media is unavailable.');
  }
}
