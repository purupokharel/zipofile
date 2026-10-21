/** macOS installer filename for a release, e.g. 2.1 → ZipoFile_v2_1.dmg */
export function versionedDmgFileName(version: string): string {
  return `ZipoFile_v${version.trim().replace(/\./g, "_")}.dmg`;
}
