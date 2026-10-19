import { describe, expect, it } from "vitest";
import { millionGoal } from "../src/lib/downloadStats";

describe("millionGoal", () => {
  it("targets 1 Million until the first million minutes", () => {
    expect(millionGoal(0)).toEqual({ label: "1 Million", pct: 0 });
    expect(millionGoal(500_000)).toEqual({ label: "1 Million", pct: 50 });
    expect(millionGoal(999_999)).toEqual({ label: "1 Million", pct: 100 });
  });

  it("shows N Million + and fills toward the next million", () => {
    expect(millionGoal(1_000_000)).toEqual({ label: "1 Million +", pct: 0 });
    expect(millionGoal(1_500_000)).toEqual({ label: "1 Million +", pct: 50 });
    expect(millionGoal(2_000_000)).toEqual({ label: "2 Million +", pct: 0 });
    expect(millionGoal(2_750_000)).toEqual({ label: "2 Million +", pct: 75 });
  });
});
