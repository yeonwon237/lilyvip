import { ParsedBookDraft, NormalizedChapter } from '../types';
import { ZipReader } from './ZipReader';
import { TextCleaner } from '../cleaner/TextCleaner';
import { ChapterDetector } from '../chapter-detector/ChapterDetector';
import { TxtImporter } from './TxtImporter';

export class EpubImporter {
  private static decodeText(bytes: Uint8Array): string {
    return new TextDecoder('utf-8').decode(bytes);
  }

  private static stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  public static async parseFile(file: File): Promise<ParsedBookDraft> {
    const arrayBuffer = await file.arrayBuffer();
    const files = await ZipReader.unzip(arrayBuffer);

    let title = TxtImporter.cleanFileNameToTitle(file.name);
    let author = 'Chưa rõ tác giả';

    // 1. Locate container.xml
    let opfPath = '';
    const containerEntry = files['META-INF/container.xml'];
    if (containerEntry) {
      const containerXml = this.decodeText(containerEntry);
      const match = containerXml.match(/full-path=["']([^"']+\.opf)["']/i);
      if (match) {
        opfPath = match[1];
      }
    }

    if (!opfPath) {
      // Look for any .opf file in the zip
      const opfKey = Object.keys(files).find(k => k.endsWith('.opf'));
      if (opfKey) opfPath = opfKey;
    }

    const htmlContents: { path: string; text: string; title: string }[] = [];

    if (opfPath && files[opfPath]) {
      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
      const opfXml = this.decodeText(files[opfPath]);

      // Extract title
      const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }

      // Extract author
      const creatorMatch = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
      if (creatorMatch && creatorMatch[1]) {
        author = creatorMatch[1].trim();
      }

      // Extract manifest items
      const manifestItems: Record<string, string> = {};
      const itemRegex = /<item\s+[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = itemRegex.exec(opfXml)) !== null) {
        manifestItems[match[1]] = match[2];
      }

      // Extract spine items in order
      const spineIdrefs: string[] = [];
      const itemrefRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*>/gi;
      while ((match = itemrefRegex.exec(opfXml)) !== null) {
        spineIdrefs.push(match[1]);
      }

      // Read HTML chapters
      for (const idref of spineIdrefs) {
        const href = manifestItems[idref];
        if (!href) continue;

        const fullPath = opfDir + href;
        const normalizedPath = Object.keys(files).find(k => k === fullPath || k.endsWith(href));
        if (normalizedPath && files[normalizedPath]) {
          const rawHtml = this.decodeText(files[normalizedPath]);
          const plainText = TextCleaner.clean(this.stripHtml(rawHtml));

          if (plainText.length > 0) {
            // Extract possible chapter heading inside HTML (h1, h2, title)
            const hMatch = rawHtml.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i);
            const chapterTitle = hMatch ? hMatch[1].trim() : `Chương ${htmlContents.length + 1}`;
            htmlContents.push({ path: normalizedPath, text: plainText, title: chapterTitle });
          }
        }
      }
    }

    // If spine chapters were found and already nicely partitioned
    if (htmlContents.length > 1) {
      let totalWords = 0;
      const chapters: NormalizedChapter[] = htmlContents.map((c, idx) => {
        const paragraphs = TextCleaner.toParagraphs(c.text);
        const wordCount = ChapterDetector.countWords(c.text);
        totalWords += wordCount;

        return {
          id: `chap-${idx + 1}`,
          bookId: '',
          index: idx + 1,
          title: c.title.startsWith('Chương') ? c.title : `Chương ${idx + 1}: ${c.title}`,
          paragraphs,
          wordCount,
        };
      });

      return {
        title,
        author,
        originalFileName: file.name,
        fileFormat: 'EPUB',
        fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)) || 0.1,
        totalChapters: chapters.length,
        wordCount: totalWords,
        chapters,
        hasDetectedChapters: true,
        rawBlob: arrayBuffer,
        suggestedCoverColor: '#8C7AB3',
      };
    }

    // Fallback: Combine text and run ChapterDetector
    const combinedText = htmlContents.map(c => c.text).join('\n\n');
    const detection = ChapterDetector.detect(combinedText, 'Chương 1');
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
      fileFormat: 'EPUB',
      fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)) || 0.1,
      totalChapters: chapters.length,
      wordCount: detection.totalWords,
      chapters,
      hasDetectedChapters: detection.hasDetectedChapters,
      rawBlob: arrayBuffer,
      suggestedCoverColor: '#8C7AB3',
    };
  }
}
