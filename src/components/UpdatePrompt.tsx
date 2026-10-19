import { useEffect, useState } from "react";
import { isTauri } from "../lib/platform";

/** Desktop app only: on launch, checks the signed update feed; when a newer version
 * has been downloaded and installed, offers a restart. Silent when offline or up to date. */
export function UpdatePrompt() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    (async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (!update || cancelled) return;
        await update.downloadAndInstall();
        if (!cancelled) setReady(true);
      } catch {
        // No network or no feed yet: keep the current version without a message.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return (
    <div className="toast" role="status">
      <span>Update Available, Restart To Update.</span>
      <button
        type="button"
        className="btn primary"
        onClick={() => void import("@tauri-apps/plugin-process").then(({ relaunch }) => relaunch())}
      >
        Restart
      </button>
    </div>
  );
}
