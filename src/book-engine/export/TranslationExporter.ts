import { TranslationCache, buildBookTitleCacheKey, buildTranslationCacheKey } from '../../translation-engine/TranslationCache';
import { TRANSLATION_MODELS } from '../../translation-engine/translationConfig';
import { BookExporter } from './BookExporter';

export interface TranslationExportChapter {
  index: number;
  title: string;
  volumeTitle?: string;
}

export interface TranslatedModelSummary {
  modelId: string;
  label: string;
  translatedCount: number;
}

export interface TranslationExportResult {
  filename: string;
  blob: Blob;
  exported: number;
  missing: number[];
}

/**
 * Exports chapters the reader has already translated (kept in the local translation cache)
 * as one TXT file. Nothing is re-translated: chapters without a cached translation for the
 * chosen model are reported back as `missing`.
 */
export class TranslationExporter {
  /** Which models have at least one cached chapter for this book, with how many chapters each. */
  static async summarizeModels(bookId: string, chapters: TranslationExportChapter[]): Promise<TranslatedModelSummary[]> {
    const summaries: TranslatedModelSummary[] = [];
    for (const model of TRANSLATION_MODELS) {
      let translatedCount = 0;
      for (const chapter of chapters) {
        const cached = await TranslationCache.get(buildTranslationCacheKey(bookId, chapter.index, model.id));
        if (cached?.paragraphs?.length) translatedCount += 1;
      }
      if (translatedCount > 0) summaries.push({ modelId: model.id, label: model.label, translatedCount });
    }
    return summaries.sort((a, b) => b.translatedCount - a.translatedCount);
  }

  static async exportTxt(options: {
    bookId: string;
    bookTitle: string;
    author?: string;
    modelId: string;
    chapters: TranslationExportChapter[];
  }): Promise<TranslationExportResult> {
    const { bookId, bookTitle, author, modelId, chapters } = options;
    const translatedBookTitle = (await TranslationCache.get(buildBookTitleCacheKey(bookId, modelId)))?.title?.trim();
    const out: Array<{ index: number; title: string; paragraphs: string[]; volumeTitle?: string }> = [];
    const missing: number[] = [];
    for (const chapter of [...chapters].sort((a, b) => a.index - b.index)) {
      const cached = await TranslationCache.get(buildTranslationCacheKey(bookId, chapter.index, modelId));
      if (!cached?.paragraphs?.length) {
        missing.push(chapter.index);
        continue;
      }
      out.push({
        index: chapter.index,
        title: cached.title?.trim() || chapter.title,
        paragraphs: cached.paragraphs,
        volumeTitle: chapter.volumeTitle,
      });
    }
    const { filename, blob } = BookExporter.chaptersToTxt(translatedBookTitle || bookTitle, author, out);
    return { filename: filename.replace(/\.txt$/, ' (bản dịch).txt'), blob, exported: out.length, missing };
  }
}
