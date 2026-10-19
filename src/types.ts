export type ProjectEntry = {
  id: string;
  name: string;
  sourcePath: string;
  zipPath: string;
  zippedAt: string;
  /** "Also skip" patterns used for this archive. */
  skip?: string[];
  blobUrl?: string;
};

export type SheetId = "about" | "terms" | "privacy" | "developer" | null;

export type ZipPhase = "picking" | "scanning" | "zipping" | "saving" | "done";

export type ZipProgress = {
  phase: ZipPhase;
  filesDone: number;
  filesTotal: number | null;
  bytesDone: number;
  elapsedMs: number;
  etaMs: number | null;
  folderName?: string;
  folderPath?: string;
  archiveName?: string;
  detail?: string;
};
