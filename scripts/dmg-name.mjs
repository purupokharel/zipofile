/** @param {string} version */
export function versionedDmgFileName(version) {
  return `ZipoFile_v${String(version).trim().replace(/\./g, "_")}.dmg`;
}
