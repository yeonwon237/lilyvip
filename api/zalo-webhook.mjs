const MAX_BODY_BYTES = 64 * 1024;

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).send('Method not allowed');
  try {
    const body = await readBody(request);
    const upstream = await fetch('https://api.lilyhub.top/api/zalo/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': request.headers['content-type'] || 'application/json',
        'X-Bot-Api-Secret-Token': request.headers['x-bot-api-secret-token'] || '',
        'User-Agent': 'Lily-Zalo-Relay/1.0',
      },
      body,
    });
    const result = await upstream.arrayBuffer();
    response.status(upstream.status);
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return response.send(Buffer.from(result));
  } catch (error) {
    return response.status(error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 502).send('Webhook relay failed');
  }
}
