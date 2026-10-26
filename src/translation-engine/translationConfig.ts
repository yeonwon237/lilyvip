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
  /** 'lily-api' model open to every reader: no model license, the daily translation quota applies instead. */
  publicApi?: boolean;
  /** Model whose license this one shares (test builds of a licensed model). Defaults to hfRepo. */
  licenseRepo?: string;
}

/** Models that were removed; a reader who had one selected moves to its replacement. */
export const RETIRED_TRANSLATION_MODELS: Record<string, string> = {
  'lilymt-ancient-v14-admin-v4': 'lily-cophong-v1',
  'lily-pro': 'lily-cophong-v1',
  'lily-pro-2': 'lily-cophong-v1',
  'lilymt-modern-v14-admin-v4': 'lily-dothi-v1',
  // first build silently cached QT text when Google refused the phone's network
  'google-quick': 'google-quick-2',
  // test build removed 05/10 — back to Lily Đô Thị (up2)
  'lily-dothi-2da': 'lily-dothi-v1',
  // QT → lily-qt polish lost meaning on long/term-heavy sentences; withdrawn 19/10
  'qt-smooth': 'qt-dictionary',
};

/** Models that need a per-device model license (one-time model code or owner device). */
export const usesModelLicense = (model?: TranslationModelOption): model is TranslationModelOption =>
  model?.source === 'lily-private' || (model?.source === 'lily-api' && !model.publicApi);

export const TRANSLATION_MODELS: TranslationModelOption[] = [
  {
    id: 'gemini-user-api-v1',
    provider: 'gemini',
    label: 'Gemini · Dịch theo ngữ cảnh',
    description: 'Dùng key Gemini của Lily trên máy chủ · nhớ tên, quan hệ và xưng hô xuyên truyện',
  },
  {
    id: 'qt-dictionary',
    provider: 'dictionary',
    label: 'Lily QT',
    description: 'Bản convert nhanh theo từ điển VietPhrase',
  },
  {
    id: 'google-quick-2',
    provider: 'google',
    label: 'Dịch máy',
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
    // Runs on Lily's translate API (Marian qt_vp2vi_e8, CTranslate2) instead of the in-browser ONNX build;
    // shares the Lily Đô Thị license.
    id: 'qt-polish',
    hfRepo: 'lily-qt',
    licenseRepo: 'lily-dothi',
    source: 'lily-api',
    provider: 'onnx',
    label: 'Lily Làm mượt QT',
    description: 'Làm mượt chương đã là bản QT, không dịch từ tiếng Trung',
    ownerOnly: true,
  },
  {
    // 26/10: Lily QT S1 (own tokenizer, 512k QT pairs) on Lily's API as lily-qt-s1, open to all readers under the
    // shared free quota (Lily QT / Dịch máy). Input must already be QT-style Vietnamese.
    id: 'qt-polish-s1',
    hfRepo: 'lily-qt-s1',
    source: 'lily-api',
    provider: 'onnx',
    label: 'Lily Làm mượt QT (S1)',
    description: 'Làm mượt chương đã là bản QT tiếng Việt · không dịch từ tiếng Trung',
    publicApi: true,
  },
  {
    // Test build (26/10): vp2vi + 512k QT pairs (dichngay + EPUB QT), served as lily-qt-a500 on Lily's API.
    // Only the owner's sheet lists every model, so this stays admin-only.
    id: 'qt-polish-a500',
    hfRepo: 'lily-qt-a500',
    licenseRepo: 'lily-dothi',
    source: 'lily-api',
    provider: 'onnx',
    label: 'Lily Làm mượt QT A500 (thử nghiệm)',
    description: 'Bản mới học 512k cặp QT · so với Lily Làm mượt QT',
    ownerOnly: true,
  },
];
