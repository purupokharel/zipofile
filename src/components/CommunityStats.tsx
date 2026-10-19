import { useEffect, useState } from "react";
import { fetchSiteStats, millionGoal, type SiteStats } from "../lib/downloadStats";
import { formatBytes } from "../lib/zipProgress";

type PreviewArchivesToggle = {
  count: number;
  totalBytes: number;
  open: boolean;
  onToggle: () => void;
};

export function CommunityStats({ previewArchives }: { previewArchives?: PreviewArchivesToggle }) {
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchSiteStats().then((s) => {
        if (!cancelled && s) setStats(s);
      });
    };
    load();
    const t = window.setInterval(load, 30_000);
    const onDl = () => {
      window.setTimeout(load, 600);
    };
    window.addEventListener("zipofile-download", onDl);
    return () => {
      cancelled = true;
      clearInterval(t);
      window.removeEventListener("zipofile-download", onDl);
    };
  }, []);

  const downloads = stats?.downloads ?? 0;
  const { label: goal, pct } = millionGoal(downloads);

  return (
    <div className={`web-stats${previewArchives ? " web-stats-3" : ""}`} aria-label="Community impact">
      <article className="web-stat card">
        <p className="web-stat-label"><span className="macos">macOS</span> App Downloads</p>
        <p className="web-stat-value">{downloads.toLocaleString()}</p>
        <p className="web-stat-sub web-stat-goal-line">
          <span className="web-stat-track" aria-hidden="true">
            <span className="web-stat-fill" style={{ width: `${pct}%` }} />
          </span>
          <span className="web-stat-goal">{goal}</span>
        </p>
      </article>
      {previewArchives && (
        <button
          type="button"
          className={`web-stat card web-stat-toggle${previewArchives.open ? " on" : ""}`}
          aria-pressed={previewArchives.open}
          onClick={previewArchives.onToggle}
        >
          <p className="web-stat-label">Recent Archives</p>
          <p className="web-stat-value">{previewArchives.count.toLocaleString()}</p>
          <p className="web-stat-sub">
            {formatBytes(previewArchives.totalBytes)} saved
            {previewArchives.open ? " · showing preview" : " · tap to preview list"}
          </p>
        </button>
      )}
    </div>
  );
}
