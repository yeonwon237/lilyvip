import { TtsChunk } from './types';
import { PreprocessedParagraph } from './TtsTextPreprocessor';

export class TtsChunker {
  private static MAX_CHUNK_LENGTH = 320; // Maximum safe characters per chunk
  private static OPTIMAL_CHUNK_LENGTH = 200; // Preferred chunk length

  /**
   * Splits text on sentence boundaries (. ! ? … \n)
   */
  private static splitIntoSentences(text: string): string[] {
    if (!text) return [];

    // Split keeping punctuation
    const rawSentences = text.split(/(?<=[.!?…;])\s+/);
    const sentences: string[] = [];

    for (const raw of rawSentences) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      // If a single sentence exceeds MAX_CHUNK_LENGTH, split on comma or semicolon
      if (trimmed.length > this.MAX_CHUNK_LENGTH) {
        const subParts = trimmed.split(/(?<=[,;:])\s+/);
        let currentSub = '';

        for (const sub of subParts) {
          if ((currentSub + ' ' + sub).trim().length <= this.MAX_CHUNK_LENGTH) {
            currentSub = currentSub ? `${currentSub} ${sub}` : sub;
          } else {
            if (currentSub) sentences.push(currentSub.trim());
            currentSub = sub;
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

    for (const para of paragraphs) {
      const sentences = this.splitIntoSentences(para.text);
      let currentChunkText = '';

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];

        if (!currentChunkText) {
          currentChunkText = sentence;
        } else if ((currentChunkText + ' ' + sentence).length <= this.OPTIMAL_CHUNK_LENGTH) {
          currentChunkText = `${currentChunkText} ${sentence}`;
        } else {
          // Push completed chunk
          chunks.push({
            id: `c${chapterIndex}_chunk_${chunkIndex}`,
            index: chunkIndex++,
            paragraphIndex: para.originalIndex,
            text: currentChunkText.trim(),
            status: 'pending',
          });
          currentChunkText = sentence;
        }
      }

      // Flush remaining sentences of this paragraph
      if (currentChunkText.trim()) {
        chunks.push({
          id: `c${chapterIndex}_chunk_${chunkIndex}`,
          index: chunkIndex++,
          paragraphIndex: para.originalIndex,
          text: currentChunkText.trim(),
          status: 'pending',
        });
        currentChunkText = '';
      }
    }

    return chunks;
  }
}
