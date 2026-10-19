import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import scenarios from "./skip-scenarios.json";
import { shouldSkipRelativeFile } from "../src/lib/excludes";
import { readIgnoreFromHandle, walkDirectoryHandle } from "../src/lib/dirWalk";
import { MAX_PATTERNS, mergeSkip, parseIgnoreFile, parseSkipList, skipMatches, splitField } from "../src/lib/skipList";
import { fsDirHandle, makeTree } from "./helpers";

type Case = { name: string; patterns?: string[]; field?: string; keep: string[]; drop: string[] };
const S = scenarios as { cases: Case[]; invalid: string[]; ignoreFile: { text: string; keep: string[]; drop: string[] } };

const linesOf = (c: Case) => (c.field !== undefined ? splitField(c.field) : c.patterns!);

async function walked(dir: string, skip = parseSkipList([]).list): Promise<string[]> {
  const handle = fsDirHandle(dir);
  const full = mergeSkip(skip, await readIgnoreFromHandle(handle));
  const got: string[] = [];
  await walkDirectoryHandle(handle, [], "proj", (p) => void got.push(p.slice("proj/".length)), { files: 0, bytes: 0 }, full);
  return got.sort();
}

describe("skip list: shared scenarios", () => {
  for (const c of S.cases) {
    it(`flat path list (Safari/Firefox path): ${c.name}`, () => {
      const { list, errors } = parseSkipList(linesOf(c));
      expect(errors).toEqual([]);
      for (const p of c.keep) expect(shouldSkipRelativeFile(p.split("/"), new Map(), list), `keep ${p}`).toBe(false);
      for (const p of c.drop) expect(shouldSkipRelativeFile(p.split("/"), new Map(), list), `drop ${p}`).toBe(true);
    });
    it(`directory walker on disk (Chromium path): ${c.name}`, async () => {
      const dir = makeTree([...c.keep, ...c.drop]);
      const got = await walked(dir, parseSkipList(linesOf(c)).list);
      expect(got).toEqual([...c.keep].sort());
    });
  }

  it("rejects patterns that could escape the folder or match everything", () => {
    for (const bad of S.invalid) expect(parseSkipList([bad]).errors.length, bad).toBeGreaterThan(0);
    const many = Array.from({ length: MAX_PATTERNS + 1 }, (_, i) => `f${i}`);
    expect(parseSkipList(many).errors.length).toBeGreaterThan(0);
  });

  it("keeps the normalized lines that will be saved with the project", () => {
    const r = parseSkipList(splitField(" logs ,\n# note\n\n/data/ "));
    expect(r.errors).toEqual([]);
    expect(r.lines).toEqual(["logs", "/data/"]);
  });

  it("a skipped folder is never enumerated by the walker", async () => {
    const dir = makeTree(["a.txt", "big/x.txt"]);
    let listedBig = false;
    const handle = fsDirHandle(dir);
    const spy = new Proxy(handle, {
      get(t, k) {
        if (k !== "values") return Reflect.get(t, k);
        return async function* () {
          for await (const e of (t as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
            if (e.kind === "directory" && e.name === "big") {
              yield new Proxy(e, {
                get(t2, k2) {
                  if (k2 === "values") listedBig = true;
                  return Reflect.get(t2, k2);
                },
              });
            } else yield e;
          }
        };
      },
    });
    const got: string[] = [];
    await walkDirectoryHandle(spy, [], "proj", (p) => void got.push(p), { files: 0, bytes: 0 }, parseSkipList(["big"]).list);
    expect(got).toEqual(["proj/a.txt"]);
    expect(listedBig).toBe(false);
  });

  it(".zipofiignore at the project root is read; invalid lines are ignored", async () => {
    const ig = S.ignoreFile;
    const dir = makeTree([...ig.keep, ...ig.drop].filter((p) => p !== ".zipofiignore"));
    writeFileSync(join(dir, ".zipofiignore"), ig.text);
    expect(await walked(dir)).toEqual([...ig.keep].sort());
    const list = parseIgnoreFile(ig.text);
    expect(skipMatches(list, ["x", "a.log"], false)).toBe(true);
  });
});
