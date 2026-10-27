import asyncio
import unittest
from gateway_auth import GatewayAuth

KEY = 'test-gateway-secret-at-least-thirty-two-characters'

class GatewayTests(unittest.IsolatedAsyncioTestCase):
    async def invoke(self, headers, messages=None):
        calls, sent = [], []
        messages = list(messages or [{'type': 'http.request', 'body': b'{}'}])
        async def app(scope, receive, send):
            calls.append(await receive())
            await send({'type': 'http.response.start', 'status': 200, 'headers': []})
        async def receive():
            if not messages:
                raise AssertionError('Unauthorized requests must not read the body')
            return messages.pop(0)
        async def send(message):
            sent.append(message)
        await GatewayAuth(app, KEY, max_body_bytes=5)({'type': 'http', 'headers': headers}, receive, send)
        return calls, sent

    async def test_old_credentials_and_forged_origin_never_authorize(self):
        for headers in [[], [(b'origin', b'https://my.lilyhub.top')], [(b'x-lily-license', b'old'), (b'x-lily-claim', b'old')], [(b'x-lily-gateway-key', b'wrong')], [(b'x-lily-gateway-key', KEY.encode()), (b'x-lily-gateway-key', KEY.encode())]]:
            calls, sent = await self.invoke(headers)
            self.assertEqual(calls, [])
            self.assertEqual(sent[0]['status'], 403)

    async def test_only_gateway_secret_passes(self):
        calls, sent = await self.invoke([(b'x-lily-gateway-key', KEY.encode())])
        self.assertEqual(sent[0]['status'], 200)
        self.assertEqual(calls[0]['body'], b'{}')

    async def test_chunked_body_limit_is_enforced_before_model_app(self):
        calls, sent = await self.invoke([(b'x-lily-gateway-key', KEY.encode())], [{'type': 'http.request', 'body': b'123', 'more_body': True}, {'type': 'http.request', 'body': b'456'}])
        self.assertEqual(calls, [])
        self.assertEqual(sent[0]['status'], 413)

    def test_missing_configuration_fails_closed(self):
        for key in ['', 'short', None]:
            with self.assertRaises(RuntimeError):
                GatewayAuth(None, key)

if __name__ == '__main__':
    unittest.main()
