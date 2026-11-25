/**
 * Just enough ZIP reading to take a game file out of a .zip, in the browser,
 * with no extra libraries. Supports "stored" and "deflate" entries, which is
 * what almost every zip tool writes. Encrypted or very large entries are refused.
 */

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  encrypted: boolean;
  dataStart: number;
}

const MAX_ENTRY = 64 * 1024 * 1024;

export function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export function listZip(bytes: Uint8Array): ZipEntry[] {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Find the end-of-central-directory record (it may be followed by a comment).
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('This zip file looks damaged.');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (p + 46 > bytes.length || v.getUint32(p, true) !== 0x02014b50) throw new Error('This zip file looks damaged.');
    const flags = v.getUint16(p + 8, true);
    const method = v.getUint16(p + 10, true);
    const compressedSize = v.getUint32(p + 20, true);
    const size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (local + 30 > bytes.length || v.getUint32(local, true) !== 0x04034b50) throw new Error('This zip file looks damaged.');
    const dataStart = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    entries.push({ name, method, compressedSize, size, encrypted: (flags & 1) === 1, dataStart });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export async function readEntry(bytes: Uint8Array, e: ZipEntry): Promise<Uint8Array> {
  if (e.encrypted) throw new Error('This zip file has a password. Please unzip it first.');
  if (e.size > MAX_ENTRY) throw new Error('The game inside this zip is too big.');
  const raw = bytes.subarray(e.dataStart, e.dataStart + e.compressedSize);
  if (raw.length !== e.compressedSize) throw new Error('This zip file looks damaged.');
  let out: Uint8Array;
  if (e.method === 0) out = raw.slice();
  else if (e.method === 8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open zip files. Please unzip the game first.');
    const input = new ReadableStream<BufferSource>({
      start(c) {
        c.enqueue(raw.slice());
        c.close();
      },
    });
    const reader = input.pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_ENTRY) throw new Error('The game inside this zip is too big.');
      chunks.push(value);
    }
    out = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      out.set(c, at);
      at += c.length;
    }
  } else throw new Error('This zip uses a packing method the arcade can\'t open. Please unzip the game first.');
  if (out.length !== e.size) throw new Error('This zip file looks damaged.');
  return out;
}

function ext(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i).toLowerCase();
}

/** Take the one game file for `extensions` out of a zip. */
export async function gameFromZip(bytes: Uint8Array, extensions: string[]): Promise<{ name: string; bytes: Uint8Array }> {
  const files = listZip(bytes).filter((e) => !e.name.endsWith('/') && !e.name.split('/').pop()!.startsWith('.'));
  const games = files.filter((e) => extensions.includes(ext(e.name)));
  if (games.length === 0) {
    const inside = [...new Set(files.map((e) => ext(e.name)).filter(Boolean))].join(', ') || 'nothing usable';
    throw new Error(`This zip has no ${extensions.join(' or ')} file inside (it has ${inside}). Check the system above.`);
  }
  if (games.length > 1) throw new Error('This zip has more than one game inside. Please unzip it and choose one game file.');
  const e = games[0];
  return { name: e.name.split('/').pop()!, bytes: await readEntry(bytes, e) };
}
