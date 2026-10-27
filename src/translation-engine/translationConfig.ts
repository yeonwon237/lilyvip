/** 'lilymt-v20-block': V20 models — ≤220-char blocks, beam 2, repetition 1.2, no post-processing. */
export type TranslationInputMode = 'default' | 'lilymt-modern-block' | 'lilymt-ancient-sentence' | 'lilymt-v20-block';

export interface TranslationModelOption {
  id: string;
  hfRepo?: string;
  /** 'lily-private': served from Lily's private R2 bucket to granted accounts only.
   *  'lily-api': session-authenticated LilyHub gateway; only the public id is sent. */
  source?: 'huggingface' | 'lily-private' | 'lily-api';
  provider?: 'onnx' | 'gemini' | 'dictionary' | 'google';
  label: string;
  description: string;
  inputMode?: TranslationInputMode;
  /** Owner or accounts granted 'ai_translation' only (see TranslateSheet). */
  ownerOnly?: boolean;
  /** Available to signed-in free accounts under the server-enforced daily quota. */
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
  model?.source === 'lily-private';

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
    source: 'lily-api',
    provider: 'onnx',
    label: 'Lily Cổ Phong',
    description: 'Truyện cổ đại và ABO cổ đại · văn mượt, giữ đúng tên riêng',
    inputMode: 'lilymt-v20-block',
    ownerOnly: true,
  },
  {
    id: 'lily-dothi-v1',
    source: 'lily-api',
    provider: 'onnx',
    label: 'Lily Đô Thị',
    description: 'Truyện hiện đại, đô thị và ABO · văn mượt, giữ đúng tên riêng',
    inputMode: 'lilymt-v20-block',
    ownerOnly: true,
  },
  {
    id: 'qt-polish',
    source: 'lily-api',
    provider: 'onnx',
    label: 'Lily Làm mượt QT',
    description: 'Làm mượt chương đã là bản QT, không dịch từ tiếng Trung',
    ownerOnly: true,
  },
  {
    id: 'qt-polish-s1',
    source: 'lily-api',
    provider: 'onnx',
    label: 'Lily Làm mượt QT (S1)',
    description: 'Làm mượt chương đã là bản QT tiếng Việt · không dịch từ tiếng Trung',
    publicApi: true,
  },
  {
    id: 'qt-polish-a500',
    source: 'lily-api',
    provider: 'onnx',
    label: 'Lily Làm mượt QT A500 (thử nghiệm)',
    description: 'Model cá nhân của Lily · bản thử nghiệm làm mượt QT',
    ownerOnly: true,
  },
];
