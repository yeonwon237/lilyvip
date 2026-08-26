/// <reference lib="webworker" />
import * as tts from '@diffusionstudio/vits-web';

self.onmessage = async (event: MessageEvent) => {
  const { id, text, voiceId, modelPath } = event.data || {};
  try {
    (tts.PATH_MAP as unknown as Record<string, string>)[voiceId] = modelPath;
    const wav = await tts.predict({ text, voiceId });
    self.postMessage({ id, wav });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
