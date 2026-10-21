import { describe, expect, it } from "vitest";
import { safeAppPath, safeExternalHref, safeGitHubRepoHref, ZIPOFILE_GITHUB_REPO } from "../src/lib/safeUrl";

describe("safeExternalHref", () => {
  it("allows https URLs", () => {
    expect(safeExternalHref("https://purul.link")).toBe("https://purul.link/");
  });

  it("blocks dangerous schemes", () => {
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHref("data:text/html,x")).toBeNull();
  });

  it("blocks credentials in URL", () => {
    expect(safeExternalHref("https://user:pass@example.com/")).toBeNull();
  });
});

describe("safeGitHubRepoHref", () => {
  it("allows only the ZipoFile repo on github.com", () => {
    expect(safeGitHubRepoHref()).toBe(ZIPOFILE_GITHUB_REPO);
    expect(safeGitHubRepoHref("https://github.com/purupokharel/zipofile/")).toBe(ZIPOFILE_GITHUB_REPO);
    expect(safeGitHubRepoHref("https://evil.com/purupokharel/zipofile")).toBeNull();
    expect(safeGitHubRepoHref("https://github.com/other/zipofile")).toBeNull();
  });
});

describe("safeAppPath", () => {
  it("allows root-relative paths", () => {
    expect(safeAppPath("/downloads/foo.dmg")).toBe("/downloads/foo.dmg");
  });

  it("blocks open redirects and traversal", () => {
    expect(safeAppPath("//evil.com")).toBeNull();
    expect(safeAppPath("/../etc/passwd")).toBeNull();
    expect(safeAppPath("https://evil.com")).toBeNull();
  });
});
