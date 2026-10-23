import { type RefObject, useEffect, useState } from "react";

export const MOTION_MS = 700;

export function useMotionOpen(
  open: boolean,
  exitRef?: RefObject<HTMLElement | null>,
  exitProperty = "transform",
) {
  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(open);

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
    const finish = () => setMounted(false);
    const el = exitRef?.current;
    if (!el) {
      const t = window.setTimeout(finish, MOTION_MS + 80);
      return () => clearTimeout(t);
    }
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === exitProperty) {
        el.removeEventListener("transitionend", onEnd);
        finish();
      }
    };
    el.addEventListener("transitionend", onEnd);
    const t = window.setTimeout(finish, MOTION_MS + 80);
    return () => {
      el.removeEventListener("transitionend", onEnd);
      clearTimeout(t);
    };
  }, [mounted, active, exitProperty, exitRef]);

  return { mounted, active };
}
