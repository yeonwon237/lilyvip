import { translateChapterContent, TranslationProgress, TranslatedChapterContent } from './TranslationWorkerClient';
import { TRANSLATION_MODELS } from './translationConfig';
import { ModelLicense } from './ModelLicense';
import { translateChapterViaApi } from './ApiTranslationClient';
import { GeminiTranslationService } from './GeminiTranslationService';
import { translateQtChapter } from './qt/translateQtChapter';
import { collectBookNames } from './qt/qtNames';
import { LocalBookSource } from '../book-engine/source/LocalBookSource';

export class TranslationEngine {
  private static instance: TranslationEngine;

  public static getInstance(): TranslationEngine {
    if (!TranslationEngine.instance) {
      TranslationEngine.instance = new TranslationEngine();
    }
    return TranslationEngine.instance;
  }

  /** Blurb + opening chapter, where the cast line ("主角：…┃配角：…") usually sits. */
  private async bookIntroText(bookId: string): Promise<string[]> {
    try {
      const source = LocalBookSource.getInstance();
      const book = await source.getBook(bookId);
      const opening = await source.getChapter(bookId, book?.firstChapterIndex ?? 1);
      return [book?.description || '', ...(opening?.paragraphs || []).slice(0, 60)];
    } catch {
      return [];
    }
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
    if (model.provider === 'dictionary') {
      onProgress?.({ stage: 'loading-model' });
      const names = await collectBookNames(context?.bookId, [
        ...(context ? await this.bookIntroText(context.bookId) : []),
        ...paragraphs,
      ]);
      return translateQtChapter(title, paragraphs, onProgress, bookTitle, names);
    }
    if (!model.hfRepo) throw new Error('Mô hình ONNX chưa có kho lưu trữ.');
    if (model.source === 'lily-api') {
      const auth = await ModelLicense.ensureAuth(model.hfRepo);
      return translateChapterViaApi(title, paragraphs, model.hfRepo, auth, onProgress, bookTitle);
    }
    const auth = model.source === 'lily-private' ? await ModelLicense.ensureAuth(model.hfRepo) : undefined;
    return translateChapterContent(title, paragraphs, model.hfRepo, model.inputMode, onProgress, bookTitle, model.source, auth);
  }
}
