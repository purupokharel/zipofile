import { version } from "../../package.json";
import { versionedDmgFileName } from "../lib/dmgName";

/** Desktop builds offered in the Download menu. The version is read from package.json at
 * build time (scripts/bump-version.mjs keeps it in step with tauri.conf.json; tests check). */
/** Build-time version from package.json (updater, releases). */
export const AUTO_APP_VERSION: string = version;
/** @deprecated use display version in UI; kept for tests. */
export const APP_VERSION: string = version;
/** Public site the desktop app opens for downloads (the app has no local /downloads). */
export const SITE_ORIGIN = "https://zipofile.com";
export const GITHUB_REPO_URL = "https://github.com/purupokharel/zipofile";

export type DownloadItem =
  | { id: string; label: string; href: string; note: string; available: true }
  | { id: string; label: string; available: false };

export const DOWNLOADS: DownloadItem[] = [
  {
    id: "macos",
    label: "macOS App",
    href: `/downloads/${versionedDmgFileName(version)}?v=${version}`,
    note: "Intel & Apple Silicon",
    available: true,
  },
  { id: "linux", label: "Linux (planned)", available: false },
  { id: "windows", label: "Windows (planned)", available: false },
];
