import { version } from "../../package.json";

/** Desktop builds offered in the Download menu. The version is read from package.json at
 * build time (scripts/bump-version.mjs keeps it in step with tauri.conf.json; tests check). */
/** Build-time version from package.json (updater, releases). */
export const AUTO_APP_VERSION: string = version;
/** @deprecated use display version in UI; kept for tests. */
export const APP_VERSION: string = version;
/** Public site the desktop app opens for downloads (the app has no local /downloads). */
export const SITE_ORIGIN = "https://zipofi.com";

export type DownloadItem =
  | { id: string; label: string; href: string; note: string; available: true }
  | { id: string; label: string; available: false };

export const DOWNLOADS: DownloadItem[] = [
  {
    id: "macos",
    label: "macOS App",
    href: "/downloads/ZipoFile.dmg",
    note: "Intel & Apple Silicon",
    available: true,
  },
  { id: "linux", label: "Linux (planned)", available: false },
  { id: "windows", label: "Windows (planned)", available: false },
];
