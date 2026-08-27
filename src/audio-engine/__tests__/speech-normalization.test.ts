import assert from 'node:assert/strict';
import { normalizeForSpeech, TtsTextPreprocessor } from '../TtsTextPreprocessor.ts';

const cases: Array<[string, string]> = [
  ['Không!', 'Không.'],
  ['Ngươi đi đâu?', 'Ngươi đi đâu.'],
  ['Ngươi điên rồi sao?!', 'Ngươi điên rồi sao.'],
  ['Ta... không biết.', 'Ta, không biết.'],
  ['A === B', 'A, B'],
  ['=====', ''],
  ['====o0o====', ''],
  ['***', ''],
  ['— Nàng nói: "Ta biết."', 'Nàng nói, Ta biết.'],
  ['Chương 10.5', 'Chương 10.5'],
  ['Nhiệt độ là 37.5 độ.', 'Nhiệt độ là 37.5 độ.'],
  ['50%', '50%'],
  ['Nàng khẽ nói (rất nhỏ): Ta biết.', 'Nàng khẽ nói rất nhỏ, Ta biết.'],
  ['Xem https://example.com/a?q=1 ngay.', 'Xem ngay.'],
  ['A\u200B B&nbsp;C', 'A B C'],
];

for (const [input, expected] of cases) {
  assert.equal(normalizeForSpeech(input), expected, input);
}

const raw = 'Không! Ta không đi.';
const prepared = TtsTextPreprocessor.prepareChapter('', [raw], false);
assert.equal(raw, 'Không! Ta không đi.', 'reader/source text must stay unchanged');
assert.equal(prepared[0]?.text, 'Không. Ta không đi.');

for (const output of cases.map(([input]) => normalizeForSpeech(input))) {
  assert.doesNotMatch(output, /[!?="“”]/, `unsafe engine input: ${output}`);
}

console.log(`Speech normalization: ${cases.length + 3} assertions passed`);
