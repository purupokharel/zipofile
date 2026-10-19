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
