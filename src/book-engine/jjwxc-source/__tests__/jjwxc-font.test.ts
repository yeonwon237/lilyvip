import { JjwxcFontManager } from '../JjwxcFontManager';
import { JjwxcChapterExtractor } from '../JjwxcChapterExtractor';
import assert from 'node:assert/strict';

console.log('\n=== JjwxcFontManager: extractFontInfo ===');

{
  const html = `
    <style>
      @font-face {
        font-family: jjwxcfont_9e294;
        src: url('//static.jjwxc.net/tmp/fonts/jjwxcfont_9e294.woff2?h=wap.jjwxc.net') format('woff2'),
             url('//static.jjwxc.net/tmp/fonts/jjwxcfont_9e294.ttf?h=wap.jjwxc.net') format('truetype');
      }
    </style>
  `;
  const info = JjwxcFontManager.extractFontInfo(html);
  assert.equal(info.fontFamily, 'jjwxcfont_9e294');
  assert.equal(info.fontUrl, 'https://static.jjwxc.net/tmp/fonts/jjwxcfont_9e294.woff2?h=wap.jjwxc.net');
  console.log('  ✓ PASS: extracts fontFamily and woff2 fontUrl correctly');
}

{
  const emptyInfo = JjwxcFontManager.extractFontInfo('');
  assert.equal(emptyInfo.fontFamily, undefined);
  assert.equal(emptyInfo.fontUrl, undefined);
  console.log('  ✓ PASS: returns empty object on empty HTML');
}

console.log('\n=== JjwxcFontManager: cleanObfuscation ===');

{
  const raw = '苏南雪&#xec3d&zwnj;一把抱起&#xe65f;&zwnj;';
  const cleaned = JjwxcFontManager.cleanObfuscation(raw);
  assert.ok(!cleaned.includes('&zwnj;'), 'should not contain &zwnj;');
  assert.ok(!cleaned.includes('\u200c'), 'should not contain \\u200c');
  assert.ok(!cleaned.includes('&#xec3d'), 'should decode hex entities');
  assert.equal(cleaned.charCodeAt(3), 0xec3d, 'entity should be decoded to char code 0xec3d');
  console.log('  ✓ PASS: strips &zwnj;, zero-width characters, and decodes hex entities');
}

console.log('\n=== JjwxcFontManager: decodeText ===');

{
  const plain = '这是一段正常的中文文本，没有任何加密字符。';
  const res = await JjwxcFontManager.decodeText(plain);
  assert.equal(res, plain);
  console.log('  ✓ PASS: returns standard text unchanged when no PUA characters exist');
}

console.log('\n=== JjwxcChapterExtractor: font metadata extraction ===');

{
  const vipHtml = `
    <html>
      <head>
        <title>24、第 24 章</title>
        <style>
          @font-face {
            font-family: jjwxcfont_test123;
            src: url('//static.jjwxc.net/tmp/fonts/jjwxcfont_test123.woff2?h=wap.jjwxc.net');
          }
        </style>
      </head>
      <body>
        <ul class="content_ul">
          <li>这是第一段内容。<br><br>这是第二段内容。</li>
        </ul>
      </body>
    </html>
  `;
  const res = await JjwxcChapterExtractor.extractAsync(vipHtml);
  assert.equal(res.status, 'ok');
  assert.equal(res.paragraphs.length, 2);
  console.log('  ✓ PASS: extractAsync preserves standard paragraphs and handles markup');
}

console.log('\nAll JJWXC font manager tests passed!\n');
