import { describe, expect, it } from "vitest";
import { archiveNameFromFolder } from "../src/lib/projects";
import { fromStored, safeArchiveFileName, sortNewestFirst, toStored } from "../src/lib/projectStore";
import type { ProjectEntry } from "../src/types";

const entry = (id: string, zippedAt: string): ProjectEntry => ({
  id,
  name: `P${id}`,
  sourcePath: "proj",
  zipPath: "proj.zip",
  zippedAt,
  blobUrl: "blob:stale",
});

describe("project list logic", () => {
  it("sorts newest first without mutating input", () => {
    const rows = [entry("1", "2026-01-01T00:00:00Z"), entry("2", "2026-03-01T00:00:00Z"), entry("3", "2026-02-01T00:00:00Z")];
    expect(sortNewestFirst(rows).map((r) => r.id)).toEqual(["2", "3", "1"]);
    expect(rows.map((r) => r.id)).toEqual(["1", "2", "3"]);
  });

  it("persists the Blob, never the session-bound blob: URL", () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])]);
    const stored = toStored(entry("1", "2026-01-01T00:00:00Z"), blob);
    expect("blobUrl" in stored).toBe(false);
    expect(stored.blob).toBe(blob);
  });

  it("rehydrates with a fresh URL so Unzip/Download work after reload", () => {
    const blob = new Blob(["x"]);
    const back = fromStored({ ...toStored(entry("1", "2026-01-01T00:00:00Z"), blob), blobUrl: "blob:old" }, () => "blob:new");
    expect(back.blobUrl).toBe("blob:new");
    expect("blob" in back).toBe(false);
  });

  it("legacy rows without a stored Blob drop the dead URL", () => {
    const { blobUrl: _u, ...legacy } = entry("1", "2026-01-01T00:00:00Z");
    void _u;
    const back = fromStored({ ...legacy, blobUrl: "blob:dead" }, () => "blob:new");
    expect(back.blobUrl).toBeUndefined();
  });

  it("uses the folder name when the archive name field is blank", () => {
    expect(archiveNameFromFolder("", "my-repo")).toBe("my-repo");
    expect(archiveNameFromFolder("  ", "my-repo")).toBe("my-repo");
    expect(archiveNameFromFolder("Custom", "my-repo")).toBe("Custom");
  });

  it("archive file names are safe", () => {
    expect(safeArchiveFileName("My App")).toBe("My App.zip");
    expect(safeArchiveFileName("../../etc/passwd")).toBe("_.._etc_passwd.zip");
    expect(safeArchiveFileName("   ")).toBe("project.zip");
    expect(safeArchiveFileName("a:b*c?")).toBe("a_b_c_.zip");
  });
});
