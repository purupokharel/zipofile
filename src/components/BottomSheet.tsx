import { useEffect } from "react";
import { IconClose } from "./icons";

type Props = {
  open: boolean;
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ open, title, wide, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`drawer-root${open ? " open" : ""}`} aria-hidden={!open}>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className={`drawer${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer-head">
          <div className="drawer-inner">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose} tabIndex={open ? 0 : -1}>
              <IconClose />
            </button>
          </div>
        </header>
        <div className="drawer-body">
          <div className="drawer-inner">{open && children}</div>
        </div>
      </aside>
    </div>
  );
}
