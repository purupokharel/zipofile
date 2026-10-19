import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DOWNLOADS, SITE_ORIGIN } from "../content/downloads";
import { recordAppDownload } from "../lib/downloadStats";
import { isTauri } from "../lib/platform";
import { safeAppPath, safeExternalHref } from "../lib/safeUrl";
import { IconDownload } from "./icons";

export function DownloadMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const items = () =>
    Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const close = useCallback((focusButton: boolean) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open]);

  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list[list.length - 1]?.focus();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <div className="dl-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="foot-dl-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKey}
      >
        <span className="foot-icon" aria-hidden>
          <IconDownload />
        </span>
        <span className="foot-link-label">Download</span>
      </button>
      {open && (
        <div className="dl-popup" role="menu" id={menuId} aria-label="Download ZipoFile" onKeyDown={onMenuKey}>
          {DOWNLOADS.map((d) => {
            if (!d.available) {
              return (
              <span key={d.id} role="menuitem" tabIndex={-1} aria-disabled="true" className="dl-item dl-disabled">
                <span className="dl-label">{d.label}</span>
              </span>
              );
            }
            const path = safeAppPath(d.href);
            if (!path) return null;
            return (
              <a
                key={d.id}
                role="menuitem"
                tabIndex={-1}
                className="dl-item"
                href={path}
                download
                onClick={(e) => {
                  close(false);
                  if (!isTauri()) {
                    recordAppDownload();
                    return;
                  }
                  e.preventDefault();
                  const url = safeExternalHref(new URL(path, SITE_ORIGIN).href);
                  if (!url) return;
                  void import("@tauri-apps/api/core").then(({ invoke }) => invoke("open_external", { url }));
                }}
              >
                <span className="dl-label">{d.label}</span>
                <span className="dl-note">{d.note}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
