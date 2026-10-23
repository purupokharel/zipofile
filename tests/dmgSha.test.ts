import { describe, expect, it } from "vitest";
import { parseDmgSha256, shortDmgSha256 } from "../src/lib/macDownloadUrl";

describe("dmg sha256", () => {
  it("accepts only 64 hex chars", () => {
    const ok = "7ae34b601b96b4f342ad200b33dec63b1c2a54465a065e3f085a99a4f022dd29";
    expect(parseDmgSha256(ok)).toBe(ok);
    expect(parseDmgSha256("nope")).toBeNull();
    expect(parseDmgSha256("../x")).toBeNull();
    expect(shortDmgSha256(ok)).toBe("7ae34b601b96…f022dd29");
  });
});
