import type { ProjectEntry, ZipProgress } from "../types";
import { etaFromRate, initialZipProgress } from "./zipProgress";
import { isTauri } from "./platform";
import { buildMarkerIndex, shouldSkipRelativeFile } from "./excludes";
import { buildStoreZipParts, readZip, type StoreEntry } from "./zipCore";
import { fromStored, safeArchiveFileName, sortNewestFirst, toStored, type StoredProject } from "./projectStore";
import { readIgnoreFromHandle, walkDirectoryHandle } from "./dirWalk";
import { IGNORE_FILE, mergeSkip, parseIgnoreFile, parseSkipList, type SkipList } from "./skipList";

const DB_NAME = "zipofi";
const STORE = "projects";
const SCAN_UI_MS = 200;
/** Yield to the page about every 50 ms (time-based, so huge folders do not pay a fixed
 * per-yield timer cost thousands of times). */
const YIELD_MS = 50;
/** Files read at the same time while building the archive. */
const READ_CONCURRENCY = 16;

type ProgressFn = (p: ZipProgress) => void;
type ZipEntry = { path: string; file: File };

/** List label and zip stem when the name field is left blank. */
export function archiveNameFromFolder(displayName: string, folderName: string): string {
  const custom = displayName.trim();
  if (custom) return custom;
  const fromFolder = folderName.trim();
  return fromFolder || "project";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

async function webList(): Promise<ProjectEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = sortNewestFirst(req.result as StoredProject[]);
      resolve(rows.map((r) => fromStored(r, (b) => URL.createObjectURL(b))));
    };
    req.onerror = () => reject(req.error);
  });
}

