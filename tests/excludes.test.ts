import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import scenarios from "./exclude-scenarios.json";
import {
  buildMarkerIndex,
  CHILD_MARKERS,
  DEFAULT_EXCLUDES,
  EXCLUDE_RULES,
  shouldSkipDir,
  shouldSkipFile,
  shouldSkipRelativeFile,
} from "../src/lib/excludes";
import { walkDirectoryHandle } from "../src/lib/dirWalk";
import { fsDirHandle, makeTree } from "./helpers";

type Scenario = { stack: string; keep: string[]; drop: string[] };
const SCENARIOS = (scenarios as { scenarios: Scenario[] }).scenarios;

describe("exclusion rules: per-stack scenarios (flat path list, Safari/Firefox upload path)", () => {
  for (const sc of SCENARIOS) {
    it(`${sc.stack}`, () => {
      const all = [...sc.keep, ...sc.drop].map((p) => p.split("/"));
      const markers = buildMarkerIndex(all);
      for (const p of sc.keep) expect(shouldSkipRelativeFile(p.split("/"), markers), `keep ${p}`).toBe(false);
      for (const p of sc.drop) expect(shouldSkipRelativeFile(p.split("/"), markers), `drop ${p}`).toBe(true);
    });
  }
});

describe("exclusion rules: per-stack scenarios (real disk tree via directory-handle walker, Chromium path)", () => {
  for (const sc of SCENARIOS) {
    it(`${sc.stack}`, async () => {
      const dir = makeTree([...sc.keep, ...sc.drop]);
      const seen: string[] = [];
      await walkDirectoryHandle(fsDirHandle(dir), [], "proj", (path) => {
        seen.push(path.replace(/^proj\//, ""));
      });
      expect(seen.sort()).toEqual([...sc.keep].sort());
    });
  }
});

describe("exclusion rules: units", () => {
  it("keeps real config dotfiles and dot-dirs", () => {
    for (const f of [".gitignore", ".eslintrc", ".eslintrc.json", ".prettierrc", ".npmrc", ".nvmrc", ".editorconfig", ".env.example", ".env.sample", ".env.template", ".dockerignore"]) {
      expect(shouldSkipFile(f), f).toBe(false);
    }
    for (const d of [".github", ".husky", ".storybook", ".devcontainer", ".circleci", ".config"]) {
      expect(shouldSkipDir(d, { parentName: "", parentFiles: [], childFiles: [] }), d).toBe(false);
    }
  });

  it("drops secret env files and OS junk", () => {
    for (const f of [".env", ".env.local", ".env.production", ".env.development.local", ".DS_Store", "Thumbs.db", "desktop.ini"]) {
      expect(shouldSkipFile(f), f).toBe(true);
    }
  });

  it("env is only skipped when it is a real virtualenv", () => {
    expect(DEFAULT_EXCLUDES.has("env")).toBe(false);
    expect(shouldSkipDir("env", { parentName: "", parentFiles: [], childFiles: [] })).toBe(false);
    expect(shouldSkipDir("env", { parentName: "", parentFiles: [], childFiles: ["pyvenv.cfg"] })).toBe(true);
    expect(shouldSkipDir("py311", { parentName: "", parentFiles: [], childFiles: ["pyvenv.cfg"] })).toBe(true);
  });

  it("vendor / bin / obj are contextual", () => {
    const none = { parentName: "", parentFiles: [] as string[], childFiles: [] as string[] };
    expect(shouldSkipDir("vendor", none)).toBe(false);
    expect(shouldSkipDir("vendor", { ...none, parentFiles: ["composer.json"] })).toBe(true);
    expect(shouldSkipDir("vendor", { ...none, childFiles: ["modules.txt"] })).toBe(true);
    expect(shouldSkipDir("bin", none)).toBe(false);
    expect(shouldSkipDir("bin", { ...none, parentFiles: ["Api.CSPROJ"] })).toBe(true);
    expect(shouldSkipDir("obj", { ...none, parentFiles: ["Solution.sln"] })).toBe(true);
    expect(shouldSkipDir("bundle", { ...none, parentName: "vendor" })).toBe(true);
    expect(shouldSkipDir("bundle", none)).toBe(false);
  });

  it("name-only check without context never applies contextual rules", () => {
    expect(shouldSkipDir("vendor")).toBe(false);
    expect(shouldSkipDir("node_modules")).toBe(true);
    expect(shouldSkipDir("foo.egg-info")).toBe(true);
  });

  it("child markers the walkers probe are exactly the rule markers", () => {
    expect([...CHILD_MARKERS].sort()).toEqual(["modules.txt", "pyvenv.cfg"]);
  });

  it("desktop (Rust) embeds the same rules file as the web build", () => {
    const rs = readFileSync(join(__dirname, "../src-tauri/src/lib.rs"), "utf8");
    expect(rs).toContain('include_str!("../../src/lib/exclude-rules.json")');
    expect(rs).not.toMatch(/const DEFAULT_EXCLUDES: &\[&str\]/);
    expect(EXCLUDE_RULES.version).toBe(2);
  });
});
