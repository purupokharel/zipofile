import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { recordAppDownload } from "../lib/downloadStats";
import { fetchDisplayVersion } from "../lib/displayVersion";
import { resolveMacDownloadUrl } from "../lib/macDownloadUrl";
import { isTauri } from "../lib/platform";
import { safeExternalHref } from "../lib/safeUrl";
import { AUTO_APP_VERSION } from "../content/downloads";
import { updateHighlights } from "../content/updateSheets";
import { checkForNewerRelease, fetchSiteReleaseVersion } from "../lib/updateCheck";
import { BottomSheet } from "./BottomSheet";
import { IconApple, IconNotify } from "./icons";

/** `?notifyUpdate=2.1` or `localStorage zipofile-notify-update` forces the badge for UI testing. */
function testNotifyVersion(): string | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("notifyUpdate");
  if (q === "1" || q === "true") return AUTO_APP_VERSION;
  if (q?.trim()) return q.trim();
  try {
    return localStorage.getItem("zipofile-notify-update");
  } catch {
    return null;
  }
}

function openLatestMacDownload() {
  void resolveMacDownloadUrl().then((raw) => {
    const url = safeExternalHref(raw);
    if (!url) return;
    if (isTauri()) {
      void import("@tauri-apps/api/core").then(({ invoke }) => invoke("open_external", { url }));
      return;
    }
    recordAppDownload();
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}

export function UpdateNotifyButton() {
  const [available, setAvailable] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const forced = testNotifyVersion();
    if (forced) {
      setAvailable(forced);
      return;
    }
    void fetchDisplayVersion().then(async (d) => {
      if (isTauri()) {
        const newer = await checkForNewerRelease(d.display);
        if (!cancelled && newer) setAvailable(newer);
        return;
      }
      const remote = await fetchSiteReleaseVersion();
      if (cancelled) return;
      setAvailable(remote ?? d.display);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = available ? `New V${available} Available` : "Updates";
  const promptTitle = available ? `New V${available} Available` : "";

  return (
    <>
      <button
        type="button"
        className={`side-icon win-notify${available ? " has-update" : ""}`}
        aria-label={label}
        title={label}
        onClick={() => available && setPromptOpen(true)}
      >
        <IconNotify hasUpdate={!!available} />
      </button>
      {available &&
        createPortal(
          <BottomSheet
            open={promptOpen}
            title={promptTitle}
            panelClassName="bottom-sheet-panel-update"
            onClose={() => setPromptOpen(false)}
          >
            <div className="update-sheet">
              <ul className="update-sheet-highlights">
                {updateHighlights(available).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="update-sheet-actions">
                <button
                  type="button"
                  className="btn primary dl-mac"
                  onClick={() => {
                    setPromptOpen(false);
                    openLatestMacDownload();
                  }}
                >
                  <IconApple /> Download
                </button>
              </div>
            </div>
          </BottomSheet>,
          document.body,
        )}
    </>
  );
}
