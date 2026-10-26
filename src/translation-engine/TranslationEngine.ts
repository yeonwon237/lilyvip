import { translateChapterContent, TranslationProgress, TranslatedChapterContent } from './TranslationWorkerClient';
import { TRANSLATION_MODELS } from './translationConfig';
import { ModelLicense } from './ModelLicense';
import { translateChapterViaApi } from './ApiTranslationClient';
import { GeminiTranslationService } from './GeminiTranslationService';
import { translateQtChapter } from './qt/translateQtChapter';
import { translateGoogleChapter } from './GoogleTranslateService';
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
    context?: { bookId: string; chapterIndex: number; sourceBookTitle?: string; geminiClaimId?: string | null }
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
        context.geminiClaimId || undefined,
      );
    }
    if (model.provider === 'dictionary' || model.provider === 'google') {
      onProgress?.({ stage: 'loading-model' });
      const names = await collectBookNames(context?.bookId, [
        ...(context ? await this.bookIntroText(context.bookId) : []),
        ...paragraphs,
      ]);
      return model.provider === 'google'
        ? translateGoogleChapter(title, paragraphs, onProgress, bookTitle, names)
        : translateQtChapter(title, paragraphs, onProgress, bookTitle, names);
    }
    if (!model.hfRepo) throw new Error('Mô hình ONNX chưa có kho lưu trữ.');
    if (model.source === 'lily-api') {
      // Readers without a model license (MY01/MY02) send the Lily quota claim instead; the server verifies it with LilyHub.
      const claim = context?.geminiClaimId && context.geminiClaimId !== 'admin-unlimited' ? context.geminiClaimId : undefined;
      const auth = model.publicApi ? undefined : await ModelLicense.ensureAuth(model.licenseRepo || model.hfRepo).catch(error => {
        if (claim) return undefined;
        throw error;
      });
      return translateChapterViaApi(title, paragraphs, model.hfRepo, auth, onProgress, bookTitle, claim);
    }
    const auth = model.source === 'lily-private' ? await ModelLicense.ensureAuth(model.hfRepo) : undefined;
    return translateChapterContent(title, paragraphs, model.hfRepo, model.inputMode, onProgress, bookTitle, model.source, auth);
  }
}
