import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { ZipReader } from '../importers/ZipReader';
import { BookImporter } from '../importers';
function zip(name: string, text: string, descriptor = false, method = 8) {
  const plain = Buffer.from(text); const packed = method === 8 ? deflateRawSync(plain) : plain;
  let crc = 0xffffffff;
  for (const byte of plain) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  crc = (crc ^ 0xffffffff) >>> 0;
  const local = Buffer.alloc(30 + Buffer.byteLength(name));
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(descriptor ? 8 : 0, 6); local.writeUInt16LE(method, 8);
  if (!descriptor) { local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(plain.length, 22); }
  local.writeUInt16LE(Buffer.byteLength(name), 26); local.write(name, 30);
  const extra = descriptor ? Buffer.alloc(16) : Buffer.alloc(0);
  if (descriptor) { extra.writeUInt32LE(0x08074b50); extra.writeUInt32LE(crc, 4); extra.writeUInt32LE(packed.length, 8); extra.writeUInt32LE(plain.length, 12); }
  const central = Buffer.alloc(46 + Buffer.byteLength(name));
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(descriptor ? 8 : 0, 8); central.writeUInt16LE(method, 10);
  central.writeUInt32LE(crc, 16); central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(plain.length, 24);
  central.writeUInt16LE(Buffer.byteLength(name), 28); central.write(name, 46);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length, 12); end.writeUInt32LE(local.length + packed.length + extra.length, 16);
  return Uint8Array.from(Buffer.concat([local, packed, extra, central, end])).buffer;
}
for (const descriptor of [false, true]) for (const method of [0, 8]) {
  const archive = zip('word/document.xml', '<w:p><w:t>Nội dung kiểm tra</w:t></w:p>', descriptor, method);
  assert.match(new TextDecoder().decode((await ZipReader.unzip(archive))['word/document.xml']), /Nội dung/);
  const draft = await BookImporter.parse(new File([archive], 'fixture.docx'));
  assert.ok(draft.chapters[0].paragraphs[0].includes('Nội dung'));
}
await assert.rejects(() => ZipReader.unzip(new Uint8Array([1, 2, 3]).buffer));
const corrupt = zip('text.txt', 'abc', false, 0); new Uint8Array(corrupt)[38] ^= 1;
await assert.rejects(() => ZipReader.unzip(corrupt));
const oversized = zip('text.txt', 'abc'); const view = new DataView(oversized);
const centralOffset = view.getUint32(oversized.byteLength - 6, true);
view.setUint32(centralOffset + 24, 200 * 1024 * 1024, true);
await assert.rejects(() => ZipReader.unzip(oversized), /giới hạn/);
const spoofed = zip('text.txt', 'a'.repeat(10000)); const spoofView = new DataView(spoofed);
spoofView.setUint32(spoofView.getUint32(spoofed.byteLength - 6, true) + 24, 1, true);
await assert.rejects(() => ZipReader.unzip(spoofed));
await assert.rejects(() => BookImporter.parse(new File([zip('unrelated.txt', 'text')], 'empty.epub')), /nội dung/);
await assert.rejects(() => BookImporter.parse(new File([zip('unrelated.txt', 'text')], 'empty.docx')), /nội dung/);
const files = await ZipReader.unzip(zip('__proto__', 'safe', false, 0));
assert.equal(Object.getPrototypeOf(files), null);
assert.equal(new TextDecoder().decode(files.__proto__), 'safe');
console.log('Import integrity: stored/deflate ZIP, data descriptors, DOCX pipeline, CRC/truncation/size limits, empty archives and special filenames passed');
