// Client-side chapter translation, running fully in-browser via transformers.js (WASM).
// Models are pre-converted/quantized ONNX exports. Public ones are hosted on the yennguyen45
// Hugging Face account; private ones ('lily-private') sit in Lily's own R2 bucket and are
// only served to owner / 'ai_translation' accounts (see cloudflare/lily-models-worker).
// 'lily-api' models do not run in the browser at all: chapters go to Lily's translate API
// (VPS, see ApiTranslationClient) with the same per-device model license.
// These are independent, user-selectable modes — not a base model plus an optional
// post-processing step. The Chinese → Vietnamese models translate source text directly;
// "Biên tập QT" is a separate model for chapters that are ALREADY rough QT-style Vietnamese
// (e.g. from an external VietPhrase/QT conversion) and just need smoothing — it never runs
// chained after the others.

/** 'lilymt-v20-block': V20 models — ≤220-char blocks, beam 2, repetition 1.2, no post-processing. */
export type TranslationInputMode = 'default' | 'lilymt-modern-block' | 'lilymt-ancient-sentence' | 'lilymt-v20-block';

export interface TranslationModelOption {
  id: string;
  hfRepo?: string;
  /** 'lily-private': served from Lily's private R2 bucket to granted accounts only.
   *  'lily-api': translated on Lily's server; hfRepo is then the server-side model name. */
  source?: 'huggingface' | 'lily-private' | 'lily-api';
  provider?: 'onnx' | 'gemini' | 'dictionary' | 'google';
  label: string;
  description: string;
  inputMode?: TranslationInputMode;
  /** Owner or accounts granted 'ai_translation' only (see TranslateSheet). */
  ownerOnly?: boolean;
}

/** Models that were removed; a reader who had one selected moves to its replacement. */
export const RETIRED_TRANSLATION_MODELS: Record<string, string> = {
  'lilymt-ancient-v14-admin-v4': 'lily-cophong-v1',
  'lily-pro': 'lily-cophong-v1',
  'lily-pro-2': 'lily-cophong-v1',
  'lilymt-modern-v14-admin-v4': 'lily-dothi-v1',
};

/** Models that need a per-device model license (one-time model code or owner device). */
export const usesModelLicense = (model?: TranslationModelOption): model is TranslationModelOption =>
  model?.source === 'lily-private' || model?.source === 'lily-api';

export const TRANSLATION_MODELS: TranslationModelOption[] = [
  {
    id: 'gemini-user-api-v1',
    provider: 'gemini',
    label: 'Gemini · Dịch theo ngữ cảnh',
    description: 'Dùng API key của bạn · nhớ tên, quan hệ và xưng hô xuyên truyện',
  },
  {
    id: 'qt-dictionary',
    provider: 'dictionary',
    label: 'Lily QT',
    description: 'Bản convert nhanh theo từ điển VietPhrase',
  },
  {
    id: 'google-quick',
    provider: 'google',
    label: 'Google Dịch (thử nghiệm)',
    description: 'Dịch nhanh, dễ đọc hơn QT · ép tên và xưng hô ta/ngươi/nàng · lỗi thì tự về QT',
    ownerOnly: true,
  },
  {
    id: 'lily-cophong-v1',
    hfRepo: 'lily-cophong',
    source: 'lily-api',
    provider: 'onnx',
    label: 'Lily Cổ Phong',
    description: 'Truyện cổ đại và ABO cổ đại · văn mượt, giữ đúng tên riêng',
    inputMode: 'lilymt-v20-block',
    // Accounts granted translation get a per-device license automatically (ModelLicense).
    ownerOnly: true,
  },
  {
    id: 'lily-dothi-v1',
    hfRepo: 'lily-dothi',
    source: 'lily-api',
    provider: 'onnx',
    label: 'Lily Đô Thị',
    description: 'Truyện hiện đại, đô thị và ABO · văn mượt, giữ đúng tên riêng',
    inputMode: 'lilymt-v20-block',
    ownerOnly: true,
  },
  {
    id: 'qt-polish',
    hfRepo: 'yennguyen45/vp2vi-polish-web',
    provider: 'onnx',
    label: 'Lily Biên tập QT',
    description: 'Làm mượt chương đã là bản QT, không dịch từ tiếng Trung',
    ownerOnly: true,
  },
];
