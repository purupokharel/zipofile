import { isTauri } from "./platform";

export function initAppTheme(): () => void {
  if (!isTauri()) return () => {};

  const root = document.documentElement;
  let unlisten: (() => void) | undefined;
  let cancelled = false;

  void import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
    if (cancelled) return;
    const win = getCurrentWindow();
    const apply = async () => {
      const theme = await win.theme();
      if (theme === "dark" || theme === "light") root.dataset.theme = theme;
      else root.dataset.theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    };
    await apply();
    unlisten = await win.onThemeChanged(({ payload }) => {
      root.dataset.theme = payload;
    });
  });

  return () => {
    cancelled = true;
    unlisten?.();
    delete root.dataset.theme;
  };
}
