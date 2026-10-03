// Google Dịch relay for the "Google Dịch (thử nghiệm)" reading mode.
// Readers call Google straight from their browser first; some phone networks (5G carrier NAT,
// iCloud Private Relay) get refused there ("Load failed"), so the client then comes here.
// Only accepts same-site POSTs with a bounded text, and only ever talks to Google's endpoint.

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=vi&dt=t';
const MAX_TEXT = 6000;

export default async function googleTranslateProxy(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
  if (req.headers['sec-fetch-site'] === 'cross-site') { res.statusCode = 403; res.end(); return; }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_TEXT * 4 + 100) throw new Error('TOO_LARGE');
      chunks.push(chunk);
    }
    const { q } = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (typeof q !== 'string' || !q.trim() || q.length > MAX_TEXT) throw new Error('BAD_REQUEST');
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'Mozilla/5.0' },
      body: 'q=' + encodeURIComponent(q),
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) throw new Error(`UPSTREAM_${upstream.status}`);
    const data = await upstream.json();
    const text = (data?.[0] || []).map(part => part?.[0] || '').join('');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ text }));
  } catch (error) {
    const code = String(error?.message || 'ERROR');
    res.statusCode = code === 'BAD_REQUEST' || code === 'TOO_LARGE' ? 400 : 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: code }));
  }
}
