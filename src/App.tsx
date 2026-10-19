import { useCallback, useEffect, useState } from "react";
import { AddProjectPanel } from "./components/AddProjectPanel";
import { BottomSheet } from "./components/BottomSheet";
import { CommunityStats } from "./components/CommunityStats";
import { DeveloperSheet } from "./components/DeveloperSheet";
import { DownloadMenu } from "./components/DownloadMenu";
import { WebDemoSheet } from "./components/WebDemoSheet";
import { SheetMarkdown } from "./components/SheetMarkdown";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { IconArchive, IconBrandLogo, IconCoffee, IconDoc, IconLock, IconNavFolder, IconPlus, IconSearch, IconShare, IconSidebarPlus, IconSidebarSearch, IconWindowClose, IconZip } from "./components/icons";
import { WEB_SAMPLE_ARCHIVES, WEB_SAMPLE_ARCHIVE_TOTAL_BYTES } from "./content/sampleArchives";
import { REFRESH_WARNING, SHEETS } from "./content/sheets";

const ARCHIVE_SESSION_KEY = "zipofi-archiving";
import { DOWNLOADS } from "./content/downloads";
import { DISPLAY_VERSION_EVENT, fetchDisplayVersion } from "./lib/displayVersion";
import { recordAppDownload } from "./lib/downloadStats";
import { isTauri } from "./lib/platform";
import { safeAppPath } from "./lib/safeUrl";
import { downloadZip, listProjects, unzipProject, validateSkipField, zipProjectFromPicker } from "./lib/projects";
import { splitField } from "./lib/skipList";
import { ZipProgressBar } from "./components/ZipProgressBar";
import type { ProjectEntry, SheetId, ZipProgress } from "./types";



function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

const SHARE_URL = "https://zipofi.com/";
const SHARE_TITLE = "ZipoFile";
const SHARE_TEXT =
  "Zip projects without the dependency bloat. Skips node_modules, .git, build output, and caches.";

