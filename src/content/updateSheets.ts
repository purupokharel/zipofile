const BY_VERSION: Record<string, string[]> = {
  "2.2": [
    "Up to 30% faster archiving on typical project folders",
    "UI polish across the app and site, plus minor bug fixes",
    "Update notification when a newer macOS build is on zipofile.com, with direct download",
    "Archives sidebar with smoother expand/collapse and live archive counts",
    "Community stats and release highlights on the zipofile.com preview",
  ],
  "2.1": [
    "Up to 30% faster archiving, with UI polish and minor bug fixes",
    "Archives sidebar: recent list, full A–Z view, and spotlight sync with the main list",
    "zipofile.com community footer, download counter, and sample archive demo",
  ],
  "2.0": [
    "Extract, Show in Finder, and Trash on every archive row",
    "Archives sidebar in the macOS app with expand/collapse",
    "Community download stats on zipofile.com",
  ],
};

const FALLBACK = [
  "Universal macOS build (Intel and Apple Silicon), signed and notarized",
  "Store-mode ZIP with smart default excludes for dependencies and build output",
];

export function updateHighlights(version: string): string[] {
  return BY_VERSION[version] ?? FALLBACK;
}
