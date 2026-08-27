import { TtsChunk } from './types';
import { PreprocessedParagraph } from './TtsTextPreprocessor';

export class TtsChunker {
  private static MAX_CHUNK_LENGTH = 240;

  /**
   * Splits text on sentence boundaries (. ! ? … \n)
   */
  private static splitIntoSentences(text: string): string[] {
    if (!text) return [];

    // Split keeping punctuation
    const rawSentences = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [text];
    const sentences: string[] = [];

    for (const raw of rawSentences) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      // Câu quá dài: ưu tiên dấu phẩy; nếu vẫn dài thì cắt ở khoảng trắng.
      if (trimmed.length > this.MAX_CHUNK_LENGTH) {
        const subParts = trimmed.split(/(?<=[,;:])\s+/);
        let currentSub = '';

        for (const sub of subParts) {
          if ((currentSub + ' ' + sub).trim().length <= this.MAX_CHUNK_LENGTH) {
            currentSub = currentSub ? `${currentSub} ${sub}` : sub;
          } else {
            if (currentSub) sentences.push(currentSub.trim());
            if (sub.length <= this.MAX_CHUNK_LENGTH) currentSub = sub;
            else {
              // A malformed/space-free paragraph must not become an unbounded inference.
              const words = sub.split(/\s+/).flatMap(word => word.length > this.MAX_CHUNK_LENGTH
                ? (word.match(/.{1,120}/gu) || []) : [word]); currentSub = '';
              for (const word of words) {
                const combined = `${currentSub} ${word}`.trim();
                if (currentSub && combined.length > this.MAX_CHUNK_LENGTH) { sentences.push(currentSub); currentSub = word; }
                else currentSub = combined;
              }
            }
          }
        }
        if (currentSub) sentences.push(currentSub.trim());
      } else {
        sentences.push(trimmed);
      }
    }

    return sentences;
  }

  /**
   * Chunks preprocessed paragraphs into audio synthesis chunks
   */
  public static chunkChapter(
    paragraphs: PreprocessedParagraph[],
    chapterIndex: number
  ): TtsChunk[] {
    const chunks: TtsChunk[] = [];
    let chunkIndex = 0;

    let packedText = '';
    let packedParagraphIndex = 0;
    const flush = () => {
      if (!packedText.trim()) return;
      chunks.push({ id: `c${chapterIndex}_chunk_${chunkIndex}`, index: chunkIndex++, paragraphIndex: packedParagraphIndex, text: packedText.trim(), status: 'pending' });
      packedText = '';
    };

    for (const para of paragraphs) {
      const sentences = this.splitIntoSentences(para.text);
      for (const sentence of sentences) {
        const combined = `${packedText} ${sentence}`.trim();
        if (packedText && combined.length > this.MAX_CHUNK_LENGTH) flush();
        if (!packedText) packedParagraphIndex = para.originalIndex;
        packedText = `${packedText} ${sentence}`.trim();
      }
    }
    flush();

    return chunks;
  }
}
