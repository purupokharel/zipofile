import { describe, expect, it } from "vitest";
import { isValidDisplayVersion, resolveDisplayVersion } from "../src/lib/displayVersion";

describe("display version", () => {
  it("uses auto when override is empty", () => {
    expect(resolveDisplayVersion("1.0.5", null)).toBe("1.0.5");
    expect(resolveDisplayVersion("1.0.5", "")).toBe("1.0.5");
  });
  it("uses custom override when set", () => {
    expect(resolveDisplayVersion("1.0.5", "1.0")).toBe("1.0");
  });
  it("accepts two- or three-part versions", () => {
    expect(isValidDisplayVersion("1.0")).toBe(true);
    expect(isValidDisplayVersion("1.0.5")).toBe(true);
    expect(isValidDisplayVersion("1")).toBe(false);
  });
});
