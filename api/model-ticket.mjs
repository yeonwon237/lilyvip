// Issues a short-lived ticket for the private on-device translation models.
// Runs on the reader's own origin so it receives the .lilyhub.top session cookie, which the
// browser never sends to the models Worker; the Worker checks it with LilyHub and signs the
// ticket (see cloudflare/lily-models-worker). No secret lives here.
const MODELS_WORKER_URL = (process.env.LILY_MODELS_WORKER_URL || 'https://lily-models.nguyenyen15011998.workers.dev').replace(/\/$/, '');

export default async function modelTicket(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
  if (req.headers['sec-fetch-site'] === 'cross-site') { res.statusCode = 403; res.end(); return; }
  const cookie = String(req.headers.cookie || '');
  if (!cookie) { res.statusCode = 401; res.end(); return; }
  try {
    const response = await fetch(`${MODELS_WORKER_URL}/v1/ticket`, {
      method: 'POST',
      headers: { 'x-lily-cookie': cookie },
      signal: AbortSignal.timeout(10_000),
    });
    res.statusCode = response.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(response.ok ? await response.text() : JSON.stringify({ error: response.status === 403 ? 'FORBIDDEN' : 'UNAVAILABLE' }));
  } catch {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'UNAVAILABLE' }));
  }
}
