import type { ZipProgress } from "../types";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatDuration(ms: number): string {
  const n = Math.max(0, ms);
  if (n < 1000) return `${(n / 1000).toFixed(1)}s`;
  const s = Math.floor(n / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${(s % 60).toString().padStart(2, "0")}s`;
  return `${s}s`;
}

/** Measured STORE vs `zip -r -0` on the About example (~6.5×). */
export const ZIP_STORE_SPEEDUP = 6.5;

export function timeSavedMs(zipMs: number): number {
  return Math.max(0, zipMs) * (ZIP_STORE_SPEEDUP - 1);
}

export function lifetimeSavedMs(rows: { zipMs?: number }[]): number {
  return rows.reduce((n, p) => n + timeSavedMs(p.zipMs ?? 0), 0);
}

export function lifetimeArchiveBytes(rows: { zipSizeBytes?: number }[]): number {
  return rows.reduce((n, p) => n + (p.zipSizeBytes ?? 0), 0);
}

export function formatSavedOver(savedMs: number, totalBytes: number): string {
  const s = Math.max(0, Math.floor(savedMs / 1000));
  const m = Math.floor(s / 60);
  return `${m}m ${(s % 60).toString().padStart(2, "0")}s saved over ${formatBytes(totalBytes)}`;
}

/** Shown on stats / preview cards — time not archive size. */
export function formatTimeSavedVsZip(savedMs: number): string {
  return `${formatDuration(savedMs)} Saved vs Zip -r -0`;
}

export function etaFromRate(done: number, total: number | null, elapsedMs: number): number | null {
  if (!total || done <= 0 || done >= total) return null;
  const rate = done / elapsedMs;
  if (rate <= 0) return null;
  return (total - done) / rate;
}

export const initialZipProgress = (): ZipProgress => ({
  phase: "picking",
  filesDone: 0,
  filesTotal: null,
  bytesDone: 0,
  elapsedMs: 0,
  etaMs: null,
});
