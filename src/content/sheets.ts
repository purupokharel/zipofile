export type SheetContent = { title: string; body: string };

export const SHEETS: Record<Exclude<import("../types").SheetId, null>, SheetContent> = {
  about: {
    title: "About ZipoFile",
    body: `## What ZipoFile does

ZipoFile is a macOS app. It makes a .zip of a project folder and leaves out dependency, cache, build, version-control, and editor folders. Those folders can be recreated from the project's own files (package.json, requirements.txt, Cargo.toml, and so on) and often hold most of a project's files.

zipofile.com is the product site. It shows how the app looks and lets you download it. It does not zip folders in the browser.

## How to use it

- In the macOS app, click **Add Project**.
- Type a project name, or leave it blank to use the folder's name.
- Click **Pick Folder & Archive** and choose the folder.
- The archive is added to **Archives** with its name, the date it was made, and how long the zip took, newest first.

## Folders left out, by stack

Each name below is matched at any depth in the folder. Names without a condition are skipped in every project, whatever its stack.

- **Node.js and other JavaScript projects (React, Vue, Vite, etc.):** node_modules, bower_components, .pnpm-store, dist, build, coverage, .nyc_output, .cache, .parcel-cache
- **Monorepo tools:** .turbo (Turborepo), .nx (Nx)
- **JavaScript frameworks:** .next (Next.js), .nuxt and .output (Nuxt), .svelte-kit (SvelteKit), .expo (Expo), .angular (Angular), .docusaurus (Docusaurus)
- **Python:** .venv, venv, __pycache__, .pytest_cache, .mypy_cache, .ruff_cache, .tox, .nox, .ipynb_checkpoints, .eggs, .hypothesis, any folder whose name ends in .egg-info, and any folder that contains a pyvenv.cfg file (a virtual environment with any name, such as env)
- **Rust:** target
- **Java with Maven:** target
- **Java, Kotlin, and Android with Gradle:** build, .gradle, .kotlin, .cxx, .externalNativeBuild
- **Swift and Xcode:** DerivedData, .swiftpm, .build, Pods, Carthage
- **Dart and Flutter:** .dart_tool, .pub-cache, build
- **Go:** vendor, only when it contains modules.txt
- **PHP:** vendor, only when the folder that holds it also has composer.json
- **Ruby:** bundle inside a vendor folder (vendor/bundle), and .bundle only when the folder that holds it also has a Gemfile
- **.NET:** bin and obj, only when the folder that holds them also has a .csproj, .fsproj, .vbproj, or .sln file
- **Other tools:** .terraform (Terraform), .serverless (Serverless Framework), elm-stuff (Elm), .sass-cache (Sass)
- **Version control:** .git, .hg, .svn
- **Editors:** .vscode, .idea

A folder you made yourself named build, dist, target, coverage, or any other name in this list without a condition is also left out. Folders named env, vendor, bin, obj, or bundle are kept unless their condition above is met.

## Files left out

- .env and every .env.* file (for example .env.local and .env.production), so credentials are not copied. These templates are kept: .env.example, .env.sample, .env.template, .env.dist.
- .DS_Store, Thumbs.db, desktop.ini

## What is kept

Every other file and folder, including dotfiles and dot-folders such as .github, .husky, .gitignore, .eslintrc, and .npmrc. The folder you pick is always archived, even if its own name is in the list above.

The built-in list cannot be changed. To leave out anything else, such as a large log folder, a bundled runtime, or key files, use the skip list below.

## Your own skip list

In **Add Project**, the optional **Also skip** field adds patterns for that archive, on top of the rules above.

- Enter one pattern per line, or separate them with commas.
- A name without / (for example logs or *.pem) skips every file or folder with that name, at any depth.
- A pattern with / (for example runtime/forensics or /data) is a path from the picked folder. Only that path is skipped.
- A trailing / (for example tmp/) matches folders only.
- * matches any characters within a name, ? matches one character, and ** matches any number of folders (for example **/fixtures/*.bin).
- Matching is case-sensitive. Lines starting with # are ignored.
- Rejected: patterns with .., . or empty path parts, a backslash, or a drive letter, and * or ** on their own. Patterns only match paths inside the picked folder. Up to 100 patterns of up to 256 characters.

A skipped folder is not opened, the same as with the built-in rules.

If the picked folder contains a file named .zipofiignore, its lines are added to the skip list with the same rules, one pattern per line. Commas are not separators in that file, invalid lines in it are ignored, and ! (negation) is not supported. The .zipofiignore file itself is archived.

The patterns from the field are saved with the archive and shown under its name in **Archives**. There is no re-archive button: to archive the same folder again, use **Add Project** and enter the patterns again.

## How files are stored

Every file is stored without compression (zip method 0), with its modification time, so no time is spent compressing. The app lists folders on up to 16 threads and reads up to 32 files at once (two per processor thread), and it starts reading while the folder is still being listed. It writes files in the order of a sorted walk of the folder, so the same unchanged folder gives a byte-for-byte identical archive.

Each file has two zip headers that both contain its path. No other extra fields are written, except Zip64 fields, which are added only when an archive has 65,535 or more entries, holds a file of 4 GB or more, or passes 4 GB. With hundreds of thousands of small files the headers add up: in the example below they made the archive about 25% larger than the files. Empty folders are kept, with their modification time. Any standard unzip tool can open the archive.

## Where archives are saved

Archives are written to ~/Library/Application Support/com.zipofi.app/archives/ as <project name>_<id>.zip. The list of archives (name, source folder, archive path, date, skip patterns, and zip time) is saved in projects.json in ~/Library/Application Support/com.zipofi.app/. **Show in Finder** opens the archive's folder. **Extract** asks for a destination folder, restores file permissions (scripts such as gradlew stay executable), and refuses any entry that would be written outside that folder. Symbolic links in the project are not followed and not stored.

There is no Remove button yet.

## Platforms

- **macOS app:** the **Download** menu and the Download macOS App button on zipofile.com link to a universal build for Intel and Apple Silicon Macs (a .dmg file of about 11 MB). It is signed with an Apple Developer ID certificate and notarized by Apple, with the notarization ticket stapled to both the app and the .dmg, so Gatekeeper accepts it, also offline. macOS may still ask once to confirm opening an app downloaded from the internet. It has been run on an Intel Mac only, not yet on Apple Silicon. From version 1.0.1 the app checks zipofile.com for a newer version when it starts. An update is installed only if its signature matches the key built into the app, and the app then asks to restart.
- **Windows and Linux:** listed as planned in the Download menu. No builds are available.
- **Website:** zipofile.com is a preview of the app UI plus downloads, counters, and this documentation. It does not read your project folders or write .zip files.

## Measured example

Test folder: a Python web app with two small React experiments, 641 MB in 534,355 files. Most are small log and data files, 415,159 of them in one log folder. Machine: one Intel iMac (Xeon W-2140B, 8 cores and 16 threads, 32 GB RAM), with the files already in the disk cache. ZipoFile times are the median of 5 runs, with the range in brackets.

- Default rules: ZipoFile left out 5,405 files (99.4 MB) and kept 528,950 files (541.6 MB). macOS app: 15.3 seconds (15.2 to 17.1). Archive: 679.2 MB.
- Default rules plus one skip-list path for the log folder: ZipoFile kept 113,791 files (451.5 MB). macOS app: 6.2 seconds (6.1 to 6.4). Archive: 482.1 MB.
- zip -r -0 (no compression) on the whole folder, run twice: 1 minute 36 seconds and 1 minute 47 seconds. Archive: 862.6 MB.
- zip -r (with compression) on the whole folder, measured earlier the same day: 2 minutes 11 seconds. Archive: 355.6 MB.

With default rules, the macOS app was about 6 to 7 times faster than zip -r -0 on this folder, mostly because it lists folders and reads files on many threads at once. On this machine, opening 528,950 files alone took about 10 seconds even with 32 threads, so most of the remaining time is the operating system opening files. Only 1% of the files were in excluded folders. Times depend on the project, the disk, and the machine. The Archives heading estimates time saved versus zip -r -0 using that 6.5 times factor.`,
  },
  terms: {
    title: "Terms Of Use",
    body: `## Acceptance

By using the ZipoFile macOS app or zipofile.com you agree to these terms. If you do not agree, do not use them.

## What ZipoFile is

ZipoFile is a macOS application that archives a project folder on your Mac. zipofile.com is the product website. It does not zip folders in the browser.

## Your content

You keep ownership of everything you archive. The macOS app reads your folder and writes the .zip on your disk. ZipoFile does not upload your file names or file contents.

## Website

zipofile.com may show a preview of the app interface, download the macOS installer, and display public counters. It does not read project folders on your computer.

## Acceptable use

Use ZipoFile only for projects you have the right to copy and share. Do not use it to distribute malware or infringing material.

## No warranty

ZipoFile is provided **as is**, without warranty. Archives leave out the folders and files listed in About, including .env files. Check that an archive contains what you need before you delete the original folder.

## Changes

We may update these terms. Continued use after an update means you accept it.`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `## Summary

The ZipoFile macOS app reads and archives your files on your Mac. It does not upload them. zipofile.com does not zip your projects.

## Data the macOS app stores

On your Mac only: archive files in ~/Library/Application Support/com.zipofi.app/archives/ and the archive list (name, source folder path, archive path, date, skip patterns, zip time) in projects.json in ~/Library/Application Support/com.zipofi.app/.

The app sets no cookies and contains no analytics or tracking code.

## Website

zipofile.com does not store your project files. It may store a public download count when you download the macOS app, and it serves public files such as the installer, version info, and this documentation.

## Network requests

The macOS app uses fonts already installed on your Mac (SF Pro) and loads no third-party fonts. It checks zipofile.com for a newer version when it starts. The website may load the public download counter and add one when you download the app. Share, Buy Coffee, and developer links open the sites named in About and Support. No file names or file contents from your projects are sent.

zipofile.com's host may keep standard request logs (IP address, browser user agent), like any website.

## Third parties

The Buy Coffee links (Venmo, PayPal) and the developer website (purul.link) are third-party sites with their own privacy policies.

## Contact

Questions: reach the developer via [purul.link](https://purul.link).`,
  },
  developer: {
    title: "Buy Coffee",
    body: "",
  },
};

