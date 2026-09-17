import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { JjwxcSourceAdapter } from '../JjwxcSourceAdapter';
import { JjwxcTocLoader } from '../JjwxcTocLoader';
import { JjwxcChapterService } from '../JjwxcChapterService';
import { TOC_OK_HTML, SESSION_EXPIRED_HTML } from '../JjwxcDevFixtures';
import { BookRepository } from '../../storage/BookRepository';
import type { NormalizedBook, NormalizedChapter } from '../../types';
import type { Book, Chapter } from '../../../types';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });

let totalTests = 0;
let passedTests = 0;

function check(condition: boolean, name: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    process.exitCode = 1;
  }
}

console.log('\n=== JjwxcSourceAdapter.mapTocToDraft: pure mapping, no network ===');
{
  const toc = JjwxcTocLoader.parse(TOC_OK_HTML); // status 'ok' is a subset of JjwxcTocFetchStatus
  const draft = JjwxcSourceAdapter.mapTocToDraft('9209789', 'wap.jjwxc.net', toc);
  check(draft !== null, 'ok TOC maps to a non-null draft');
  check(draft?.fileFormat === 'WEBSITE', 'draft reuses the existing WEBSITE fileFormat — no new SupportedFormat needed');
  check(draft?.title === '示例小说', 'draft title comes from parsed TOC');
  check(draft?.author === '墨言', 'draft author comes from parsed TOC');
  check(draft?.chapters.length === 3, 'draft has all 3 chapters from the TOC');
  check(Boolean(draft?.chapters.every(c => c.paragraphs.length === 0)), 'every chapter is saved with empty placeholder paragraphs (no full-book prefetch)');
  check(Boolean(draft?.chapters.every(c => c.wordCount === 0)), 'placeholder chapters report 0 word count until fetched');
  check(draft?.chapters[0].sourceUrl === '/onebook.php?novelid=9209789&chapterid=1', 'each chapter keeps its own sourceUrl for the later lazy fetch');
  check(draft?.chapters[0].index === 1 && draft?.chapters[2].index === 3, 'chapter indices are dense/contiguous starting at 1 (required by BookRepository.saveBook)');
}
{
  const expiredToc = JjwxcTocLoader.parse(SESSION_EXPIRED_HTML);
  const draft = JjwxcSourceAdapter.mapTocToDraft('9209789', 'wap.jjwxc.net', expiredToc);
  check(draft === null, 'a non-ok TOC status (session_expired) never produces a draft — no partial/junk book');
}
{
  const emptyToc = { status: 'ok' as const, title: 'x', author: null, chapters: [] };
  const draft = JjwxcSourceAdapter.mapTocToDraft('1', 'wap.jjwxc.net', emptyToc);
  check(draft === null, 'an ok status with zero chapters still refuses to produce a draft');
}

console.log('\n=== JjwxcSourceAdapter.buildSourceMeta ===');
{
  const meta = JjwxcSourceAdapter.buildSourceMeta('https://wap.jjwxc.net/book2/9209789', 'wap.jjwxc.net', '9209789');
  check(meta.type === 'website', 'source.type reuses the existing "website" bucket — no BookSourceMeta type change needed');
  check(meta.adapter === 'jjwxc', 'source.adapter identifies this as the jjwxc adapter');
  check(meta.novelId === '9209789', 'source.novelId is set (field already existed on BookSourceMeta)');
}

