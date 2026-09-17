import type { LilyLibraryBackupV1 } from '../storage/LocalLibraryBackup';

export class BookExporter {
  /**
   * Converts a Lily backup package into clean formatted TXT content.
   */
  public static backupToTxt(backup: LilyLibraryBackupV1): { filename: string; blob: Blob } {
    const book = backup.books[0];
    const title = book?.title || 'truyen';
    const author = book?.author;
    const chapters = [...backup.chapters].sort((a, b) => a.index - b.index);
    return this.chaptersToTxt(title, author, chapters);
  }

  /**
   * Converts a list of chapters into a clean formatted UTF-8 plain text file with proper chapter dividers.
   */
  public static chaptersToTxt(
    title: string,
    author?: string,
    chapters: Array<{ index: number; title: string; paragraphs?: string[]; volumeTitle?: string }> = []
  ): { filename: string; blob: Blob } {
    const lines: string[] = [];
    const cleanTitle = (title || 'truyen').trim();
    lines.push(cleanTitle);
    if (author && author.trim()) {
      lines.push(`Tác giả: ${author.trim()}`);
    }
    lines.push('');
    lines.push('='.repeat(40));
    lines.push('');

    let currentVolume = '';
    const sorted = [...chapters].sort((a, b) => a.index - b.index);

    for (const ch of sorted) {
      if (ch.volumeTitle && ch.volumeTitle.trim() !== currentVolume) {
        currentVolume = ch.volumeTitle.trim();
        lines.push('');
        lines.push(`=== ${currentVolume} ===`);
        lines.push('');
      }

      const chTitle = ch.title?.trim() || `Chương ${ch.index}`;
      lines.push(chTitle);
      lines.push('');

      if (ch.paragraphs && ch.paragraphs.length > 0) {
        const body = ch.paragraphs
          .map(p => p.trim())
          .filter(Boolean)
          .join('\r\n\r\n');
        if (body) lines.push(body);
      }
      lines.push('');
      lines.push('-'.repeat(30));
      lines.push('');
    }

    const content = lines.join('\r\n');
    // Prepend UTF-8 BOM so text editors and Windows Notepad render Vietnamese/Unicode characters properly
    const blob = new Blob(['\uFEFF', content], { type: 'text/plain;charset=utf-8' });
    const safeFilename = cleanTitle.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'truyen';
    return { filename: `${safeFilename}.txt`, blob };
  }

  /**
   * Triggers a browser native download prompt to save the file to device disk.
   */
  public static downloadBlob(blob: Blob | File, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
