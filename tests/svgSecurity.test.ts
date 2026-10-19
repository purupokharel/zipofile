import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertSafePublicSvg } from "../src/lib/safeSvg";
import { ZIPOFI_MARK_PATH } from "../src/lib/zipofiMarkPath";

const svgPath = join(import.meta.dirname, "../public/assets/img/zipofi.svg");

describe("public SVG assets", () => {
  it("zipofi.svg is minimal and passes safety checks", () => {
    const raw = readFileSync(svgPath, "utf8");
    assertSafePublicSvg(raw);
    expect(raw).toContain(ZIPOFI_MARK_PATH.slice(0, 40));
    expect(raw).not.toMatch(/<script/i);
  });
});
