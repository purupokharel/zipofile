#!/usr/bin/env node
// Sets the app version everywhere it is written:
// package.json, package-lock.json (root entries), src-tauri/tauri.conf.json,
// src-tauri/Cargo.toml ([package]), src-tauri/Cargo.lock (zipofi entry).
// The UI reads the version from package.json at build time (src/content/downloads.ts).
//   node scripts/bump-version.mjs patch     # 1.0.3 -> 1.0.4, prints the new version
//   node scripts/bump-version.mjs 1.2.0     # explicit
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./source-hash.mjs";

const root = projectRoot();
const rd = (f) => readFileSync(join(root, f), "utf8");
const wr = (f, s) => writeFileSync(join(root, f), s);

export function nextPatch(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) throw new Error(`not a plain x.y.z version: ${v}`);
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

function replaceOnce(file, re, to) {
  const s = rd(file);
  if (!re.test(s)) throw new Error(`version not found in ${file}`);
  wr(file, s.replace(re, to));
}

if (process.argv[1]?.endsWith("bump-version.mjs")) {
  const arg = process.argv[2] ?? "patch";
  const cur = JSON.parse(rd("package.json")).version;
  const next = arg === "patch" ? nextPatch(cur) : arg;
  if (!/^\d+\.\d+\.\d+$/.test(next)) throw new Error(`bad version ${next}`);
  replaceOnce("package.json", /("version":\s*")[^"]+(")/, `$1${next}$2`);
  const lock = JSON.parse(rd("package-lock.json"));
  lock.version = next;
  if (lock.packages?.[""]) lock.packages[""].version = next;
  wr("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
  replaceOnce("src-tauri/tauri.conf.json", /("version":\s*")[^"]+(")/, `$1${next}$2`);
  replaceOnce("src-tauri/Cargo.toml", /(\[package\][^\[]*?\nversion\s*=\s*")[^"]+(")/, `$1${next}$2`);
  replaceOnce("src-tauri/Cargo.lock", /(\[\[package\]\]\nname = "zipofi"\nversion = ")[^"]+(")/, `$1${next}$2`);
  console.log(next);
}
