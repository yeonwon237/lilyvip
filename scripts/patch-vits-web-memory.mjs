import { readFile, writeFile } from 'node:fs/promises';

const target = new URL('../node_modules/@diffusionstudio/vits-web/dist/vits-web.js', import.meta.url);
const leaking = `  } = await y.run(w);\n  return new Blob([b(E, 1, s)], { type: "audio/x-wav" });`;
const fixed = `  } = await y.run(w);\n  const A = new Blob([b(E, 1, s)], { type: "audio/x-wav" });\n  await y.release();\n  return A;`;
const source = await readFile(target, 'utf8');
if (source.includes(fixed)) console.log('vits-web memory patch already applied');
else if (source.includes(leaking)) { await writeFile(target, source.replace(leaking, fixed)); console.log('Applied vits-web ONNX session memory patch'); }
else throw new Error('Unsupported @diffusionstudio/vits-web build; memory patch was not applied');
