import { describe, expect, it, vi } from "vitest";
import { SITE_ORIGIN } from "../src/content/downloads";
import { compareDisplayVersions, checkForNewerRelease, fetchSiteReleaseVersion } from "../src/lib/updateCheck";

describe("compareDisplayVersions", () => {
  it("orders major.minor releases", () => {
    expect(compareDisplayVersions("2.1", "2.2")).toBe(-1);
    expect(compareDisplayVersions("2.2", "2.1")).toBe(1);
    expect(compareDisplayVersions("2.1", "2.1")).toBe(0);
  });
});

describe("fetchSiteReleaseVersion", () => {
  it("reads version from zipofile.com release.json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: "2.2" }),
      }),
    );
    await expect(fetchSiteReleaseVersion()).resolves.toBe("2.2");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`${SITE_ORIGIN}/downloads/release.json`), {
      cache: "no-store",
    });
    vi.unstubAllGlobals();
  });
});

describe("checkForNewerRelease", () => {
  it("returns remote version when newer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: "2.2" }),
      }),
    );
    await expect(checkForNewerRelease("2.1")).resolves.toBe("2.2");
    await expect(checkForNewerRelease("2.2")).resolves.toBeNull();
    vi.unstubAllGlobals();
  });
});
