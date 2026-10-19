import type { ZipProgress } from "../types";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m}m ${r.toString().padStart(2, "0")}s`;
  return `${r}s`;
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
