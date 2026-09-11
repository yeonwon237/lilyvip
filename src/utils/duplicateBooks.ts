import { Book } from '../types';

export interface DuplicateCheckInput {
  title: string;
  author: string;
  wordCount: number;
  totalChapters: number;
}

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Finds an existing book that looks like the same work as `draft`: same
 * title plus either the same author, or a near-identical word count and
 * chapter count (a straight re-import of the same file always reparses to
 * the same numbers, even if the author field was left blank or edited).
 */
export const findDuplicateBook = (existingBooks: Book[], draft: DuplicateCheckInput): Book | null => {
  const title = normalize(draft.title);
  if (!title) return null;
  const author = normalize(draft.author);

  return existingBooks.find(book => {
    if (normalize(book.title) !== title) return false;
    if (author && normalize(book.author) === author) return true;
    const wordCountClose = draft.wordCount > 0
      && Math.abs(book.wordCount - draft.wordCount) <= Math.max(20, draft.wordCount * 0.01);
    return book.totalChapters === draft.totalChapters && wordCountClose;
  }) ?? null;
};

/** Identifies the same File picked twice in one multi-select dialog. */
export const findDuplicateFile = (files: File[], file: File, uptoIndex: number): File | null => {
  for (let i = 0; i < uptoIndex; i++) {
    const other = files[i];
    if (other.name === file.name && other.size === file.size) return other;
  }
  return null;
};

export class DuplicateBookError extends Error {
  existingBook: Book;
  constructor(existingBook: Book) {
    super(`"${existingBook.title}" có vẻ đã có trong thư viện rồi.`);
    this.name = 'DuplicateBookError';
    this.existingBook = existingBook;
  }
}
