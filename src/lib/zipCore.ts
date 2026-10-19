import { unzip } from "fflate";

/**
 * Zipofi's web ZIP writer. Every entry is STORED (method 0). Zip64 end records are
 * written when there are 65,535 or more entries or the archive passes 4 GiB, so
 * very large folders produce a valid archive. Output is a list of parts so a Blob
 * can be built without copying every file into one big buffer.
 */

export type StoreEntry = { path: string; data: Uint8Array; mtime?: number };

const CRC_TABLE = (() => {
  const t = new Uint32Array(256 * 8);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  for (let n = 0; n < 256; n++) {
    for (let s = 1; s < 8; s++) t[s * 256 + n] = (t[(s - 1) * 256 + n]! >>> 8) ^ t[t[(s - 1) * 256 + n]! & 0xff]!;
  }
  return t;
})();

/** CRC-32 (IEEE), slice-by-8. */
export function crc32(d: Uint8Array): number {
  const t = CRC_TABLE;
  let c = 0xffffffff;
  let i = 0;
  const n8 = d.length - (d.length % 8);
  for (; i < n8; i += 8) {
    const a = (d[i]! | (d[i + 1]! << 8) | (d[i + 2]! << 16) | (d[i + 3]! << 24)) ^ c;
    c =
      t[7 * 256 + (a & 0xff)]! ^
      t[6 * 256 + ((a >>> 8) & 0xff)]! ^
      t[5 * 256 + ((a >>> 16) & 0xff)]! ^
      t[4 * 256 + (a >>> 24)]! ^
      t[3 * 256 + d[i + 4]!]! ^
      t[2 * 256 + d[i + 5]!]! ^
      t[256 + d[i + 6]!]! ^
      t[d[i + 7]!]!;
  }
  for (; i < d.length; i++) c = t[(c ^ d[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(ms: number | undefined): [number, number] {
  const d = new Date(ms ?? Date.now());
  const y = d.getFullYear();
  if (y < 1980) return [0, (1 << 5) | 1];
  return [
    (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    ((Math.min(y, 2107) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  ];
}

const enc = new TextEncoder();
const U32 = 0xffffffff;

/** Write a non-negative integer below 2^53 as little-endian uint64 (no BigInt needed). */
function setU64(v: DataView, at: number, x: number) {
  v.setUint32(at, x % 0x100000000, true);
  v.setUint32(at + 4, Math.floor(x / 0x100000000), true);
}

/** Build the archive as parts (headers and file bytes, in order). */
export function buildStoreZipParts(entries: StoreEntry[]): Uint8Array[] {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  let centralSize = 0;
  for (const e of entries) {
    const name = enc.encode(e.path);
    if (name.length > 0xffff) throw new Error(`Path too long: ${e.path}`);
    const size = e.data.length;
    if (size >= U32) throw new Error(`${e.path} is 4 GB or larger; use the macOS app for this folder.`);
    const crc = crc32(e.data);
    const [tm, dt] = dosTime(e.mtime);
    const lh = new Uint8Array(30 + name.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, tm, true);
    lv.setUint16(12, dt, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    lh.set(name, 30);
    parts.push(lh, e.data);

    const bigOff = offset >= U32;
    const ch = new Uint8Array(46 + name.length + (bigOff ? 12 : 0));
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, (3 << 8) | 45, true);
    cv.setUint16(6, bigOff ? 45 : 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, tm, true);
    cv.setUint16(14, dt, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, bigOff ? 12 : 0, true);
    cv.setUint32(38, ((0o100000 | 0o644) << 16) >>> 0, true);
    cv.setUint32(42, bigOff ? U32 : offset, true);
    ch.set(name, 46);
    if (bigOff) {
      cv.setUint16(46 + name.length, 0x0001, true);
      cv.setUint16(48 + name.length, 8, true);
      setU64(cv, 50 + name.length, offset);
    }
    central.push(ch);
    centralSize += ch.length;
    offset += lh.length + size;
  }
  for (const c of central) parts.push(c);
  const n = entries.length;
  const cdOff = offset;
  if (n >= 0xffff || centralSize >= U32 || cdOff >= U32) {
    const z = new Uint8Array(56 + 20);
    const v = new DataView(z.buffer);
    v.setUint32(0, 0x06064b50, true);
    setU64(v, 4, 44);
    v.setUint16(12, (3 << 8) | 45, true);
    v.setUint16(14, 45, true);
    setU64(v, 24, n);
    setU64(v, 32, n);
    setU64(v, 40, centralSize);
    setU64(v, 48, cdOff);
    v.setUint32(56, 0x07064b50, true);
    setU64(v, 64, cdOff + centralSize);
    v.setUint32(72, 1, true);
    parts.push(z);
  }
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, Math.min(n, 0xffff), true);
  ev.setUint16(10, Math.min(n, 0xffff), true);
  ev.setUint32(12, Math.min(centralSize, U32), true);
  ev.setUint32(16, Math.min(cdOff, U32), true);
  parts.push(eocd);
  return parts;
}

export function concatParts(parts: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Convenience for tests and the benchmark: one buffer. */
export async function buildStoreZip(files: Record<string, Uint8Array> | StoreEntry[]): Promise<Uint8Array> {
  const entries = Array.isArray(files) ? files : Object.entries(files).map(([path, data]) => ({ path, data }));
  return concatParts(buildStoreZipParts(entries));
}

export function readZip(data: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, out) => (err ? reject(err) : resolve(out)));
  });
}
