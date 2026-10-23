import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

describe("obfuscated mail", () => {
  it("does not ship a plain hello@ address in frontend sources", () => {
    const files = [
      "src/lib/obfuscatedMail.ts",
      "src/components/ObfuscatedMailLink.tsx",
      "src/components/CommunityStats.tsx",
      "src/content/footerSheets.ts",
    ];
    for (const f of files) {
      const text = readFileSync(join(ROOT, f), "utf8");
      expect(text.toLowerCase()).not.toContain("hello@zipofile.com");
      expect(text).not.toMatch(/mailto:hello/i);
    }
  });
});
