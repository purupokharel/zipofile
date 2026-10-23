import { useEffect, useRef } from "react";
import { useMotionOpen } from "../lib/motionOpen";
import { IconClose } from "./icons";

type Props = {
  open: boolean;
  title: string;
  wide?: boolean;
  panelClassName?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ open, title, wide, panelClassName, onClose, children }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const { mounted, active } = useMotionOpen(open, panelRef);

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
        className={`bottom-sheet-panel${wide ? " bottom-sheet-panel-wide" : ""}${panelClassName ? ` ${panelClassName}` : ""}`}
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
