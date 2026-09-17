import { Book, Chapter } from '../../types';
import { BookRepository } from '../storage/BookRepository';
import { countCjkAwareWords } from './countCjkAwareWords';

// 'not_configured' covers the (currently permanent) gap between "book was
// imported" and "there's a way to actually fetch this chapter's text on the
// web" — the fetch mechanism (copy-paste, bookmarklet, or otherwise) hasn't
// been decided/built yet. Once it exists, this module is where it plugs in.
export type JjwxcChapterLoadStatus = 'ok' | 'locked' | 'session_expired' | 'unknown_format' | 'not_configured';

export interface JjwxcChapterLoadResult {
  status: JjwxcChapterLoadStatus;
  paragraphs: string[];
}

/**
 * Bridges a JJWXC-sourced book's empty-placeholder chapters (saved by
 * JjwxcSourceAdapter with `paragraphs: []`) to real chapter text. Called from
 * ReaderContext.loadChapterData; everything downstream (Reader UI, Translate,
 * TTS, bookmarks) only ever sees `paragraphs: string[]`, exactly like a
 * locally-imported book — see ReaderContext/TranslateSheet, unchanged.
 */
export class JjwxcChapterService {
  public static isJjwxcBook(book: Pick<Book, 'source'>): boolean {
    return book.source?.type === 'website' && book.source.adapter === 'jjwxc';
  }

  /** Persists chapter text once it's been obtained by whatever means — kept
   * separate from "how do we get the text" so the fetch mechanism (still
   * being designed) only ever has to call this one method. */
  public static async saveChapterText(book: Book, chapterIndex: number, title: string | null, paragraphs: string[]): Promise<void> {
    await BookRepository.updateChapterContent(book.id, chapterIndex, {
      title: title || undefined,
      paragraphs,
      wordCount: countCjkAwareWords(paragraphs),
    });
  }

  public static async ensureChapterLoaded(book: Book, chapter: Chapter): Promise<JjwxcChapterLoadResult> {
    if (chapter.paragraphs && chapter.paragraphs.length > 0) {
      return { status: 'ok', paragraphs: chapter.paragraphs };
    }
    if (!chapter.sourceUrl) {
      return { status: 'unknown_format', paragraphs: [] };
    }
    // No web-safe fetch mechanism is wired up yet (see module doc) — report
    // this honestly instead of guessing or faking content.
    return { status: 'not_configured', paragraphs: [] };
  }
}
