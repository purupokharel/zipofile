import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AUTO_APP_VERSION, DOWNLOADS } from "../content/downloads";
import { FOOTER_SHEET_COPY, type FooterSheetId } from "../content/footerSheets";
import { BottomSheet } from "./BottomSheet";
import { IconApple } from "./icons";
import { ObfuscatedMailLink } from "./ObfuscatedMailLink";
import { SheetMarkdown } from "./SheetMarkdown";
import { fetchSiteStats, millionGoal, recordAppDownload, type SiteStats } from "../lib/downloadStats";
import { DISPLAY_VERSION_EVENT, fetchPublishedVersion, formatPublicVersion } from "../lib/displayVersion";
import { safeAppPath } from "../lib/safeUrl";
import { formatTimeSavedVsZip } from "../lib/zipProgress";

type PreviewArchivesToggle = {
  count: number;
  totalSavedMs: number;
  open: boolean;
  onToggle: () => void;
};

export function CommunityStats({ previewArchives }: { previewArchives?: PreviewArchivesToggle }) {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [version, setVersion] = useState(AUTO_APP_VERSION);
  const [infoSheet, setInfoSheet] = useState<FooterSheetId | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchPublishedVersion().then((v) => {
        if (!cancelled) setVersion(v);
      });
    };
    load();
    const t = window.setInterval(load, 30_000);
    window.addEventListener(DISPLAY_VERSION_EVENT, load);
    return () => {
      cancelled = true;
      clearInterval(t);
      window.removeEventListener(DISPLAY_VERSION_EVENT, load);
    };
  }, []);

  const downloads = stats?.downloads ?? 0;
  const { pct } = millionGoal(downloads);
  const mac = DOWNLOADS.find((d) => d.available && d.id === "macos");
  const macHref = mac && mac.available ? safeAppPath(mac.href) : null;
  const releaseTitle = `What's New in v${formatPublicVersion(version)}`;
  const sheetTitle = infoSheet === "release" ? releaseTitle : infoSheet ? FOOTER_SHEET_COPY[infoSheet].title : "";

  return (
    <>
      <div className={`web-stats${previewArchives ? " web-stats-3" : ""}`} aria-label="Community impact">
        <button
          type="button"
          className={`web-stat card web-stat-toggle${infoSheet === "downloads" ? " on" : ""}`}
          aria-pressed={infoSheet === "downloads"}
          onClick={() => setInfoSheet((s) => (s === "downloads" ? null : "downloads"))}
        >
          <p className="web-stat-label" title="ZipoFile Community">ZipoFile Community</p>
          <p className="web-stat-value">{downloads.toLocaleString()}</p>
          <p className="web-stat-sub web-stat-goal-line">
            <progress className="web-stat-track" max={100} value={pct} aria-label="Community download progress" />
          </p>
        </button>
        {previewArchives && (
          <button
            type="button"
            className={`web-stat card web-stat-toggle${previewArchives.open ? " on" : ""}`}
            aria-pressed={previewArchives.open}
            onClick={previewArchives.onToggle}
          >
            <p className="web-stat-label" title="Recent Archives">Recent Archives</p>
            <p className="web-stat-value">{previewArchives.count.toLocaleString()}</p>
            <p className="web-stat-sub" title={formatTimeSavedVsZip(previewArchives.totalSavedMs)}>
              {formatTimeSavedVsZip(previewArchives.totalSavedMs)}
              {previewArchives.open ? " · Preview on" : " · Tap to preview"}
            </p>
          </button>
        )}
        <button
          type="button"
          className={`web-stat card web-stat-toggle${infoSheet === "release" ? " on" : ""}`}
          aria-pressed={infoSheet === "release"}
          onClick={() => setInfoSheet((s) => (s === "release" ? null : "release"))}
        >
          <p className="web-stat-label" title="What's New">What's New</p>
          <p className="web-stat-value">v{formatPublicVersion(version)}</p>
          <p className="web-stat-sub" title="Extract, Finder, and Trash on every row · Tap for highlights">
            Extract, Finder, and Trash on every row · Tap for highlights
          </p>
        </button>
      </div>

      {createPortal(
        <BottomSheet open={infoSheet !== null} title={sheetTitle} onClose={() => setInfoSheet(null)}>
          {infoSheet === "downloads" && (
            <>
              <SheetMarkdown body={FOOTER_SHEET_COPY.downloads.body} />
              <div className="footer-sheet-actions">
                {macHref && (
                  <a className="btn primary dl-mac" href={macHref} download onClick={() => recordAppDownload()}>
                    <IconApple /> Download
                  </a>
                )}
                <ObfuscatedMailLink />
              </div>
            </>
          )}
          {infoSheet === "release" && <SheetMarkdown body={FOOTER_SHEET_COPY.release.body} />}
        </BottomSheet>,
        document.body,
      )}
    </>
  );
}
