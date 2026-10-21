#!/usr/bin/env node
// Confirms the desktop binary embeds the same hashed web assets that dist/ (the site) serves,
// so the downloadable app has the same files and styles as the deployed site.
//   node scripts/check-embedded-assets.mjs [path/to/ZipoFile.app]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./source-hash.mjs";

export function checkEmbeddedAssets(root, app) {
  const bin = join(app, "Contents/MacOS/zipofi");
  if (!existsSync(bin)) return { ok: false, missing: [], message: `no app binary at ${bin}` };
  const assets = readdirSync(join(root, "dist/assets")).filter((f) => /\.(js|css)$/.test(f));
  const data = readFileSync(bin);
  const missing = assets.filter((f) => !data.includes(Buffer.from(`/assets/${f}`)));
  return {
    ok: assets.length > 0 && missing.length === 0,
    missing,
    message: missing.length ? `app is missing ${missing.join(", ")}` : `app embeds all ${assets.length} dist js/css assets (${assets.join(", ")})`,
  };
}

if (process.argv[1]?.endsWith("check-embedded-assets.mjs")) {
  const root = projectRoot();
  const macos = join(root, "src-tauri/target/universal-apple-darwin/release/bundle/macos");
  const app =
    process.argv[2] ||
    [join(macos, "ZipoFile.app"), join(macos, "Zipofi.app")].find((p) => existsSync(p)) ||
    join(macos, "ZipoFile.app");
  const r = checkEmbeddedAssets(root, app);
  (r.ok ? console.log : console.error)(r.message);
  process.exit(r.ok ? 0 : 1);
}
