#!/usr/bin/env node
// Content hash of every input that goes into the ZipoFile app and site build.
// Only file paths and contents count, so `touch` (mtime only) does not change it.
//   node scripts/source-hash.mjs          # prints the hash
//   node scripts/source-hash.mjs --list   # prints the hashed files
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Directories hashed recursively and single files hashed, relative to the project root. */
export const INPUT_DIRS = ["src", "public", "src-tauri/src", "src-tauri/capabilities", "src-tauri/icons"];
export const INPUT_FILES = [
  "index.html",
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
  "src-tauri/tauri.conf.json",
  "src-tauri/build.rs",
];
/** Never hashed: release outputs and OS clutter. */
const IGNORED_PREFIXES = ["public/downloads/"];
const IGNORED_NAMES = new Set([".DS_Store"]);

const posix = (p) => p.split(sep).join("/");

/** True when a project-relative path (posix) is one of the hashed inputs. */
export function isInput(rel) {
  rel = posix(rel);
  const name = rel.slice(rel.lastIndexOf("/") + 1);
  if (IGNORED_NAMES.has(name)) return false;
  if (IGNORED_PREFIXES.some((p) => rel === p.slice(0, -1) || rel.startsWith(p))) return false;
  if (INPUT_FILES.includes(rel)) return true;
  return INPUT_DIRS.some((d) => rel.startsWith(d + "/"));
}

function walk(root, dir, out) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) walk(root, rel, out);
    else if (e.isFile() && isInput(rel)) out.push(rel);
  }
}

/** Sorted list of hashed files under root. */
export function inputFiles(root) {
  const out = [];
  for (const d of INPUT_DIRS) if (existsSync(join(root, d)) && statSync(join(root, d)).isDirectory()) walk(root, d, out);
  for (const f of INPUT_FILES) if (existsSync(join(root, f))) out.push(f);
  return [...new Set(out)].sort();
}

/** sha256 over (path, length, content) of every input file. */
export function sourceHash(root) {
  const h = createHash("sha256");
  for (const rel of inputFiles(root)) {
    const data = readFileSync(join(root, rel));
    h.update(`${rel}\0${data.length}\0`);
    h.update(data);
  }
  return h.digest("hex");
}

export const projectRoot = () => fileURLToPath(new URL("..", import.meta.url));

if (process.argv[1] && posix(relative(process.cwd(), process.argv[1])).endsWith("source-hash.mjs")) {
  const root = projectRoot();
  if (process.argv.includes("--list")) console.log(inputFiles(root).join("\n"));
  else console.log(sourceHash(root));
}
