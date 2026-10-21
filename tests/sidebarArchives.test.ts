import { describe, expect, it } from "vitest";
import { SIDEBAR_RECENT_COUNT, sidebarArchiveEntries, sidebarArchiveRatio } from "../src/lib/sidebarArchives";
import type { ProjectEntry } from "../src/types";

const mk = (id: string, name: string): ProjectEntry => ({
  id,
  name,
  sourcePath: "/x",
  zipPath: "/z",
  zippedAt: "2026-01-01T00:00:00.000Z",
});

describe("sidebarArchives", () => {
  it("shows recent count ratio", () => {
    expect(sidebarArchiveRatio(5, 10)).toBe("5/10");
    expect(sidebarArchiveRatio(3, 3)).toBe("3/3");
  });
  it("lists recent then all A–Z when expanded", () => {
    const all = Array.from({ length: 10 }, (_, i) => mk(`a${i}`, `Project ${9 - i}`));
    expect(sidebarArchiveEntries(all, false).length).toBe(SIDEBAR_RECENT_COUNT);
    const expanded = sidebarArchiveEntries(all, true);
    expect(expanded.length).toBe(10);
    expect(expanded.map((p) => p.name)).toEqual(
      [...all].sort((a, b) => a.name.localeCompare(b.name)).map((p) => p.name),
    );
  });
});
