/**
 * Per-project "Also skip" patterns. Same syntax and matching as
 * src-tauri/src/skiplist.rs; both are tested against tests/skip-scenarios.json.
 *
 * - One pattern per line (the Add Project field also accepts commas).
 * - Blank lines and lines starting with # are ignored.
 * - No "/" in the pattern: matches a file or folder with that name at any depth.
 * - A "/" anywhere (a leading "/" is allowed): a path from the project root.
 * - A trailing "/": folders only.
 * - "*" matches any characters except "/", "?" one character, and "**" as a whole
 *   path segment matches any number of folders. Case-sensitive.
 * - Rejected: "..", "." or empty segments, "\", drive letters, "*" or "**" alone.
 */

export const MAX_PATTERNS = 100;
export const MAX_PATTERN_LEN = 256;
export const IGNORE_FILE = ".zipofiignore";

type Pattern = { anchored: boolean; dirOnly: boolean; segs: string[] };

export type SkipList = { patterns: readonly Pattern[] };
export const EMPTY_SKIP: SkipList = { patterns: [] };

export function splitField(text: string): string[] {
  return text.split(/[\n,]/).map((s) => s.trim());
}

export function splitIgnoreFile(text: string): string[] {
  return text.split(/\r?\n/).map((s) => s.trim());
}

function parseOne(raw: string): Pattern | null {
  const s = raw.trim();
  if (!s || s.startsWith("#")) return null;
  if ([...s].length > MAX_PATTERN_LEN) throw new Error(`"${s}" is longer than ${MAX_PATTERN_LEN} characters`);
  if (s.includes("\\")) throw new Error(`"${s}": use / to separate folders`);
  if (/^[A-Za-z]:/.test(s)) throw new Error(`"${s}": paths must be relative to the project folder`);
  let body = s;
  let anchored = false;
  let dirOnly = false;
  if (body.startsWith("/")) {
    anchored = true;
    body = body.slice(1);
  }
  if (body.endsWith("/")) {
    dirOnly = true;
    body = body.slice(0, -1);
  }
  if (body.includes("/")) anchored = true;
  const segs = body.split("/");
  if (segs.some((g) => g === "" || g === "." || g === "..")) {
    throw new Error(`"${s}": empty, "." and ".." path parts are not allowed`);
  }
  if (segs.every((g) => g === "*" || g === "**")) throw new Error(`"${s}" would skip everything`);
  return { anchored, dirOnly, segs };
}

/** Strict parse (Add Project field): returns every error, one per bad line. */
export function parseSkipList(lines: string[]): { list: SkipList; errors: string[]; lines: string[] } {
  const patterns: Pattern[] = [];
  const kept: string[] = [];
  const errors: string[] = [];
  for (const l of lines) {
    try {
      const p = parseOne(l);
      if (p) {
        patterns.push(p);
        kept.push(l.trim());
      }
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  if (patterns.length > MAX_PATTERNS) errors.push(`At most ${MAX_PATTERNS} patterns are allowed`);
  return { list: { patterns }, errors, lines: kept };
}

/** Lenient parse for .zipofiignore: invalid lines are ignored. */
export function parseIgnoreFile(text: string): SkipList {
  const patterns: Pattern[] = [];
  for (const l of splitIgnoreFile(text)) {
    try {
      const p = parseOne(l);
      if (p && patterns.length < MAX_PATTERNS) patterns.push(p);
    } catch {
      /* ignored */
    }
  }
  return { patterns };
}

export function mergeSkip(a: SkipList, b: SkipList): SkipList {
  return { patterns: [...a.patterns, ...b.patterns] };
}

function segMatch(pat: string, name: string): boolean {
  const p = [...pat];
  const n = [...name];
  let pi = 0;
  let ni = 0;
  let star = -1;
  let mark = 0;
  while (ni < n.length) {
    if (pi < p.length && (p[pi] === "?" || p[pi] === n[ni])) {
      pi++;
      ni++;
    } else if (pi < p.length && p[pi] === "*") {
      star = pi++;
      mark = ni;
    } else if (star !== -1) {
      pi = star + 1;
      ni = ++mark;
    } else {
      return false;
    }
  }
  while (pi < p.length && p[pi] === "*") pi++;
  return pi === p.length;
}

function pathMatch(segs: string[], parts: string[], si = 0, pi = 0): boolean {
  if (si === segs.length) return pi === parts.length;
  if (segs[si] === "**") {
    for (let k = pi; k <= parts.length; k++) if (pathMatch(segs, parts, si + 1, k)) return true;
    return false;
  }
  return pi < parts.length && segMatch(segs[si]!, parts[pi]!) && pathMatch(segs, parts, si + 1, pi + 1);
}

/** `parts` = path relative to the project root, split on "/", never empty. */
export function skipMatches(list: SkipList, parts: string[], isDir: boolean): boolean {
  if (!parts.length || !list.patterns.length) return false;
  const name = parts[parts.length - 1]!;
  return list.patterns.some((p) => {
    if (p.dirOnly && !isDir) return false;
    return p.anchored ? pathMatch(p.segs, parts) : segMatch(p.segs[0]!, name);
  });
}
