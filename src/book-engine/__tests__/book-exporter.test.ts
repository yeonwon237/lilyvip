import assert from 'node:assert/strict';
import { BookExporter } from '../export/BookExporter';
import type { LilyLibraryBackupV1 } from '../storage/LocalLibraryBackup';

console.log('--- Testing BookExporter ---');

// 1. chaptersToTxt
const sampleChapters = [
  { index: 2, title: 'Chương 2: Ngày mới', paragraphs: ['Nắng ấm ban mai.', 'Cô bước ra sân.'] },
  { index: 1, title: 'Chương 1: Khởi đầu', paragraphs: ['Mở đầu câu chuyện.', 'Một ngày nọ.'] },
];

const res1 = BookExporter.chaptersToTxt('Trọng Sinh Chi Hậu', 'Tác Giả A', sampleChapters);
assert.equal(res1.filename, 'Trọng Sinh Chi Hậu.txt', 'Generates correct clean filename');

// Read content from blob
const buffer = await res1.blob.arrayBuffer();
const bytes = new Uint8Array(buffer);
assert.equal(bytes[0], 0xEF, 'BOM byte 0');
assert.equal(bytes[1], 0xBB, 'BOM byte 1');
assert.equal(bytes[2], 0xBF, 'BOM byte 2');

const text1 = await res1.blob.text();
assert.ok(text1.includes('Trọng Sinh Chi Hậu'), 'Includes title');
assert.ok(text1.includes('Tác giả: Tác Giả A'), 'Includes author');
assert.ok(text1.indexOf('Chương 1: Khởi đầu') < text1.indexOf('Chương 2: Ngày mới'), 'Chapters are sorted contiguously by index');
assert.ok(text1.includes('Mở đầu câu chuyện.'), 'Includes paragraphs');
console.log('✓ PASS: chaptersToTxt basic formatting and chapter ordering passed');

// 2. Volume separation
const volumeChapters = [
  { index: 1, title: 'Chương 1', volumeTitle: 'Quyển 1: Tiền truyện', paragraphs: ['Đoạn 1'] },
  { index: 2, title: 'Chương 2', volumeTitle: 'Quyển 1: Tiền truyện', paragraphs: ['Đoạn 2'] },
  { index: 3, title: 'Chương 3', volumeTitle: 'Quyển 2: Hậu truyện', paragraphs: ['Đoạn 3'] },
];
const resVol = BookExporter.chaptersToTxt('Truyện Quyển', 'Tác Giả B', volumeChapters);
const textVol = await resVol.blob.text();
assert.ok(textVol.includes('=== Quyển 1: Tiền truyện ==='), 'Includes Volume 1 header');
assert.ok(textVol.includes('=== Quyển 2: Hậu truyện ==='), 'Includes Volume 2 header');
assert.equal(textVol.split('=== Quyển 1: Tiền truyện ===').length, 2, 'Volume header is not repeated unnecessarily');
console.log('✓ PASS: Volume titles handled correctly');

// 3. backupToTxt
const mockBackup: Partial<LilyLibraryBackupV1> = {
  books: [
    {
      id: 'book-1',
      title: 'Hồng Lâu Mộng',
      author: 'Tào Tuyết Cần',
      fileFormat: 'TXT',
      totalChapters: 2,
      wordCount: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileSizeMB: 1,
      progressPercent: 0,
    } as any,
  ],
  chapters: [
    {
      id: 'chap-1',
      bookId: 'book-1',
      index: 1,
      title: 'Hồi 1',
      paragraphs: ['Khởi đầu giả ảo.'],
      wordCount: 500,
    },
    {
      id: 'chap-2',
      bookId: 'book-1',
      index: 2,
      title: 'Hồi 2',
      paragraphs: ['Giả Bảo Ngọc xuất thế.'],
      wordCount: 500,
    },
  ],
};

const resBackup = BookExporter.backupToTxt(mockBackup as LilyLibraryBackupV1);
assert.equal(resBackup.filename, 'Hồng Lâu Mộng.txt');
const textBackup = await resBackup.blob.text();
assert.ok(textBackup.includes('Hồng Lâu Mộng'));
assert.ok(textBackup.includes('Tào Tuyết Cần'));
assert.ok(textBackup.includes('Hồi 1'));
assert.ok(textBackup.includes('Giả Bảo Ngọc xuất thế.'));
console.log('✓ PASS: backupToTxt correctly parses LilyLibraryBackupV1');

console.log('=== All BookExporter tests passed! ===');
