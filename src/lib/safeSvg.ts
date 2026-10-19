/** Reject SVG markup that could run script or load external content. For static public assets only. */
const BLOCKED =
  /<script[\s>]|<foreignObject|(?:^|[\s>])on[a-z]+=|javascript:|data:text\/html|<iframe|xlink:href|href\s*=\s*["'][^"']*:/i;

export function assertSafePublicSvg(source: string): void {
  const s = source.trim();
  if (!s.startsWith("<svg") || !s.includes("</svg>")) {
    throw new Error("SVG must be a single root svg element");
  }
  if (BLOCKED.test(s)) throw new Error("SVG contains blocked markup");
  if (/<(?:use|image|feImage)[^>]+(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(s)) {
    throw new Error("SVG must not reference external URLs");
  }
}
