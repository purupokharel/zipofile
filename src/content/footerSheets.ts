export type FooterSheetId = "downloads" | "release";

export const FOOTER_SHEET_COPY: Record<
  FooterSheetId,
  { title: string; body: string }
> = {
  downloads: {
    title: "ZipoFile Community",
    body: `## You are part of this

The number on the card is how many times the **macOS app** has been downloaded from zipofile.com. Each install is someone archiving real projects on their Mac — not a vanity metric in the browser.

The bar is our shared momentum: it fills as more people pick up ZipoFile and put it to work.

## Try it and stay in touch

Download the universal build, zip a folder you care about, and see how store-mode archiving feels when node_modules, .git, build output, and caches stay out of the zip.

**Feedback** below opens your mail app with the subject **ZipoFile Feedback**. Bugs, ideas, and “this saved me time” notes all help the next release.`,
  },
  release: {
    title: "Release highlights",
    body: `## Performance and polish

- Up to **30% faster archiving** on typical project folders, plus UI refinements and minor bug fixes

## Archives and actions

- Sidebar **Archives**: recent list, full A–Z expand, and spotlight sync with the main list
- **Extract**, **Show in Finder**, and **Trash** on every archive row

## macOS app

- Universal **Intel and Apple Silicon** build, Developer ID signed and notarized
- In-app updates with signature verification before restart
- Store-mode ZIP (uncompressed) with smart default excludes and optional per-archive skip rules

## zipofile.com

- Live desktop preview, community download stats, sample archive demo, and release metadata under /downloads`,
  },
};
