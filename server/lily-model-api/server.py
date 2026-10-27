"""Private Lily inference service. Expose only behind the authenticated gateway.

Uvicorn must bind 127.0.0.1. MODEL_GATEWAY_KEY is shared only with LilyHub's
MODEL_UPSTREAM_KEY secret. Browser licenses, origins and quota UUIDs never grant
access here. The LilyHub gateway owns session, entitlement and quota checks.
The existing lily_ct2 module and model directories stay on the VPS.
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from gateway_auth import GatewayAuth
from lily_ct2 import LilyModel, LilyQT

GATEWAY_KEY = os.environ.get('MODEL_GATEWAY_KEY', '')
if len(GATEWAY_KEY) < 32:
    raise RuntimeError('MODEL_GATEWAY_KEY is required')
MODEL_DIR = os.environ.get('LILY_MODEL_DIR', '/home/ubuntu/models')
MODELS = [m for m in os.environ.get('LILY_MODELS', 'lily-cophong,lily-dothi').split(',') if m]
api = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app = GatewayAuth(api, GATEWAY_KEY)
models = {m: (LilyQT if m.startswith('lily-qt') else LilyModel)(f'{MODEL_DIR}/{m}', compute_type='int8', inter_threads=4, intra_threads=1) for m in MODELS}
slots = asyncio.Semaphore(4)
log = logging.getLogger('lily')
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')


class TranslateBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    model: str = Field(max_length=64)
    paragraphs: list[str] = Field(min_length=1, max_length=64)


@api.get('/health')
async def health():
    return {'ok': True}


@api.post('/v1/translate')
async def translate(body: TranslateBody):
    model = models.get(body.model)
    if model is None:
        raise HTTPException(400, 'INVALID_REQUEST')
    chars = sum(len(p) for p in body.paragraphs)
    if not chars or chars > 24000:
        raise HTTPException(413, 'PAYLOAD_TOO_LARGE')
    try:
        await asyncio.wait_for(slots.acquire(), timeout=5)
    except asyncio.TimeoutError:
        raise HTTPException(429, 'BUSY') from None
    try:
        started = time.monotonic()
        result = await asyncio.to_thread(model.translate_paragraphs, body.paragraphs)
        log.info('translated paragraphs=%d chars=%d elapsed_ms=%d', len(body.paragraphs), chars, (time.monotonic() - started) * 1000)
        return {'translations': result}
    finally:
        slots.release()
