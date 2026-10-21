/**
 * Web-path benchmark: same exclusion rules + directory walker + fflate store zip the
 * browser uses, driven over the real filesystem in Node.
 *   npm run bench -- /path/to/project /tmp/out.zip
 * Read-only on the source; output must be under /tmp.
 */
import { openAsBlob, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { readIgnoreFromHandle, walkDirectoryHandle } from "../src/lib/dirWalk";
import { buildStoreZipParts, type StoreEntry } from "../src/lib/zipCore";
import { mergeSkip, parseSkipList, splitField } from "../src/lib/skipList";
import { openSync, writeSync, closeSync } from "node:fs";

function dirHandle(abs: string): FileSystemDirectoryHandle {
  return {
    kind: "directory",
    name: basename(abs),
    async *values() {
      for (const d of readdirSync(abs, { withFileTypes: true })) {
        if (d.isDirectory()) yield dirHandle(join(abs, d.name));
        else if (d.isFile()) yield fileHandle(join(abs, d.name));
      }
    },
    async getFileHandle(n: string) {
      const p = join(abs, n);
      let ok = false;
      try {
        ok = statSync(p).isFile();
      } catch {
        ok = false;
      }
      if (!ok) throw new DOMException("not found", "NotFoundError");
      return fileHandle(p);
    },
  } as unknown as FileSystemDirectoryHandle;
}

function fileHandle(abs: string): FileSystemFileHandle {
  return {
    kind: "file",
    name: basename(abs),
    async getFile() {
      // Lazy like a browser File: metadata now, bytes only when read.
      if (process.env.ZIPOFI_BENCH_EAGER) return new File([readFileSync(abs)], basename(abs));
      const blob = await openAsBlob(abs);
      return Object.assign(blob, { name: basename(abs), lastModified: statSync(abs).mtimeMs }) as unknown as File;
    },
  } as unknown as FileSystemFileHandle;
}

const src = resolve(process.argv[2] ?? "");
const out = process.argv[3] ?? "/tmp/zipofi-web-bench.zip";
if (!process.argv[2]) throw new Error("usage: npm run bench -- <project> [/tmp/out.zip]");
if (!out.startsWith("/tmp/")) throw new Error("output must be under /tmp");

const skipArg = process.env.ZIPOFI_BENCH_SKIP ?? "";
const parsed = parseSkipList(splitField(skipArg));
if (parsed.errors.length) throw new Error(parsed.errors.join("; "));

const t0 = performance.now();
const root = basename(src);
let bytes = 0;
const rootHandle = dirHandle(src);
const skip = mergeSkip(parsed.list, await readIgnoreFromHandle(rootHandle));
// Same two steps as src/lib/projects.ts: walk (collect File objects), then read
// READ_CONCURRENCY files at a time into the archive in walk order.
const found: { path: string; file: File }[] = [];
const scan = await walkDirectoryHandle(
  rootHandle,
  [],
  root,
  (path, file) => void found.push({ path, file }),
  { files: 0, bytes: 0 },
  skip,
);
const entries: StoreEntry[] = new Array(found.length);
let next = 0;
const worker = async () => {
  while (next < found.length) {
    const i = next++;
    const { path, file } = found[i]!;
    const data = new Uint8Array(await file.arrayBuffer());
    entries[i] = { path, data, mtime: file.lastModified };
    bytes += data.byteLength;
  }
};
await Promise.all(Array.from({ length: 16 }, worker));
const parts = buildStoreZipParts(entries);
const fd = openSync(out, "w");
let zipBytes = 0;
let batch: Uint8Array[] = [];
let batchLen = 0;
const flush = () => {
  if (batchLen) writeSync(fd, Buffer.concat(batch, batchLen));
  batch = [];
  batchLen = 0;
};
for (const p of parts) {
  batch.push(p);
  batchLen += p.length;
  zipBytes += p.length;
  if (batchLen >= 4 << 20) flush();
}
flush();
closeSync(fd);
const ms = Math.round(performance.now() - t0);
console.log(`BENCH ZipoFile-web src=${src} files=${scan.files} bytes=${bytes} zip_bytes=${zipBytes} ms=${ms}`);
