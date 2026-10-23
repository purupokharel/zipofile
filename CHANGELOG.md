# Changelog

All notable changes to ZipoFile (macOS app and [zipofile.com](https://zipofile.com)) are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Version numbers match public releases and `package.json`.

When you ship a build, add a dated section at the top (under `[Unreleased]` if needed) and paste the highlights into the GitHub release notes.

## [Unreleased]

## [2.1] - 2026-10-21

### Added
- Footer info sheets on the web preview: download milestone & feedback (obfuscated contact), and release highlights on the stats cards.
- Persistent macOS download counter on the server (`api/data/`), excluded from deploy overwrites.
- Sidebar **Archives** on desktop: recent list, A–Z expand, spotlight sync with the main list.
- Sample archive demo on zipofile.com with animated preview toggle and community stats (time saved vs `zip -r -0`).

### Changed
- Public version **2.1** across site UI, release metadata, and desktop bundle semver **2.1.0**.
- Site UI polish: card surfaces, search width, GitHub header link, gray/dark theme tokens for window chrome.
- Safer publish checks (`check:publish`) and DMG version matching for deploy.

## [2.0] - 2026-10-20

### Added
- **Extract**, **Show in Finder**, and **Trash** on every archive row in the app and web preview.
- In-app **Archives** sidebar (Tauri) with expand/collapse and row spotlight.
- Community stats row on zipofile.com: macOS download count with million-download goal meter.

### Changed
- Major UI pass aligned with native macOS chrome (traffic lights, top-right actions, bottom sheets).
- README, Open Graph image, and product copy for the public GitHub repository.

## [1.9] - 2026-10-19

### Added
- Published SHA-256 for the DMG in `release.json` and checksum UI next to download controls.
- Share sheet and GitHub link in the app title bar; native share on macOS where available.

### Fixed
- Deploy pipeline uploads `index.html` and updater feed last; verify step checks live DMG and archive hashes.

## [1.8] - 2026-10-10

### Added
- Zip progress bar with phase, file count, and ETA during archive writes.
- Refresh / interrupted-archive warning when quitting mid-zip.

### Changed
- Stronger Content-Security-Policy, `X-Frame-Options`, and HSTS on the static site.

## [1.7] - 2026-09-28

### Added
- `.zipofiignore` support and optional per-archive **Also skip** patterns (validated, capped).
- Trash confirmation sheet before removing an archive.

## [1.6] - 2026-09-15

### Added
- **Support** (developer) sheet with Buy Me a Coffee and contact paths.
- Download menu in the sidebar footer (macOS + planned platforms).

### Changed
- About, Terms, and Privacy sheets expanded for signing, notarization, and update behavior.

## [1.5] - 2026-09-01

### Added
- Tauri in-app updater: signature-verified installs and restart prompt.
- `latest.json` / `release.json` feed on zipofile.com for version and source-hash checks.

## [1.4] - 2026-08-18

### Added
- Universal macOS build (Intel and Apple Silicon) in a single DMG.
- Developer ID signing and Apple notarization with stapled tickets.

## [1.3] - 2026-08-04

### Added
- Stack-aware default excludes (Node, Python, Rust, Java, mobile, VCS, editors).
- Conditional skips (`vendor`, `bin`/`obj`, Go `vendor/modules.txt`, etc.).

## [1.2] - 2026-07-22

### Added
- Archive list metadata: zip duration and custom exclusion count in the UI.
- Search across archive names in the main list.

### Changed
- Store-mode ZIP (no compression) for faster writes and predictable output.

## [1.1] - 2026-07-08

### Added
- Automatic update check on launch against zipofile.com (from this release onward).
- Public download counter API (`download-count.php`) with rate limiting.

## [1.0] - 2026-06-24

### Added
- First public ZipoFile macOS app: pick a project folder, write a local `.zip`, skip common dependency and cache folders.
- Archives list with date; extract to a chosen folder; local storage under Application Support.
- zipofile.com product site with download page and in-browser UI preview (no browser-side zipping).

[2.1]: https://github.com/purupokharel/zipofile/compare/v2.0...v2.1
[2.0]: https://github.com/purupokharel/zipofile/compare/v1.9...v2.0
[1.9]: https://github.com/purupokharel/zipofile/compare/v1.8...v1.9
[1.8]: https://github.com/purupokharel/zipofile/compare/v1.7...v1.8
[1.7]: https://github.com/purupokharel/zipofile/compare/v1.6...v1.7
[1.6]: https://github.com/purupokharel/zipofile/compare/v1.5...v1.6
[1.5]: https://github.com/purupokharel/zipofile/compare/v1.4...v1.5
[1.4]: https://github.com/purupokharel/zipofile/compare/v1.3...v1.4
[1.3]: https://github.com/purupokharel/zipofile/compare/v1.2...v1.3
[1.2]: https://github.com/purupokharel/zipofile/compare/v1.1...v1.2
[1.1]: https://github.com/purupokharel/zipofile/compare/v1.0...v1.1
[1.0]: https://github.com/purupokharel/zipofile/releases/tag/v1.0
