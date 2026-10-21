import { describe, expect, it } from "vitest";
import { formatPublicVersion, isValidDisplayVersion, resolveDisplayVersion } from "../src/lib/displayVersion";

describe("display version", () => {
  it("uses auto when override is empty", () => {
    expect(resolveDisplayVersion("1.5", null)).toBe("1.5");
    expect(resolveDisplayVersion("1.5", "")).toBe("1.5");
    expect(resolveDisplayVersion("1.0.11", null)).toBe("2.1");
  });
  it("uses custom override when set", () => {
    expect(resolveDisplayVersion("1.5", "1.0")).toBe("1.0");
  });
  it("maps legacy three-part versions to major.minor", () => {
    expect(formatPublicVersion("1.0.0")).toBe("1.0");
    expect(formatPublicVersion("1.0.9")).toBe("1.9");
    expect(formatPublicVersion("1.0.10")).toBe("2.0");
    expect(formatPublicVersion("1.0.11")).toBe("2.1");
    expect(formatPublicVersion("2.1")).toBe("2.1");
  });
  it("accepts two- or three-part versions", () => {
    expect(isValidDisplayVersion("1.0")).toBe(true);
    expect(isValidDisplayVersion("1.0.5")).toBe(true);
    expect(isValidDisplayVersion("1")).toBe(false);
  });
});
