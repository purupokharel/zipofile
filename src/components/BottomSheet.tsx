import { useEffect, useRef, useState } from "react";
import { IconClose } from "./icons";

type Props = {
  open: boolean;
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const SHEET_ANIM_MS = 700;

export function BottomSheet({ open, title, wide, onClose, children }: Props) {
  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(open);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setActive(false);
  }, [open]);

  useEffect(() => {
    if (!mounted || active) return;
    const el = panelRef.current;
    const finish = () => setMounted(false);
    if (!el) {
      finish();
      return;
    }
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === "transform") {
        el.removeEventListener("transitionend", onEnd);
        finish();
      }
    };
    el.addEventListener("transitionend", onEnd);
    const t = window.setTimeout(finish, SHEET_ANIM_MS + 80);
    return () => {
      el.removeEventListener("transitionend", onEnd);
      clearTimeout(t);
    };
  }, [mounted, active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);

  if (!mounted) return null;

  return (
    <div className={`bottom-sheet-root${active ? " open" : ""}`} aria-hidden={!active}>
      <div className="bottom-sheet-scrim" onClick={onClose} />
      <aside
        ref={panelRef}
        className={`bottom-sheet-panel${wide ? " bottom-sheet-panel-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="bottom-sheet-head">
          <div className="bottom-sheet-inner">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <IconClose />
            </button>
          </div>
        </header>
        <div className="bottom-sheet-body">
          <div className="bottom-sheet-inner">{children}</div>
        </div>
      </aside>
    </div>
  );
}
