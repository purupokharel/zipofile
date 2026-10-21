import { describe, expect, it } from "vitest";
import { millionGoal } from "../src/lib/downloadStats";
import { ZIP_STORE_SPEEDUP, formatDuration, lifetimeSavedMs, timeSavedMs } from "../src/lib/zipProgress";

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

describe("zip time saved", () => {
  it("credits 5.5× zip duration versus store zip -r -0", () => {
    expect(ZIP_STORE_SPEEDUP).toBe(6.5);
    expect(timeSavedMs(15_300)).toBe(15_300 * 5.5);
  });
  it("sums lifetime zipMs and ignores missing times", () => {
    expect(lifetimeSavedMs([{ zipMs: 1000 }, {}, { zipMs: 2000 }])).toBe(timeSavedMs(3000));
  });
  it("formats zip duration for the table", () => {
    expect(formatDuration(800)).toBe("0.8s");
    expect(formatDuration(2100)).toBe("2s");
    expect(formatDuration(62_000)).toBe("1m 02s");
  });
});
