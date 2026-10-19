import { useEffect, useRef, useState } from "react";
import type { ZipProgress } from "../types";
import { formatBytes, formatDuration } from "../lib/zipProgress";

type Props = { progress: ZipProgress | null; active: boolean };

const STEPS = ["scanning", "zipping", "saving"] as const;
const LABEL = { scanning: "Scanning", zipping: "Archiving", saving: "Finishing", done: "Complete" } as const;

function useElapsed(active: boolean, baseMs: number) {
  const start = useRef(0);
  const [t, setT] = useState(baseMs);
  useEffect(() => {
    if (!active) return;
    start.current = Date.now() - baseMs;
    setT(baseMs);
    const id = window.setInterval(() => setT(Date.now() - start.current), 1000);
    return () => clearInterval(id);
  }, [active, baseMs]);
  return t;
}

export function ZipProgressBar({ progress, active }: Props) {
  const elapsed = useElapsed(active && !!progress, progress?.elapsedMs ?? 0);
  if (!active || !progress) return null;
  const picking = progress.phase === "picking";
  const { filesDone, filesTotal: total, bytesDone } = progress;
  const pct = total ? Math.min(100, Math.round((filesDone / total) * 100)) : null;
  const idx = STEPS.indexOf(progress.phase as (typeof STEPS)[number]);
  const rate = elapsed > 1500 && bytesDone ? `${formatBytes(bytesDone / (elapsed / 1000))}/s` : null;

  return (
    <section className="card progress" aria-live="polite">
      <div className="progress-top">
        <div className="progress-title">
          <strong title={progress.folderPath}>{picking ? "Waiting for folder" : (progress.folderName ?? "Archive")}</strong>
          <span>
            {picking
              ? "Choose a folder in the system dialog."
              : (progress.detail ?? (progress.archiveName ? `${progress.archiveName}.zip` : LABEL[progress.phase as keyof typeof LABEL]))}
          </span>
        </div>
        <div className="progress-pct">{picking ? "" : pct !== null ? `${pct}%` : "…"}</div>
      </div>
      <div className={`meter${pct === null ? " indeterminate" : ""}`} role="progressbar" aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
        <i style={pct !== null ? { width: `${pct}%` } : undefined} />
      </div>
      {!picking && (
        <>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s} className={i < idx || progress.phase === "done" ? "done" : i === idx ? "now" : ""}>
                {LABEL[s]}
              </li>
            ))}
          </ol>
          <dl className="stats">
            <div><dt>Files</dt><dd>{filesDone.toLocaleString()}{total != null ? ` of ${total.toLocaleString()}` : ""}</dd></div>
            <div><dt>Size</dt><dd>{formatBytes(bytesDone)}</dd></div>
            <div><dt>Elapsed</dt><dd>{formatDuration(elapsed)}</dd></div>
            <div><dt>Remaining</dt><dd>{progress.etaMs != null ? `~${formatDuration(progress.etaMs)}` : "—"}</dd></div>
            {rate && <div><dt>Speed</dt><dd>{rate}</dd></div>}
          </dl>
        </>
      )}
    </section>
  );
}
