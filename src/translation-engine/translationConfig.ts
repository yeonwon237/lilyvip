// Client-side ZH → VI translation, running fully in-browser via transformers.js (WASM).
// Models are pre-converted/quantized ONNX exports hosted on the yennguyen45 Hugging Face account.

export interface TranslationModelOption {
  id: string;
  hfRepo: string;
  label: string;
  description: string;
}

export const TRANSLATION_MODELS: TranslationModelOption[] = [
  {
    id: 'lily-pro',
    hfRepo: 'yennguyen45/hachimimt-60-zh-vi-web',
    label: 'Lily Pro',
    description: 'Dịch thẳng Trung → Việt, bám sát nguyên văn',
  },
  {
    id: 'lily-pro-2',
    hfRepo: 'yennguyen45/hachimimt-60-qt-web',
    label: 'Lily Pro 2',
    description: 'Dịch thẳng Trung → Việt, văn phong khác',
  },
];

export const POLISH_MODEL: TranslationModelOption = {
  id: 'polish',
  hfRepo: 'yennguyen45/vp2vi-polish-web',
  label: 'Làm mượt văn phong',
  description: 'Biến bản dịch thô kiểu QT thành văn xuôi mượt hơn',
};
