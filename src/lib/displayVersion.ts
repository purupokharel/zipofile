import { AUTO_APP_VERSION } from "../content/downloads";

export const DISPLAY_VERSION_EVENT = "zipofile-display-version";
const VERSION_JSON = "/app-version.json";
const LATEST_URL = "/downloads/latest.json";
const VERSION_RE = /^\d+\.\d+(\.\d+)?$/;

/** Public labels: major.minor only (legacy 1.0.N → 1.N or 2.0 after 1.0.10). */
export function formatPublicVersion(v: string): string {
  const s = v.trim();
  const two = /^(\d+)\.(\d+)$/.exec(s);
  if (two) return s;
  const leg = /^(\d+)\.(\d+)\.(\d+)$/.exec(s);
  if (leg && leg[2] === "0") {
    const patch = Number(leg[3]);
    return `${Number(leg[1]) + Math.floor(patch / 10)}.${patch % 10}`;
  }
  return s;
}

export type DisplayVersionState = {
  auto: string;
  override: string | null;
  display: string;
};

export function resolveDisplayVersion(auto: string, override: string | null | undefined): string {
  const o = override?.trim();
  const raw = o ? o : auto;
  return formatPublicVersion(raw);
}

export function isValidDisplayVersion(v: string): boolean {
  return VERSION_RE.test(v.trim());
}

/** Live macOS release version from the updater feed; falls back to display version. */
export async function fetchPublishedVersion(): Promise<string> {
  try {
    const r = await fetch(`${LATEST_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { version?: string };
      const v = j.version?.trim();
      if (v && isValidDisplayVersion(v)) return formatPublicVersion(v);
    }
  } catch {
    /* offline or feed missing */
  }
  return (await fetchDisplayVersion()).display;
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