async function webSave(entry: ProjectEntry, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(toStored(entry, blob));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function emit(
  onProgress: ProgressFn | undefined,
  base: ZipProgress,
  patch: Partial<ZipProgress>,
): ZipProgress {
  const next: ZipProgress = {
    ...base,
    ...patch,
    etaMs:
      patch.etaMs !== undefined
        ? patch.etaMs
        : etaFromRate(
            patch.filesDone ?? base.filesDone,
            patch.filesTotal !== undefined ? patch.filesTotal : base.filesTotal,
            patch.elapsedMs ?? base.elapsedMs,
          ),
  };
  onProgress?.(next);
  return next;
}

async function yieldMain() {
  await new Promise<void>((r) => setTimeout(r, 0));
}

type PickedFolder =
  | { mode: "handle"; handle: FileSystemDirectoryHandle; rootName: string }
  | { mode: "webkit"; files: File[]; rootName: string };

async function collectFromWebkit(
  files: File[],
  rootName: string,
  skip: SkipList,
  onProgress: ProgressFn | undefined,
  state: ZipProgress,
  started: number,
): Promise<{ entries: ZipEntry[]; state: ZipProgress }> {
  const entries: ZipEntry[] = [];
  let bytes = 0;
  let s = state;
  const total = files.length;
  let lastUi = 0;
  // Paths relative to the picked folder (root name stripped), computed once.
  const relParts = files.map((file) => {
    const rel = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
    const parts = rel.split("/").filter(Boolean);
    return parts.length > 1 && parts[0] === rootName ? parts.slice(1) : parts;
  });
  const markers = buildMarkerIndex(relParts);
  const ignoreIdx = relParts.findIndex((p) => p.length === 1 && p[0] === IGNORE_FILE);
  const fullSkip = ignoreIdx >= 0 ? mergeSkip(skip, parseIgnoreFile(await files[ignoreIdx]!.text())) : skip;
  let lastYield = Date.now();
  for (let i = 0; i < total; i++) {
    const file = files[i]!;
    const inner = relParts[i]!;
    if (!inner.length || shouldSkipRelativeFile(inner, markers, fullSkip)) continue;
    entries.push({ path: `${rootName}/${inner.join("/")}`, file });
    bytes += file.size;
    const now = Date.now();
    if (now - lastUi >= SCAN_UI_MS || i === total - 1) {
      lastUi = now;
      s = emit(onProgress, s, {
        phase: "scanning",
        filesDone: i + 1,
        filesTotal: total,
        bytesDone: bytes,
        elapsedMs: now - started,
        detail:
          `Filtering the browser's file list: ${entries.length.toLocaleString()} files kept so far.`,
      });
    }
    if (now - lastYield >= YIELD_MS) {
      lastYield = now;
      await yieldMain();
    }
  }
  return { entries, state: s };
}

async function collectFromHandle(
  handle: FileSystemDirectoryHandle,
  rootName: string,
  skip: SkipList,
  onProgress: ProgressFn | undefined,
  state: ZipProgress,
  started: number,
): Promise<{ entries: ZipEntry[]; state: ZipProgress }> {
  const entries: ZipEntry[] = [];
  let s = state;
  let lastYield = 0;
  const fullSkip = mergeSkip(skip, await readIgnoreFromHandle(handle));
  await walkDirectoryHandle(handle, [], rootName, async (path, file, scan) => {
    entries.push({ path, file });
    const now = Date.now();
    if (scan.files === 1 || now - lastYield >= YIELD_MS) {
      lastYield = now;
      s = emit(onProgress, s, {
        phase: "scanning",
        filesDone: scan.files,
        filesTotal: null,
        bytesDone: scan.bytes,
        elapsedMs: Date.now() - started,
        detail: "Reading the folder. Nothing inside excluded folders is read.",
      });
      await yieldMain();
    }
  }, { files: 0, bytes: 0 }, fullSkip);
  return { entries, state: s };
}

async function buildZipBlob(
  entries: ZipEntry[],
  onProgress: ProgressFn | undefined,
  state: ZipProgress,
  started: number,
): Promise<{ blob: Blob; state: ZipProgress }> {
  const total = entries.length;
  const out: StoreEntry[] = new Array(total);
  let bytesDone = 0;
  let filesDone = 0;
  let next = 0;
  let lastUi = 0;

  // Read up to READ_CONCURRENCY files at once; order in the archive stays the walk order.
  const worker = async () => {
    while (next < total) {
      const i = next++;
      const { path, file } = entries[i]!;
      const data = new Uint8Array(await file.arrayBuffer());
      out[i] = { path, data, mtime: file.lastModified };
      bytesDone += data.byteLength;
      filesDone++;
      const now = Date.now();
      if (now - lastUi >= YIELD_MS || filesDone === total) {
        lastUi = now;
        state = emit(onProgress, state, {
          phase: "zipping",
          filesDone,
          filesTotal: total,
          bytesDone,
          elapsedMs: now - started,
          detail: "Reading files into the archive (store mode).",
        });
        await yieldMain();
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(READ_CONCURRENCY, total) }, worker));

  state = emit(onProgress, state, {
    phase: "saving",
    filesDone: total,
    filesTotal: total,
    bytesDone,
    elapsedMs: Date.now() - started,
    detail: "Writing the archive (store mode, no compression).",
  });
  await yieldMain();

  const parts = buildStoreZipParts(out);
  const blob = new Blob(parts as BlobPart[], { type: "application/zip" });
  return { blob, state };
}

async function saveEntry(
  name: string,
  rootName: string,
  skipLines: string[],
  blob: Blob,
  onProgress: ProgressFn | undefined,
  state: ZipProgress,
  started: number,
  filesTotal: number,
): Promise<ProjectEntry> {
  const blobUrl = URL.createObjectURL(blob);
  const entry: ProjectEntry = {
    id: crypto.randomUUID(),
    name,
    sourcePath: rootName,
    zipPath: safeArchiveFileName(name),
    zippedAt: new Date().toISOString(),
    skip: skipLines,
    zipMs: Date.now() - started,
    zipSizeBytes: blob.size,
    blobUrl,
  };
  emit(onProgress, state, {
    phase: "done",
    filesDone: filesTotal,
    filesTotal,
    bytesDone: state.bytesDone,
    elapsedMs: Date.now() - started,
    detail: "Archive saved to your list.",
  });
  await webSave(entry, blob);
  return entry;
}

async function runWebArchive(
  picked: PickedFolder,
  displayName: string,
  skipLines: string[],
  onProgress?: ProgressFn,
): Promise<ProjectEntry> {
  const name = archiveNameFromFolder(displayName, picked.rootName);
  const parsed = parseSkipList(skipLines);
  if (parsed.errors.length) throw new Error(parsed.errors.join("\n"));
  const skip = parsed.list;
  const started = Date.now();
  const folderPath =
    picked.mode === "handle"
      ? picked.rootName
      : `Selected folder: ${picked.rootName}`;
  const startDetail =
    picked.mode === "handle"
      ? "Reading the folder. Nothing inside excluded folders is read."
      : "The browser has listed every file in the folder. Applying the exclusion list.";

  let state = emit(onProgress, initialZipProgress(), {
    phase: "scanning",
    filesDone: 0,
    filesTotal: null,
    bytesDone: 0,
    elapsedMs: 0,
    folderName: picked.rootName,
    folderPath,
    archiveName: name,
    detail: startDetail,
  });

  let collected: { entries: ZipEntry[]; state: ZipProgress };
  if (picked.mode === "handle") {
    collected = await collectFromHandle(picked.handle, picked.rootName, skip, onProgress, state, started);
  } else {
    collected = await collectFromWebkit(picked.files, picked.rootName, skip, onProgress, state, started);
  }
  const entries = collected.entries;
  state = collected.state;

  if (!entries.length) {
    throw new Error(
      "Nothing to archive: every file in this folder is on the exclusion list or the skip list (see About).",
    );
  }

  state = emit(onProgress, state, {
    phase: "zipping",
    filesDone: 0,
    filesTotal: entries.length,
    bytesDone: 0,
    elapsedMs: Date.now() - started,
  });

  const packed = await buildZipBlob(entries, onProgress, state, started);
  return saveEntry(name, picked.rootName, parsed.lines, packed.blob, onProgress, packed.state, started, entries.length);
}

export async function listProjects(): Promise<ProjectEntry[]> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<ProjectEntry[]>("list_projects");
  }
  return webList();
}

