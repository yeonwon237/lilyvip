import { translateChapterContent, TranslationProgress, TranslatedChapterContent } from './TranslationWorkerClient';
import { TRANSLATION_MODELS } from './translationConfig';

export class TranslationEngine {
  private static instance: TranslationEngine;

  public static getInstance(): TranslationEngine {
    if (!TranslationEngine.instance) {
      TranslationEngine.instance = new TranslationEngine();
    }
    return TranslationEngine.instance;
  }

  async translateChapter(
    title: string,
    paragraphs: string[],
    modelId: string,
    onProgress?: (progress: TranslationProgress) => void,
    bookTitle?: string
  ): Promise<TranslatedChapterContent> {
    const model = TRANSLATION_MODELS.find(m => m.id === modelId);
    if (!model) throw new Error('Không tìm thấy mô hình dịch.');

    return translateChapterContent(title, paragraphs, model.hfRepo, model.inputMode, onProgress, bookTitle);
  }
}
