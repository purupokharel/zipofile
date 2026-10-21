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
    zipMs: 2100,
    zipSizeBytes: 24_600_000,
  },
  {
    id: "sample-api",
    name: "Python API",
    sourcePath: "~/Projects/python-api",
    zipPath: "",
    zippedAt: "2026-03-12T09:05:00.000Z",
    zipMs: 800,
    zipSizeBytes: 8_200_000,
  },
  {
    id: "sample-dashboard",
    name: "React Dashboard",
    sourcePath: "~/Projects/react-dashboard",
    zipPath: "",
    zippedAt: "2026-03-10T18:40:00.000Z",
    zipMs: 4200,
    zipSizeBytes: 142_000_000,
  },
  {
    id: "sample-mobile",
    name: "Flutter App",
    sourcePath: "~/Projects/flutter-app",
    zipPath: "",
    zippedAt: "2026-03-08T11:15:00.000Z",
    zipMs: 3100,
    zipSizeBytes: 89_400_000,
  },
  {
    id: "sample-docs",
    name: "Docs Site",
    sourcePath: "~/Projects/docs-site",
    zipPath: "",
    zippedAt: "2026-03-05T16:30:00.000Z",
    zipMs: 1200,
    zipSizeBytes: 12_100_000,
  },
  {
    id: "sample-cli",
    name: "CLI Toolkit",
    sourcePath: "~/Projects/cli-toolkit",
    zipPath: "",
    zippedAt: "2026-03-04T08:00:00.000Z",
    zipMs: 650,
    zipSizeBytes: 4_800_000,
  },
  {
    id: "sample-go",
    name: "Go Microservice",
    sourcePath: "~/Projects/go-microservice",
    zipPath: "",
    zippedAt: "2026-03-03T14:22:00.000Z",
    zipMs: 900,
    zipSizeBytes: 6_300_000,
  },
  {
    id: "sample-landing",
    name: "Landing Page",
    sourcePath: "~/Projects/landing-page",
    zipPath: "",
    zippedAt: "2026-03-02T19:10:00.000Z",
    zipMs: 1100,
    zipSizeBytes: 9_500_000,
  },
  {
    id: "sample-monorepo",
    name: "Monorepo",
    sourcePath: "~/Projects/monorepo",
    zipPath: "",
    zippedAt: "2026-03-01T10:45:00.000Z",
    zipMs: 5800,
    zipSizeBytes: 210_000_000,
  },
  {
    id: "sample-rust",
    name: "Rust CLI",
    sourcePath: "~/Projects/rust-cli",
    zipPath: "",
    zippedAt: "2026-02-28T17:00:00.000Z",
    zipMs: 1400,
    zipSizeBytes: 11_200_000,
  },
];

export const WEB_SAMPLE_ARCHIVE_TOTAL_BYTES = WEB_SAMPLE_ARCHIVES.reduce((n, a) => n + a.zipSizeBytes, 0);
