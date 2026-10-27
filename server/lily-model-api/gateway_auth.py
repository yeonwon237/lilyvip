"""ASGI ingress: only the authenticated LilyHub gateway can reach the model app."""
import hmac
import json


class GatewayAuth:
    def __init__(self, app, key, max_body_bytes=100 * 1024):
        if not isinstance(key, str) or len(key) < 32:
            raise RuntimeError('MODEL_GATEWAY_KEY must be a server-only secret of at least 32 characters')
        self.app = app
        self.key = key.encode('utf-8')
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'lifespan':
            return await self.app(scope, receive, send)
        if scope['type'] != 'http':
            await send({'type': 'websocket.close', 'code': 1008})
            return
        keys = [value for name, value in scope.get('headers', []) if name.lower() == b'x-lily-gateway-key']
        if len(keys) != 1 or not hmac.compare_digest(keys[0], self.key):
            return await self.reject(send, 403, 'ACCESS_DENIED')
        chunks = []
        size = 0
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            data = message.get('body', b'')
            size += len(data)
            if size > self.max_body_bytes:
                return await self.reject(send, 413, 'PAYLOAD_TOO_LARGE')
            chunks.append(data)
            if not message.get('more_body', False):
                break
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {'type': 'http.request', 'body': b''.join(chunks), 'more_body': False}
            return await receive()

        await self.app(scope, bounded_receive, send)

    @staticmethod
    async def reject(send, status, error):
        body = json.dumps({'error': error}).encode()
        await send({'type': 'http.response.start', 'status': status, 'headers': [(b'content-type', b'application/json'), (b'cache-control', b'no-store')]})
        await send({'type': 'http.response.body', 'body': body})
