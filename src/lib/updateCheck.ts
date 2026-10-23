import { SITE_ORIGIN } from "../content/downloads";
import { formatPublicVersion, isValidDisplayVersion } from "./displayVersion";

export function compareDisplayVersions(installed: string, published: string): number {
  const a = formatPublicVersion(installed).split(".").map((n) => Number(n) || 0);
  const b = formatPublicVersion(published).split(".").map((n) => Number(n) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d < 0) return -1;
    if (d > 0) return 1;
  }
  return 0;
}

export async function fetchSiteReleaseVersion(): Promise<string | null> {
  try {
    const r = await fetch(`${SITE_ORIGIN}/downloads/release.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as { version?: string };
    const v = j.version?.trim();
    if (!v || !isValidDisplayVersion(v)) return null;
    return formatPublicVersion(v);
  } catch {
    return null;
  }
}

/** Returns the live site version when it is newer than `installed`, else null. */
export async function checkForNewerRelease(installed: string): Promise<string | null> {
  const remote = await fetchSiteReleaseVersion();
  if (!remote) return null;
  return compareDisplayVersions(installed, remote) < 0 ? remote : null;
}
