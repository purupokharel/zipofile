import { AUTO_APP_VERSION, SITE_ORIGIN } from "../content/downloads";
import { versionedDmgFileName } from "./dmgName";

type ReleaseFeed = { version?: string; dmg?: string };

/** Live zipofile.com DMG URL (release.json), or build-time fallback when offline. */
export async function resolveMacDownloadUrl(): Promise<string> {
  try {
    const r = await fetch(`${SITE_ORIGIN}/downloads/release.json?t=${Date.now()}`, { cache: "no-store" });
    if (r.ok) {
      const rel = (await r.json()) as ReleaseFeed;
      const dmg = rel.dmg?.trim();
      if (dmg && !dmg.includes("..") && !dmg.includes("/")) {
        const v = rel.version?.trim();
        const q = v ? `?v=${encodeURIComponent(v)}` : "";
        return `${SITE_ORIGIN}/downloads/${dmg}${q}`;
      }
      if (rel.version?.trim()) {
        const v = rel.version.trim();
        return `${SITE_ORIGIN}/downloads/${versionedDmgFileName(v)}?v=${encodeURIComponent(v)}`;
      }
    }
  } catch {
    /* offline */
  }
  const v = AUTO_APP_VERSION;
  return `${SITE_ORIGIN}/downloads/${versionedDmgFileName(v)}?v=${encodeURIComponent(v)}`;
}
