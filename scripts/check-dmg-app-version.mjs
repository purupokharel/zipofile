#!/usr/bin/env node
import { appVersionMatchesRelease, normalizeVersion } from "./bump-version.mjs";

const display = process.argv[2];
const bundle = process.argv[3];
if (!display || !bundle) {
  console.error("usage: check-dmg-app-version.mjs <release-display-version> <CFBundleShortVersionString>");
  process.exit(2);
}
if (!appVersionMatchesRelease(display, bundle)) {
  const want = normalizeVersion(display);
  console.error(`The app inside the DMG is v${bundle}, expected v${want} (bundle semver ${want}.0).`);
  process.exit(1);
}
