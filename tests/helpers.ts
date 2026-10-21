import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

/** Create a fixture tree on disk; file content is deterministic per path. */
export function makeTree(files: string[], root?: string, name = "proj"): string {
  const base = root ?? mkdtempSync(join(tmpdir(), "zipofi-test-"));
  const dir = join(base, name);
  mkdirSync(dir, { recursive: true });
  for (const rel of files) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, contentFor(rel));
  }
  return dir;
}

export function contentFor(rel: string): Uint8Array {
  // Mix of text and binary-ish bytes so byte-identity checks mean something.
  const head = new TextEncoder().encode(`ZipoFile fixture: ${rel}\n`);
  const tail = new Uint8Array(257);
  for (let i = 0; i < tail.length; i++) tail[i] = (i * 31 + rel.length) & 0xff;
  const out = new Uint8Array(head.length + tail.length);
  out.set(head);
  out.set(tail, head.length);
  return out;
}

/** Minimal FileSystemDirectoryHandle backed by the real filesystem (for walker tests). */
export function fsDirHandle(abs: string): FileSystemDirectoryHandle {
  const handle = {
    kind: "directory" as const,
    name: basename(abs),
    async *values() {
      for (const d of readdirSync(abs, { withFileTypes: true })) {
        if (d.isDirectory()) yield fsDirHandle(join(abs, d.name));
        else if (d.isFile()) yield fsFileHandle(join(abs, d.name));
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
      return fsFileHandle(p);
    },
  };
  return handle as unknown as FileSystemDirectoryHandle;
}

function fsFileHandle(abs: string): FileSystemFileHandle {
  return {
    kind: "file",
    name: basename(abs),
    async getFile() {
      return new File([readFileSync(abs)], basename(abs));
    },
  } as unknown as FileSystemFileHandle;
}

/** Parse the zip central directory: entry name -> compression method. */
export function centralDirectoryMethods(zip: Uint8Array): Map<string, number> {
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("EOCD not found");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("bad central header");
    const method = dv.getUint16(p + 10, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen));
    out.set(name, method);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
