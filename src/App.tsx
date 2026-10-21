import { useCallback, useEffect, useState } from "react";
import { AddProjectPanel } from "./components/AddProjectPanel";
import { BottomSheet } from "./components/BottomSheet";
import { CommunityStats } from "./components/CommunityStats";
import { DeveloperSheet } from "./components/DeveloperSheet";
import { DownloadMenu } from "./components/DownloadMenu";
import { WebDemoSheet } from "./components/WebDemoSheet";
import { SheetMarkdown } from "./components/SheetMarkdown";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { IconApple, IconArchive, IconBrandLogo, IconClose, IconCoffee, IconDoc, IconExtract, IconGitHub, IconInfo, IconLock, IconNavExpand, IconNavFolder, IconPlus, IconSearch, IconShare, IconShowInFinder, IconSidebarPlus, IconSidebarSearch, IconTrash, IconWindowClose, IconWinPlus, IconZip } from "./components/icons";
import { WEB_SAMPLE_ARCHIVES, WEB_SAMPLE_ARCHIVE_TOTAL_BYTES } from "./content/sampleArchives";
import { REFRESH_WARNING, SAMPLE_ARCHIVE_DEMO, SHEETS, TRASH_CONFIRM_TITLE, trashConfirmBody, type SampleArchiveDemoId } from "./content/sheets";

const ARCHIVE_SESSION_KEY = "zipofi-archiving";
import { DOWNLOADS, GITHUB_REPO_URL } from "./content/downloads";
import { DISPLAY_VERSION_EVENT, fetchDisplayVersion } from "./lib/displayVersion";
import { recordAppDownload } from "./lib/downloadStats";
import { isTauri } from "./lib/platform";
import { externalLinkRel, safeAppPath, safeExternalHref } from "./lib/safeUrl";
import { downloadZip, listProjects, removeProject, unzipProject, validateSkipField, zipProjectFromPicker } from "./lib/projects";
import { splitField } from "./lib/skipList";
import { ZipProgressBar } from "./components/ZipProgressBar";
import { SIDEBAR_RECENT_COUNT, sidebarArchiveEntries, sidebarArchiveRatio } from "./lib/sidebarArchives";
import { formatDuration } from "./lib/zipProgress";
import type { ProjectEntry, SheetId, ZipProgress } from "./types";



function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

const SEARCH_LETTERS_ONLY = /[^a-zA-Z\s]/g;
const sanitizeSearchQuery = (raw: string) => raw.replace(SEARCH_LETTERS_ONLY, "");

const GITHUB_HREF = safeExternalHref(GITHUB_REPO_URL);
const SHARE_URL = "https://zipofile.com/";
const SHARE_TITLE = "ZipoFile";
const SHARE_TEXT =
  "Zip projects without the dependency bloat. Skips node_modules, .git, build output, and caches.";

function shareUrl() {
  const canonicalHref = document.querySelector<HTMLLinkElement>("link[rel='canonical']")?.href;
  return canonicalHref || SHARE_URL;
}

/** Share canonical URL so social apps fetch OG metadata and large card image. */
async function shareZipofi(notify: (m: string) => void) {
  const url = shareUrl();
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("share_site", { title: SHARE_TITLE, text: SHARE_TEXT, url });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      console.error(e);
    }
  } else if (typeof navigator.share === "function") {
    try {
      const payload: ShareData = { url };
      await navigator.share(payload);
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    notify(`Link copied: ${url}`);
  } catch {
    notify(`Share ZipoFile: ${url}`);
  }
}

