import { Book, Chapter } from '../../types';
import { BookRepository } from '../storage/BookRepository';
import { JjwxcAccessManager } from './JjwxcAccessManager';
import { JjwxcChapterFetchStatus, JjwxcWebViewService } from './JjwxcWebViewService';

export type JjwxcChapterLoadStatus = JjwxcChapterFetchStatus | 'native_required';

export interface JjwxcChapterLoadResult {
  status: JjwxcChapterLoadStatus;
  paragraphs: string[];
}

// Same CJK-aware word count used by the website importer (see
// src/book-engine/website-importer/html-cleaner.ts) — duplicated in miniature
// here rather than imported, since JjwxcChapterExtractor deliberately returns
// only {status, title, paragraphs} and nothing else, so the count is computed
// on the caller's side.
function countWords(paragraphs: string[]): number {
  const text = paragraphs.join(' ');
  const latinWords = text.match(/[\wÀ-ɏẠ-ỹ]+/g) || [];
  const cjkChars = text.match(/[一-鿿぀-ヿ가-힯]/g) || [];
  return latinWords.length + cjkChars.length;
}

/**
 * Bridges a JJWXC-sourced book's empty-placeholder chapters (saved by
 * JjwxcSourceAdapter with `paragraphs: []`) to real chapter text, fetched lazily
 * the first time the reader opens that chapter — never at import time. Called
 * from ReaderContext.loadChapterData; everything downstream (Reader UI,
 * Translate, TTS, bookmarks) only ever sees `paragraphs: string[]`, exactly like
 * a locally-imported book — see ReaderContext/TranslateSheet, unchanged.
 */
export class JjwxcChapterService {
  public static isJjwxcBook(book: Pick<Book, 'source'>): boolean {
    return book.source?.type === 'website' && book.source.adapter === 'jjwxc';
  }

  public static async ensureChapterLoaded(book: Book, chapter: Chapter, isOwner: boolean | undefined): Promise<JjwxcChapterLoadResult> {
    if (chapter.paragraphs && chapter.paragraphs.length > 0) {
      return { status: 'ok', paragraphs: chapter.paragraphs };
    }
    if (!chapter.sourceUrl) {
      return { status: 'unknown_format', paragraphs: [] };
    }
    // Check before ever touching the WebView plugin — on web/localhost (or a
    // non-owner account) this must fail closed without attempting a native call.
    if (!JjwxcAccessManager.isNativeRuntimeAvailable() || !JjwxcAccessManager.isJjwxcConnectEnabled(isOwner)) {
      return { status: 'native_required', paragraphs: [] };
    }

    const result = await JjwxcWebViewService.fetchChapter(chapter.sourceUrl, isOwner);
    if (result.status === 'ok' && result.paragraphs.length > 0) {
      await BookRepository.updateChapterContent(book.id, chapter.index, {
        title: result.title || undefined,
        paragraphs: result.paragraphs,
        wordCount: countWords(result.paragraphs),
      });
      return { status: 'ok', paragraphs: result.paragraphs };
    }
    // A parser that reports "ok" but with no paragraphs is itself a parsing miss,
    // not a real success — never claim ok with empty content.
    return { status: result.status === 'ok' ? 'unknown_format' : result.status, paragraphs: [] };
  }
}
