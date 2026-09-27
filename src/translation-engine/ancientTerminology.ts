/**
 * Source-aware terminology safeguards for the Ancient v14 pipeline.
 *
 * These are deliberately narrow corrections for meanings that do not vary by
 * prose context. A rule runs only when its Chinese source term is present and
 * only replaces known wrong renderings. This avoids the broad, destructive
 * post-processing that previously made unrelated sentences worse.
 */

interface AncientTermRule {
  source: string;
  expected: string;
  wrong: RegExp[];
}

const ANCIENT_TERM_RULES: AncientTermRule[] = [
  {
    source: '雨露期',
    expected: 'kỳ vũ lộ',
    wrong: [
      /kỳ mưa sương/giu,
      /kỳ mưa móc/giu,
      /thời kỳ mưa sương/giu,
      /thời kỳ mưa móc/giu,
      /mưa lộ kỳ/giu,
    ],
  },
  {
    source: '信香',
    expected: 'tín hương',
    wrong: [/thư hương/giu, /hương tin/giu, /tín tức tố/giu],
  },
  {
    source: '瓮城',
    expected: 'ủng thành',
    wrong: [/thành ông/giu, /ông thành/giu, /úng thành/giu],
  },
  {
    source: '流矢',
    expected: 'tên lạc',
    wrong: [/lưu tiễn/giu, /mũi tên trôi/giu],
  },
  {
    source: '檀越',
    expected: 'thí chủ',
    wrong: [/đàn việt/giu, /đàn vượt/giu],
  },
  {
    source: '孟夏',
    expected: 'đầu hạ',
    wrong: [/mạnh hạ/giu, /mạnh mùa hè/giu],
  },
  {
    source: '走火入魔',
    expected: 'tẩu hỏa nhập ma',
    wrong: [/đi lửa nhập ma/giu, /chạy lửa nhập ma/giu],
  },
];

function preserveInitialCase(original: string, replacement: string): string {
  if (!original || original[0] !== original[0].toLocaleUpperCase('vi')) return replacement;
  return replacement[0].toLocaleUpperCase('vi') + replacement.slice(1);
}

export function applyAncientTerminology(source: string, translation: string): string {
  if (!source || !translation) return translation;

  let result = translation;
  for (const rule of ANCIENT_TERM_RULES) {
    if (!source.includes(rule.source)) continue;
    for (const wrong of rule.wrong) {
      result = result.replace(wrong, match => preserveInitialCase(match, rule.expected));
    }
  }

  // Ancient v14 can omit the name of this medicine while retaining the rest
  // of the sentence. The guarded source prefix makes this repair unambiguous.
  if (
    source.trimStart().startsWith('“假死药”服下后')
    && !/thuốc giả chết/iu.test(result)
    && /^sau khi uống(?: xong)?[,，]?\s*/iu.test(result)
  ) {
    result = result.replace(
      /^sau khi uống(?: xong)?[,，]?\s*/iu,
      '“Thuốc giả chết” uống vào thì ',
    );
  }

  if (source.includes('顾檀越')) {
    result = result.replace(/cố đàn(?: việt)?/giu, match => preserveInitialCase(match, 'Cố thí chủ'));
  }

  if (source.includes('信香相斥')) {
    result = result.replace(
      /tín hương([^.!?。！？]{0,40})mắng nhiếc/giu,
      (match, middle: string) => preserveInitialCase(match, `tín hương${middle}bài xích nhau`),
    );
  }

  return result;
}
