import type { ProjectEntry } from "../types";

export const SIDEBAR_RECENT_COUNT = 5;

export function sidebarArchiveEntries(
  all: ProjectEntry[],
  expanded: boolean,
): ProjectEntry[] {
  if (expanded) {
    return [...all].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }
  return all.slice(0, SIDEBAR_RECENT_COUNT);
}

export function sidebarArchiveRatio(shown: number, total: number): string {
  if (total <= 0) return "";
  return `${shown}/${total}`;
}
