/** https/http only; blocks javascript:, data:, protocol tricks, and embedded credentials. */
export function safeExternalHref(raw: string): string | null {
  const input = raw.trim();
  if (!input || /[\u0000-\u001f\u007f]/.test(input)) return null;
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  return parsed.href;
}

/** Same-origin path for downloads and static assets (no open redirects). */
export function safeAppPath(raw: string): string | null {
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(path) || path.includes("..")) return null;
  return path;
}

export const externalLinkRel = "noopener noreferrer" as const;

/** Canonical public repo link for header/footer (https + fixed path only). */
export const ZIPOFILE_GITHUB_REPO = "https://github.com/purupokharel/zipofile";

export function safeGitHubRepoHref(raw: string = ZIPOFILE_GITHUB_REPO): string | null {
  const href = safeExternalHref(raw);
  if (!href) return null;
  const u = new URL(href);
  if (u.hostname !== "github.com") return null;
  const path = u.pathname.replace(/\/+$/, "").toLowerCase();
  if (path !== "/purupokharel/zipofile") return null;
  return ZIPOFILE_GITHUB_REPO;
}