console.log('\n=== JjwxcChapterService: pure decision branches (no native call) ===');
{
  const book = { id: 'b1', source: { type: 'website', adapter: 'jjwxc', url: '', hostname: '', importedAt: '' } } as unknown as Book;
  check(JjwxcChapterService.isJjwxcBook(book), 'isJjwxcBook true for source.type=website + adapter=jjwxc');
  check(!JjwxcChapterService.isJjwxcBook({ ...book, source: { ...book.source!, adapter: 'wordpress' } }), 'isJjwxcBook false for a different adapter under the same website type');
  check(!JjwxcChapterService.isJjwxcBook({ source: undefined } as unknown as Book), 'isJjwxcBook false when there is no source at all (a plain local import)');
}
{
  const book = { id: 'b1', source: { type: 'website', adapter: 'jjwxc', url: '', hostname: '', importedAt: '' } } as unknown as Book;
  const chapterWithText = { paragraphs: ['đã có sẵn'] } as unknown as Chapter;
  const result = await JjwxcChapterService.ensureChapterLoaded(book, chapterWithText);
  check(result.status === 'ok' && result.paragraphs[0] === 'đã có sẵn', 'a chapter that already has paragraphs is returned as-is, no fetch attempted');
}
{
  const book = { id: 'b1', source: { type: 'website', adapter: 'jjwxc', url: '', hostname: '', importedAt: '' } } as unknown as Book;
  const chapterNoUrl = { paragraphs: [] } as unknown as Chapter;
  const result = await JjwxcChapterService.ensureChapterLoaded(book, chapterNoUrl);
  check(result.status === 'unknown_format', 'a placeholder chapter with no sourceUrl at all reports unknown_format, not a crash');
}
{
  // No web-safe fetch mechanism exists yet (see JjwxcChapterService module doc) —
  // a chapter that needs fetching must report not_configured, never fake content.
  const book = { id: 'b1', source: { type: 'website', adapter: 'jjwxc', url: '', hostname: '', importedAt: '' } } as unknown as Book;
  const chapterNeedsFetch = { index: 1, paragraphs: [], sourceUrl: '/onebook.php?novelid=1&chapterid=1' } as unknown as Chapter;
  const result = await JjwxcChapterService.ensureChapterLoaded(book, chapterNeedsFetch);
  check(result.status === 'not_configured', 'a chapter that needs fetching reports not_configured instead of throwing or faking content');
  check(result.paragraphs.length === 0, 'not_configured result carries no paragraphs');
}

console.log('\n=== BookRepository.updateChapterContent: single-chapter write ===');
{
  const now = new Date().toISOString();
  const book: NormalizedBook = {
    id: 'jjwxc-test-book', version: 1, title: 'Test', author: 'Test', coverColor: '#fff',
    fileFormat: 'WEBSITE', fileSizeMB: 0.1, totalChapters: 2, wordCount: 0,
    originalFileName: 'wap.jjwxc.net', storageType: 'local', createdAt: now, updatedAt: now,
    lastReadAt: now, currentChapter: 1, currentChapterTitle: 'C1', progressPercent: 0,
    tags: [], shelfIds: [], hasDetectedChapters: true,
    source: { type: 'website', adapter: 'jjwxc', url: 'https://wap.jjwxc.net/book2/1', hostname: 'wap.jjwxc.net', novelId: '1', importedAt: now },
  };
  const chapters: NormalizedChapter[] = [
    { id: 'c1', bookId: book.id, index: 1, title: 'Chương 1', paragraphs: [], wordCount: 0, sourceUrl: '/c1' },
    { id: 'c2', bookId: book.id, index: 2, title: 'Chương 2', paragraphs: [], wordCount: 0, sourceUrl: '/c2' },
  ];
  await BookRepository.saveBook(book, chapters);

  await BookRepository.updateChapterContent(book.id, 1, { paragraphs: ['đoạn 1', 'đoạn 2'], wordCount: 4 });

  const updated = await BookRepository.getChapter(book.id, 1);
  check(updated?.paragraphs.length === 2, 'updateChapterContent writes the fetched paragraphs into the existing chapter record');
  check(updated?.wordCount === 4, 'updateChapterContent writes the computed word count');
  check(updated?.title === 'Chương 1', 'updateChapterContent preserves the existing title when no new title is given');

  const untouched = await BookRepository.getChapter(book.id, 2);
  check(untouched?.paragraphs.length === 0, 'updateChapterContent does not touch a different chapter of the same book');

  const bookAfter = await BookRepository.getBook(book.id);
  check(bookAfter?.totalChapters === 2, 'updateChapterContent does not rewrite unrelated book-level fields');

  console.log('\n=== JjwxcChapterService.saveChapterText: the one write path any future fetch mechanism will call ===');
  const appBook = { id: book.id } as unknown as Book;
  await JjwxcChapterService.saveChapterText(appBook, 2, null, ['đoạn X', 'đoạn Y', 'đoạn Z']);
  const savedChapter2 = await BookRepository.getChapter(book.id, 2);
  check(savedChapter2?.paragraphs.length === 3, 'saveChapterText persists the given paragraphs');
  check(savedChapter2?.title === 'Chương 2', 'saveChapterText keeps the existing title when none is given');
  check(typeof savedChapter2?.wordCount === 'number' && savedChapter2.wordCount > 0, 'saveChapterText computes a non-zero word count from the paragraphs');
}

console.log(`\n${passedTests}/${totalTests} JJWXC Phase 2.5 (source adapter + lazy chapter service) tests passed`);
if (passedTests !== totalTests) process.exitCode = 1;
