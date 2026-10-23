import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOWNLOAD_COUNT_HEADER, SITE_CSP, SITE_SECURITY_HEADERS } from "../scripts/site-security.mjs";

const ROOT = join(__dirname, "..");

describe("site security headers", () => {
  it("htaccess and _headers ship the live policy", () => {
    const ht = readFileSync(join(ROOT, "public/.htaccess"), "utf8");
    const cf = readFileSync(join(ROOT, "public/_headers"), "utf8");
    for (const [name, value] of Object.entries(SITE_SECURITY_HEADERS)) {
      expect(ht).toContain(name);
      expect(ht).toContain(value);
      expect(cf).toContain(`${name}: ${value}`);
    }
    expect(ht).toContain("frame-ancestors 'none'");
    expect(ht).toContain("Options -Indexes");
    expect(SITE_CSP).toContain("frame-ancestors 'none'");
  });

  it("download counter requires a custom header and rate limit", () => {
    const php = readFileSync(join(ROOT, "public/api/download-count.php"), "utf8");
    const lib = readFileSync(join(ROOT, "public/api/stats-lib.php"), "utf8");
    const apiHt = readFileSync(join(ROOT, "public/api/.htaccess"), "utf8");
    const dataHt = readFileSync(join(ROOT, "public/api/data/.htaccess"), "utf8");
    expect(php).toContain("HTTP_X_ZIPOFILE_DOWNLOAD");
    expect(php).toContain("$max = 8");
    expect(php).toContain("zipofile.com");
    expect(php).toContain("stats-lib.php");
    expect(lib).toContain("/data/download-stats.json");
    expect(lib).toContain("downloads/stats.json");
    expect(php).not.toContain("Access-Control-Allow-Origin");
    expect(apiHt).toContain("Require all denied");
    expect(dataHt).toContain("Require all denied");
    expect(DOWNLOAD_COUNT_HEADER).toBe("X-Zipofile-Download");
  });

  it("deploy rsync keeps server-side download stats off the site bundle", () => {
    const deploy = readFileSync(join(ROOT, "scripts/deploy.sh"), "utf8");
    expect(deploy).toContain("--exclude=/api/data/");
    expect(deploy).toContain("--exclude=/downloads/stats.json");
  });
});
