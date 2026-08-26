import { Annotation } from '../types';

export interface TextSegment {
  text: string;
  annotation?: Annotation;
}

export class AnnotationRenderer {
  /**
   * Slice a single paragraph into non-overlapping plain and highlighted text segments
   */
  public static sliceParagraph(
    paragraphText: string,
    annotations: Annotation[]
  ): TextSegment[] {
    if (!paragraphText) {
      return [];
    }

    if (!annotations || annotations.length === 0) {
      return [{ text: paragraphText }];
    }

    const textLength = paragraphText.length;

    // 1. Sanitize & clamp ranges to paragraph bounds
    const validAnnotations: Array<{
      annotation: Annotation;
      start: number;
      end: number;
    }> = [];

    for (const ann of annotations) {
      let start = Math.max(0, Math.min(textLength, ann.startOffset));
      let end = Math.max(0, Math.min(textLength, ann.endOffset));

      if (start < end) {
        validAnnotations.push({
          annotation: ann,
          start,
          end,
        });
      }
    }

    if (validAnnotations.length === 0) {
      return [{ text: paragraphText }];
    }

    // 2. Sort by start offset ascending, then end offset descending
    validAnnotations.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.end - a.end;
    });

    // 3. Resolve overlapping ranges gracefully (clamp succeeding ranges)
    const normalizedRanges: Array<{
      annotation: Annotation;
      start: number;
      end: number;
    }> = [];

    let currentEnd = 0;
    for (const item of validAnnotations) {
      const adjustedStart = Math.max(item.start, currentEnd);
      const adjustedEnd = Math.max(adjustedStart, item.end);

      if (adjustedStart < adjustedEnd) {
        normalizedRanges.push({
          annotation: item.annotation,
          start: adjustedStart,
          end: adjustedEnd,
        });
        currentEnd = adjustedEnd;
      }
    }

    // 4. Build contiguous segments
    const segments: TextSegment[] = [];
    let cursor = 0;

    for (const range of normalizedRanges) {
      // Plain text before highlight
      if (range.start > cursor) {
        segments.push({
          text: paragraphText.substring(cursor, range.start),
        });
      }

      // Highlighted text segment
      segments.push({
        text: paragraphText.substring(range.start, range.end),
        annotation: range.annotation,
      });

      cursor = range.end;
    }

    // Trailing plain text after last highlight
    if (cursor < textLength) {
      segments.push({
        text: paragraphText.substring(cursor, textLength),
      });
    }

    return segments;
  }
}
