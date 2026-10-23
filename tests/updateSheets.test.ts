import { describe, expect, it } from "vitest";
import { updateHighlights } from "../src/content/updateSheets";

describe("updateHighlights", () => {
  it("returns version-specific bullets", () => {
    expect(updateHighlights("2.1").length).toBeGreaterThan(0);
    expect(updateHighlights("2.1").some((line) => line.includes("Archives"))).toBe(true);
  });

  it("falls back for unknown versions", () => {
    expect(updateHighlights("0.0").length).toBeGreaterThan(0);
  });
});