export default function App() {
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projectName, setProjectName] = useState("");
  const [skipText, setSkipText] = useState("");
  const skipErrors = validateSkipField(splitField(skipText));
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewArchivesOpen, setPreviewArchivesOpen] = useState(false);
  const [removedSampleIds, setRemovedSampleIds] = useState<string[]>([]);
  const [brandVersion, setBrandVersion] = useState("…");
  const [refreshWarn, setRefreshWarn] = useState<"attempt" | "interrupted" | null>(null);
  const [trashConfirm, setTrashConfirm] = useState<{ entry: ProjectEntry; sample: boolean } | null>(null);
  const [sampleDemo, setSampleDemo] = useState<SampleArchiveDemoId | null>(null);
  const [sidebarArchivesExpanded, setSidebarArchivesExpanded] = useState(false);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const archiving =
    zipping && zipProgress != null && zipProgress.phase !== "done" && zipProgress.phase !== "picking";

  const reportZipProgress = useCallback((p: ZipProgress) => {
    setZipping(true);
    setZipProgress(p);
    if (p.folderName) setMessage(null);
  }, []);

  const refresh = useCallback(async () => {
    setProjects(await listProjects());
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const load = () => void fetchDisplayVersion().then((s) => setBrandVersion(s.display));
    load();
    window.addEventListener(DISPLAY_VERSION_EVENT, load);
    return () => window.removeEventListener(DISPLAY_VERSION_EVENT, load);
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      sessionStorage.removeItem(ARCHIVE_SESSION_KEY);
      return;
    }
    if (sessionStorage.getItem(ARCHIVE_SESSION_KEY) === "1") {
      sessionStorage.removeItem(ARCHIVE_SESSION_KEY);
      setRefreshWarn("interrupted");
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    if (!archiving) {
      sessionStorage.removeItem(ARCHIVE_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(ARCHIVE_SESSION_KEY, "1");

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const refreshKey =
        e.key === "F5" ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r");
      if (!refreshKey) return;
      e.preventDefault();
      setRefreshWarn("attempt");
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [archiving]);

  const clearSpotlight = () => setSpotlightId(null);
  const openSheet = (id: SheetId) => {
    clearSpotlight();
    setSheet(id);
  };
  const closeSheet = () => setSheet(null);

  const handleZip = () => {
    setAddOpen(false);
    setMessage(null);
    setZipProgress(null);
    setZipping(true);
    void zipProjectFromPicker(projectName, splitField(skipText), reportZipProgress)
      .then(async () => {
        setProjectName("");
        setSkipText("");
        await refresh();
        setMessage("Archive saved.");
      })
      .catch((e) => {
        setMessage(e instanceof Error ? e.message : "Could not create archive.");
        setZipProgress(null);
      })
      .finally(() => {
        sessionStorage.removeItem(ARCHIVE_SESSION_KEY);
        setZipping(false);
      });
  };

  const handleUnzip = async (p: ProjectEntry) => {
    setZipping(true);
    setMessage(null);
    try {
      await unzipProject(p);
      setMessage(`Extracted “${p.name}”.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not extract archive.");
    } finally {
      setZipping(false);
    }
  };

  const requestTrash = (p: ProjectEntry, sample: boolean) => setTrashConfirm({ entry: p, sample });

  const confirmTrash = async () => {
    if (!trashConfirm) return;
    const { entry, sample } = trashConfirm;
    setTrashConfirm(null);
    if (sample) {
      setRemovedSampleIds((ids) => (ids.includes(entry.id) ? ids : [...ids, entry.id]));
      if (spotlightId === entry.id) clearSpotlight();
      setMessage(`Trashed “${entry.name}”.`);
      return;
    }
    setZipping(true);
    setMessage(null);
    try {
      await removeProject(entry);
      if (spotlightId === entry.id) clearSpotlight();
      await refresh();
      setMessage(`Trashed “${entry.name}”.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not trash archive.");
    } finally {
      setZipping(false);
    }
  };

  const webSite = !isTauri();
  const macDl =
    webSite &&
    (() => {
      const m = DOWNLOADS.find((d) => d.available && d.id === "macos");
      return m && m.available ? safeAppPath(m.href) : null;
    })();
  const sheetContent = sheet ? SHEETS[sheet] : null;
  const drawerOpen = addOpen || !!sheet;
  const drawerTitle = addOpen
    ? webSite
      ? "The macOS App Experience"
      : "New Archive"
    : sheet === "developer"
      ? "Support ZipoFile"
      : (sheetContent?.title ?? "");
  const openNewArchive = () => {
    clearSpotlight();
    closeSheet();
    setAddOpen(true);
  };
  const closeDrawer = () => (addOpen ? !zipping && setAddOpen(false) : closeSheet());
  const q = query.trim().toLowerCase();
  const samplePreview = webSite && projects.length === 0;
  const showingSampleArchives = samplePreview && previewArchivesOpen;
  const visibleSampleArchives = WEB_SAMPLE_ARCHIVES.filter((p) => !removedSampleIds.includes(p.id));
  const archiveList = showingSampleArchives ? visibleSampleArchives : samplePreview ? [] : projects;
  const allSidebarArchives = samplePreview ? visibleSampleArchives : projects;
  const sidebarArchives = sidebarArchiveEntries(allSidebarArchives, sidebarArchivesExpanded);
  const sidebarRatio =
    allSidebarArchives.length > 0
      ? sidebarArchiveRatio(
          sidebarArchivesExpanded ? allSidebarArchives.length : Math.min(SIDEBAR_RECENT_COUNT, allSidebarArchives.length),
          allSidebarArchives.length,
        )
      : "";
  const shown = q ? archiveList.filter((p) => p.name.toLowerCase().includes(q)) : archiveList;

  const focusArchiveInList = (id: string) => {
    if (samplePreview) setPreviewArchivesOpen(true);
    setSpotlightId(id);
    setAddOpen(false);
    closeSheet();
    setQuery("");
    window.setTimeout(() => document.getElementById("a-" + id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const rowClass = (id: string) => (spotlightId === id ? "row spotlight" : "row");
  const footLink = (id: SheetId, label: string, icon: React.ReactNode) => (
    <button type="button" className={`nav-item${sheet === id && !addOpen ? " active" : ""}`} onClick={() => { setAddOpen(false); openSheet(id); }}>
      <span className="foot-icon">{icon}</span>
      <span className="foot-link-label">{label}</span>
    </button>
  );

  return (
    <div className={`app${isTauri() ? " tauri" : ""}`}>
      <aside className="sidebar">
        <div className="drag" data-tauri-drag-region />
        <div className="side-top" data-tauri-drag-region="deep">
          {!isTauri() && <span className="side-site">zipofile.com</span>}
          <button type="button" className="side-icon side-search" aria-label="Search" title="Search" onClick={() => document.querySelector<HTMLInputElement>(".search input")?.focus()}>
            <IconSidebarSearch />
          </button>
          <button type="button" className="side-icon side-new" aria-label="New Archive" title="New Archive" disabled={zipping && !webSite} onClick={openNewArchive}>
            <IconSidebarPlus />
          </button>
        </div>
        <div className="brand" data-tauri-drag-region="deep" aria-label={`ZipoFile v${brandVersion}`}>
          <span className="brand-logo">
            <IconBrandLogo />
            <span className="brand-logo-ver" aria-hidden="true">v{brandVersion}</span>
          </span>
          <span className="brand-name">ZipoFile</span>
        </div>
        <nav className="nav" aria-label="Main">
          <div className="nav-group">
            <div className={`nav-archive-section${!drawerOpen ? " active" : ""}`}>
              <button
                type="button"
                className="nav-archive-cell nav-archive-leading"
                onClick={() => {
                  setAddOpen(false);
                  closeSheet();
                  clearSpotlight();
                }}
              >
                <IconArchive />
                <span className="nav-archive-title">Archives</span>
              </button>
              <div className="nav-archive-cell nav-archive-mid" aria-hidden={!sidebarRatio}>
                <span className="nav-archive-ratio">{sidebarRatio}</span>
              </div>
              <button
                type="button"
                className={`nav-archive-cell nav-archive-expand nav-expand${sidebarArchivesExpanded ? " on" : ""}`}
                aria-label={sidebarArchivesExpanded ? "Show recent archives" : "Show all archives alphabetically"}
                aria-expanded={sidebarArchivesExpanded}
                title={sidebarArchivesExpanded ? "Recent archives" : "All archives (A–Z)"}
                disabled={allSidebarArchives.length === 0}
                onClick={() => setSidebarArchivesExpanded((v) => !v)}
              >
                <IconNavExpand />
              </button>
            </div>
            {sidebarArchives.length > 0 && (
              <div className="nav-sublist" role="group" aria-label={sidebarArchivesExpanded ? "All archives" : "Recent archives"}>
                {sidebarArchives.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`nav-sub${spotlightId === p.id ? " active" : ""}`}
                    title={p.name}
                    onClick={() => focusArchiveInList(p.id)}
                  >
                    <span className="nav-sub-icon" aria-hidden>
                      <IconNavFolder />
                    </span>
                    <span className="nav-sub-label">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="side-foot">
          <div className="foot-links">
            {footLink("terms", "Terms", <IconDoc />)}
            {footLink("privacy", "Privacy", <IconLock />)}
            <DownloadMenu />
            {footLink("developer", "Support", <IconCoffee />)}
          </div>
          <small>
            <span>© {new Date().getFullYear()} ZipoFile · </span>
            <button type="button" onClick={() => { setAddOpen(false); openSheet("developer"); }}>By Puru Pokharel</button>
          </small>
        </div>
      </aside>

      <main className="content">
        <div className="drag" data-tauri-drag-region />
        <div className="win-actions">
          <button
            type="button"
            className={`side-icon win-about${sheet === "about" && !addOpen ? " on" : ""}`}
            aria-label="About"
            title="About"
            onClick={() => { setAddOpen(false); openSheet("about"); }}
          >
            <IconInfo />
          </button>
          <button type="button" className="side-icon win-share" aria-label="Share" title="Share" onClick={() => void shareZipofi(setMessage)}>
            <IconShare />
          </button>
          {GITHUB_HREF && (
            <a
              href={GITHUB_HREF}
              className="side-icon win-github"
              aria-label="GitHub repository"
              title="GitHub"
              target="_blank"
              rel={externalLinkRel}
              onClick={(e) => {
                if (!isTauri()) return;
                e.preventDefault();
                void import("@tauri-apps/api/core").then(({ invoke }) =>
                  invoke("open_external", { url: GITHUB_HREF.replace(/\/$/, "") }),
                );
              }}
            >
              <IconGitHub />
            </a>
          )}
          <button
            type="button"
            className={`side-icon${isTauri() ? "" : " win-plus"}`}
            aria-label={isTauri() ? "Close" : "New Archive"}
            title={isTauri() ? "Close" : "New Archive"}
            disabled={!isTauri() && zipping}
            onClick={() => {
              if (isTauri()) void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => getCurrentWindow().close());
              else openNewArchive();
            }}
          >
            {isTauri() ? <IconWindowClose /> : <IconWinPlus />}
          </button>
        </div>
        <header className="toolbar" data-tauri-drag-region="deep">
          <div className="archives-head">
            <h1>Archives</h1>
          </div>
          <label className="search">
            <IconSearch />
            <input
              value={query}
              onChange={(e) => {
                clearSpotlight();
                setQuery(sanitizeSearchQuery(e.target.value));
              }}
              placeholder="Search and find instantly..."
              aria-label="Search archives"
              autoComplete="off"
              spellCheck={false}
              inputMode="search"
              maxLength={64}
            />
            {query && (
              <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQuery("")}>
                <IconClose />
              </button>
            )}
          </label>
          {macDl ? (
            <a className="btn primary dl-mac" href={macDl} download onClick={() => recordAppDownload()}>
              <IconApple /> Download
            </a>
          ) : (
            <button type="button" className="btn primary" disabled={zipping} onClick={openNewArchive}>
              <IconPlus /> New Archive
            </button>
          )}
        </header>

        <div className="scroll">
          <UpdatePrompt />
          {isTauri() && <ZipProgressBar progress={zipProgress} active={zipping} />}
          {message && (
            <div className="toast" role="status">
              <span>{message}</span>
              <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setMessage(null)}>×</button>
            </div>
          )}
          {loading ? null : samplePreview ? (
            showingSampleArchives ? (
              <ul className="list card">
                {shown.map((p) => (
                  <li key={p.id} id={"a-" + p.id} className={rowClass(p.id)}>
                    <span className="row-icon"><IconArchive /></span>
                    <div className="row-main">
                      <strong>{p.name}</strong>
                      <span>
                        {formatDate(p.zippedAt)}
                        {p.zipMs != null ? ` · zipped in ${formatDuration(p.zipMs)}` : ""}
                        {" · sample preview"}
                      </span>
                    </div>
                    <button type="button" className="btn row-action" aria-label="Extract" onClick={() => { clearSpotlight(); setSampleDemo("extract"); }}>
                      <IconExtract /><span className="btn-label">Extract</span>
                    </button>
                    <button type="button" className="btn row-action" aria-label="Show in Finder" onClick={() => { clearSpotlight(); setSampleDemo("finder"); }}>
                      <IconShowInFinder /><span className="btn-label">Show in Finder</span>
                    </button>
                    <button type="button" className="btn row-action" aria-label="Trash" onClick={() => requestTrash(p, true)}>
                      <IconTrash /><span className="btn-label">Trash</span>
                    </button>
                  </li>
                ))}
                {shown.length === 0 && <li className="row muted">No results for “{query}”.</li>}
              </ul>
            ) : (
              !zipping && (
                <div className="empty">
                  <span className="empty-icon"><IconZip /></span>
                  <h2>No Archives</h2>
                  <p className="empty-lead">
                    Zip a project folder faster without node_modules, .git,
                    <br />
                    build output, or caches. Keep the app yours forever.
                  </p>
                  <button type="button" className="btn primary" disabled={zipping} onClick={openNewArchive}>
                    <IconPlus /> New Archive
                  </button>
                </div>
              )
            )
          ) : projects.length === 0 ? (
            !zipping && (
              <div className="empty">
                <span className="empty-icon"><IconZip /></span>
                <h2>No Archives</h2>
                <p className="empty-lead">
                  Zip a project folder faster without node_modules, .git,
                  <br />
                  build output, or caches. Keep the app yours forever.
                </p>
                <button type="button" className="btn primary" disabled={zipping} onClick={openNewArchive}>
                  <IconPlus /> New Archive
                </button>
              </div>
            )
          ) : (
            <ul className="list card">
              {shown.map((p) => (
                <li key={p.id} id={"a-" + p.id} className={rowClass(p.id)}>
                  <span className="row-icon"><IconArchive /></span>
                  <div className="row-main">
                    <strong>{p.name}</strong>
                    <span>
                      {formatDate(p.zippedAt)}
                      {p.zipMs != null ? ` · zipped in ${formatDuration(p.zipMs)}` : ""}
                      {p.skip && p.skip.length > 0 && (
                        <> · <span title={p.skip.join("\n")}>{p.skip.length} custom {p.skip.length === 1 ? "exclusion" : "exclusions"}</span></>
                      )}
                    </span>
                  </div>
                  <button type="button" className="btn row-action" aria-label="Extract" disabled={zipping} onClick={() => { clearSpotlight(); void handleUnzip(p); }}>
                    <IconExtract /><span className="btn-label">Extract</span>
                  </button>
                  <button
                    type="button"
                    className="btn row-action"
                    aria-label="Show in Finder"
                    disabled={zipping}
                    onClick={() => {
                      clearSpotlight();
                      void downloadZip(p).catch((e) =>
                        setMessage(e instanceof Error ? e.message : "Could not open in Finder."),
                      );
                    }}
                  >
                    <IconShowInFinder /><span className="btn-label">Show in Finder</span>
                  </button>
                  <button type="button" className="btn row-action" aria-label="Trash" disabled={zipping} onClick={() => requestTrash(p, false)}>
                    <IconTrash /><span className="btn-label">Trash</span>
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="row muted">No results for “{query}”.</li>}
            </ul>
          )}
          {samplePreview && !loading && !zipping && (
            <footer className="content-foot">
              <CommunityStats
                previewArchives={{
                  count: WEB_SAMPLE_ARCHIVES.length,
                  totalBytes: WEB_SAMPLE_ARCHIVE_TOTAL_BYTES,
                  open: previewArchivesOpen,
                  onToggle: () => {
                    setPreviewArchivesOpen((v) => {
                      if (v) clearSpotlight();
                      return !v;
                    });
                  },
                }}
              />
            </footer>
          )}
        </div>
      </main>

      <BottomSheet open={drawerOpen} title={drawerTitle} wide={!addOpen && (sheet === "about" || sheet === "developer")} onClose={closeDrawer}>
        {addOpen ? (
          webSite ? (
            <WebDemoSheet />
          ) : (
            <AddProjectPanel
              name={projectName}
              skip={skipText}
              skipErrors={skipErrors}
              busy={zipping}
              onName={setProjectName}
              onSkip={setSkipText}
              onClose={() => setAddOpen(false)}
              onSubmit={handleZip}
            />
          )
        ) : sheet === "developer" ? (
          <DeveloperSheet />
        ) : (
          sheetContent && <SheetMarkdown body={sheetContent.body} />
        )}
      </BottomSheet>

      <BottomSheet
        open={sampleDemo !== null}
        title={sampleDemo ? SAMPLE_ARCHIVE_DEMO[sampleDemo].title : ""}
        onClose={() => setSampleDemo(null)}
      >
        {sampleDemo && (
          <>
            <SheetMarkdown body={SAMPLE_ARCHIVE_DEMO[sampleDemo].body} />
            <div className="form-actions">
              <button type="button" className="btn primary" onClick={() => setSampleDemo(null)}>Got it</button>
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={trashConfirm !== null}
        title={TRASH_CONFIRM_TITLE}
        onClose={() => setTrashConfirm(null)}
      >
        {trashConfirm && (
          <>
            <SheetMarkdown body={trashConfirmBody(trashConfirm.entry.name)} />
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setTrashConfirm(null)}>Cancel</button>
              <button type="button" className="btn primary" disabled={zipping} onClick={() => void confirmTrash()}>
                Trash
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      {isTauri() && (
        <BottomSheet
          open={refreshWarn !== null}
          title={REFRESH_WARNING[refreshWarn ?? "attempt"].title}
          onClose={() => setRefreshWarn(null)}
        >
          <SheetMarkdown body={REFRESH_WARNING[refreshWarn ?? "attempt"].body} />
        </BottomSheet>
      )}
    </div>
  );
}
