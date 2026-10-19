import { CHILD_MARKERS, isAlwaysExcludedDir, shouldSkipDir, shouldSkipFile } from "./excludes";
import { EMPTY_SKIP, IGNORE_FILE, parseIgnoreFile, skipMatches, type SkipList } from "./skipList";

type DirHandle = FileSystemDirectoryHandle & {
  values?: () => AsyncIterable<FileSystemHandle>;
  entries?: () => AsyncIterable<[string, FileSystemHandle]>;
};

export type WalkScan = { files: number; bytes: number };

type PermHandle = FileSystemDirectoryHandle & {
  queryPermission?: (o: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: "read" }) => Promise<PermissionState>;
};

async function ensureRead(handle: FileSystemDirectoryHandle) {
  const h = handle as PermHandle;
  const opts = { mode: "read" as const };
  if (h.queryPermission) {
    const q = await h.queryPermission(opts);
    if (q !== "granted" && h.requestPermission) {
      const r = await h.requestPermission(opts);
      if (r !== "granted") throw new Error("Folder read permission denied.");
    }
  }
}

async function* children(handle: DirHandle): AsyncGenerator<FileSystemHandle> {
  if (handle.values) {
    for await (const entry of handle.values()) yield entry;
    return;
  }
  if (handle.entries) {
    for await (const [, entry] of handle.entries()) yield entry;
    return;
  }
  throw new Error("This browser cannot read folders. Use Chrome or Edge.");
}

async function childMarkers(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const found: string[] = [];
  for (const marker of CHILD_MARKERS) {
    try {
      await dir.getFileHandle(marker);
      found.push(marker);
    } catch {
      /* not present */
    }
  }
  return found;
}

/**
 * Walk a directory handle (Chromium showDirectoryPicker path). Excluded directories are
 * never descended into, which is what makes this path fast on huge trees.
 */
export async function walkDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  prefix: string[],
  rootName: string,
  onFile: (path: string, file: File, scan: WalkScan) => void | Promise<void>,
  scan: WalkScan = { files: 0, bytes: 0 },
  skip: SkipList = EMPTY_SKIP,
): Promise<WalkScan> {
  if (!prefix.length) await ensureRead(handle);
  const h = handle as DirHandle;

  const files: FileSystemFileHandle[] = [];
  const dirs: FileSystemDirectoryHandle[] = [];
  for await (const entry of children(h)) {
    if (entry.kind === "directory") dirs.push(entry as FileSystemDirectoryHandle);
    else files.push(entry as FileSystemFileHandle);
  }
  const fileNames = files.map((f) => f.name);
  const parentName = prefix.length ? prefix[prefix.length - 1]! : "";

  for (const fh of files) {
    if (shouldSkipFile(fh.name)) continue;
    if (skipMatches(skip, [...prefix, fh.name], false)) continue;
    const file = await fh.getFile();
    scan.files += 1;
    scan.bytes += file.size;
    await onFile(`${rootName}/${[...prefix, fh.name].join("/")}`, file, scan);
  }

  for (const dh of dirs) {
    if (isAlwaysExcludedDir(dh.name)) continue;
    if (skipMatches(skip, [...prefix, dh.name], true)) continue; // skip list: never enumerated
    const markers = await childMarkers(dh);
    if (shouldSkipDir(dh.name, { parentName, parentFiles: fileNames, childFiles: markers })) continue;
    await walkDirectoryHandle(dh, [...prefix, dh.name], rootName, onFile, scan, skip);
  }
  return scan;
}

/** Read `.zipofiignore` at the picked folder's root, if present (invalid lines ignored). */
export async function readIgnoreFromHandle(handle: FileSystemDirectoryHandle): Promise<SkipList> {
  try {
    const fh = await handle.getFileHandle(IGNORE_FILE);
    return parseIgnoreFile(await (await fh.getFile()).text());
  } catch {
    return EMPTY_SKIP;
  }
}
