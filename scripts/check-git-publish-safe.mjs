#!/usr/bin/env node
/** Fails if staged paths look like binaries, secrets, or deploy tooling. Run before commit/push. */
import { execSync } from "node:child_process";

const staged = execSync("git diff --cached --name-only -z", { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const rules = [
  { re: /\.dmg$/i, why: "macOS installer — use GitHub Releases" },
  { re: /\.tar\.gz$/i, why: "updater archive — use GitHub Releases" },
  { re: /\.sig$/i, why: "updater signature — use GitHub Releases" },
  { re: /\.(app|exe|dll|dylib|so)$/i, why: "binary executable" },
  { re: /(^|\/)dist\//, why: "build output" },
  { re: /(^|\/)node_modules\//, why: "dependencies" },
  { re: /(^|\/)src-tauri\//, why: "desktop tree not in public repo" },
  { re: /deploy\.env/i, why: "deploy secrets" },
  { re: /(^|\/)\.env(\.|$)/, why: "environment secrets" },
  { re: /\.pem$|\.p12$|id_rsa|id_ed25519|known_hosts/i, why: "key material" },
  { re: /^scripts\/(deploy|release-mac|autorelease|auto-release)/, why: "local deploy/release scripts" },
  { re: /^public\/api\//, why: "server-only API" },
  { re: /^public\/downloads\/(?!.*\.json$).+/i, why: "only release JSON belongs in public/downloads" },
];

const bad = [];
for (const path of staged) {
  for (const { re, why } of rules) {
    if (re.test(path)) {
      bad.push({ path, why });
      break;
    }
  }
}

if (bad.length) {
  console.error("Publish safety check failed — unstage these before commit:\n");
  for (const { path, why } of bad) console.error(`  ${path}\n    → ${why}`);
  process.exit(1);
}

if (process.argv[1]?.endsWith("check-git-publish-safe.mjs")) {
  console.log(staged.length ? `OK: ${staged.length} staged file(s) look safe to publish.` : "OK: nothing staged.");
}
