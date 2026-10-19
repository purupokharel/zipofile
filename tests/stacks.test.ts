import { describe, expect, it } from "vitest";
import scenarios from "./exclude-scenarios.json";
import { STACK_SCENARIOS, STACKS } from "../src/content/stacks";

const byName = new Map((scenarios as { scenarios: { stack: string; keep: string[]; drop: string[] }[] }).scenarios.map((s) => [s.stack, s]));

describe("home page 'Exclusion rules for' list is backed by fixtures", () => {
  it.each(STACKS)("%s", (stack) => {
    const names = STACK_SCENARIOS[stack]!;
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) {
      const sc = byName.get(n);
      expect(sc, `scenario ${n}`).toBeDefined();
      expect(sc!.keep.length).toBeGreaterThan(0);
      expect(sc!.drop.length).toBeGreaterThan(0);
    }
  });
});
