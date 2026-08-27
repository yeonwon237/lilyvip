import { readFile, writeFile } from 'node:fs/promises';

const target = new URL('../node_modules/@diffusionstudio/vits-web/dist/vits-web.js', import.meta.url);
const leaking = `  const {\n    output: { data: E }\n  } = await y.run(w);\n  return new Blob([b(E, 1, s)], { type: "audio/x-wav" });`;
const previous = `  const {\n    output: { data: E }\n  } = await y.run(w);\n  const A = new Blob([b(E, 1, s)], { type: "audio/x-wav" });\n  await y.release();\n  return A;`;
const fixed = `  try {\n    const { output: { data: E } } = await y.run(w);\n    return new Blob([b(E, 1, s)], { type: "audio/x-wav" });\n  } finally {\n    await y.release();\n  }`;
let source = await readFile(target, 'utf8');
if (!source.includes(fixed)) {
  if (source.includes(previous)) source = source.replace(previous, fixed);
  else if (source.includes(leaking)) source = source.replace(leaking, fixed);
  else throw new Error('Unsupported @diffusionstudio/vits-web build; memory patch was not applied');
}
// Bounded inference on mobile; no COOP/COEP or threaded WASM dependency.
source = source.replace('_.env.wasm.numThreads = navigator.hardwareConcurrency', '_.env.wasm.numThreads = 1');
await writeFile(target, source);
console.log('vits-web: ONNX session finally-release and single-thread memory patch applied');
