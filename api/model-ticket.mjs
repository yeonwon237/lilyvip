// Issues a short-lived ticket for the private on-device translation models.
// Runs on the reader's own origin so it receives the .lilyhub.top session cookie, which the
// browser never sends to the models Worker; the Worker checks it with LilyHub and signs the
// ticket (see cloudflare/lily-models-worker). No secret lives here.
//
// GET ?debug=1 explains a refusal for the signed-in reader: cookie NAMES and LilyHub field
// NAMES only, never values, and never a ticket.
const MODELS_WORKER_URL = (process.env.LILY_MODELS_WORKER_URL || 'https://lily-models.nguyenyen15011998.workers.dev').replace(/\/$/, '');

const cookieNames = cookie => cookie.split(';').map(part => part.split('=')[0].trim()).filter(Boolean);

export default async function modelTicket(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const debug = req.method === 'GET' && new URL(req.url || '/', 'https://lily.invalid').searchParams.get('debug') === '1';
  if (req.method !== 'POST' && !debug) { res.statusCode = 405; res.end(); return; }
  if (req.headers['sec-fetch-site'] === 'cross-site') { res.statusCode = 403; res.end(); return; }
  const cookie = String(req.headers.cookie || '');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!cookie && !debug) { res.statusCode = 401; res.end(JSON.stringify({ error: 'NO_SESSION' })); return; }
  try {
    const response = await fetch(`${MODELS_WORKER_URL}/v1/ticket`, {
      method: 'POST',
      headers: { 'x-lily-cookie': cookie },
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (debug) {
      res.statusCode = 200;
      res.end(JSON.stringify({ cookieNames: cookieNames(cookie), workerStatus: response.status, why: payload.why || null, ticketIssued: response.ok }, null, 2));
      return;
    }
    res.statusCode = response.status;
    res.end(JSON.stringify(response.ok ? payload : { error: response.status === 403 ? 'FORBIDDEN' : 'UNAVAILABLE' }));
  } catch {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'UNAVAILABLE' }));
  }
}
