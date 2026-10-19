// Measures "Lily QT mượt" (Lily QT → lily-qt on Lily's translate API) before it opens to readers:
//   1. quality: QT vs smoothed output on the evaluation sentences (written to a JSON report)
//   2. VPS load: chapter-sized requests at rising concurrency (latency + throughput)
//
// Needs a model license for this device. Put it in .lily-license.local (gitignored, never printed):
//   {"license":"…","device":"…","account":"…"}
// Copy the values from a browser where Lily dịch already works (localStorage
// LILY_MODEL_LICENSES_V1 and LILY_MODEL_DEVICE_ID_V1).
//
//   npx tsx scripts/measure-qt-smooth.ts            # quality + load
//   npx tsx scripts/measure-qt-smooth.ts --quality  # quality only
import { readFileSync, writeFileSync } from 'node:fs';
import { translateHanViet } from '../src/translation-engine/qt/qtTranslator';

const API = (process.env.LILY_TRANSLATE_API_URL || 'https://158-178-235-239.sslip.io').replace(/\/$/, '');
const MODEL = 'lily-qt';
const REPORT = 'scripts/qt-smooth-report.json';

const EXTRA = [
  '陆未晞把书放在桌子上，转身离开了房间。',
  '他站在门口看着她，眼神里满是温柔。',
  '这件事情你不用管，我自己会处理好的。',
  '师尊，弟子知错了，求您不要赶我下山。',
  '她低头看了一眼手机，屏幕上是一条未读消息。',
  '雨下得很大，街上几乎看不到行人。',
  '你到底想要什么？我已经给了你所有的东西。',
  '皇上龙颜大怒，满朝文武无人敢出声。',
];

function readAuth() {
  try {
    const auth = JSON.parse(readFileSync('.lily-license.local', 'utf8'));
    if (auth.license && auth.device && auth.account) return auth as { license: string; device: string; account: string };
  } catch {}
  console.error('Thiếu .lily-license.local {"license","device","account"} — xem đầu tệp.');
  process.exit(1);
}

async function smooth(paragraphs: string[], auth: ReturnType<typeof readAuth>) {
  const started = performance.now();
  const response = await fetch(`${API}/v1/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Lily-License': auth.license,
      'X-Lily-Device': auth.device,
      'X-Lily-Account': auth.account,
    },
    body: JSON.stringify({ model: MODEL, paragraphs }),
  });
  const ms = performance.now() - started;
  if (!response.ok) throw new Error(`HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json();
  return { translations: payload.translations as string[], ms };
}

const qt = async (text: string) => (await translateHanViet(text)).text.trim();
const pct = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]);
};

async function quality(auth: ReturnType<typeof readAuth>) {
  const evaluation = JSON.parse(readFileSync('src/translation-engine/qt/data/evaluation/abo-comparison.json', 'utf8'));
  const sources: string[] = [...evaluation.rows.map((row: { source: string }) => row.source), ...EXTRA];
  const qtLines = await Promise.all(sources.map(qt));
  const { translations, ms } = await smooth(qtLines, auth);
  const rows = sources.map((source, i) => ({ source, qt: qtLines[i], smooth: translations[i], verdict: '', note: '' }));
  for (const row of rows) console.log(`\n${row.source}\n  QT : ${row.qt}\n  Mượt: ${row.smooth}`);
  console.log(`\n${rows.length} câu, một request ${Math.round(ms)} ms`);
  return rows;
}

async function load(auth: ReturnType<typeof readAuth>) {
  // A chapter-sized chunk, like ApiTranslationClient sends: 20 paragraphs, ~2–3k characters of QT.
  const evaluation = JSON.parse(readFileSync('src/translation-engine/qt/data/evaluation/abo-comparison.json', 'utf8'));
  const pool = await Promise.all([...evaluation.rows.map((row: { source: string }) => row.source), ...EXTRA].map(qt));
  const chunk = Array.from({ length: 20 }, (_, i) => `${pool[i % pool.length]} ${pool[(i + 7) % pool.length]}`);
  const chunkChars = chunk.reduce((sum, p) => sum + p.length, 0);
  const results = [];
  for (const concurrency of [1, 2, 4, 8]) {
    const total = concurrency * 3;
    const latencies: number[] = [];
    let errors = 0;
    let next = 0;
    const started = performance.now();
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (next < total) {
        next += 1;
        try { latencies.push((await smooth(chunk, auth)).ms); } catch { errors += 1; }
      }
    }));
    const seconds = (performance.now() - started) / 1000;
    const row = {
      concurrency,
      requests: total,
      errors,
      p50_ms: latencies.length ? pct(latencies, 0.5) : null,
      p95_ms: latencies.length ? pct(latencies, 0.95) : null,
      chars_per_s: Math.round((latencies.length * chunkChars) / seconds),
    };
    console.log(row);
    results.push(row);
  }
  return { chunkParagraphs: chunk.length, chunkChars, results };
}

async function main() {
  const auth = readAuth();
  const health = await (await fetch(`${API}/health`)).json();
  console.log('health', health);
  const report: Record<string, unknown> = { api: API, model: MODEL, at: new Date().toISOString(), health };
  report.quality = await quality(auth);
  if (!process.argv.includes('--quality')) report.load = await load(auth);
  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(`\nĐã ghi ${REPORT}`);
}

main().catch(error => { console.error(error); process.exit(1); });
