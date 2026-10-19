import { DOWNLOADS } from "../content/downloads";
import { recordAppDownload } from "../lib/downloadStats";
import { safeAppPath } from "../lib/safeUrl";

export function WebDemoSheet() {
  const mac = DOWNLOADS.find((d) => d.available && d.id === "macos");
  const href = mac && mac.available ? safeAppPath(mac.href) : null;

  return (
    <div className="web-demo">
      <p className="web-demo-lead">
        This page is the same interface as the ZipoFile macOS app — on purpose. You are looking at how it
        looks and feels after you download and launch the app.
      </p>
      <p>
        We do not archive projects on the web. ZipoFile is a free macOS app for life: fast native zips, smart
        excludes, and archives that stay on your machine.
      </p>
      {href && (
        <a
          className="btn primary web-demo-dl dl-mac"
          href={href}
          download
          onClick={() => recordAppDownload()}
        >
          Download macOS App
        </a>
      )}
      <p className="hint">Intel and Apple Silicon · Signed And Notarized by Apple</p>
    </div>
  );
}
