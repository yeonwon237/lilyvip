import { ParsedBookDraft, NormalizedChapter } from '../types';
import { ZipReader } from './ZipReader';
import { TextCleaner } from '../cleaner/TextCleaner';
import { ChapterDetector } from '../chapter-detector/ChapterDetector';
import { TxtImporter } from './TxtImporter';

export class DocxImporter {
  public static async parseFile(file: File): Promise<ParsedBookDraft> {
    const arrayBuffer = await file.arrayBuffer();
    const files = await ZipReader.unzip(arrayBuffer);

    let title = TxtImporter.cleanFileNameToTitle(file.name);
    let author = 'Chưa rõ tác giả';

    const documentXmlEntry = files['word/document.xml'];
    let extractedText = '';

    if (documentXmlEntry) {
      const xmlString = new TextDecoder('utf-8').decode(documentXmlEntry);
      
      // Extract paragraphs by splitting <w:p>
      const paragraphMatches = xmlString.match(/<w:p\b[^>]*>(.*?)<\/w:p>/gi) || [];
      const paragraphs: string[] = [];

      for (const pXml of paragraphMatches) {
        // Extract all text inside <w:t> tags
        const textMatches = pXml.match(/<w:t\b[^>]*>([^<]*)<\/w:t>/gi) || [];
        const line = textMatches
          .map(t => t.replace(/<[^>]+>/g, ''))
          .join('');

        if (line.trim().length > 0) {
          paragraphs.push(line);
        }
      }

      extractedText = paragraphs.join('\n\n');
    }

    const cleanedText = TextCleaner.clean(extractedText);
    const detection = ChapterDetector.detect(cleanedText, 'Chương 1: Toàn văn');

    const chapters: NormalizedChapter[] = detection.chapters.map(c => ({
      id: `chap-${c.index}`,
      bookId: '',
      index: c.index,
      title: c.title,
      paragraphs: TextCleaner.toParagraphs(c.body),
      wordCount: c.wordCount,
    }));

    return {
      title,
      author,
      originalFileName: file.name,
      fileFormat: 'DOCX',
      fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)) || 0.1,
      totalChapters: chapters.length,
      wordCount: detection.totalWords,
      chapters,
      hasDetectedChapters: detection.hasDetectedChapters,
      rawBlob: arrayBuffer,
      suggestedCoverColor: '#D19A66',
    };
  }
}
