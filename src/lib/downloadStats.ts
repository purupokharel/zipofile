export type SiteStats = {
  downloads: number;
  minutesSaved?: number;
  minutesPerDownload?: number;
};

const STATS_URL = "/api/site-stats.php";
const COUNT_URL = "/api/download-count.php";
const COUNT_HEADER = "X-Zipofile-Download";

export async function fetchSiteStats(): Promise<SiteStats | null> {
  try {
    const r = await fetch(`${STATS_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as SiteStats;
    if (typeof j.downloads !== "number") return null;
    return j;
  } catch {
    return null;
  }
}

/** Best-effort: live server increments api/data/download-stats.json; local dev may 404. */
export function recordAppDownload(): void {
  void fetch(COUNT_URL, { method: "POST", keepalive: true, headers: { [COUNT_HEADER]: "1" }, credentials: "same-origin" })
    .then(() => {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("zipofile-download"));
    })
    .catch(() => {});
}

const MILLION = 1_000_000;

/** Progress bar fill toward an internal 1M download tier. */
export function millionGoal(n: number): { pct: number } {
  const saved = Math.max(0, n);
  const inTier = saved % MILLION;
  return {
    pct: Math.min(100, Math.round((inTier / MILLION) * 100)),
  };
}