/** Share the site link: native share sheet where the browser has one, else copy it. Link previews use og:* tags on the deployed site. */
async function shareZipofi(notify: (m: string) => void) {
  const url = SHARE_URL;
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("share_site", { title: SHARE_TITLE, text: SHARE_TEXT, url });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  } else if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
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
  const [brandVersion, setBrandVersion] = useState("…");
  const [refreshWarn, setRefreshWarn] = useState<"attempt" | "interrupted" | null>(null);
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
    if (sessionStorage.getItem(ARCHIVE_SESSION_KEY) === "1") {
      sessionStorage.removeItem(ARCHIVE_SESSION_KEY);
      setRefreshWarn("interrupted");
    }
  }, []);

  useEffect(() => {
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

  const openSheet = (id: SheetId) => setSheet(id);
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
    closeSheet();
    setAddOpen(true);
  };
  const closeDrawer = () => (addOpen ? !zipping && setAddOpen(false) : closeSheet());
  const q = query.trim().toLowerCase();
  const samplePreview = webSite && projects.length === 0;
  const showingSampleArchives = samplePreview && previewArchivesOpen;
  const archiveList = showingSampleArchives ? WEB_SAMPLE_ARCHIVES : samplePreview ? [] : projects;
  const sidebarArchives = (showingSampleArchives ? WEB_SAMPLE_ARCHIVES : samplePreview ? [] : projects).slice(0, 5);
  const shown = q ? archiveList.filter((p) => p.name.toLowerCase().includes(q)) : archiveList;
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
        <div className="brand" data-tauri-drag-region="deep">
          <span className="brand-logo" aria-hidden="true">
            <IconBrandLogo />
          </span>
          <span className="brand-name">ZipoFile<span className="brand-ver"> · v{brandVersion}</span></span>
        </div>
        <nav className="nav" aria-label="Main">
          <div className="nav-group">
            <button type="button" className={`nav-item${!drawerOpen ? " active" : ""}`} onClick={() => { setAddOpen(false); closeSheet(); }}>
              <IconArchive /> Archives
              {((!webSite && projects.length > 0) || showingSampleArchives) && (
                <span className="badge">{showingSampleArchives ? WEB_SAMPLE_ARCHIVES.length : projects.length}</span>
              )}
            </button>
            {sidebarArchives.length > 0 && (
              <div className="nav-sublist" role="group" aria-label="Recent archives">
                {sidebarArchives.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="nav-sub"
                    title={p.name}
                    onClick={() => {
                      setAddOpen(false);
                      closeSheet();
                      setQuery("");
                      setTimeout(() => document.getElementById("a-" + p.id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
                    }}
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
          <button type="button" className="side-icon" aria-label="Share" title="Share" onClick={() => void shareZipofi(setMessage)}>
            <IconShare />
          </button>
          <button
            type="button"
            className="side-icon"
            aria-label="Close"
            title="Close"
            onClick={() => {
              if (isTauri()) void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => getCurrentWindow().close());
              else if (drawerOpen) closeDrawer();
              else window.close(); // browsers allow this only for script-opened tabs
            }}
          >
            <IconWindowClose />
          </button>
        </div>
        <header className="toolbar" data-tauri-drag-region="deep">
          <h1>Archives</h1>
          <button
            type="button"
            className={`toolbar-about${sheet === "about" && !addOpen ? " active" : ""}`}
            onClick={() => { setAddOpen(false); openSheet("about"); }}
          >
            About
          </button>
          <label className="search">
            <IconSearch />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search archives" />
          </label>
          {macDl ? (
            <a className="btn primary dl-mac" href={macDl} download onClick={() => recordAppDownload()}>
              Download macOS App
            </a>
          ) : (
            <button type="button" className="btn primary" disabled={zipping} onClick={openNewArchive}>
              <IconPlus /> New Archive
            </button>
          )}
        </header>

        <div className="scroll">
          <UpdatePrompt />
          <ZipProgressBar progress={zipProgress} active={zipping} />
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
                  <li key={p.id} id={"a-" + p.id} className="row">
                    <span className="row-icon"><IconArchive /></span>
                    <div className="row-main">
                      <strong>{p.name}</strong>
                      <span>{formatDate(p.zippedAt)} · sample preview</span>
                    </div>
                    <button type="button" className="btn" disabled>Extract</button>
                    <button type="button" className="btn" disabled>Download</button>
                  </li>
                ))}
                {shown.length === 0 && <li className="row muted">No results for “{query}”.</li>}
              </ul>
            ) : (
              !zipping && (
                <div className="empty">
                  <span className="empty-icon"><IconZip /></span>
                  <h2>No Archives</h2>
                  <p>Zip a project folder faster without node_modules, .git, build output, or caches. Keep it as yours forever.</p>
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
                <p>Zip a project folder faster without node_modules, .git, build output, or caches. Keep it as yours forever.</p>
                <button type="button" className="btn primary" disabled={zipping} onClick={openNewArchive}>
                  <IconPlus /> New Archive
                </button>
              </div>
            )
          ) : (
            <ul className="list card">
              {shown.map((p) => (
                <li key={p.id} id={"a-" + p.id} className="row">
                  <span className="row-icon"><IconArchive /></span>
                  <div className="row-main">
                    <strong>{p.name}</strong>
                    <span>
                      {formatDate(p.zippedAt)}
                      {p.skip && p.skip.length > 0 && (
                        <> · <span title={p.skip.join("\n")}>{p.skip.length} custom {p.skip.length === 1 ? "exclusion" : "exclusions"}</span></>
                      )}
                    </span>
                  </div>
                  <button type="button" className="btn" disabled={zipping} onClick={() => handleUnzip(p)}>Extract</button>
                  <button type="button" className="btn" disabled={zipping} onClick={() => downloadZip(p)}>
                    {isTauri() ? "Show in Finder" : "Download"}
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
                  onToggle: () => setPreviewArchivesOpen((v) => !v),
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
        open={refreshWarn !== null}
        title={REFRESH_WARNING[refreshWarn ?? "attempt"].title}
        onClose={() => setRefreshWarn(null)}
      >
        <SheetMarkdown body={REFRESH_WARNING[refreshWarn ?? "attempt"].body} />
      </BottomSheet>
    </div>
  );
}
