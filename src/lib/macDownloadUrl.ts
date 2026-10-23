import { AUTO_APP_VERSION, SITE_ORIGIN } from "../content/downloads";
import { versionedDmgFileName } from "./dmgName";

export type ReleaseFeed = { version?: string; dmg?: string; dmgSha256?: string };

const SHA256 = /^[a-f0-9]{64}$/i;

export function parseDmgSha256(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  return SHA256.test(s) ? s : null;
}

export function shortDmgSha256(hex: string): string {
  const s = hex.toLowerCase();
  return `${s.slice(0, 12)}…${s.slice(-8)}`;
}

async function readRelease(signal?: AbortSignal): Promise<ReleaseFeed | null> {
  try {
    const r = await fetch(`/downloads/release.json?t=${Date.now()}`, { cache: "no-store", signal });
    if (!r.ok) return null;
    return (await r.json()) as ReleaseFeed;
  } catch {
    return null;
  }
}

export async function fetchPublishedDmgSha256(signal?: AbortSignal): Promise<string | null> {
  const rel = await readRelease(signal);
  return parseDmgSha256(rel?.dmgSha256);
}

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
