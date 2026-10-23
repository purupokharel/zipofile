import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = {
  className?: string;
  measureKey?: string | number | boolean;
  /** Target height when `measureKey` is false (collapse while content may still be expanded). */
  collapseHeight?: number | null;
  onCollapseTransitionEnd?: () => void;
  children: React.ReactNode;
};

export function CollapsibleHeight({
  className,
  measureKey,
  collapseHeight,
  onCollapseTransitionEnd,
  children,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const lockedRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const shell = shellRef.current;
    if (!inner || !shell) return;

    const measure = () => inner.getBoundingClientRect().height;
    const target = measureKey ? measure() : (collapseHeight ?? measure());

    const animateTo = (next: number) => {
      const from = lockedRef.current ?? shell.getBoundingClientRect().height;
      if (Math.abs(from - next) < 0.5) {
        lockedRef.current = next;
        setHeight(next);
        return;
      }
      lockedRef.current = from;
      setHeight(from);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lockedRef.current = next;
          setHeight(next);
        });
      });
    };

    animateTo(target);

    const ro = new ResizeObserver(() => {
      if (measureKey) animateTo(measure());
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, [measureKey, collapseHeight]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || measureKey) return;
    const onEnd = (e: TransitionEvent) => {
      if (e.target !== shell || e.propertyName !== "height") return;
      onCollapseTransitionEnd?.();
    };
    shell.addEventListener("transitionend", onEnd);
    return () => shell.removeEventListener("transitionend", onEnd);
  }, [measureKey, onCollapseTransitionEnd]);

  const shell = `motion-collapse${height != null ? " ready" : ""}${className ? ` ${className}` : ""}`;

  return (
    <div ref={shellRef} className={shell} style={height != null ? { height } : undefined}>
      <div ref={innerRef} className="motion-collapse-inner">{children}</div>
    </div>
  );
}
