import { describe, expect, it } from "vitest";
import { stampCacheVerHtml } from "../scripts/apply-cache-ver.mjs";

describe("cache ver stamp", () => {
  it("adds ?v= to vite hashed assets in dist index", () => {
    const html =
      '<script type="module" crossorigin src="/assets/index-SSQKpKQo.js"></script>\n' +
      '<link rel="stylesheet" crossorigin href="/assets/index-9992zIfn.css">';
    const out = stampCacheVerHtml(html, 11);
    expect(out).toContain('/assets/index-SSQKpKQo.js?v=11');
    expect(out).toContain('/assets/index-9992zIfn.css?v=11');
  });

  it("stamps schema.json", () => {
    expect(stampCacheVerHtml('<script type="application/ld+json" src="/schema.json"></script>', 18)).toContain(
      'src="/schema.json?v=18"',
    );
  });
});

