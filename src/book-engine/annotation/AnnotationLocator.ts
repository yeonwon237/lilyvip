import { Annotation } from '../types';

export interface ResolvedLocation {
  resolved: boolean;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
}

export class AnnotationLocator {
  private static CONTEXT_LENGTH = 35;

  /**
   * Extract context prefix and suffix from paragraph text around selection offsets
   */
  public static extractContext(
    paragraphText: string,
    startOffset: number,
    endOffset: number
  ): { prefix: string; suffix: string } {
    if (!paragraphText) return { prefix: '', suffix: '' };

    const prefixStart = Math.max(0, startOffset - this.CONTEXT_LENGTH);
    const prefix = paragraphText.substring(prefixStart, startOffset);

    const suffixEnd = Math.min(paragraphText.length, endOffset + this.CONTEXT_LENGTH);
    const suffix = paragraphText.substring(endOffset, suffixEnd);

    return { prefix, suffix };
  }

  /**
   * Robust text locator resolution for an annotation against chapter paragraphs
   */
  public static resolve(
    annotation: Annotation,
    paragraphs: string[]
  ): ResolvedLocation {
    const defaultLocation: ResolvedLocation = {
      resolved: false,
      paragraphIndex: annotation.paragraphIndex,
      startOffset: annotation.startOffset,
      endOffset: annotation.endOffset,
    };

    if (!paragraphs || paragraphs.length === 0 || !annotation.selectedText) {
      return defaultLocation;
    }

    const cleanSelected = annotation.selectedText.trim();
    if (!cleanSelected) return defaultLocation;

    // 1. Primary Strategy: Check target paragraph at specified offsets
    if (annotation.paragraphIndex >= 0 && annotation.paragraphIndex < paragraphs.length) {
      const pText = paragraphs[annotation.paragraphIndex];
      const sliceAtOffset = pText.substring(annotation.startOffset, annotation.endOffset);

      if (sliceAtOffset.trim() === cleanSelected) {
        return {
          resolved: true,
          paragraphIndex: annotation.paragraphIndex,
          startOffset: annotation.startOffset,
          endOffset: annotation.endOffset,
        };
      }

      // 2. Intra-Paragraph Search: Text shifted slightly within same paragraph
      const matchesInPara = this.findAllOccurrences(pText, cleanSelected);
      if (matchesInPara.length === 1) {
        const match = matchesInPara[0];
        return {
          resolved: true,
          paragraphIndex: annotation.paragraphIndex,
          startOffset: match.start,
          endOffset: match.end,
        };
      } else if (matchesInPara.length > 1) {
        // Disambiguate by context prefix/suffix
        const bestMatch = this.findBestContextMatch(
          pText,
          matchesInPara,
          annotation.prefix,
          annotation.suffix,
          annotation.startOffset
        );
        if (bestMatch) {
          return {
            resolved: true,
            paragraphIndex: annotation.paragraphIndex,
            startOffset: bestMatch.start,
            endOffset: bestMatch.end,
          };
        }
      }
    }

    // 3. Chapter-Wide Search: Paragraph index might have shifted due to formatting
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      if (pIdx === annotation.paragraphIndex) continue; // Already checked
      const pText = paragraphs[pIdx];
      const matches = this.findAllOccurrences(pText, cleanSelected);

      if (matches.length > 0) {
        const bestMatch = this.findBestContextMatch(
          pText,
          matches,
          annotation.prefix,
          annotation.suffix
        );
        if (bestMatch) {
          return {
            resolved: true,
            paragraphIndex: pIdx,
            startOffset: bestMatch.start,
            endOffset: bestMatch.end,
          };
        }
      }
    }

    // 4. Fallback: Unresolved without crashing
    return defaultLocation;
  }

  /**
   * Find all occurrences of target string in paragraph text
   */
  private static findAllOccurrences(
    text: string,
    target: string
  ): Array<{ start: number; end: number }> {
    const results: Array<{ start: number; end: number }> = [];
    if (!text || !target) return results;

    let index = text.indexOf(target);
    while (index !== -1) {
      results.push({ start: index, end: index + target.length });
      index = text.indexOf(target, index + 1);
    }

    return results;
  }

  /**
   * Disambiguate multiple matches by comparing prefix, suffix, and proximity
   */
  private static findBestContextMatch(
    text: string,
    matches: Array<{ start: number; end: number }>,
    expectedPrefix?: string,
    expectedSuffix?: string,
    approxOffset?: number
  ): { start: number; end: number } | null {
    if (matches.length === 0) return null;
    if (matches.length === 1 && !expectedPrefix && !expectedSuffix) return matches[0];

    let bestMatch = matches[0];
    let highestScore = -1;

    for (const match of matches) {
      let score = 0;

      if (expectedPrefix) {
        const actualPrefix = text.substring(Math.max(0, match.start - expectedPrefix.length), match.start);
        score += this.calcSimilarity(actualPrefix, expectedPrefix) * 2;
      }

      if (expectedSuffix) {
        const actualSuffix = text.substring(match.end, Math.min(text.length, match.end + expectedSuffix.length));
        score += this.calcSimilarity(actualSuffix, expectedSuffix) * 2;
      }

      if (approxOffset !== undefined) {
        const distance = Math.abs(match.start - approxOffset);
        score += Math.max(0, 1 - distance / 1000);
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = match;
      }
    }

    return bestMatch;
  }

  /**
   * Simple character overlap similarity score (0 to 1)
   */
  private static calcSimilarity(strA: string, strB: string): number {
    if (!strA || !strB) return 0;
    if (strA === strB) return 1;

    let matches = 0;
    const minLen = Math.min(strA.length, strB.length);
    for (let i = 0; i < minLen; i++) {
      if (strA[i] === strB[i]) matches++;
    }

    return matches / Math.max(strA.length, strB.length);
  }
}