export async function removeProject(entry: ProjectEntry): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("remove_project", { id: entry.id });
    return;
  }
  if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(entry.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function pickWebkitFolder(displayName: string, skipLines: string[], onProgress?: ProgressFn): Promise<ProjectEntry> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    input.multiple = true;
    (input as HTMLInputElement & { directory?: boolean }).directory = true;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;opacity:0";
    document.body.appendChild(input);

    const cleanup = () => input.remove();
    const fail = (err: unknown) => {
      cleanup();
      reject(err instanceof Error ? err : new Error("No folder selected."));
    };
    const succeed = (entry: ProjectEntry) => {
      cleanup();
      resolve(entry);
    };

    input.addEventListener(
      "change",
      () => {
        const files = Array.from(input.files ?? []);
        if (!files.length) {
          fail(new Error("No folder selected."));
          return;
        }
        const picker = (
          window as Window & {
            showDirectoryPicker?: (o?: { mode?: "read" }) => Promise<FileSystemDirectoryHandle>;
          }
        ).showDirectoryPicker;
        if (files.length > 100_000 && picker) {
          fail(
            new Error(
              "This folder has more than 100,000 files. Pick it again with the folder picker in Chrome or Edge, which skips excluded folders without reading them.",
            ),
          );
          return;
        }
        const rel = (files[0]!.webkitRelativePath || files[0]!.name).replace(/\\/g, "/");
        const rootName = (rel.split("/")[0] ?? "").trim() || "project";
        void runWebArchive({ mode: "webkit", files, rootName }, displayName, skipLines, onProgress)
          .then(succeed)
          .catch(fail);
      },
      { once: true },
    );
    input.addEventListener("cancel", () => fail(new Error("No folder selected.")), { once: true });
    input.click();
  });
}

