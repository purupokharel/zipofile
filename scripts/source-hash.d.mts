export const INPUT_DIRS: string[];
export const INPUT_FILES: string[];
export function isInput(rel: string): boolean;
export function inputFiles(root: string): string[];
export function sourceHash(root: string): string;
export function projectRoot(): string;
