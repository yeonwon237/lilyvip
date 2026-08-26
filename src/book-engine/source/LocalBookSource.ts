import { Book, Chapter } from '../../types';
import { 
  NormalizedBook, 
  NormalizedChapter, 
  ReadingProgress, 
  ParsedBookDraft, 
  StorageEstimateInfo,
  SearchResult,
  Bookmark 
} from '../types';
import { BookSource } from './BookSource';
import { BookRepository } from '../storage/BookRepository';

export class LocalBookSource implements BookSource {
  private static instance: LocalBookSource | null = null;

  public static getInstance(): LocalBookSource {
    if (!this.instance) {
      this.instance = new LocalBookSource();
    }
    return this.instance;
  }

  /**
   * Convert internal NormalizedBook into app Book type
   */
  private mapToAppBook(norm: NormalizedBook): Book {
    return {
      id: norm.id,
      title: norm.title,
      author: norm.author,
      coverUrl: norm.coverUrl,
      coverColor: norm.coverColor,
      totalChapters: norm.totalChapters,
      currentChapter: norm.currentChapter,
      currentChapterTitle: norm.currentChapterTitle,
      progressPercent: norm.progressPercent,
      wordCount: norm.wordCount,
      fileSizeMB: norm.fileSizeMB,
      fileFormat: norm.fileFormat,
      storageType: 'local',
      lastReadAt: norm.lastReadAt,
      addedAt: norm.createdAt.split('T')[0] || norm.createdAt,
      tags: norm.tags || ['Truyện cá nhân'],
      shelfIds: norm.shelfIds || [],
      description: norm.description || `Tác phẩm cá nhân nhập từ tệp ${norm.originalFileName} gồm ${norm.totalChapters} chương.`,
    };
  }

  /**
   * Convert internal NormalizedChapter into app Chapter type
   */
  private mapToAppChapter(norm: NormalizedChapter, currentChapterIndex: number = 1): Chapter {
    return {
      id: norm.id,
      bookId: norm.bookId,
      index: norm.index,
      title: norm.title,
      wordCount: norm.wordCount,
      isRead: norm.index < currentChapterIndex,
      isCurrent: norm.index === currentChapterIndex,
      paragraphs: norm.paragraphs,
    };
  }

  public async getBooks(): Promise<Book[]> {
    const rawBooks = await BookRepository.getBooks();
    return rawBooks.map(b => this.mapToAppBook(b));
  }

  public async getBook(id: string): Promise<Book | null> {
    const raw = await BookRepository.getBook(id);
    return raw ? this.mapToAppBook(raw) : null;
  }

  public async getChapter(bookId: string, chapterIndex: number): Promise<Chapter | null> {
    const raw = await BookRepository.getChapter(bookId, chapterIndex);
    if (!raw) return null;
    const progress = await BookRepository.getProgress(bookId);
    const currentIndex = progress ? progress.chapterIndex : 1;
    return this.mapToAppChapter(raw, currentIndex);
  }

  public async getChapterList(bookId: string): Promise<Array<{ index: number; title: string; wordCount: number; isRead: boolean; isCurrent: boolean }>> {
    const rawList = await BookRepository.getChapterList(bookId);
    const progress = await BookRepository.getProgress(bookId);
    const currentIndex = progress ? progress.chapterIndex : 1;

    return rawList.map(c => ({
      index: c.index,
      title: c.title,
      wordCount: c.wordCount,
      isRead: c.index < currentIndex,
      isCurrent: c.index === currentIndex,
    }));
  }

  public async saveBook(draft: ParsedBookDraft, customMeta?: Partial<NormalizedBook>): Promise<Book> {
    const bookId = `local-book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const bookToSave: NormalizedBook = {
      id: bookId,
      version: 1,
      title: customMeta?.title?.trim() || draft.title,
      author: customMeta?.author?.trim() || draft.author,
      coverUrl: customMeta?.coverUrl !== undefined ? customMeta.coverUrl : draft.coverUrl,
      coverColor: customMeta?.coverColor || draft.suggestedCoverColor,
      fileFormat: draft.fileFormat,
      fileSizeMB: draft.fileSizeMB,
      totalChapters: draft.totalChapters,
      wordCount: draft.wordCount,
      originalFileName: draft.originalFileName,
      storageType: 'local',
      createdAt: now,
      updatedAt: now,
      lastReadAt: 'Vừa thêm',
      currentChapter: 1,
      currentChapterTitle: draft.chapters[0] ? draft.chapters[0].title : 'Chương 1',
      progressPercent: 0,
      tags: customMeta?.tags || ['Truyện cá nhân'],
      shelfIds: customMeta?.shelfIds || [],
      hasDetectedChapters: draft.hasDetectedChapters,
      confidence: draft.confidence,
      description: customMeta?.description || `Tác phẩm cá nhân nhập từ tệp ${draft.originalFileName} gồm ${draft.totalChapters} chương.`,
    };

    const chaptersToSave: NormalizedChapter[] = draft.chapters.map(c => ({
      ...c,
      bookId,
    }));

    const saved = await BookRepository.saveBook(bookToSave, chaptersToSave, draft.rawBlob);
    return this.mapToAppBook(saved);
  }

  public async deleteBook(id: string): Promise<void> {
    await BookRepository.deleteBook(id);
  }

  public async saveProgress(
    bookId: string, 
    chapterIndex: number, 
    percentage: number, 
    chapterTitle: string,
    scrollPercent?: number,
    scrollOffset?: number
  ): Promise<void> {
    await BookRepository.saveProgress({
      bookId,
      chapterIndex,
      chapterTitle,
      percentage,
      scrollPercent: scrollPercent ?? 0,
      scrollOffset: scrollOffset ?? 0,
      updatedAt: new Date().toISOString(),
    });
  }

  public async getProgress(bookId: string): Promise<ReadingProgress | null> {
    return BookRepository.getProgress(bookId);
  }

  public async searchInBook(bookId: string, query: string, maxResults = 50): Promise<SearchResult[]> {
    return BookRepository.searchInBook(bookId, query, maxResults);
  }

  public async countBooks(): Promise<number> {
    return BookRepository.countBooks();
  }

  public async getStorageEstimate(): Promise<StorageEstimateInfo> {
    return BookRepository.getStorageEstimate();
  }

  public async saveBookmark(bookmark: Partial<Bookmark> & { bookId: string; chapterIndex: number; selectedText: string }): Promise<Bookmark> {
    return BookRepository.saveBookmark(bookmark);
  }

  public async deleteBookmark(id: string): Promise<void> {
    return BookRepository.deleteBookmark(id);
  }

  public async getBookmark(id: string): Promise<Bookmark | null> {
    return BookRepository.getBookmark(id);
  }

  public async getBookmarksForBook(bookId: string): Promise<Bookmark[]> {
    return BookRepository.getBookmarksForBook(bookId);
  }

  public async getBookmarksForChapter(bookId: string, chapterIndex: number): Promise<Bookmark[]> {
    return BookRepository.getBookmarksForChapter(bookId, chapterIndex);
  }

  public async getRawBlob(bookId: string): Promise<Blob | null> {
    return BookRepository.getRawBlob(bookId);
  }

  public async requestPersistentStorage(): Promise<boolean> {
    return BookRepository.requestPersistentStorage();
  }
}
