import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { inputFiles, isInput, sourceHash } from "../scripts/source-hash.mjs";
import { checkReleaseFresh } from "../scripts/check-release-fresh.mjs";
import { verifyUpdaterSignature } from "../scripts/verify-updater-sig.mjs";
import { appVersionMatchesRelease, nextPatch, toSemver } from "../scripts/bump-version.mjs";
import { versionedDmgFileName } from "../scripts/dmg-name.mjs";
import { APP_VERSION } from "../src/content/downloads";

const ROOT = join(__dirname, "..");
let dir: string;
const put = (rel: string, data: string) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), data);
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zipofi-hash-"));
  put("src/App.tsx", "export {}");
  put("public/assets/img/a.svg", "<svg/>");
  put("public/downloads/ZipoFile.dmg", "old dmg");
  put("index.html", "<html></html>");
  put("package.json", "{}");
  put("src-tauri/src/lib.rs", "fn main() {}");
  put("dist/index.html", "built");
  put("node_modules/x/index.js", "dep");
});

describe("source hash", () => {
  it("is stable and ignores mtime-only changes (touch)", () => {
    const h = sourceHash(dir);
    expect(sourceHash(dir)).toBe(h);
    const t = new Date(Date.now() + 60_000);
    utimesSync(join(dir, "src/App.tsx"), t, t);
    expect(sourceHash(dir)).toBe(h);
  });
  it("changes when an input's content, name or set of files changes", () => {
    const h = sourceHash(dir);
    put("src/App.tsx", "export const x = 1");
    const h2 = sourceHash(dir);
    expect(h2).not.toBe(h);
    put("src/new.css", "");
    expect(sourceHash(dir)).not.toBe(h2);
  });
  it("ignores release outputs, build output, dependencies and .DS_Store", () => {
    const h = sourceHash(dir);
    put("public/downloads/release.json", "{}");
    put("public/downloads/latest.json", "{}");
    put("dist/assets/x.js", "1");
    put("node_modules/y/i.js", "2");
    put("src/.DS_Store", "3");
    put("src-tauri/target/release/zipofi", "4");
    expect(sourceHash(dir)).toBe(h);
    expect(inputFiles(dir)).toEqual(["index.html", "package.json", "public/assets/img/a.svg", "src-tauri/src/lib.rs", "src/App.tsx"]);
  });
  it("classifies watcher paths like the hash does", () => {
    for (const p of ["src/App.tsx", "src/styles/global.css", "src-tauri/tauri.conf.json", "src-tauri/capabilities/default.json", "src-tauri/icons/icon.icns", "public/favicon.ico", "package-lock.json"])
      expect(isInput(p), p).toBe(true);
    for (const p of ["public/downloads/ZipoFile.dmg", "dist/index.html", "src-tauri/target/x", "node_modules/a/b.js", ".review/x.png", "README.md", "scripts/release-mac.sh"])
      expect(isInput(p), p).toBe(false);
  });
});

describe("stale DMG check", () => {
  const writeRelease = (hash: string) => put("public/downloads/release.json", JSON.stringify({ version: "1.0.1", sourceHash: hash }));
  it("fails without release.json", () => {
    const r = checkReleaseFresh(dir, {});
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/release\.json is missing/);
  });
  it("fails when the source changed after the release, passes when fresh", () => {
    writeRelease(sourceHash(dir));
    expect(checkReleaseFresh(dir, {}).ok).toBe(true);
    put("src/App.tsx", "export const changed = true");
    const r = checkReleaseFresh(dir, {});
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/download is stale/);
  });
  it("honours ZIPOFI_ALLOW_STALE_DMG=1", () => {
    expect(checkReleaseFresh(dir, { ZIPOFI_ALLOW_STALE_DMG: "1" }).ok).toBe(true);
  });
  it("guards the web build but not the desktop build", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts.build).toMatch(/^node scripts\/check-release-fresh\.mjs && /);
    expect(pkg.scripts["build:desktop"]).not.toMatch(/check-release-fresh|npm run build/);
    expect(pkg.scripts["build:desktop"]).toMatch(/tsc -b tsconfig\.app\.json tsconfig\.node\.json/);
    expect(pkg.scripts["build:desktop"]).not.toMatch(/tsconfig\.test/);
    const conf = JSON.parse(readFileSync(join(ROOT, "src-tauri/tauri.conf.json"), "utf8"));
    expect(conf.build.beforeBuildCommand).toBe("npm run build:desktop");
  });
});

