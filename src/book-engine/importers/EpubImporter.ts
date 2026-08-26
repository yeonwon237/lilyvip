import { ParsedBookDraft, NormalizedChapter, ImportDiagnostics } from '../types';
import { ZipReader } from './ZipReader';
import { TextCleaner } from '../cleaner/TextCleaner';
import { ChapterDetector } from '../chapter-detector/ChapterDetector';
import { TxtImporter } from './TxtImporter';

export class EpubImporter {
  private static decodeText(bytes: Uint8Array): string {
    try {
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      return new TextDecoder('latin1').decode(bytes);
    }
  }

  /**
   * Parse XML string safely using DOMParser (or fallback for node environments)
   */
  private static parseXML(xmlString: string): Document | null {
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'application/xml');
        const parseError = doc.querySelector('parsererror');
        if (!parseError) return doc;
      } catch {
        // Fall through to regex/fallback
      }
    }
    return null;
  }

  /**
   * Extract readable text paragraphs from HTML/XHTML string using DOMParser or robust tag stripping
   */
  private static extractParagraphsFromHtml(htmlString: string): { title: string; text: string; paragraphs: string[]; isTocPage: boolean } {
    let title = '';
    let paragraphs: string[] = [];
    let isTocPage = false;

    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        // Extract title from h1, h2, or <title>
        const headingEl = doc.querySelector('h1, h2, h3, title');
        if (headingEl && headingEl.textContent) {
          title = headingEl.textContent.trim();
        }

        // Check if page is an explicit TOC / Nav element
        const navEl = doc.querySelector('nav, [epub\\:type="toc"], [role="doc-toc"], .toc, #toc, .table-of-contents');
        const totalLinks = doc.querySelectorAll('a').length;
        const totalListItems = doc.querySelectorAll('li').length;

        // Remove script and style tags
        doc.querySelectorAll('script, style, noscript, svg').forEach(el => el.remove());

        // Extract paragraphs
        const pElements = doc.querySelectorAll('p, div, blockquote, li');
        if (pElements.length > 0) {
          pElements.forEach(p => {
            const txt = TextCleaner.clean(p.textContent || '');
            if (txt.length > 0) {
              paragraphs.push(txt);
            }
          });
        }

        if (paragraphs.length === 0 && doc.body) {
          const bodyText = TextCleaner.clean(doc.body.textContent || '');
          paragraphs = TextCleaner.toParagraphs(bodyText);
        }

        const combinedText = paragraphs.join('\n\n');
        const totalWords = ChapterDetector.countWords(combinedText);
        const avgWordsPerParagraph = paragraphs.length > 0 ? totalWords / paragraphs.length : 0;

        // Heuristic detection: A page is a TOC if:
        // 1. Explicit nav/toc element with many links, OR
        // 2. Contains >= 5 paragraphs/list-items with average word count < 15 words and high link density, OR
        // 3. Contains many "Chương" or numbered items (e.g. "1. Giới thiệu", "2. Chương 1") with tiny total body words
        if (navEl && totalLinks >= 3) {
          isTocPage = true;
        } else if ((totalLinks >= 5 || totalListItems >= 5) && avgWordsPerParagraph < 18) {
          isTocPage = true;
        } else if (paragraphs.length >= 6 && avgWordsPerParagraph < 12) {
          const chapMatches = combinedText.match(/(?:chương|chapter)\s+\d+/gi) || [];
          const listMatches = combinedText.match(/^\s*\d+[\.\-\)]\s+/gm) || [];
          if (chapMatches.length >= 4 || listMatches.length >= 4) {
            isTocPage = true;
          }
        }

        return { title, text: combinedText, paragraphs, isTocPage };
      } catch {
        // Fallback to regex
      }
    }

    // Fallback HTML stripping
    const stripped = htmlString
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

    const cleaned = TextCleaner.clean(stripped);
    const fallbackParas = TextCleaner.toParagraphs(cleaned);
    const totalWords = ChapterDetector.countWords(cleaned);
    const avgWords = fallbackParas.length > 0 ? totalWords / fallbackParas.length : 0;

    const chapMatches = cleaned.match(/(?:chương|chapter)\s+\d+/gi) || [];
    const listMatches = cleaned.match(/^\s*\d+[\.\-\)]\s+/gm) || [];
    if (fallbackParas.length >= 5 && avgWords < 12 && (chapMatches.length >= 4 || listMatches.length >= 4)) {
      isTocPage = true;
    }

    return {
      title,
      text: cleaned,
      paragraphs: fallbackParas,
      isTocPage,
    };
  }

  public static async parseFile(file: File): Promise<ParsedBookDraft> {
    const arrayBuffer = await file.arrayBuffer();
    const files = await ZipReader.unzip(arrayBuffer);
    const warnings: string[] = [];

    let title = TxtImporter.cleanFileNameToTitle(file.name);
    let author = 'Chưa rõ tác giả';

    // 1. Locate container.xml -> find OPF full-path
    let opfPath = '';
    const containerEntry = files['META-INF/container.xml'];
    if (containerEntry) {
      const containerXml = this.decodeText(containerEntry);
      const doc = this.parseXML(containerXml);
      if (doc) {
        const rootfile = doc.querySelector('rootfile');
        if (rootfile) {
          opfPath = rootfile.getAttribute('full-path') || '';
        }
      } else {
        const match = containerXml.match(/full-path=["']([^"']+\.opf)["']/i);
        if (match) opfPath = match[1];
      }
    }

    if (!opfPath) {
      const opfKey = Object.keys(files).find(k => k.endsWith('.opf'));
      if (opfKey) opfPath = opfKey;
    }

    const htmlChapters: { title: string; paragraphs: string[]; text: string; volumeTitle?: string }[] = [];

    if (opfPath && files[opfPath]) {
      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
      const opfXml = this.decodeText(files[opfPath]);
      const opfDoc = this.parseXML(opfXml);

      if (opfDoc) {
        // Metadata title & creator
        const titleEl = opfDoc.querySelector('title, dc\\:title');
        if (titleEl && titleEl.textContent) {
          title = titleEl.textContent.trim();
        }

        const creatorEl = opfDoc.querySelector('creator, dc\\:creator');
        if (creatorEl && creatorEl.textContent) {
          author = creatorEl.textContent.trim();
        }

        // Manifest items (id -> { href, properties, id })
        const manifestMap = new Map<string, { href: string; properties: string; id: string }>();
        opfDoc.querySelectorAll('manifest > item').forEach(item => {
          const id = item.getAttribute('id') || '';
          const href = item.getAttribute('href') || '';
          const properties = item.getAttribute('properties') || '';
          if (id && href) manifestMap.set(id, { href, properties, id });
        });

        // Spine items in reading order
        const spineHrefList: { href: string; isExplicitToc: boolean }[] = [];
        opfDoc.querySelectorAll('spine > itemref').forEach(itemref => {
          const idref = itemref.getAttribute('idref');
          if (idref && manifestMap.has(idref)) {
            const itemInfo = manifestMap.get(idref)!;
            const isExplicitToc = 
              itemInfo.properties.includes('nav') ||
              itemInfo.id.toLowerCase().includes('toc') ||
              itemInfo.id.toLowerCase().includes('ncx') ||
              itemInfo.id.toLowerCase().includes('nav') ||
              /(?:toc|nav|mulu|table-of-contents|contents|index)\.(?:x?html|htm|xml)$/i.test(itemInfo.href);

            spineHrefList.push({ href: itemInfo.href, isExplicitToc });
          }
        });

        // Read and extract chapters from spine documents
        for (const { href, isExplicitToc } of spineHrefList) {
          // If manifest explicitly declared this item as TOC/nav -> skip it!
          if (isExplicitToc) {
            continue;
          }

          // Resolve path relative to OPF dir
          const fullPath = (opfDir + href).replace(/^\//, '');
          const matchingKey = Object.keys(files).find(k => k === fullPath || k.endsWith(href));

          if (matchingKey && files[matchingKey]) {
            const rawHtml = this.decodeText(files[matchingKey]);
            const { title: docTitle, text, paragraphs, isTocPage } = this.extractParagraphsFromHtml(rawHtml);

            // Skip empty documents or TOC / Index pages
            if (isTocPage || paragraphs.length === 0 || text.trim().length < 20) {
              continue;
            }

            // Check if this single HTML document contains multiple chapters
            const internalDetection = ChapterDetector.detect(text);
            const avgWordsInInternal = internalDetection.totalChapters > 0 
              ? internalDetection.totalWords / internalDetection.totalChapters 
              : 0;

            // If internal detection found multiple chapters with SUBSTANTIAL body (> 40 words each)
            if (internalDetection.hasDetectedChapters && internalDetection.totalChapters > 1 && avgWordsInInternal >= 40) {
              for (const subChap of internalDetection.chapters) {
                htmlChapters.push({
                  title: subChap.title,
                  paragraphs: TextCleaner.toParagraphs(subChap.body),
                  text: subChap.body,
                  volumeTitle: subChap.volumeTitle,
                });
              }
            } else {
              const chapterTitle = docTitle || `Chương ${htmlChapters.length + 1}`;
              htmlChapters.push({
                title: chapterTitle,
                paragraphs,
                text,
              });
            }
          }
        }
      }
    }

    // If chapters were successfully partitioned from EPUB structure
    if (htmlChapters.length > 0) {
      let totalWords = 0;
      const chapters: NormalizedChapter[] = htmlChapters.map((c, idx) => {
        const wordCount = ChapterDetector.countWords(c.text) + ChapterDetector.countWords(c.title);
        totalWords += wordCount;

        return {
          id: `chap-${idx + 1}`,
          bookId: '',
          index: idx + 1,
          title: c.title.startsWith('Chương') || c.title.startsWith('Chapter') ? c.title : `Chương ${idx + 1}: ${c.title}`,
          paragraphs: c.paragraphs,
          wordCount,
          volumeTitle: c.volumeTitle,
        };
      });

      const firstChaptersPreview = chapters.slice(0, 3).map(c => `${c.index}. ${c.title}`);
      const lastChaptersPreview = chapters.slice(-3).map(c => `${c.index}. ${c.title}`);

      const diagnostics: ImportDiagnostics = {
        format: 'EPUB',
        fileSize: file.size,
        decodedEncoding: 'UTF-8 XML (DOMParser)',
        rawCharacters: totalWords * 5,
        cleanedCharacters: totalWords * 5,
        detectedHeadingCount: chapters.length,
        candidateCount: chapters.length,
        acceptedCount: chapters.length,
        rejectedCount: 0,
        chapterCount: chapters.length,
        detectionStrategy: 'EPUB Spine & DOMParser Extraction',
        confidence: 'HIGH',
        score: 90,
        anomalies: [],
        warnings,
        errors: [],
        firstChaptersPreview,
        lastChaptersPreview,
      };

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
        confidence: 'HIGH',
        detectionStrategy: 'EPUB Spine & DOMParser Extraction',
        diagnostics,
        rawBlob: arrayBuffer,
        suggestedCoverColor: '#8C7AB3',
      };
    }

    // Fallback: Combine and detect
    const fallbackText = Object.keys(files)
      .filter(k => k.endsWith('.html') || k.endsWith('.xhtml') || k.endsWith('.htm'))
      .map(k => this.extractParagraphsFromHtml(this.decodeText(files[k])).text)
      .join('\n\n');

    const detection = ChapterDetector.detect(fallbackText, 'Chương 1');
    const chapters: NormalizedChapter[] = detection.chapters.map(c => ({
      id: `chap-${c.index}`,
      bookId: '',
      index: c.index,
      title: c.title,
      paragraphs: TextCleaner.toParagraphs(c.body),
      wordCount: c.wordCount,
      volumeTitle: c.volumeTitle,
      specialType: c.specialType,
    }));

    const diagnostics: ImportDiagnostics = {
      format: 'EPUB',
      fileSize: file.size,
      decodedEncoding: 'UTF-8 XML Fallback',
      rawCharacters: fallbackText.length,
      cleanedCharacters: fallbackText.length,
      detectedHeadingCount: detection.hasDetectedChapters ? detection.totalChapters : 0,
      candidateCount: detection.candidateCount,
      acceptedCount: detection.acceptedCount,
      rejectedCount: detection.rejectedCount,
      chapterCount: chapters.length,
      detectionStrategy: detection.strategy,
      confidence: detection.confidence,
      score: detection.score,
      anomalies: detection.anomalies,
      warnings: [...warnings, ...detection.warnings],
      errors: [],
      firstChaptersPreview: detection.firstChaptersPreview,
      lastChaptersPreview: detection.lastChaptersPreview,
    };

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
      confidence: detection.confidence,
      detectionStrategy: detection.strategy,
      diagnostics,
      rawBlob: arrayBuffer,
      suggestedCoverColor: '#8C7AB3',
    };
  }
}
