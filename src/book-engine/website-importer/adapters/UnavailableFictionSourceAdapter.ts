import { CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';

const SOURCE_ERRORS: Record<string, string> = {
  'sangtacviet.com': 'Sáng Tác Việt yêu cầu trình duyệt chạy bước xác minh trước khi trả nội dung chương. Lily chưa thể nhập nguồn này an toàn và đầy đủ.',
  'sangtacviet.vip': 'Sáng Tác Việt yêu cầu trình duyệt chạy bước xác minh trước khi trả nội dung chương. Lily chưa thể nhập nguồn này an toàn và đầy đủ.',
  'truyenfull.live': 'TruyenFull đang chặn trình đọc tự động bằng Cloudflare. Lily chưa thể nhập nguồn này mà không có nguy cơ thiếu chương.',
  'truyenno1.net': 'Tên miền truyenno1.net hiện không hoạt động hoặc không thể kết nối. Lily chưa thể nhập nguồn này.',
};

export class UnavailableFictionSourceAdapter implements WebsiteAdapter {
  public name = 'unavailable-fiction-source';

  public canHandle(raw: string): boolean {
    try {
      const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
      return Object.prototype.hasOwnProperty.call(SOURCE_ERRORS, host);
    } catch { return false; }
  }

  private message(raw: string): string {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
    return SOURCE_ERRORS[host] || 'Lily chưa thể nhập nguồn truyện này.';
  }

  public async analyze(rawUrl: string): Promise<WebsiteAnalysisResult> {
    throw new Error(this.message(rawUrl));
  }

  public async fetchChapterContent(chapter: CandidateChapter): Promise<{ content: string; paragraphs: string[]; wordCount: number }> {
    throw new Error(this.message(chapter.url));
  }
}
