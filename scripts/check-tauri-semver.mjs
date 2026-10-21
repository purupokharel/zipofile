#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeVersion, toSemver } from "./bump-version.mjs";
import { projectRoot } from "./source-hash.mjs";

const root = projectRoot();
const display = normalizeVersion(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version);
const want = toSemver(display);
const confVer = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8")).version;
const cargo = readFileSync(join(root, "src-tauri/Cargo.toml"), "utf8");
const cargoM = cargo.match(/\[package\][^\[]*?\nversion\s*=\s*"([^"]+)"/);
const cargoVer = cargoM?.[1];

const bad = [];
if (confVer !== want) bad.push(`tauri.conf.json has "${confVer}", expected semver "${want}" (display v${display})`);
if (cargoVer !== want) bad.push(`Cargo.toml has "${cargoVer ?? "?"}", expected "${want}"`);

if (bad.length) {
  console.error("Tauri semver check failed:\n" + bad.map((b) => `  - ${b}`).join("\n"));
  console.error(`Run: node scripts/bump-version.mjs ${display}  (or patch) to sync.`);
  process.exit(1);
}
