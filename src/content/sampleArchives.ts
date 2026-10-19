import type { ProjectEntry } from "../types";

export type SampleArchiveEntry = ProjectEntry & { zipSizeBytes: number };

/** Web preview only — sidebar submenu + list demo (no real zips in the browser). */
export const WEB_SAMPLE_ARCHIVES: SampleArchiveEntry[] = [
  {
    id: "sample-portfolio",
    name: "Portfolio Site",
    sourcePath: "~/Projects/portfolio-site",
    zipPath: "",
    zippedAt: "2026-03-14T15:20:00.000Z",
    zipSizeBytes: 24_600_000,
  },
  {
    id: "sample-api",
    name: "Python API",
    sourcePath: "~/Projects/python-api",
    zipPath: "",
    zippedAt: "2026-03-12T09:05:00.000Z",
    zipSizeBytes: 8_200_000,
  },
  {
    id: "sample-dashboard",
    name: "React Dashboard",
    sourcePath: "~/Projects/react-dashboard",
    zipPath: "",
    zippedAt: "2026-03-10T18:40:00.000Z",
    zipSizeBytes: 142_000_000,
  },
  {
    id: "sample-mobile",
    name: "Flutter App",
    sourcePath: "~/Projects/flutter-app",
    zipPath: "",
    zippedAt: "2026-03-08T11:15:00.000Z",
    zipSizeBytes: 89_400_000,
  },
  {
    id: "sample-docs",
    name: "Docs Site",
    sourcePath: "~/Projects/docs-site",
    zipPath: "",
    zippedAt: "2026-03-05T16:30:00.000Z",
    zipSizeBytes: 12_100_000,
  },
];

export const WEB_SAMPLE_ARCHIVE_TOTAL_BYTES = WEB_SAMPLE_ARCHIVES.reduce((n, a) => n + a.zipSizeBytes, 0);
