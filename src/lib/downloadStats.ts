export type SiteStats = {
  downloads: number;
  minutesSaved?: number;
  minutesPerDownload?: number;
};

const STATS_URL = "/downloads/stats.json";
const COUNT_URL = "/api/download-count.php";

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

/** Best-effort: live server increments stats.json; local dev may 404. */
export function recordAppDownload(): void {
  void fetch(COUNT_URL, { method: "POST", keepalive: true })
    .then(() => {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("zipofile-download"));
    })
    .catch(() => {});
}

const MILLION = 1_000_000;

/** Progress toward the next million milestone. */
export function millionGoal(n: number): { label: string; pct: number } {
  const saved = Math.max(0, n);
  if (saved < MILLION) {
    return {
      label: "1 Million",
      pct: Math.min(100, Math.round((saved / MILLION) * 100)),
    };
  }
  const millions = Math.floor(saved / MILLION);
  const inTier = saved % MILLION;
  return {
    label: `${millions} Million +`,
    pct: Math.min(100, Math.round((inTier / MILLION) * 100)),
  };
}
