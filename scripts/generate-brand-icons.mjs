import fs from 'node:fs/promises';
import sharp from 'sharp';
// Approved concept 11: preserve its geometry and coral/ivory colors.
const original = await fs.readFile('docs/brand/lilyhub-book.svg', 'utf8');
const square = original.replace('Lily Reader Lật', 'Lilyhub');
const rounded = square.replace('<rect width="512" height="512"', '<rect rx="112" width="512" height="512"');
await fs.writeFile('public/lilyhub-coral.svg', rounded);
await fs.writeFile('public/icon.svg', rounded);
for (const [name, size, svg] of [
 ['lilyhub-coral-32.png',32,rounded], ['lilyhub-coral-180.png',180,square],
 ['lilyhub-coral-192.png',192,square], ['lilyhub-coral-512.png',512,square],
 ['favicon-32.png',32,rounded], ['apple-touch-icon.png',180,square],
 ['lilyhub-icon-192.png',192,square], ['lilyhub-icon-512.png',512,square],
 ['lilyhub-icon-mark.png',512,rounded],
]) await sharp(Buffer.from(svg)).resize(size,size).png().toFile(`public/${name}`);
