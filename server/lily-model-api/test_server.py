import os
import sys
import types
import unittest
from unittest.mock import patch

# Run this integration test with the VPS Python runtime (FastAPI/TestClient).
# It loads no weights and performs no real inference.
class FakeModel:
    calls = 0
    def __init__(self, *args, **kwargs):
        pass
    def translate_paragraphs(self, paragraphs):
        FakeModel.calls += 1
        return ['translated' for _ in paragraphs]

fake = types.ModuleType('lily_ct2')
fake.LilyModel = fake.LilyQT = FakeModel
KEY = 'test-server-key-at-least-thirty-two-characters'
with patch.dict(os.environ, {'MODEL_GATEWAY_KEY': KEY, 'LILY_MODELS': 'lily-dothi,lily-qt-s1'}), patch.dict(sys.modules, {'lily_ct2': fake}):
    import server
from fastapi.testclient import TestClient

class ServerTests(unittest.TestCase):
    def test_all_routes_require_gateway_key(self):
        with TestClient(server.app) as client:
            for path in ['/health', '/docs', '/openapi.json', '/v1/translate']:
                response = client.get(path, headers={'Origin': 'https://my.lilyhub.top', 'X-Lily-License': 'old', 'X-Lily-Claim': 'old'})
                self.assertEqual(response.status_code, 403)
            for model in ['lily-dothi', 'lily-qt-s1']:
                self.assertEqual(client.post('/v1/translate', json={'model': model, 'paragraphs': ['hi']}).status_code, 403)

    def test_gateway_request_works_without_legacy_license_and_hides_metadata(self):
        with TestClient(server.app) as client:
            headers = {'X-Lily-Gateway-Key': KEY}
            self.assertEqual(client.get('/health', headers=headers).json(), {'ok': True})
            response = client.post('/v1/translate', headers=headers, json={'model': 'lily-qt-s1', 'paragraphs': ['hi']})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {'translations': ['translated']})
            self.assertEqual(client.post('/v1/translate', headers=headers, json={'model': 'lily-dothi', 'paragraphs': []}).status_code, 422)
            self.assertEqual(client.post('/v1/translate', headers=headers, json={'model': 'unknown', 'paragraphs': ['hi']}).status_code, 400)

if __name__ == '__main__':
    unittest.main()
