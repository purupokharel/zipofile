export const isTauri = () => {
  if (typeof window === "undefined") return false;
  const g = globalThis as typeof globalThis & { isTauri?: boolean };
  return g.isTauri === true || "__TAURI_INTERNALS__" in window;
};
