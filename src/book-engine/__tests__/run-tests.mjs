/**
 * Comprehensive Automated Test Suite for Chapter Structure Analyzer V3
 * Repo: yeonwon237/lilyvip
 */

class TextCleaner {
  static removeBOM(text) {
    if (!text) return '';
    if (text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 0xFFFE) {
      return text.slice(1);
    }
    return text.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '');
  }

  static normalizeLineEndings(text) {
    if (!text) return '';
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  static removeControlCharacters(text) {
    if (!text) return '';
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  static normalizeWhitespace(text) {
    if (!text) return '';
    return text
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  }

  static trimLineEnds(text) {
    if (!text) return '';
    return text
      .split('\n')
      .map(line => line.replace(/[ \t]+$/, ''))
      .join('\n');
  }

  static collapseExcessiveBlankLines(text) {
    if (!text) return '';
    return text.replace(/\n{3,}/g, '\n\n');
  }

  static clean(rawText) {
    if (!rawText) return '';
    let result = this.removeBOM(rawText);
    result = this.normalizeLineEndings(result);
    result = this.removeControlCharacters(result);
    result = this.normalizeWhitespace(result);
    result = this.trimLineEnds(result);
    result = this.collapseExcessiveBlankLines(result);
    return result.trim();
  }

  static toParagraphs(text) {
    if (!text) return [];
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
}

class ChapterDetector {
  static parseVietnameseWordNumber(text) {
    if (!text) return null;
    const clean = text.toLowerCase().trim();

    const units = {
      'không': 0, 'nhất': 1, 'một': 1, 'mốt': 1,
      'nhị': 2, 'hai': 2,
      'tam': 3, 'ba': 3,
      'tứ': 4, 'bốn': 4, 'tư': 4,
      'ngũ': 5, 'năm': 5, 'lăm': 5,
      'lục': 6, 'sáu': 6,
      'thất': 7, 'bảy': 7, 'bẩy': 7,
      'bát': 8, 'tám': 8,
      'cửu': 9, 'chín': 9,
      'mười': 10, 'chục': 10,
      'trăm': 100,
      'nghìn': 1000, 'ngàn': 1000,
    };

    if (units[clean] !== undefined) return units[clean];

    const words = clean.split(/\s+/);
    let total = 0;
    let current = 0;

    for (const w of words) {
      if (w === 'mươi' || w === 'chục') {
        current = (current === 0 ? 1 : current) * 10;
      } else if (w === 'trăm') {
        current = (current === 0 ? 1 : current) * 100;
      } else if (w === 'mười') {
        if (current === 0) current = 10;
        else current += 10;
      } else if (units[w] !== undefined) {
        current += units[w];
      }
    }
    total += current;

    return total > 0 ? total : null;
  }

  static countWords(text) {
    if (!text) return 0;
    const latinWords = text.trim().match(/[\w\u00C0-\u024F\u1EA0-\u1EF9]+/g) || [];
    const cjkChars = text.match(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g) || [];
    return latinWords.length + cjkChars.length;
  }

  static isChapterHeading(line) {
    return this.classifyCandidate(line, 0, 0) !== null;
  }

  static classifyCandidate(line, lineIndex, charOffset) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) return null;

    if (/^(?:hết|kết thúc|đã hết|hết quyển|toàn văn hoàn|hoàn)\s+(?:chương|hồi|tiết|phần|quyển)/i.test(trimmed)) {
      return null;
    }
    if (/^[\[\(【]?[-–—\s]*(?:hết|kết thúc|hoàn|toàn văn hoàn)[-–—\s]*[\]\)】]?$/i.test(trimmed)) {
      return null;
    }

    if (/^(?:trong|vào|ở|khi|tại|theo|như|với|từ)\s+(?:chương|hồi|tiết|phần|quyển)/i.test(trimmed)) {
      return null;
    }

    if (/[,;]$/.test(trimmed)) {
      return null;
    }

    // 1. Special chapter
    const specialMatch = trimmed.match(/^[ \t]*(?:[\[【\(\《])?(ngoại truyện|phiên ngoại|lời mở đầu|lời bạt|lời tựa|prologue|epilogue|vĩ thanh|tiền truyện)(?:[\]】\)\》])?(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i);
    if (specialMatch) {
      return { rawLine: line, trimmedLine: trimmed, lineIndex, type: 'special', number: null, titleSuffix: specialMatch[2]?.trim() || '', charOffset };
    }

    // 2. Volume
    const volumeMatch = trimmed.match(/^[ \t]*(?:[\[【\(\《])?(?:quyển|quy\u1ec3n|QUY\u1ec2N|Quyển|volume|vol|卷)[ \t]+(?:thứ[ \t]+)?(\d+|[IVXLCDM]+|[mnhbtscv\u0111\u00e0-\u1ef9\s]{1,20})(?:[\]】\)\》])?(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i);
    if (volumeMatch && !/chương/i.test(trimmed)) {
      const rawNum = volumeMatch[1].trim();
      const num = /^\d+$/.test(rawNum) ? parseInt(rawNum, 10) : this.parseVietnameseWordNumber(rawNum);
      return { rawLine: line, trimmedLine: trimmed, lineIndex, type: 'volume', number: num, titleSuffix: volumeMatch[2]?.trim() || '', charOffset };
    }

    // 3. Quyển X Chương Y
    const volChapMatch = trimmed.match(/^[ \t]*(?:quyển|quy\u1ec3n|Quyển)[ \t]+(\d+|[IVXLCDM]+)[ \t]+(?:chương|ch\u01b0\u01a1ng|Chương)[ \t]+(\d+)(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i);
    if (volChapMatch) {
      return { rawLine: line, trimmedLine: trimmed, lineIndex, type: 'chapter', number: parseInt(volChapMatch[2], 10), titleSuffix: volChapMatch[3]?.trim() || '', charOffset };
    }

    // 4. Standard Vietnamese Chapter
    const stdChapMatch = trimmed.match(/^[ \t]*(?:[\[【\(\《])?(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(?:số[ \t]+)?(?:thứ[ \t]+)?(\d+)(?:[\]】\)\》])?(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i);
    if (stdChapMatch) {
      return { rawLine: line, trimmedLine: trimmed, lineIndex, type: 'chapter', number: parseInt(stdChapMatch[1], 10), titleSuffix: stdChapMatch[2]?.trim() || '', charOffset };
    }

    // 5. Word chapter
    const wordChapMatch = trimmed.match(/^[ \t]*(?:[\[【\(\《])?(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(?:thứ[ \t]+)?([mnhbtscv\u0111\u00e0-\u1ef9\s]{1,30})(?:[\]】\)\》])?(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i);
    if (wordChapMatch) {
      const parsedNum = this.parseVietnameseWordNumber(wordChapMatch[1].trim());
      if (parsedNum !== null) {
        return { rawLine: line, trimmedLine: trimmed, lineIndex, type: 'chapter_word', number: parsedNum, titleSuffix: wordChapMatch[2]?.trim() || '', charOffset };
      }
    }

    // 6. Chinese Chapter
    const cnChapMatch = trimmed.match(/^[ \t]*第[ \t]*(\d+)[ \t]*[章回节](?:[ \t]*(.*))?$/i);
    if (cnChapMatch) {
      return { rawLine: line, trimmedLine: trimmed, lineIndex, type: 'chinese_chapter', number: parseInt(cnChapMatch[1], 10), titleSuffix: cnChapMatch[2]?.trim() || '', charOffset };
    }

    // 7. English Chapter
    const enChapMatch = trimmed.match(/^[ \t]*(?:[\[【\(\《])?(?:chapter|CHAPTER|Chapter)[ \t]+(\d+)(?:[\]】\)\》])?(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i);
    if (enChapMatch) {
      return { rawLine: line, trimmedLine: trimmed, lineIndex, type: 'english_chapter', number: parseInt(enChapMatch[1], 10), titleSuffix: enChapMatch[2]?.trim() || '', charOffset };
    }

    // 8. Section Markers
    const secMatch = trimmed.match(/^[ \t]*(?:[\[【\(\《])?(?:hồi|h\u1ed3i|H\u1ed2I|Hồi|tiết|ti\u1ebft|TI\u1ebeT|Tiết)[ \t]+(?:thứ[ \t]+)?(\d+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,20})(?:[\]】\)\》])?(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i);
    if (secMatch) {
      const raw = secMatch[1].trim();
      const num = /^\d+$/.test(raw) ? parseInt(raw, 10) : this.parseVietnameseWordNumber(raw);
      return { rawLine: line, trimmedLine: trimmed, lineIndex, type: 'section', number: num, titleSuffix: secMatch[2]?.trim() || '', charOffset };
    }

    // 9. Part Markers
    const partMatch = trimmed.match(/^[ \t]*(?:[\[【\(\《])?(?:phần|ph\u1ea7n|PH\u1ea6N|Phần|part|PART)[ \t]+(?:thứ[ \t]+)?(\d+|[IVXLCDM]+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,20})(?:[\]】\)\》])?(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i);
    if (partMatch) {
      const raw = partMatch[1].trim();
      const num = /^\d+$/.test(raw) ? parseInt(raw, 10) : this.parseVietnameseWordNumber(raw);
      return { rawLine: line, trimmedLine: trimmed, lineIndex, type: 'part', number: num, titleSuffix: partMatch[2]?.trim() || '', charOffset };
    }

    // 10. Numeric-only candidate
    const numMatch = trimmed.match(/^[ \t]*(?:[\[【\(])?(\d{1,4})(?:[\]】\)])?(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/);
    if (numMatch) {
      const numVal = parseInt(numMatch[1], 10);
      const isZeroPadded = numMatch[1].length >= 3 && numMatch[1].startsWith('0');
      const titleSuffix = numMatch[2]?.trim() || '';
      const hasTitle = Boolean(titleSuffix);

      // REJECT if title is actually a nested chapter marker in a TOC list (e.g. "2. Chương 1: Cánh cửa", "3. Chương 2")
      if (/^(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|chapter|hồi|tiết|phần|quyển)\s+(?:\d+|[IVXLCDM]+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,20})/i.test(titleSuffix)) {
        return null;
      }

      if (isZeroPadded || hasTitle || numMatch[1].length >= 3) {
        return { rawLine: line, trimmedLine: trimmed, lineIndex, type: 'numeric', number: numVal, titleSuffix, charOffset };
      }
    }

    return null;
  }

  static filterTOCAndDoubleHeadings(candidates, lines) {
    if (candidates.length <= 1) return candidates;

    // PASS 1: Merge consecutive duplicate headings
    const merged = [];
    let i = 0;
    while (i < candidates.length) {
      const curr = candidates[i];
      const next = i < candidates.length - 1 ? candidates[i + 1] : null;

      if (next && curr.number !== null && next.number === curr.number && next.lineIndex - curr.lineIndex <= 4) {
        const chosen = next.titleSuffix.length >= curr.titleSuffix.length ? next : curr;
        merged.push({
          ...chosen,
          lineIndex: next.lineIndex,
        });
        i += 2;
      } else {
        merged.push(curr);
        i += 1;
      }
    }

    if (merged.length <= 3) return merged;

    // PASS 2: Explicit TOC Header detection
    let explicitTocLine = -1;
    for (let l = 0; l < Math.min(lines.length, 120); l++) {
      const tr = lines[l].trim();
      if (/^(?:\[|\(|【|\*)?\s*(?:mục\s+lục|muc\s+luc|table\s+of\s+contents|contents|danh\s+sách\s+chương|phân\s+chương|phân\s+quyển|index)\s*(?:\]|\)|】|\*|:)?$/i.test(tr)) {
        explicitTocLine = l;
        break;
      }
    }

    // Calculate word counts between consecutive candidates
    const candidateSpacings = [];
    for (let j = 0; j < merged.length; j++) {
      const start = merged[j].lineIndex + 1;
      const end = j < merged.length - 1 ? merged[j + 1].lineIndex : lines.length;
      const words = this.countWords(lines.slice(start, end).join('\n'));
      const lineDiff = j < merged.length - 1 ? merged[j + 1].lineIndex - merged[j].lineIndex : 100;
      candidateSpacings.push({ index: j, wordCount: words, lineDiff });
    }

    let tocCutoffIndex = -1;

    // Approach A: If explicit TOC header was found
    if (explicitTocLine >= 0) {
      const firstCandAfterToc = merged.findIndex(c => c.lineIndex > explicitTocLine);
      if (firstCandAfterToc >= 0) {
        for (let k = firstCandAfterToc; k < merged.length - 1; k++) {
          const isNextReset = merged[k + 1].number !== null && merged[k + 1].number === 1 && merged[k].number !== null && merged[k].number > 1;
          const isCurrentDense = candidateSpacings[k].wordCount < 45;
          const isNextSubstantial = candidateSpacings[k + 1].wordCount > 100;

          if (isNextReset || (!isCurrentDense && isNextSubstantial)) {
            tocCutoffIndex = k + 1;
            break;
          }
        }
      }
    }

    // Approach B: Implicit TOC block (Sequence Restart with density difference)
    if (tocCutoffIndex < 0) {
      for (let k = 2; k < Math.min(merged.length - 1, 500); k++) {
        const current = merged[k];
        const next = merged[k + 1];

        if (current.number !== null && next.number !== null) {
          if (current.number >= 3 && next.number <= 2) {
            let denseCount = 0;
            for (let j = 0; j <= k; j++) {
              if (candidateSpacings[j].wordCount < 40 || candidateSpacings[j].lineDiff <= 5) {
                denseCount++;
              }
            }

            if (denseCount / (k + 1) >= 0.65) {
              tocCutoffIndex = k + 1;
              break;
            }
          }
        }
      }
    }

    // Approach C: Sequence Duplication Check
    if (tocCutoffIndex < 0) {
      const chapter1Indices = merged
        .map((c, idx) => ({ c, idx }))
        .filter(item => item.c.number === 1);

      if (chapter1Indices.length >= 2) {
        const firstIdx = chapter1Indices[0].idx;
        const secondIdx = chapter1Indices[1].idx;

        if (firstIdx === 0 && secondIdx > 2) {
          let totalWordsInFirstBlock = 0;
          for (let j = 0; j < secondIdx; j++) {
            totalWordsInFirstBlock += candidateSpacings[j].wordCount;
          }
          const avgWords = totalWordsInFirstBlock / secondIdx;

          if (avgWords < 35 && candidateSpacings[secondIdx].wordCount >= 50) {
            tocCutoffIndex = secondIdx;
          }
        }
      }
    }

    if (tocCutoffIndex > 0) {
      return merged.slice(tocCutoffIndex);
    }

    return merged;
  }

  static evaluateStrategy(strategyName, rawCandidates, lines, totalWords) {
    const anomalies = [];
    if (rawCandidates.length === 0) {
      return { score: 0, accepted: [], monotonicRatio: 0, strictSequenceRatio: 0, avgWordsPerChapter: 0, missingNumbers: [], anomalies: [] };
    }

    const candidates = this.filterTOCAndDoubleHeadings(rawCandidates, lines);
    candidates.sort((a, b) => a.lineIndex - b.lineIndex);

    let monotonicCount = 0;
    let strictCount = 0;
    let duplicates = 0;
    let reversals = 0;
    let prevNum = null;
    const missingNumbers = [];

    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      if (cand.number !== null) {
        if (prevNum !== null) {
          if (cand.number > prevNum) {
            monotonicCount++;
            if (cand.number === prevNum + 1) {
              strictCount++;
            } else if (cand.number > prevNum + 1 && cand.number <= prevNum + 10) {
              for (let missing = prevNum + 1; missing < cand.number; missing++) {
                if (missingNumbers.length < 10) missingNumbers.push(missing);
              }
            }
          } else if (cand.number === prevNum) {
            duplicates++;
          } else {
            reversals++;
          }
        }
        prevNum = cand.number;
      }
    }

    const pairCount = Math.max(1, candidates.filter(c => c.number !== null).length - 1);
    const monotonicRatio = monotonicCount / pairCount;
    const strictSequenceRatio = strictCount / pairCount;

    let totalSpacingWords = 0;
    for (let i = 0; i < candidates.length; i++) {
      const startLine = candidates[i].lineIndex + 1;
      const endLine = i < candidates.length - 1 ? candidates[i + 1].lineIndex : lines.length;
      const words = this.countWords(lines.slice(startLine, endLine).join('\n'));
      totalSpacingWords += words;
    }
    const avgWordsPerChapter = Math.round(totalSpacingWords / Math.max(1, candidates.length));

    let score = 0;
    if (strategyName === 'EXPLICIT_CHAPTER') {
      score += 45;
      score += Math.min(30, candidates.length * 1.5);
      score += monotonicRatio * 30;
      score += strictSequenceRatio * 20;
      if (avgWordsPerChapter < 10) score -= 40;
      if (duplicates > 5) score -= 15;
      if (reversals > 5) score -= 25;
    } else if (strategyName === 'NUMERIC_SEQUENCE') {
      if (candidates.length >= 3 && avgWordsPerChapter >= 15 && monotonicRatio >= 0.7) {
        score += 35;
        score += Math.min(25, candidates.length * 1.5);
        score += monotonicRatio * 30;
        score += strictSequenceRatio * 20;
      } else {
        score = 5;
      }
    } else if (strategyName === 'SECTION_BASED') {
      score += 25;
      score += Math.min(25, candidates.length);
      score += monotonicRatio * 25;
      if (avgWordsPerChapter < 10) score -= 30;
    }

    if (missingNumbers.length > 0) {
      anomalies.push(`Thiếu số chương trong chuỗi: ${missingNumbers.join(', ')}`);
    }

    return {
      score: Math.max(0, Math.round(score)),
      accepted: candidates,
      monotonicRatio,
      strictSequenceRatio,
      avgWordsPerChapter,
      missingNumbers,
      anomalies,
    };
  }

  static detect(cleanedText, fallbackTitle = 'Chương 1') {
    if (!cleanedText || cleanedText.trim().length === 0) {
      return {
        chapters: [{ index: 1, title: fallbackTitle, body: '', wordCount: 0 }],
        hasDetectedChapters: false,
        totalChapters: 1,
        totalWords: 0,
        confidence: 'LOW',
        strategy: 'Empty Text Fallback',
        score: 0,
        anomalies: [],
      };
    }

    const lines = cleanedText.split('\n');
    const totalWords = this.countWords(cleanedText);

    const allCandidates = [];
    let charOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cand = this.classifyCandidate(line, i, charOffset);
      if (cand) allCandidates.push(cand);
      charOffset += line.length + 1;
    }

    const explicitChapters = allCandidates.filter(c => 
      c.type === 'chapter' || c.type === 'chapter_word' || c.type === 'chinese_chapter' || c.type === 'english_chapter'
    );
    const numericCandidates = allCandidates.filter(c => c.type === 'numeric');
    const sectionCandidates = allCandidates.filter(c => c.type === 'section' || c.type === 'part');
    const specialCandidates = allCandidates.filter(c => c.type === 'special');
    const volumeCandidates = allCandidates.filter(c => c.type === 'volume');

    const evalA = this.evaluateStrategy('EXPLICIT_CHAPTER', explicitChapters, lines, totalWords);
    const evalB = this.evaluateStrategy('NUMERIC_SEQUENCE', numericCandidates, lines, totalWords);
    const evalC = this.evaluateStrategy('SECTION_BASED', sectionCandidates, lines, totalWords);

    let dominantStrategy = 'NONE';
    let chosenCandidates = [];
    let bestScore = 0;
    const anomalies = [];

    if (evalA.score >= 35 && evalA.score >= evalB.score && evalA.score >= evalC.score) {
      dominantStrategy = `Explicit Chapter Structure (${evalA.accepted.length} chương)`;
      bestScore = evalA.score;
      anomalies.push(...evalA.anomalies);

      const chapterLineIndices = new Set(evalA.accepted.map(c => c.lineIndex));
      const combined = [...evalA.accepted];

      for (const spec of specialCandidates) {
        if (!chapterLineIndices.has(spec.lineIndex)) {
          combined.push(spec);
        }
      }
      combined.sort((a, b) => a.lineIndex - b.lineIndex);
      chosenCandidates = combined;
    } else if (evalB.score >= 35 && evalB.score >= evalC.score) {
      dominantStrategy = `Numeric Sequence Structure (${evalB.accepted.length} mục)`;
      bestScore = evalB.score;
      chosenCandidates = evalB.accepted;
      anomalies.push(...evalB.anomalies);
    } else if (evalC.score >= 35) {
      dominantStrategy = `Section / Part Structure (${evalC.accepted.length} phần)`;
      bestScore = evalC.score;
      chosenCandidates = evalC.accepted;
      anomalies.push(...evalC.anomalies);
    }

    if (dominantStrategy === 'NONE' || chosenCandidates.length === 0) {
      const allText = cleanedText.trim();
      return {
        chapters: [{ index: 1, title: 'Chương 1: Toàn văn tác phẩm', body: allText, wordCount: this.countWords(allText) }],
        hasDetectedChapters: false,
        totalChapters: 1,
        totalWords: this.countWords(allText),
        confidence: 'LOW',
        strategy: 'Single Chapter Fallback',
        score: 10,
        anomalies: ['Toàn bộ nội dung gom thành 1 chương'],
      };
    }

    const volumeMap = new Map();
    let currentVol = '';
    for (const vol of volumeCandidates) {
      currentVol = vol.trimmedLine;
      volumeMap.set(vol.lineIndex, currentVol);
    }

    let activeVolume = '';
    const rawChapters = [];

    for (let i = 0; i < chosenCandidates.length; i++) {
      const cand = chosenCandidates[i];
      const nextCand = i < chosenCandidates.length - 1 ? chosenCandidates[i + 1] : null;

      for (const [volLine, volTitle] of volumeMap.entries()) {
        if (volLine < cand.lineIndex && (i === 0 || volLine > chosenCandidates[i - 1].lineIndex)) {
          activeVolume = volTitle;
        }
      }

      let formattedTitle = cand.trimmedLine;
      if (cand.type === 'numeric') {
        formattedTitle = cand.titleSuffix ? `Chương ${cand.number}: ${cand.titleSuffix}` : `Chương ${cand.number}`;
      }

      const bodyStart = cand.lineIndex + 1;
      const bodyEnd = nextCand ? nextCand.lineIndex : lines.length;

      const bodyLines = lines.slice(bodyStart, bodyEnd).filter(line => {
        const tr = line.trim();
        return !volumeCandidates.some(v => v.trimmedLine === tr);
      });

      const body = bodyLines.join('\n').trim();
      const wCount = this.countWords(body) + this.countWords(formattedTitle);

      rawChapters.push({
        index: i + 1,
        title: formattedTitle,
        body,
        wordCount: wCount,
        volumeTitle: activeVolume || undefined,
      });
    }

    if (chosenCandidates[0].lineIndex > 0) {
      const prefaceLines = lines.slice(0, chosenCandidates[0].lineIndex).filter(line => {
        const tr = line.trim();
        return !volumeCandidates.some(v => v.trimmedLine === tr);
      });
      const prefaceText = prefaceLines.join('\n').trim();
      if (prefaceText.length > 0 && rawChapters.length > 0) {
        rawChapters[0].body = `${prefaceText}\n\n${rawChapters[0].body}`.trim();
        rawChapters[0].wordCount = this.countWords(rawChapters[0].body) + this.countWords(rawChapters[0].title);
      }
    }

    const confidence = bestScore >= 70 && rawChapters.length >= 3 && anomalies.length === 0 ? 'HIGH' : bestScore >= 35 ? 'MEDIUM' : 'LOW';

    let totalWordsResult = 0;
    rawChapters.forEach(c => { totalWordsResult += c.wordCount; });

    return {
      chapters: rawChapters,
      hasDetectedChapters: true,
      totalChapters: rawChapters.length,
      totalWords: totalWordsResult,
      confidence,
      strategy: dominantStrategy,
      score: bestScore,
      anomalies,
    };
  }
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

console.log('\n======================================================');
console.log('🧪 CHAPTER STRUCTURE ANALYZER V3 COMPREHENSIVE SUITE');
console.log('======================================================\n');

// 1. Standard Vietnamese Chapters Sequence
console.log('📦 1. Testing Standard Vietnamese Chapter Sequences...');
let novel10 = '';
for (let i = 1; i <= 10; i++) {
  novel10 += `Chương ${i}: Tiêu đề phần ${i}\nĐoạn văn miêu tả sự việc chi tiết của chương số ${i} diễn ra vô cùng cảm động và sâu sắc trong đêm mưa lạnh lẽo.\n\n`;
}
const res10 = ChapterDetector.detect(novel10);
assert(res10.hasDetectedChapters === true, '10 chapters: hasDetectedChapters is true');
assert(res10.totalChapters === 10, '10 chapters: exactly 10 chapters detected');
assert(res10.confidence === 'HIGH', '10 chapters: confidence is HIGH');

// 2. CHƯƠNG 001: Title format
console.log('\n📦 2. Testing CHƯƠNG 001 Zero-padded format...');
let novelPadded = '';
for (let i = 1; i <= 5; i++) {
  const pad = String(i).padStart(3, '0');
  novelPadded += `CHƯƠNG ${pad}: Hành trình kỳ ${i}\nNội dung chi tiết của chương ${i}.\n\n`;
}
const resPadded = ChapterDetector.detect(novelPadded);
assert(resPadded.totalChapters === 5, 'Zero-padded: exactly 5 chapters detected');
assert(resPadded.chapters[0].title.includes('CHƯƠNG 001'), 'Chapter 1 title includes CHƯƠNG 001');

// 3. Chinese Webnovel Chapters (第1章 ... 第8章)
console.log('\n📦 3. Testing Chinese Webnovel Chapters (第1章)...');
let novelCn = '';
for (let i = 1; i <= 8; i++) {
  novelCn += `第${i}章 风云再起\n这里是第${i}章的内容，描述了激烈的战斗和生动的场面。\n\n`;
}
const resCn = ChapterDetector.detect(novelCn);
assert(resCn.totalChapters === 8, 'Chinese chapters: exactly 8 chapters detected');
assert(resCn.confidence === 'HIGH', 'Chinese chapters: confidence is HIGH');

// 4. Numeric-only sequence (001, 002, 003)
console.log('\n📦 4. Testing Numeric-Only Strategy (001, 002, 003)...');
let novelNum = '';
for (let i = 1; i <= 10; i++) {
  const pad = String(i).padStart(3, '0');
  novelNum += `${pad}. Khởi đầu phần ${i}\nĐoạn văn dài của chương số ${i} với đầy đủ tình tiết và cảm xúc của nhân vật trong tác phẩm văn học.\n\n`;
}
const resNum = ChapterDetector.detect(novelNum);
assert(resNum.totalChapters === 10, 'Numeric 001..010: exactly 10 chapters detected');
assert(resNum.chapters[0].title.startsWith('Chương 1'), 'Numeric title normalized to Chương 1');

// 5. Volume Hierarchy: Quyển 1 (Chương 1..10) + Quyển 2 (Chương 11..20)
console.log('\n📦 5. Testing Volume Hierarchy (Quyển 1, Quyển 2)...');
let novelWithVolumes = 'Quyển 1: Thiếu Niên Xuất Sơn\n\n';
for (let i = 1; i <= 10; i++) {
  novelWithVolumes += `Chương ${i}: Diễn biến hồi ${i}\nNội dung chương ${i} trong quyển 1.\n\n`;
}
novelWithVolumes += 'Quyển 2: Giang Hồ Phong Ba\n\n';
for (let i = 11; i <= 20; i++) {
  novelWithVolumes += `Chương ${i}: Diễn biến hồi ${i}\nNội dung chương ${i} trong quyển 2.\n\n`;
}
const resVol = ChapterDetector.detect(novelWithVolumes);
assert(resVol.totalChapters === 20, 'Volume hierarchy: exactly 20 chapters (Quyển is NOT a chapter!)');
assert(resVol.chapters[0].volumeTitle === 'Quyển 1: Thiếu Niên Xuất Sơn', 'Chapter 1 belongs to Quyển 1');
assert(resVol.chapters[10].volumeTitle === 'Quyển 2: Giang Hồ Phong Ba', 'Chapter 11 belongs to Quyển 2');

// 6. Part Hierarchy (Phần 1, Phần 2 with Chương 1..N)
console.log('\n📦 6. Testing Part Hierarchy (Phần 1 with Chương 1..5)...');
let novelWithParts = 'Phần 1: Khởi đầu\n\n';
for (let i = 1; i <= 5; i++) {
  novelWithParts += `Chương ${i}: Tiêu đề ${i}\nNội dung chương ${i}.\n\n`;
}
novelWithParts += 'Phần 2: Tiếp diễn\n\n';
for (let i = 6; i <= 10; i++) {
  novelWithParts += `Chương ${i}: Tiêu đề ${i}\nNội dung chương ${i}.\n\n`;
}
const resParts = ChapterDetector.detect(novelWithParts);
assert(resParts.totalChapters === 10, 'Part hierarchy: exactly 10 chapters (Dominant strategy is Chương)');

// 7. Special Chapters (Ngoại truyện, Phiên ngoại, Prologue)
console.log('\n📦 7. Testing Special Chapters (Ngoại truyện, Phiên ngoại)...');
let novelWithSpecial = 'Prologue: Lời mở đầu\nĐây là phần giới thiệu trước khi câu chuyện chính thức bắt đầu.\n\n';
for (let i = 1; i <= 3; i++) {
  novelWithSpecial += `Chương ${i}: Diễn biến ${i}\nNội dung chính ${i}.\n\n`;
}
novelWithSpecial += 'Ngoại truyện: Trăm năm hạnh phúc\nCâu chuyện ngọt ngào sau khi kết thúc phần chính văn.\n\n';
const resSpecial = ChapterDetector.detect(novelWithSpecial);
assert(resSpecial.totalChapters === 5, 'Special chapters: exactly 5 chapters (Prologue + 3 Chaps + Ngoại truyện)');

// 8. Anomaly Handling: Missing chapter (1, 2, 4, 5)
console.log('\n📦 8. Testing Sequence Anomaly (Missing chapter 3)...');
const anomalyText = `Chương 1: Khởi đầu\nNội dung 1.\n\nChương 2: Tái ngộ\nNội dung 2.\n\nChương 4: Phong ba\nNội dung 4.\n\nChương 5: Kết thúc\nNội dung 5.\n\n`;
const resAnomaly = ChapterDetector.detect(anomalyText);
assert(resAnomaly.totalChapters === 4, 'Missing chapter: successfully parses 4 chapters without crashing');
assert(resAnomaly.anomalies.some(a => a.includes('3')), 'Reports anomaly: missing chapter 3');

// 9. Table of Contents (TOC) De-duplication (89 chapters with TOC -> exactly 89 chapters)
console.log('\n📦 9. Testing 89 Chapters with TOC (Table of Contents)...');
let novel89TOC = 'MỤC LỤC TÁC PHẨM\n';
for (let i = 1; i <= 89; i++) {
  novel89TOC += `Chương ${i}: Tiêu đề mục lục ${i}\n`;
}
novel89TOC += '\nNỘI DUNG TÁC PHẨM\n\n';
for (let i = 1; i <= 89; i++) {
  novel89TOC += `Chương ${i}: Tiêu đề thực ${i}\nĐây là nội dung thực tế rất dài của chương số ${i} kể về hành trình phiêu lưu kì thú khắp thế gian.\n\n`;
}
const res89TOC = ChapterDetector.detect(novel89TOC);
assert(res89TOC.totalChapters === 89, `89 Chapters with TOC: Exactly 89 chapters detected (got ${res89TOC.totalChapters}, NOT 178/179!)`);
assert(res89TOC.chapters[0].title.includes('Chương 1: Tiêu đề thực 1'), 'Chapter 1 is from body content');
assert(res89TOC.chapters[88].title.includes('Chương 89: Tiêu đề thực 89'), 'Chapter 89 is from body content');

// 9B. TOC with blank lines and no explicit header
console.log('\n📦 9B. Testing 89 Chapters with implicit TOC (blank lines, no MỤC LỤC header)...');
let novel89ImplicitTOC = '';
for (let i = 1; i <= 89; i++) {
  novel89ImplicitTOC += `Chương ${i}: Tiêu đề ${i}\n\n`;
}
for (let i = 1; i <= 89; i++) {
  novel89ImplicitTOC += `Chương ${i}: Tiêu đề ${i}\nĐoạn văn thân bài dài chứa diễn biến chi tiết của chương số ${i}.\n\n`;
}
const res89Implicit = ChapterDetector.detect(novel89ImplicitTOC);
assert(res89Implicit.totalChapters === 89, `89 Chapters with Implicit TOC: Exactly 89 chapters detected (got ${res89Implicit.totalChapters}, NOT 178!)`);

// 9C. Ordered list TOC without MỤC LỤC header: "1. Giới thiệu \n 2. Chương 1: Cánh cửa \n 3. Chương 2: Nữ Vương..."
console.log('\n📦 9C. Testing 89 Chapters with Ordered List TOC (1. Giới thiệu, 2. Chương 1: Cánh cửa...)...');
let novel89OrderedTOC = '1. Giới thiệu\n';
for (let i = 1; i <= 89; i++) {
  novel89OrderedTOC += `${i + 1}. Chương ${i}: Tiêu đề ${i}\n`;
}
novel89OrderedTOC += '\n\n';
for (let i = 1; i <= 89; i++) {
  novel89OrderedTOC += `Chương ${i}: Tiêu đề ${i}\nNội dung chính văn rất dài và chi tiết của chương số ${i} trong tác phẩm.\n\n`;
}
const res89Ordered = ChapterDetector.detect(novel89OrderedTOC);
assert(res89Ordered.totalChapters === 89, `89 Chapters with Ordered List TOC: Exactly 89 chapters detected (got ${res89Ordered.totalChapters}, NOT 178/179!)`);
assert(res89Ordered.chapters[0].title.includes('Chương 1: Tiêu đề 1'), 'Chapter 1 is real body chapter');

// 10. Double-Line Headings (89 chapters with 2 heading lines each -> exactly 89 chapters)
console.log('\n📦 10. Testing 89 Chapters with Double-Line Headings...');
let novel89Double = '';
for (let i = 1; i <= 89; i++) {
  novel89Double += `Chương ${i}\nChương ${i}: Tiêu đề chi tiết ${i}\nNội dung chương ${i} của tác phẩm.\n\n`;
}
const res89Double = ChapterDetector.detect(novel89Double);
assert(res89Double.totalChapters === 89, `89 Chapters with Double Headings: Exactly 89 chapters detected (got ${res89Double.totalChapters}, NOT 178!)`);
assert(res89Double.chapters[0].title.includes('Chương 1: Tiêu đề chi tiết 1'), 'Merged into full title');

// 11. Footer 'Hết Chương N' Rejection (89 chapters with footer lines -> exactly 89 chapters)
console.log('\n📦 11. Testing 89 Chapters with Ending Footers...');
let novel89Footer = '';
for (let i = 1; i <= 89; i++) {
  novel89Footer += `Chương ${i}: Tiêu đề ${i}\nNội dung chi tiết chương ${i}.\nHết chương ${i}\n\n`;
}
const res89Footer = ChapterDetector.detect(novel89Footer);
assert(res89Footer.totalChapters === 89, `89 Chapters with Footer: Exactly 89 chapters detected (got ${res89Footer.totalChapters}, NOT 178!)`);

// 12. False Positive Prose Rejections
console.log('\n📦 12. Testing False Positive Prose Rejections...');
const groceryListText = `Chương 1: Ngày đầu tiên
Hôm nay đi chợ và mua các thứ sau:
1. Táo
2. Cam
3. Lê
4. Chuối
Sau đó trở về nhà nấu bữa tối thơm ngon.

Chương 2: Ngày thứ hai
Mọi việc vẫn diễn ra êm đềm như thường lệ.`;
const resGrocery = ChapterDetector.detect(groceryListText);
assert(resGrocery.totalChapters === 2, 'Numbered list in prose rejected: exactly 2 chapters');

assert(ChapterDetector.classifyCandidate('Trong chương 1 chúng ta đã thấy...', 0, 0) === null, 'Rejects "Trong chương 1..."');
assert(ChapterDetector.classifyCandidate('Ở phần 2 của câu chuyện...', 0, 0) === null, 'Rejects "Ở phần 2..."');
assert(ChapterDetector.classifyCandidate('Hết chương 1', 0, 0) === null, 'Rejects "Hết chương 1"');

// 13. Scale Tests: 300 & 600 Chapters
console.log('\n📦 13. Testing Scale (300 & 600 Chapters)...');
let novel300 = '';
for (let i = 1; i <= 300; i++) {
  novel300 += `Chương ${i}: Kỳ ngộ tiên hiệp số ${i}\nĐoạn văn chi tiết của chương số ${i} diễn ra vô cùng ly kỳ và hấp dẫn.\n\n`;
}
const start300 = Date.now();
const res300 = ChapterDetector.detect(novel300);
const time300 = Date.now() - start300;
assert(res300.totalChapters === 300, `300 Chapters: Exactly 300 chapters parsed in ${time300}ms`);
assert(res300.chapters[0].title.startsWith('Chương 1'), 'Chapter 1 is correct');
assert(res300.chapters[149].title.startsWith('Chương 150'), 'Chapter 150 (mid) is correct');
assert(res300.chapters[299].title.startsWith('Chương 300'), 'Chapter 300 (last) is correct');

let novel600 = '';
for (let i = 1; i <= 600; i++) {
  novel600 += `Chương ${i} - Tiên đạo trường sinh tập ${i}\nNội dung chương ${i}.\n\n`;
}
const res600 = ChapterDetector.detect(novel600);
assert(res600.totalChapters === 600, '600 Chapters: Exactly 600 chapters parsed');
assert(res600.chapters[599].title.startsWith('Chương 600'), 'Chapter 600 is correct');

console.log('\n======================================================');
console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('======================================================\n');

if (failedTests > 0) process.exit(1);
