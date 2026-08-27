/** Bounded ZIP extraction for EPUB/DOCX. Use central sizes (data descriptors
 * may leave local sizes at zero); never return compressed bytes as book text. */
export class ZipReader {
  public static async unzip(buffer: ArrayBuffer): Promise<Record<string, Uint8Array>> {
    const fail = () => new Error('Tệp EPUB/DOCX hỏng, mã hóa hoặc vượt giới hạn giải nén an toàn.');
    const maxTotal = 128 * 1024 * 1024;
    const maxEntry = 32 * 1024 * 1024;
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const files: Record<string, Uint8Array> = Object.create(null);
    let end = -1;
    for (let pos = bytes.length - 22; pos >= Math.max(0, bytes.length - 65557); pos--) {
      if (view.getUint32(pos, true) === 0x06054b50 && pos + 22 + view.getUint16(pos + 20, true) === bytes.length) { end = pos; break; }
    }
    if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw fail();
    const count = view.getUint16(end + 10, true);
    let pos = view.getUint32(end + 16, true);
    const centralEnd = pos + view.getUint32(end + 12, true);
    if (!count || count > 20000 || centralEnd > end || view.getUint16(end + 8, true) !== count) throw fail();
    let total = 0;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let crc = i;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      table[i] = crc >>> 0;
    }
    for (let i = 0; i < count; i++) {
      if (pos + 46 > centralEnd || view.getUint32(pos, true) !== 0x02014b50) throw fail();
      const flags = view.getUint16(pos + 8, true);
      const method = view.getUint16(pos + 10, true);
      const crc = view.getUint32(pos + 16, true);
      const compressed = view.getUint32(pos + 20, true);
      const size = view.getUint32(pos + 24, true);
      const nameLength = view.getUint16(pos + 28, true);
      const next = pos + 46 + nameLength + view.getUint16(pos + 30, true) + view.getUint16(pos + 32, true);
      const local = view.getUint32(pos + 42, true);
      if ((flags & 1) || ![0, 8].includes(method) || size > maxEntry || (total += size) > maxTotal
          || next > centralEnd || local + 30 > pos || view.getUint32(local, true) !== 0x04034b50) throw fail();
      const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      if (start + compressed > view.getUint32(end + 16, true) || Object.prototype.hasOwnProperty.call(files, name)) throw fail();
      const data = bytes.slice(start, start + compressed);
      let output: Uint8Array;
      if (method === 0) output = data;
      else {
        if (typeof DecompressionStream === 'undefined') throw new Error('Trình duyệt chưa hỗ trợ giải nén EPUB/DOCX. Hãy cập nhật trình duyệt hoặc dùng TXT.');
        const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
        const chunks: Uint8Array[] = [];
        let actual = 0;
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            actual += part.value.length;
            if (actual > size || actual > maxEntry) { await reader.cancel(); throw fail(); }
            chunks.push(part.value);
          }
        } finally { reader.releaseLock(); }
        output = new Uint8Array(actual);
        let offset = 0;
        for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
      }
      if (output.length !== size) throw fail();
      let checksum = 0xffffffff;
      for (const byte of output) checksum = (checksum >>> 8) ^ table[(checksum ^ byte) & 255];
      if (((checksum ^ 0xffffffff) >>> 0) !== crc) throw fail();
      files[name] = output;
      pos = next;
    }
    return files;
  }
}