describe("versions and updater config", () => {
  it("names the macOS dmg ZipoFile_vM_m.dmg", () => {
    expect(versionedDmgFileName("1.0")).toBe("ZipoFile_v1_0.dmg");
    expect(versionedDmgFileName("2.1")).toBe("ZipoFile_v2_1.dmg");
    expect(versionedDmgFileName("2.9")).toBe("ZipoFile_v2_9.dmg");
  });
  it("bumps minor 0–9 then rolls major", () => {
    expect(nextPatch("1.0")).toBe("1.1");
    expect(nextPatch("1.8")).toBe("1.9");
    expect(nextPatch("1.9")).toBe("2.0");
    expect(nextPatch("2.9")).toBe("3.0");
    expect(nextPatch("1.0.11")).toBe("2.2");
    expect(() => nextPatch("1.10")).toThrow();
  });
  it("keeps display version in package.json/UI and semver in Tauri/Cargo", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const conf = JSON.parse(readFileSync(join(ROOT, "src-tauri/tauri.conf.json"), "utf8"));
    const cargo = readFileSync(join(ROOT, "src-tauri/Cargo.toml"), "utf8");
    const lock = readFileSync(join(ROOT, "src-tauri/Cargo.lock"), "utf8");
    const semver = toSemver(pkg.version);
    expect(conf.version).toBe(semver);
    expect(APP_VERSION).toBe(pkg.version);
    expect(cargo).toMatch(new RegExp(`\\[package\\][^\\[]*\\nversion = "${semver.replace(/\./g, "\\.")}"`));
    expect(lock).toContain(`name = "zipofi"\nversion = "${semver}"`);
  });
  it("maps display version to Tauri semver", () => {
    expect(toSemver("2.1")).toBe("2.1.0");
    expect(toSemver("1.9")).toBe("1.9.0");
  });
  it("matches DMG bundle version to display release version", () => {
    expect(appVersionMatchesRelease("2.1", "2.1.0")).toBe(true);
    expect(appVersionMatchesRelease("2.1", "2.1")).toBe(true);
    expect(appVersionMatchesRelease("2.1", "2.2.0")).toBe(false);
  });
  it("configures the signed updater feed", () => {
    const conf = JSON.parse(readFileSync(join(ROOT, "src-tauri/tauri.conf.json"), "utf8"));
    expect(conf.bundle.createUpdaterArtifacts).toBe(true);
    expect(conf.plugins.updater.endpoints).toEqual(["https://zipofile.com/downloads/latest.json"]);
    expect(Buffer.from(conf.plugins.updater.pubkey, "base64").toString("utf8")).toMatch(/^untrusted comment: minisign public key/);
    const caps = JSON.parse(readFileSync(join(ROOT, "src-tauri/capabilities/default.json"), "utf8"));
    expect(caps.permissions).toEqual(expect.arrayContaining(["updater:default", "process:allow-restart"]));
  });
  it("published updater archive matches latest.json and its signature verifies", () => {
    const pub = join(ROOT, "public/downloads");
    if (!existsSync(join(pub, "latest.json"))) return; // before the first updater release
    const latest = JSON.parse(readFileSync(join(pub, "latest.json"), "utf8"));
    const rel = JSON.parse(readFileSync(join(pub, "release.json"), "utf8"));
    expect(latest.version).toBe(rel.version);
    for (const k of ["darwin-x86_64", "darwin-aarch64"]) {
      expect(latest.platforms[k].url).toBe("https://zipofile.com/downloads/ZipoFile.app.tar.gz");
    }
    const conf = JSON.parse(readFileSync(join(ROOT, "src-tauri/tauri.conf.json"), "utf8"));
    const r = verifyUpdaterSignature(readFileSync(join(pub, "ZipoFile.app.tar.gz")), latest.platforms["darwin-x86_64"].signature, conf.plugins.updater.pubkey);
    expect(r.ok, r.reason).toBe(true);
  });
});