function zipProjectWeb(displayName: string, skipLines: string[], onProgress?: ProgressFn): Promise<ProjectEntry> {
  onProgress?.({
    ...initialZipProgress(),
    phase: "picking",
    detail: "Choose a folder in the system dialog.",
  });

  const nativePicker = (
    window as Window & {
      showDirectoryPicker?: (o?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;

  if (nativePicker) {
    return nativePicker({ mode: "read" })
      .then((handle) =>
        runWebArchive(
          { mode: "handle", handle, rootName: handle.name?.trim() || "project" },
          displayName,
          skipLines,
          onProgress,
        ),
      )
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          throw new Error("No folder selected.");
        }
        if (err instanceof Error) throw err;
        throw new Error("Could not read the selected folder.");
      });
  }

  return pickWebkitFolder(displayName, skipLines, onProgress);
}

/** Validate the "Also skip" field before opening a folder picker. */
export function validateSkipField(lines: string[]): string[] {
  return parseSkipList(lines).errors;
}

export function zipProjectFromPicker(
  displayName: string,
  skipLines: string[],
  onProgress?: ProgressFn,
): Promise<ProjectEntry> {
  const parsed = parseSkipList(skipLines);
  if (parsed.errors.length) return Promise.reject(new Error(parsed.errors.join("\n")));
  if (isTauri()) {
    return zipProjectTauri(displayName, parsed.lines, onProgress);
  }
  return zipProjectWeb(displayName, parsed.lines, onProgress);
}

async function zipProjectTauri(
  displayName: string,
  skipLines: string[],
  onProgress?: ProgressFn,
): Promise<ProjectEntry> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");
    const { listen } = await import("@tauri-apps/api/event");

    const started = Date.now();
    const selected = await open({ directory: true, multiple: false, title: "Select project folder" });
    if (!selected || Array.isArray(selected)) {
      throw new Error("No folder selected.");
    }

    const unlisten = await listen<ZipProgress>("zip-progress", (ev) => {
      onProgress?.({ ...ev.payload, elapsedMs: Date.now() - started });
    });

    const folderName = selected.split(/[/\\]/).filter(Boolean).pop() ?? "project";
    const archiveName = archiveNameFromFolder(displayName, folderName);

    try {
      emit(onProgress, initialZipProgress(), {
        phase: "zipping",
        folderName,
        folderPath: selected,
        archiveName,
        detail: "Writing archive on disk (native app).",
        elapsedMs: 0,
      });
      const entry = await invoke<ProjectEntry>("add_and_zip_project", {
        sourcePath: selected,
        displayName: displayName.trim() || null,
        skip: skipLines,
      });
      onProgress?.({
        phase: "done",
        filesDone: 0,
        filesTotal: 0,
        bytesDone: 0,
        elapsedMs: Date.now() - started,
        etaMs: null,
      });
      return entry;
    } finally {
      unlisten();
    }
  }
  throw new Error("Tauri only.");
}

export async function unzipProject(entry: ProjectEntry): Promise<void> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");
    const dest = await open({ directory: true, multiple: false, title: "Choose unzip destination" });
    if (!dest || Array.isArray(dest)) {
      throw new Error("No destination selected.");
    }
    await invoke("unzip_project", { id: entry.id, destPath: dest });
    return;
  }
  if (!entry.blobUrl) throw new Error("Archive missing.");
  const res = await fetch(entry.blobUrl);
  const buf = new Uint8Array(await res.arrayBuffer());
  const files = await readZip(buf);
  const picker = (window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> })
    .showDirectoryPicker;
  if (!picker) {
    downloadZip(entry);
    throw new Error("This browser cannot write to a folder, so the .zip was downloaded instead. Extract it with your system's unzip tool.");
  }
  const root = await picker();
  for (const [path, data] of Object.entries(files)) {
    if (path.endsWith("/")) continue;
    const parts = path.split("/");
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]!, { create: true });
    }
    const fh = await dir.getFileHandle(parts[parts.length - 1]!, { create: true });
    const w = await fh.createWritable();
    await w.write(data);
    await w.close();
    await yieldMain();
  }
}

export async function downloadZip(entry: ProjectEntry): Promise<void> {
  if (entry.blobUrl) {
    const a = document.createElement("a");
    a.href = entry.blobUrl;
    a.download = entry.zipPath;
    a.click();
    return;
  }
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("reveal_archive_in_finder", { id: entry.id });
  }
}
