#!/usr/bin/env node
// Sets the app version everywhere it is written:
// package.json, package-lock.json (root entries), src-tauri/tauri.conf.json,
// src-tauri/Cargo.toml ([package]), src-tauri/Cargo.lock (zipofi entry).
// The UI reads the version from package.json at build time (src/content/downloads.ts).
// Two-part versions only: major.minor with minor 0–9; 1.9 → 2.0, 2.9 → 3.0, etc.
//   node scripts/bump-version.mjs patch     # 1.0 -> 1.1, 1.9 -> 2.0
//   node scripts/bump-version.mjs 2.3     # explicit
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./source-hash.mjs";

const root = projectRoot();
const rd = (f) => readFileSync(join(root, f), "utf8");
const wr = (f, s) => writeFileSync(join(root, f), s);

const TWO_PART = /^(\d+)\.(\d+)$/;

/** Legacy 1.0.N → 1.N for N≤9, 1.0.10 → 2.0, 1.0.11 → 2.1, … */
export function fromLegacyVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return v;
  const baseMajor = Number(m[1]);
  const mid = Number(m[2]);
  const patch = Number(m[3]);
  if (mid !== 0) throw new Error(`legacy version must be x.0.z: ${v}`);
  const major = baseMajor + Math.floor(patch / 10);
  const minor = patch % 10;
  return `${major}.${minor}`;
}

export function normalizeVersion(v) {
  const s = String(v).trim();
  if (TWO_PART.test(s)) {
    const [, maj, min] = TWO_PART.exec(s);
    if (Number(min) > 9) throw new Error(`minor must be 0–9: ${s}`);
    return s;
  }
  if (/^\d+\.\d+\.\d+$/.test(s)) return fromLegacyVersion(s);
  throw new Error(`not a supported version: ${s}`);
}

export function nextPatch(v) {
  const cur = normalizeVersion(v);
  const [, maj, min] = TWO_PART.exec(cur);
  let major = Number(maj);
  let minor = Number(min);
  if (minor === 9) {
    major += 1;
    minor = 0;
  } else {
    minor += 1;
  }
  return `${major}.${minor}`;
}

/** Tauri and Cargo require semver x.y.z; public version stays x.y (patch is always 0). */
export function toSemver(displayVersion) {
  const v = normalizeVersion(displayVersion);
  return `${v}.0`;
}

function replaceOnce(file, re, to) {
  const s = rd(file);
  if (!re.test(s)) throw new Error(`version not found in ${file}`);
  wr(file, s.replace(re, to));
}

if (process.argv[1]?.endsWith("bump-version.mjs")) {
  const arg = process.argv[2] ?? "patch";
  const cur = normalizeVersion(JSON.parse(rd("package.json")).version);
  const next = arg === "patch" ? nextPatch(cur) : normalizeVersion(arg);
  const semver = toSemver(next);
  replaceOnce("package.json", /("version":\s*")[^"]+(")/, `$1${next}$2`);
  const lock = JSON.parse(rd("package-lock.json"));
  lock.version = next;
  if (lock.packages?.[""]) lock.packages[""].version = next;
  wr("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
  replaceOnce("src-tauri/tauri.conf.json", /("version":\s*")[^"]+(")/, `$1${semver}$2`);
  replaceOnce("src-tauri/Cargo.toml", /(\[package\][^\[]*?\nversion\s*=\s*")[^"]+(")/, `$1${semver}$2`);
  replaceOnce("src-tauri/Cargo.lock", /(\[\[package\]\]\nname = "zipofi"\nversion = ")[^"]+(")/, `$1${semver}$2`);
  console.log(next);
}
