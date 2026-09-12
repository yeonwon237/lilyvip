import { HtmlCleaner } from '../html-cleaner';
import { safeFetch } from '../safe-fetch';
import type { CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';
import { UrlNormalizer } from '../url-normalizer';

type NotionBlock = { id: string; type: string; properties?: { title?: unknown }; content?: string[] };

function richText(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.map(part => Array.isArray(part) && typeof part[0] === 'string' ? part[0] : '').join('').trim();
}

function pageIdFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const compact = url.pathname.match(/([a-f0-9]{32})(?:\/)?$/i)?.[1];
    return compact ? compact.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5') : null;
  } catch { return null; }
}

export interface ParsedNotionPage { title: string; sections: Array<{ id: string; title: string; paragraphs: string[] }> }

export function parseNotionBlocks(pageId: string, blockMap: Record<string, NotionBlock>): ParsedNotionPage {
  const root = blockMap[pageId];
  if (!root) throw new Error('Trang Notion công khai không trả về nội dung.');
  const title = richText(root.properties?.title) || 'Trang Notion';
  const ordered: NotionBlock[] = [];
  const visited = new Set<string>();
  const walk = (ids: string[]) => ids.forEach(id => {
    if (visited.has(id)) return;
    visited.add(id);
    const block = blockMap[id];
    if (!block) return;
    ordered.push(block);
    if (Array.isArray(block.content)) walk(block.content);
  });
  walk(root.content || []);

  const heading = /^(?:chương|chapter|chap|hồi|phần|quyển|volume|prologue|epilogue|phiên ngoại|ngoại truyện)\b/i;
  const readable = new Set(['text', 'quote', 'callout', 'bulleted_list', 'numbered_list', 'toggle', 'code']);
  const sections: ParsedNotionPage['sections'] = [];
  let current: ParsedNotionPage['sections'][number] | null = null;
  const preface: string[] = [];
  for (const block of ordered) {
    const value = richText(block.properties?.title);
    if (!value) continue;
    if (['header', 'sub_header', 'sub_sub_header'].includes(block.type) && heading.test(value)) {
      current = { id: block.id, title: value, paragraphs: [] };
      sections.push(current);
    } else if (readable.has(block.type)) {
      (current?.paragraphs || preface).push(value);
    }
  }
  if (!sections.length) return { title, sections: [{ id: pageId, title, paragraphs: preface }] };
  if (preface.length) sections[0].paragraphs.unshift(...preface);
  return { title, sections: sections.filter(section => section.paragraphs.length) };
}

export class NotionAdapter implements WebsiteAdapter {
  public name = 'notion';
  private cache = new Map<string, { content: string; paragraphs: string[]; wordCount: number }>();

  public canHandle(raw: string): boolean {
    try {
      const url = new URL(raw);
      return url.protocol === 'https:' && (url.hostname === 'notion.site' || url.hostname.endsWith('.notion.site')) && Boolean(pageIdFromUrl(raw));
    } catch { return false; }
  }

  private async load(raw: string, signal?: AbortSignal): Promise<ParsedNotionPage> {
    const pageId = pageIdFromUrl(raw);
    if (!pageId) throw new Error('Liên kết Notion không hợp lệ.');
    const blocks: Record<string, NotionBlock> = {};
    let cursor: unknown = { stack: [] };
    let previousCount = -1;
    for (let chunkNumber = 0; chunkNumber < 20; chunkNumber++) {
      const response = await safeFetch('https://www.notion.so/api/v3/loadPageChunk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
        body: JSON.stringify({ pageId, limit: 100, cursor, chunkNumber, verticalColumns: false }),
      });
      if (!response.ok) {
        if (Object.keys(blocks).length) break;
        throw new Error('Không đọc được Notion. Trang cần được bật “Share to web”.');
      }
      const payload = await response.json();
      const entries = payload?.recordMap?.block || {};
      for (const [id, wrapper] of Object.entries(entries)) {
        const outer = (wrapper as { value?: NotionBlock | { value?: NotionBlock } })?.value;
        const value = outer && 'value' in outer ? outer.value : outer as NotionBlock | undefined;
        if (value) blocks[id] = value;
      }
      cursor = payload?.cursor;
      const stack = (cursor as { stack?: unknown[] } | undefined)?.stack;
      if (!Array.isArray(stack) || stack.length === 0 || Object.keys(blocks).length === previousCount) break;
      previousCount = Object.keys(blocks).length;
    }
    return parseNotionBlocks(pageId, blocks);
  }

  public async analyze(raw: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const sourceUrl = UrlNormalizer.normalize(raw);
    const parsed = await this.load(sourceUrl, signal);
    if (!parsed.sections.length) throw new Error('Trang Notion không có nội dung văn bản để đọc.');
    const chapters: CandidateChapter[] = parsed.sections.map((section, index) => {
      const url = `${sourceUrl}#lily-notion=${section.id}`;
      const content = section.paragraphs.join('\n\n');
      const normalized = { content, paragraphs: section.paragraphs, wordCount: content.split(/\s+/).filter(Boolean).length };
      this.cache.set(url, normalized);
      return { index: index + 1, title: section.title, url };
    });
    const hostname = new URL(sourceUrl).hostname;
    return {
      adapter: this.name, siteName: 'Notion', hostname, sourceUrl, isWordPress: false, isWordPressCom: false,
      candidateBooks: [{ id: `notion_${Date.now()}`, title: parsed.title, author: '', sourceUrl, hostname,
        adapterName: this.name, totalChapters: chapters.length, chapters, confidence: 'HIGH',
        confidenceReason: `Tìm thấy ${chapters.length} phần trong trang Notion công khai.` }],
      diagnostics: { totalPostsDiscovered: chapters.length, totalPagesDiscovered: 1, categoriesDiscovered: 0,
        restRoutes: ['Notion public page API'], warnings: [], errors: [] },
    };
  }

  public async fetchChapterContent(chapter: CandidateChapter, signal?: AbortSignal) {
    const cached = this.cache.get(chapter.url);
    if (cached) return cached;
    const sourceUrl = chapter.url.split('#')[0];
    const sectionId = new URL(chapter.url).hash.match(/lily-notion=([a-f0-9-]+)/i)?.[1];
    const parsed = await this.load(sourceUrl, signal);
    const section = parsed.sections.find(item => item.id === sectionId) || parsed.sections[chapter.index - 1];
    if (!section) throw new Error('Không tìm thấy phần Notion này.');
    const content = section.paragraphs.join('\n\n');
    return { content, paragraphs: section.paragraphs, wordCount: content.split(/\s+/).filter(Boolean).length };
  }
}
