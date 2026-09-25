// Client-side chapter translation, running fully in-browser via transformers.js (WASM).
// Models are pre-converted/quantized ONNX exports hosted on the yennguyen45 Hugging Face account.
// These are three independent, user-selectable modes — not a base model plus an optional
// post-processing step. Lily Pro / Lily Pro 2 both translate Chinese source text straight
// to Vietnamese; "Làm mượt QT" is a separate model for chapters that are ALREADY rough
// QT-style Vietnamese (e.g. from an external VietPhrase/QT conversion) and just need
// smoothing — it never runs chained after the other two.

export interface TranslationModelOption {
  id: string;
  hfRepo: string;
  label: string;
  description: string;
  inputMode?: 'default' | 'lilymt-modern-block' | 'lilymt-ancient-sentence';
  ownerOnly?: boolean;
}

export const TRANSLATION_MODELS: TranslationModelOption[] = [
  {
    id: 'lily-pro',
    hfRepo: 'yennguyen45/hachimimt-60-zh-vi-web',
    label: 'Lily Pro',
    description: 'Dịch Trung → Việt, bám sát nguyên văn',
  },
  {
    id: 'lily-pro-2',
    hfRepo: 'yennguyen45/hachimimt-60-qt-web',
    label: 'Lily Pro 2',
    description: 'Dịch Trung → Việt, văn phong khác',
  },
  {
    id: 'lilymt-modern-v14-admin-v4',
    hfRepo: 'yennguyen45/LilyMT-modern-v14-admin-web',
    label: 'LilyMT v14 · Hiện đại/ABO (thử nghiệm)',
    description: 'INT8 · dịch theo đoạn tự nhiên · chỉ dành cho admin',
    inputMode: 'lilymt-modern-block',
    ownerOnly: true,
  },
  {
    id: 'lilymt-ancient-v14-admin-v4',
    hfRepo: 'yennguyen45/LilyMT-ancient-v14-admin-web',
    label: 'LilyMT Ancient v14 · Cổ đại/ABO (thử nghiệm)',
    description: 'INT8 · tách câu an toàn · chỉ dành cho admin',
    inputMode: 'lilymt-ancient-sentence',
    ownerOnly: true,
  },
  {
    id: 'qt-polish',
    hfRepo: 'yennguyen45/vp2vi-polish-web',
    label: 'Làm mượt QT',
    description: 'Chương đã là bản QT thô — chỉ làm mượt, không dịch Trung',
  },
];
