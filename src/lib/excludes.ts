import RULES from "./exclude-rules.json";
import { EMPTY_SKIP, skipMatches, type SkipList } from "./skipList";

/**
 * ZipoFile exclusion rules (web side). The rule data lives in exclude-rules.json and is
 * shared byte-for-byte with the desktop app (src-tauri/src/lib.rs), so both builds skip
 * exactly the same trees.
 *
 * Policy:
 * - Only directories are excluded by name. Dotfiles (.gitignore, .eslintrc, .npmrc,
 *   .prettierrc, .github/, .husky/ …) are real project config and are KEPT.
 * - Ambiguous names are contextual: `env` (or any folder) is skipped only when it
 *   contains `pyvenv.cfg`; `vendor`, `bin`, `obj`, `bundle`, `.bundle` only when the
 *   surrounding project marks them as dependency/build output.
 * - Secret env files (`.env`, `.env.local`, `.env.production`, …) are left out so a
 *   shared snapshot never leaks credentials; `.env.example`-style templates are kept.
 * - OS junk files (.DS_Store, Thumbs.db, desktop.ini) are dropped.
 * - The folder the user picks (the archive root) is never excluded.
 */

export type ContextualRule = {
  dir: string;
  why: string;
  parentHasAny?: string[];
  parentHasExt?: string[];
  parentNamed?: string;
  childHasAny?: string[];
};

export type ExcludeRules = {
  version: number;
  dirs: string[];
  dirSuffixes: string[];
  venvMarker: string;
  contextual: ContextualRule[];
  files: string[];
  secretEnvKeep: string[];
};

export const EXCLUDE_RULES = RULES as unknown as ExcludeRules;

/** Directory names that are always skipped, regardless of context. */
export const DEFAULT_EXCLUDES: ReadonlySet<string> = new Set(EXCLUDE_RULES.dirs);
const FILE_EXCLUDES: ReadonlySet<string> = new Set(EXCLUDE_RULES.files);
const ENV_KEEP: ReadonlySet<string> = new Set(EXCLUDE_RULES.secretEnvKeep);
const CONTEXT_DIRS: ReadonlySet<string> = new Set(EXCLUDE_RULES.contextual.map((r) => r.dir));

/** Marker files a walker must probe for inside a candidate directory. */
export const CHILD_MARKERS: readonly string[] = Array.from(
  new Set([EXCLUDE_RULES.venvMarker, ...EXCLUDE_RULES.contextual.flatMap((r) => r.childHasAny ?? [])]),
);

const PARENT_MARKER_NAMES: ReadonlySet<string> = new Set(
  EXCLUDE_RULES.contextual.flatMap((r) => r.parentHasAny ?? []),
);
const PARENT_MARKER_EXTS: readonly string[] = Array.from(
  new Set(EXCLUDE_RULES.contextual.flatMap((r) => r.parentHasExt ?? [])),
);

/** True when a file name matters to a contextual rule (used to index flat upload lists). */
export function isContextMarkerFile(name: string): boolean {
  if (PARENT_MARKER_NAMES.has(name) || CHILD_MARKERS.includes(name)) return true;
  const lower = name.toLowerCase();
  return PARENT_MARKER_EXTS.some((ext) => lower.endsWith(ext));
}

export type DirContext = {
  /** Name of the directory that contains the candidate ("" at the archive root). */
  parentName: string;
  /** File names directly inside the parent directory (only markers are required). */
  parentFiles: Iterable<string>;
  /** Marker files (from CHILD_MARKERS) that exist directly inside the candidate. */
  childFiles: Iterable<string>;
};

function hasAny(names: Iterable<string>, wanted: string[]): boolean {
  const set = new Set(wanted);
  for (const n of names) if (set.has(n)) return true;
  return false;
}

function hasExt(names: Iterable<string>, exts: string[]): boolean {
  for (const n of names) {
    const lower = n.toLowerCase();
    if (exts.some((e) => lower.endsWith(e))) return true;
  }
  return false;
}

/** Name-only check: always-excluded directory names and suffixes. */
export function isAlwaysExcludedDir(name: string): boolean {
  return DEFAULT_EXCLUDES.has(name) || EXCLUDE_RULES.dirSuffixes.some((s) => name.endsWith(s));
}

/** Does this directory name have a contextual rule (needs DirContext to decide)? */
export function needsContext(name: string): boolean {
  return CONTEXT_DIRS.has(name);
}

/** Full directory decision. `ctx` may be omitted only for the name-only answer. */
export function shouldSkipDir(name: string, ctx?: DirContext): boolean {
  if (isAlwaysExcludedDir(name)) return true;
  if (!ctx) return false;
  const childFiles = Array.from(ctx.childFiles);
  if (childFiles.includes(EXCLUDE_RULES.venvMarker)) return true;
  const parentFiles = Array.from(ctx.parentFiles);
  for (const rule of EXCLUDE_RULES.contextual) {
    if (rule.dir !== name) continue;
    if (rule.parentHasAny && hasAny(parentFiles, rule.parentHasAny)) return true;
    if (rule.parentHasExt && hasExt(parentFiles, rule.parentHasExt)) return true;
    if (rule.parentNamed !== undefined && rule.parentNamed === ctx.parentName) return true;
    if (rule.childHasAny && hasAny(childFiles, rule.childHasAny)) return true;
  }
  return false;
}

/** File decision (applies to the file's own name only). */
export function shouldSkipFile(name: string): boolean {
  if (FILE_EXCLUDES.has(name)) return true;
  if (name === ".env") return true;
  if (name.startsWith(".env.") && !ENV_KEEP.has(name)) return true;
  return false;
}

/**
 * Index of marker files per directory, for flat path lists (browser webkitdirectory
 * uploads) where we cannot probe the disk. Keys are directory paths joined with "/"
 * relative to the archive root ("" = root).
 */
export type MarkerIndex = Map<string, Set<string>>;

export function buildMarkerIndex(relativeFilePaths: Iterable<string[]>): MarkerIndex {
  const idx: MarkerIndex = new Map();
  for (const parts of relativeFilePaths) {
    const name = parts[parts.length - 1];
    if (!name || !isContextMarkerFile(name)) continue;
    const dir = parts.slice(0, -1).join("/");
    let set = idx.get(dir);
    if (!set) idx.set(dir, (set = new Set()));
    set.add(name);
  }
  return idx;
}

/**
 * Decide a file given its path relative to the archive root (root folder name NOT
 * included). Every ancestor directory is checked with full context from `markers`.
 */
export function shouldSkipRelativeFile(
  parts: string[],
  markers: MarkerIndex = new Map(),
  skip: SkipList = EMPTY_SKIP,
): boolean {
  if (!parts.length) return true;
  for (let i = 0; i < parts.length - 1; i++) {
    const name = parts[i]!;
    if (isAlwaysExcludedDir(name)) return true;
    if (skipMatches(skip, parts.slice(0, i + 1), true)) return true;
    const parentKey = parts.slice(0, i).join("/");
    const selfKey = parts.slice(0, i + 1).join("/");
    if (
      shouldSkipDir(name, {
        parentName: i === 0 ? "" : parts[i - 1]!,
        parentFiles: markers.get(parentKey) ?? [],
        childFiles: markers.get(selfKey) ?? [],
      })
    ) {
      return true;
    }
  }
  return shouldSkipFile(parts[parts.length - 1]!) || skipMatches(skip, parts, false);
}
