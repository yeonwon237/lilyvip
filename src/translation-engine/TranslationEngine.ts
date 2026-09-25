import { translateChapterContent, TranslationProgress, TranslatedChapterContent } from './TranslationWorkerClient';
import { TRANSLATION_MODELS } from './translationConfig';
import { GeminiTranslationService } from './GeminiTranslationService';

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
    bookTitle?: string,
    context?: { bookId: string; chapterIndex: number; sourceBookTitle?: string }
  ): Promise<TranslatedChapterContent> {
    const model = TRANSLATION_MODELS.find(m => m.id === modelId);
    if (!model) throw new Error('Không tìm thấy mô hình dịch.');

    if (model.provider === 'gemini') {
      if (!context) throw new Error('Thiếu ngữ cảnh truyện cho Gemini.');
      return GeminiTranslationService.translateChapter(
        context.bookId,
        context.chapterIndex,
        context.sourceBookTitle || '',
        title,
        paragraphs,
        onProgress,
      );
    }
    if (!model.hfRepo) throw new Error('Mô hình ONNX chưa có kho lưu trữ.');
    return translateChapterContent(title, paragraphs, model.hfRepo, model.inputMode, onProgress, bookTitle);
  }
}
