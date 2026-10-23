# ZipoFile

**ZipoFile** is a macOS application that builds a `.zip` archive of a project folder while skipping common dependency, cache, build, version-control, and editor directories. The product website is [zipofile.com](https://zipofile.com). Current public release version: **2.1**.

| Resource | URL |
| -------- | --- |
| Website (UI preview, docs, download page) | [zipofile.com](https://zipofile.com) |
| macOS installer & release notes | [GitHub Releases](https://github.com/purupokharel/zipofile/releases) · [CHANGELOG](CHANGELOG.md) · [Case study](casestudy.md) |
| Latest macOS build (when published) | `ZipoFile_v2_1.dmg` — universal (Intel and Apple Silicon) |

![ZipoFile](public/Screenshot.png)

## What this repository is

This repository contains the **source for the ZipoFile website and shared UI** (React, TypeScript, Vite). It is the code that powers [zipofile.com](https://zipofile.com), including the in-browser **preview** of the app interface, download metadata under `/downloads`, and product documentation shown in the app sheets.

The **native macOS application** is distributed as signed, notarized builds attached to [GitHub Releases](https://github.com/purupokharel/zipofile/releases). The Tauri/Rust desktop project and release automation scripts are maintained separately and are **not** part of this public tree. Issues and discussions here should focus on the website, documentation accuracy, and release artifacts published on this repo.

## What ZipoFile does (macOS app)

- You choose a folder on your Mac; ZipoFile writes a `.zip` to local app storage under `~/Library/Application Support/com.zipofi.app/archives/`.
- Built-in rules skip folders such as `node_modules`, `.git`, `target`, `dist`, virtual environments, and similar paths, plus `.env` files (while keeping common `.env.example`-style templates).
- Optional per-archive skip patterns and `.zipofiignore` add more exclusions.
- Archives are stored **uncompressed** (ZIP store method) with modification times preserved for speed and predictable output.
- **Archives** in the app lists each archive with date and zip duration; you can **Extract**, **Show in Finder**, or **Trash** an entry.
- On launch, the app may check [zipofile.com](https://zipofile.com) for updates; installed updates are signature-verified before restart.

**zipofile.com does not read your project folders or create zip files in the browser.** The site demonstrates the UI and links to the macOS download.

## Responsible use

Use ZipoFile only on folders and projects you are allowed to copy and share. Do not use it to distribute malware, infringing material, or content that violates applicable law or third-party rights. Archives intentionally omit many credential files (such as `.env`); always verify an archive before deleting originals or sharing it.

## Privacy (summary)

- **macOS app:** Project files are processed on your Mac. They are not uploaded to zipofile.com as part of archiving. The app may contact zipofile.com for version/update information.
- **Website:** Serves static pages, download files, and public counters (for example, download counts). Standard web server logs may apply. See the Privacy sheet in the app or on the site for full text.

## Folders skipped by default (overview)

Rules match names at any depth unless a condition is noted. This is a summary; the in-app **About** sheet is authoritative.

| Area | Examples skipped |
| ---- | ---------------- |
| JavaScript / Node | `node_modules`, `dist`, `build`, `.next`, `.nuxt`, `.svelte-kit`, `.turbo`, `.nx`, … |
| Python | `venv`, `.venv`, `__pycache__`, `.pytest_cache`, `*.egg-info`, folders containing `pyvenv.cfg`, … |
| Rust / Java / mobile | `target`, Gradle/CocoaPods build dirs, Flutter/Dart tool caches, … |
| VCS / editors | `.git`, `.hg`, `.svn`, `.vscode`, `.idea` |
| Conditional | e.g. `vendor` (Go/PHP), `bin`/`obj` (.NET), `bundle` (Ruby) when marker files are present |

Project config such as `.github`, `.gitignore`, and `.eslintrc` is **kept**. The folder you pick is always included even if its name matches a skip rule.

## Files always skipped

- `.env` and `.env.*` except templates like `.env.example`, `.env.sample`, `.env.template`, `.env.dist`
- `.DS_Store`, `Thumbs.db`, `desktop.ini`

## Custom skip list

In **New Archive**, optional **Also skip** patterns apply on top of built-in rules (one pattern per line or comma-separated). Path rules, globs, and `.zipofiignore` in the project folder follow the rules documented in the app **About** sheet (max 100 patterns, no `..`, no drive letters).

## Storage and safety (macOS)

- Archive list metadata: `projects.json` in `~/Library/Application Support/com.zipofi.app/`.
- **Extract** writes only inside the folder you choose; symlink targets are not followed into the archive.
- Symbolic links in the source tree are not stored.

## macOS download

Releases are published on [GitHub Releases](https://github.com/purupokharel/zipofile/releases). Builds are Developer ID–signed and notarized for Gatekeeper. macOS may still prompt once when opening software downloaded from the internet.

Windows and Linux builds are listed as planned in the Download menu; none are shipped yet.

## Build the website locally

Requires Node.js and npm.

```bash
npm install
ZIPOFI_ALLOW_STALE_DMG=1 npm run build   # skip stale-DMG check if no local release DMG
npm run preview
```

Other useful scripts:

```bash
npm run dev          # Vite dev server
npm run typecheck    # TypeScript (app + tests)
npm test             # Vitest
```

To build the macOS app, use the maintainer release workflow (not included in this repository).

## Measured example (macOS)

**Same ~1.23 GB project (verified October 2026):** mixed Python / Next.js / PHP / HTML — ZipoFile **under one second** on **Apple Silicon** and **Intel Mac** (about the same). macOS **Compress** on that folder: **~12 seconds** (Apple Silicon), **~one minute** (Intel).

**Intel iMac (warm cache):** 641 MB test tree (534k files, mostly small logs):

| Scenario | Approx. time | Notes |
| -------- | ------------ | ----- |
| ZipoFile, default rules | ~15 s | Skipped 99% of excluded bulk; archive ~679 MB |
| ZipoFile + skip path for log folder | ~6 s | Fewer files read |
| `zip -r -0` on full tree | ~1.5 min | Larger archive (~863 MB) |

Results vary by disk, cache state, and project layout. The app UI estimates time saved versus `zip -r -0` using an internal factor; treat it as an illustration, not a guarantee.

## Author

Puru Pokharel — [zipofile.com](https://zipofile.com) · [Developer site](https://purul.link/)

## Legal

Use of the macOS app and zipofile.com is subject to the **Terms** and **Privacy** content shipped in the product. This README is descriptive documentation only and does not replace those terms.
