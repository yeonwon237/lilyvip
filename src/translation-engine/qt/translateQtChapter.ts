import type { TranslatedChapterContent, TranslationProgress } from '../TranslationWorkerClient';
import { loadDictionary, QtGlossaryTerm, translateHanViet } from './qtTranslator';

/** Chapter-level "QT thô" translation: dictionary lookup only, no model. */
export async function translateQtChapter(
  title: string,
  paragraphs: string[],
  onProgress?: (progress: TranslationProgress) => void,
  bookTitle?: string,
  names: QtGlossaryTerm[] = [],
): Promise<TranslatedChapterContent> {
  onProgress?.({ stage: 'loading-model' });
  await loadDictionary();

  const total = paragraphs.length + 1;
  const translate = async (text: string) => (await translateHanViet(text, names)).text.trim();
  const translatedTitle = await translate(title);
  const translated: string[] = [];
  for (const [index, paragraph] of paragraphs.entries()) {
    translated.push(await translate(paragraph));
    // Yield now and then so a long chapter doesn't freeze the page.
    if (index % 25 === 24) {
      onProgress?.({ stage: 'translating', done: index + 2, total_items: total });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  onProgress?.({ stage: 'translating', done: total, total_items: total });

  return {
    title: translatedTitle,
    paragraphs: translated,
    bookTitle: bookTitle ? await translate(bookTitle) : undefined,
  };
}

/** Rough QT reading of a short Chinese string (book title), for import suggestions. */
export async function suggestQtTitle(text: string): Promise<string> {
  const result = (await translateHanViet(text.trim())).text.trim();
  return result.replace(/[.\s]+$/, '');
}
