// Same CJK-aware word count used by the website importer (see
// src/book-engine/website-importer/html-cleaner.ts) — kept as a small shared
// helper since JjwxcChapterExtractor deliberately returns only
// {status, title, paragraphs} and nothing else, so callers compute this themselves.
export function countCjkAwareWords(paragraphs: string[]): number {
  const text = paragraphs.join(' ');
  const latinWords = text.match(/[\wÀ-ɏẠ-ỹ]+/g) || [];
  const cjkChars = text.match(/[一-鿿぀-ヿ가-힯]/g) || [];
  return latinWords.length + cjkChars.length;
}
