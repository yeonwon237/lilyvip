import { translateParagraphs, TranslationProgress } from './TranslationWorkerClient';
import { TRANSLATION_MODELS, POLISH_MODEL } from './translationConfig';

export class TranslationEngine {
  private static instance: TranslationEngine;

  public static getInstance(): TranslationEngine {
    if (!TranslationEngine.instance) {
      TranslationEngine.instance = new TranslationEngine();
    }
    return TranslationEngine.instance;
  }

  async translateChapter(
    paragraphs: string[],
    modelId: string,
    polish: boolean,
    onProgress?: (progress: TranslationProgress) => void
  ): Promise<string[]> {
    const model = TRANSLATION_MODELS.find(m => m.id === modelId);
    if (!model) throw new Error('Không tìm thấy mô hình dịch.');

    let result = await translateParagraphs(paragraphs, model.hfRepo, onProgress);
    if (polish) {
      result = await translateParagraphs(result, POLISH_MODEL.hfRepo, onProgress);
    }
    return result;
  }
}
