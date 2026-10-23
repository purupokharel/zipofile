// Stamps ?v= from public/cache.json onto asset refs in index.html and dist/index.html
// (same rules as dev-tools/launcher/cache.py). Run after vite build so the launcher cache table stays green.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./source-hash.mjs";

const REF =
  /(?<attr>src|href)="(?<url>(?:\/src\/main\.tsx|\/assets\/[^"?]+|\/(?:favicon\.ico|icon-32\.png|apple-touch-icon\.png|site\.webmanifest|schema\.json)))(?:\?v=\d+)?"/g;

export function readCacheVer(root = projectRoot()) {
  try {
    const j = JSON.parse(readFileSync(join(root, "public/cache.json"), "utf8"));
    return Math.max(1, Number.parseInt(String(j.v ?? 1), 10) || 1);
  } catch {
    return 1;
  }
}

export function stampCacheVerHtml(html, v) {
  return html.replace(REF, (_m, _a, _u, _o, _s, g) => `${g.attr}="${g.url}?v=${v}"`);
}

export function applyCacheVer(root = projectRoot(), v = readCacheVer(root)) {
  const n = Math.max(1, Number.parseInt(String(v), 10) || 1);
  const study = join(root, "casestudy.md");
  const pubStudy = join(root, "public/casestudy.md");
  if (existsSync(study)) copyFileSync(study, pubStudy);
  let changed = 0;
  for (const rel of ["index.html", "dist/index.html"]) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const next = stampCacheVerHtml(readFileSync(path, "utf8"), n);
    writeFileSync(path, next);
    changed += 1;
  }
  return { ok: true, v: n, files: changed };
}

if (process.argv[1]?.endsWith("apply-cache-ver.mjs")) {
  const r = applyCacheVer();
  if (!r.files) console.warn("apply-cache-ver: no index.html files found");
  else console.log(`cache v${r.v} stamped on ${r.files} html file(s)`);
}