export const SAMPLE_ARCHIVE_DEMO = {
  extract: {
    title: "Extract",
    body: `## Sample preview

The archives listed here are examples so you can see how the app looks. They are not real .zip files in the browser.

In the **macOS app**, **Extract** asks you to choose a folder and unpacks the archive there, with file permissions restored.

Download the Mac app to zip and extract your own projects.`,
  },
  finder: {
    title: "Show in Finder",
    body: `## Sample preview

The archives listed here are examples so you can see how the app looks. They are not saved on this device.

In the **macOS app**, **Show in Finder** opens Finder and selects the archive in your ZipoFile archives folder.

Download the Mac app to create archives on your Mac.`,
  },
} as const;

export type SampleArchiveDemoId = keyof typeof SAMPLE_ARCHIVE_DEMO;

export const TRASH_CONFIRM_TITLE = "Trash Archive";

export function trashConfirmBody(name: string): string {
  return `Trash **${name}**?

Once trashed, this archive won't be available again.`;
}

export const REFRESH_WARNING = {
  attempt: {
    title: "Archive In Progress",
    body: `## Please wait

ZipoFile is still building your archive on this Mac. Quitting the app now stops it, and nothing is saved.

Wait until the progress bar shows **Done**.`,
  },
  interrupted: {
    title: "Archive Interrupted",
    body: `## The archive did not finish

The last run was cancelled, and nothing was added to Archives.

Start again with **Add Project** and wait until the progress bar shows **Done**.`,
  },
} as const;
