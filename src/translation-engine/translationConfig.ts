// Client-side chapter translation, running fully in-browser via transformers.js (WASM).
// Models are pre-converted/quantized ONNX exports hosted on the yennguyen45 Hugging Face account.
// These are three independent, user-selectable modes — not a base model plus an optional
// post-processing step. Lily Pro / Lily Pro 2 both translate Chinese source text straight
// to Vietnamese; "Làm mượt QT" is a separate model for chapters that are ALREADY rough
// QT-style Vietnamese (e.g. from an external VietPhrase/QT conversion) and just need
// smoothing — it never runs chained after the other two.

export interface TranslationModelOption {
  id: string;
  hfRepo?: string;
  provider?: 'onnx' | 'gemini' | 'dictionary';
  label: string;
  description: string;
  inputMode?: 'default' | 'lilymt-modern-block' | 'lilymt-ancient-sentence';
  /** Owner or accounts granted 'ai_translation' only (see TranslateSheet). */
  ownerOnly?: boolean;
}

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
    id: 'lily-pro',
    provider: 'onnx',
    hfRepo: 'yennguyen45/hachimimt-60-zh-vi-web',
    label: 'Lily Dịch · Sát nghĩa',
    description: 'Dịch Trung → Việt, bám sát nguyên văn',
    ownerOnly: true,
  },
  {
    id: 'lily-pro-2',
    provider: 'onnx',
    hfRepo: 'yennguyen45/hachimimt-60-qt-web',
    label: 'Lily Dịch · Tự nhiên',
    description: 'Dịch Trung → Việt, văn phong thoáng hơn',
    ownerOnly: true,
  },
  {
    id: 'lilymt-modern-v14-admin-v4',
    hfRepo: 'yennguyen45/LilyMT-modern-v14-admin-web',
    provider: 'onnx',
    label: 'Lily Hiện đại',
    description: 'Tối ưu cho truyện hiện đại và ABO, dịch theo đoạn',
    inputMode: 'lilymt-modern-block',
    ownerOnly: true,
  },
  {
    id: 'lilymt-ancient-v14-admin-v4',
    hfRepo: 'yennguyen45/LilyMT-ancient-v14-admin-web',
    provider: 'onnx',
    label: 'Lily Cổ đại',
    description: 'Tối ưu cho truyện cổ đại và ABO, dịch theo câu',
    inputMode: 'lilymt-ancient-sentence',
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
