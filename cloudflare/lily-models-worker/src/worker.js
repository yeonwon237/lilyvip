// Retire the public license/weight distribution service. Model inference now goes
// through LilyHub's authenticated /api/reader/translate gateway. In particular,
// no client-supplied account/device pair may mint a license, and no old license
// (including owner/code/grant licenses) may authorize public inference or downloads.
// Keep this tombstone deployed: old bundles and copied URLs must fail closed.
export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
    if (path === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ ok: true }), { headers });
    }
    const status = path === '/v1/license/verify' ? 401 : path.startsWith('/m/') ? 403 : 410;
    return new Response(JSON.stringify({ ok: false, error: 'ACCESS_DENIED' }), { status, headers });
  },
};
