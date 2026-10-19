#!/usr/bin/env node
// Fails the web/deploy build when public/downloads/release.json (written by
// scripts/release-mac.sh) does not match the current source hash, so the site never
// ships a DMG built from older source. Local escape hatch: ZIPOFI_ALLOW_STALE_DMG=1.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot, sourceHash } from "./source-hash.mjs";

export function checkReleaseFresh(root, env = process.env) {
  if (env.ZIPOFI_ALLOW_STALE_DMG === "1") return { ok: true, message: "release check skipped (ZIPOFI_ALLOW_STALE_DMG=1)" };
  const file = join(root, "public/downloads/release.json");
  if (!existsSync(file)) {
    return { ok: false, message: "public/downloads/release.json is missing. Run scripts/release-mac.sh (or set ZIPOFI_ALLOW_STALE_DMG=1 for local dev)." };
  }
  let rel;
  try {
    rel = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { ok: false, message: "public/downloads/release.json is not valid JSON." };
  }
  const current = sourceHash(root);
  if (rel.sourceHash !== current) {
    return {
      ok: false,
      message:
        `The macOS download is stale: it was built from source ${String(rel.sourceHash).slice(0, 12)} (v${rel.version}), ` +
        `the source is now ${current.slice(0, 12)}. Run scripts/release-mac.sh (or let the auto-release watcher finish), ` +
        "or set ZIPOFI_ALLOW_STALE_DMG=1 for local dev.",
    };
  }
  return { ok: true, message: `macOS download v${rel.version} matches the source (${current.slice(0, 12)}).` };
}

if (process.argv[1]?.endsWith("check-release-fresh.mjs")) {
  const r = checkReleaseFresh(projectRoot());
  (r.ok ? console.log : console.error)(r.message);
  process.exit(r.ok ? 0 : 1);
}
