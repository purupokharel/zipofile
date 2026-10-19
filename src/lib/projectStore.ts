import type { ProjectEntry } from "../types";

/** What the web build persists in IndexedDB: the entry plus the archive bytes. */
export type StoredProject = Omit<ProjectEntry, "blobUrl"> & { blob?: Blob };

/** Newest archive first (the table order). */
export function sortNewestFirst<T extends { zippedAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(b.zippedAt).getTime() - new Date(a.zippedAt).getTime());
}

/** Blob URLs die with the tab, so persist the Blob itself, never the URL. */
export function toStored(entry: ProjectEntry, blob: Blob): StoredProject {
  const { blobUrl: _drop, ...rest } = entry;
  void _drop;
  return { ...rest, blob };
}

/** Rehydrate a stored row; a fresh object URL is minted for this session. */
export function fromStored(row: StoredProject & { blobUrl?: string }, makeUrl: (b: Blob) => string): ProjectEntry {
  const { blob, blobUrl: _stale, ...rest } = row;
  void _stale;
  return blob ? { ...rest, blobUrl: makeUrl(blob) } : { ...rest };
}

/** File name for a download: keep it readable but strip path separators/control chars. */
export function safeArchiveFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_")
    .replace(/^\.+/, "")
    .trim();
  return `${cleaned || "project"}.zip`;
}
