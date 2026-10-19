import { AUTO_APP_VERSION } from "../content/downloads";

export const DISPLAY_VERSION_EVENT = "zipofile-display-version";
const VERSION_JSON = "/app-version.json";
const VERSION_RE = /^\d+\.\d+(\.\d+)?$/;

export type DisplayVersionState = {
  auto: string;
  override: string | null;
  display: string;
};

export function resolveDisplayVersion(auto: string, override: string | null | undefined): string {
  const o = override?.trim();
  return o ? o : auto;
}

export function isValidDisplayVersion(v: string): boolean {
  return VERSION_RE.test(v.trim());
}

export async function fetchDisplayVersion(): Promise<DisplayVersionState> {
  const auto = AUTO_APP_VERSION;
  try {
    const r = await fetch(`${VERSION_JSON}?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return { auto, override: null, display: auto };
    const j = (await r.json()) as { override?: string | null };
    const raw = j.override;
    const override =
      raw == null || String(raw).trim() === ""
        ? null
        : isValidDisplayVersion(String(raw))
          ? String(raw).trim()
          : null;
    return { auto, override, display: resolveDisplayVersion(auto, override) };
  } catch {
    return { auto, override: null, display: auto };
  }
}

