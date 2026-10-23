export function fromLegacyVersion(v: string): string;
export function normalizeVersion(v: string): string;
export function nextPatch(v: string): string;
export function toSemver(displayVersion: string): string;
export function appVersionMatchesRelease(displayVersion: string, bundleVersion: string): boolean;
