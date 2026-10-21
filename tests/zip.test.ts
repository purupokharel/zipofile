import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { walkDirectoryHandle } from "../src/lib/dirWalk";
import { buildStoreZip, readZip } from "../src/lib/zipCore";
import { centralDirectoryMethods, contentFor, fsDirHandle, makeTree } from "./helpers";

const INCLUDED = [
  "package.json",
  "src/index.ts",
  "src/lib/util.ts",
  "README.md",
  ".gitignore",
  ".github/workflows/ci.yml",
  "assets/logo.png",
  "app.py",
];
const EXCLUDED = [
  "node_modules/react/index.js",
  "node_modules/react/package.json",
  ".venv/pyvenv.cfg",
  ".venv/lib/site-packages/a.py",
  ".git/HEAD",
  ".git/objects/aa/bbbb",
  "__pycache__/app.cpython-312.pyc",
  ".next/cache/a.pack",
  "dist/bundle.js",
  ".env",
];

async function archiveTree(dir: string, rootName = "proj") {
  const data: Record<string, Uint8Array> = {};
  await walkDirectoryHandle(fsDirHandle(dir), [], rootName, async (path, file) => {
    data[path] = new Uint8Array(await file.arrayBuffer());
  });
  return buildStoreZip(data);
}

describe("zip round trip (store, level 0)", () => {
  it("excludes heavy trees, keeps source, bytes identical, method = stored", async () => {
    const dir = makeTree([...INCLUDED, ...EXCLUDED]);
    const zip = await archiveTree(dir);

    const methods = centralDirectoryMethods(zip);
    expect([...methods.keys()].sort()).toEqual(INCLUDED.map((p) => `proj/${p}`).sort());
    for (const [name, m] of methods) expect(m, `${name} method`).toBe(0);

    const out = await readZip(zip);
    for (const p of INCLUDED) expect(Buffer.from(out[`proj/${p}`]!).equals(Buffer.from(contentFor(p))), p).toBe(true);
    for (const p of EXCLUDED) expect(out[`proj/${p}`], p).toBeUndefined();
  });

  it("system unzip (Info-ZIP) extracts it byte-identically and reports Stored", async () => {
    const dir = makeTree([...INCLUDED, ...EXCLUDED]);
    const zip = await archiveTree(dir);
    const work = mkdtempSync(join(tmpdir(), "zipofi-unzip-"));
    const zipPath = join(work, "proj.zip");
    writeFileSync(zipPath, zip);
    const listing = execFileSync("unzip", ["-v", zipPath], { encoding: "utf8" });
    expect(listing).toMatch(/Stored/);
    expect(listing).not.toMatch(/Defl/);
    execFileSync("unzip", ["-q", zipPath, "-d", join(work, "out")]);
    for (const p of INCLUDED) {
      expect(Buffer.from(readFileSync(join(work, "out/proj", p))).equals(Buffer.from(contentFor(p))), p).toBe(true);
    }
    execFileSync("unzip", ["-tq", zipPath]);
  });

  it("store mode does not shrink compressible data (proves no deflate)", async () => {
    const big = new Uint8Array(200_000).fill(65);
    const zip = await buildStoreZip({ "proj/a.txt": big });
    expect(zip.length).toBeGreaterThan(big.length);
  });

  it("the archive root folder is never excluded, even if named like a cache dir", async () => {
    const dir = makeTree(["src/main.rs"], undefined, "build");
    const zip = await archiveTree(dir, "build");
    const out = await readZip(zip);
    expect(Object.keys(out)).toEqual(["build/src/main.rs"]);
  });
});

describe("ZipoFile store writer", () => {
  it("CRC-32 matches the reference value and zlib", async () => {
    const { crc32 } = await import("../src/lib/zipCore");
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    const zlib = await import("node:zlib");
    const z = (zlib as unknown as { crc32?: (d: Uint8Array) => number }).crc32;
    const buf = new Uint8Array(100_003);
    for (let i = 0; i < buf.length; i++) buf[i] = (i * 2654435761) >>> 13;
    if (z) expect(crc32(buf)).toBe(z(buf));
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("writes Zip64 end records for 65,535+ entries and Info-ZIP accepts them", async () => {
    const entries = Array.from({ length: 70_000 }, (_, i) => ({
      path: `many/d${Math.floor(i / 1000)}/f${i}.txt`,
      data: new TextEncoder().encode(`#${i}`),
      mtime: Date.UTC(2024, 5, 1, 12),
    }));
    const zip = await buildStoreZip(entries);
    const work = mkdtempSync(join(tmpdir(), "zipofi-z64-"));
    const zipPath = join(work, "many.zip");
    writeFileSync(zipPath, zip);
    execFileSync("unzip", ["-tqq", zipPath]);
    const info = execFileSync("zipinfo", ["-t", zipPath], { encoding: "utf8" });
    expect(info).toMatch(/^70000 files/);
    const out = await readZip(zip);
    expect(Object.keys(out).length).toBe(70_000);
    expect(new TextDecoder().decode(out["many/d69/f69999.txt"])).toBe("#69999");
  }, 60_000);

  it("stores the file's modification time", async () => {
    const zip = await buildStoreZip([{ path: "p/a.txt", data: new Uint8Array([1]), mtime: new Date(2023, 2, 4, 5, 6, 8).getTime() }]);
    const work = mkdtempSync(join(tmpdir(), "zipofi-mt-"));
    writeFileSync(join(work, "a.zip"), zip);
    const line = execFileSync("zipinfo", ["-T", join(work, "a.zip"), "p/a.txt"], { encoding: "utf8" });
    expect(line).toMatch(/20230304\.050608/);
  });
});
