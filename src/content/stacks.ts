/**
 * Stacks named on the home page ("Exclusion rules for"). Each maps to scenarios in
 * tests/exclude-scenarios.json that prove its dependency/build folders are skipped
 * and its source is kept (checked by tests/stacks.test.ts and the Rust suite).
 */
export const STACK_SCENARIOS: Record<string, string[]> = {
  "Node.js": ["Node.js", "Node / React"],
  "Next.js": ["Next.js"],
  Nuxt: ["Nuxt"],
  SvelteKit: ["SvelteKit"],
  Angular: ["Angular"],
  Python: ["Python"],
  Rust: ["Rust"],
  Go: ["Go"],
  Java: ["Java (Maven)", "Java / Gradle / Android"],
  Kotlin: ["Kotlin (Gradle)"],
  Android: ["Android"],
  "Swift / Xcode": ["Swift / Xcode"],
  Flutter: ["Flutter / Dart"],
  PHP: ["PHP"],
  Ruby: ["Ruby"],
  ".NET": [".NET"],
};

export const STACKS = Object.keys(STACK_SCENARIOS);
