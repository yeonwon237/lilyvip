import fs from 'node:fs';
import { pipeline } from '@huggingface/transformers';
import { Converter } from 'opencc-js/t2cn';

const [inputPath, modelPath, outputPath, mode = 'modern'] = process.argv.slice(2);
if (!inputPath || !modelPath || !outputPath) {
  throw new Error('Usage: node run-audit-sequential.mjs <audit.txt> <model-dir> <output.txt> [modern|ancient]');
}

const raw = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '');
const entries = [...raw.matchAll(/--- ĐOẠN (\d+) ---\s*\[TRUNG\]\s*([\s\S]*?)\s*\[VIỆT\]\s*([\s\S]*?)(?=\s*--- ĐOẠN|$)/g)]
  .map(match => ({ index: Number(match[1]), source: match[2].trim() }));
const toSimplified = Converter({ from: 't', to: 'cn' });
const translator = await pipeline('translation', modelPath, { device: 'cpu', dtype: 'q8' });
const translated = [];

for (const [position, entry] of entries.entries()) {
  const source = toSimplified(entry.source);
  const prompts = mode === 'ancient'
    ? (source.match(/[^。！？？」』”]+[。！？？」』”]*/g)?.map(value => value.trim()).filter(Boolean) || [source])
    : [source];
  const parts = [];
  for (const prompt of prompts) {
    const result = await translator(prompt, {
      num_beams: 2,
      repetition_penalty: 1.2,
      max_new_tokens: mode === 'modern' ? 512 : 300,
      early_stopping: true,
      do_sample: false,
    });
    parts.push(result[0]?.translation_text || '');
  }
  translated.push({ ...entry, target: parts.filter(Boolean).join(' ') });
  if ((position + 1) % 20 === 0 || position + 1 === entries.length) {
    console.log(`${position + 1}/${entries.length}`);
  }
}

const report = translated.map(item => [
  `--- ĐOẠN ${item.index} ---`,
  '[TRUNG]',
  item.source,
  '[VIỆT]',
  item.target,
].join('\n')).join('\n\n');
fs.writeFileSync(outputPath, `\uFEFF${report}\n`, 'utf8');
