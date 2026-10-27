import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

test('legacy endpoints fail closed with or without forged client headers', async () => {
  const env = new Proxy({}, { get() { throw new Error('Retired service must not read storage or secrets'); } });
  for (const origin of ['', 'https://my.lilyhub.top', 'https://attacker.example']) {
    for (const [method, path, status] of [
      ['POST', '/v1/licenses/grant', 410], ['POST', '/v1/activate', 410],
      ['POST', '/v1/admin/licenses/self', 410], ['POST', '/v1/license/verify', 401],
      ['GET', '/m/lily-cophong/config.json', 403], ['HEAD', '/m/lily-dothi/onnx/model.onnx', 403],
      ['OPTIONS', '/v1/licenses/grant', 410],
    ]) {
      const request = new Request(`https://models.example${path}`, { method, headers: { Origin: origin, 'X-Lily-License': 'copied-license', 'X-Lily-Account': 'owner', 'X-Lily-Device': 'device-id' } });
      assert.equal((await worker.fetch(request, env)).status, status, `${method} ${path}`);
    }
  }
});
