import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import RULES from "../src/lib/exclude-rules.json";
import { REFRESH_WARNING, SHEETS } from "../src/content/sheets";

const about = SHEETS.about.body;
const allCopy = [
  ...Object.values(SHEETS).map((s) => s.body),
  ...Object.values(REFRESH_WARNING).map((s) => s.body),
].join("\n");

// Whole-token match so ".build" is not satisfied by "build".
const mentions = (text: string, name: string) =>
  new RegExp(`(^|[\\s(,/])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[\\s),./:])`, "m").test(text);

describe("About sheet matches the shipped exclusion rules", () => {
  it("lists every always-skipped folder name", () => {
    for (const d of RULES.dirs) expect(mentions(about, d), d).toBe(true);
  });
  it("lists every suffix, contextual folder, excluded file, and kept env template", () => {
    for (const s of RULES.dirSuffixes) expect(about).toContain(s);
    expect(about).toContain(RULES.venvMarker);
    for (const r of RULES.contextual) expect(mentions(about, r.dir), r.dir).toBe(true);
    for (const r of RULES.contextual) {
      for (const m of [...(r.parentHasAny ?? []), ...(r.childHasAny ?? []), ...(r.parentHasExt ?? [])]) {
        expect(about, m).toContain(m);
      }
    }
    for (const f of RULES.files) expect(about).toContain(f);
    for (const k of RULES.secretEnvKeep) expect(about).toContain(k);
  });
  it("makes no platform or download claims the project cannot back", () => {
    expect(allCopy).not.toMatch(/from this site/i);
    expect(allCopy).not.toMatch(/Windows, or Linux/i);
    expect(allCopy).not.toMatch(/one click/i);
    expect(allCopy).not.toMatch(/fifteen minutes|any folder-based/i);
    expect(allCopy).not.toContain("\u2014");
  });
});

describe("public copy uses no real project or folder names", () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|json|css|html)$/.test(n)) files.push(p);
    }
  };
  walk(join(__dirname, "../src"));
  files.push(join(__dirname, "../index.html"), join(__dirname, "../README.md"));
  it.each(files)("%s", (f) => {
    const text = readFileSync(f, "utf8");
    expect(text).not.toMatch(/everest|pageinvoice|marketxed|knverter/i);
  });
  it("measured example matches the recorded benchmark", () => {
    expect(about).toContain("534,355 files");
    expect(about).toContain("528,950 files (541.6 MB)");
    expect(about).toContain("15.3 seconds (15.2 to 17.1)");
    expect(about).toContain("6.2 seconds (6.1 to 6.4)");
    expect(about).toContain("median of 5 runs");
    expect(about).not.toContain("22.4 seconds");
    expect(about).not.toContain("2 minutes 12 seconds");
  });
});

describe("About describes the skip list as implemented", () => {
  it("documents syntax, limits, .zipofiignore, and storage", async () => {
    const { MAX_PATTERNS, MAX_PATTERN_LEN, IGNORE_FILE } = await import("../src/lib/skipList");
    expect(about).toContain("Also skip");
    expect(about).toContain(`Up to ${MAX_PATTERNS} patterns of up to ${MAX_PATTERN_LEN} characters`);
    expect(about).toContain(IGNORE_FILE);
    expect(about).toContain("There is no re-archive button");
    expect(about).not.toMatch(/list is fixed|cannot add or remove entries/i);
  });
  it("Platforms matches the Download menu", async () => {
    const { DOWNLOADS } = await import("../src/content/downloads");
    expect(about).toContain("**Download** menu");
    expect(about).toContain("signed with an Apple Developer ID certificate and notarized by Apple");
    expect(about).toContain("run on an Intel Mac only, not yet on Apple Silicon");
    expect(about).toContain("signature matches the key built into the app");
    expect(about).not.toMatch(/right-click the app|not signed or notarized/i);
    for (const d of DOWNLOADS) if (!d.available) expect(d.label).toMatch(/\(planned\)$/);
    expect(about).toContain("listed as planned in the Download menu");
  });
});
