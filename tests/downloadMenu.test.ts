// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DownloadMenu } from "../src/components/DownloadMenu";
import { APP_VERSION, DOWNLOADS, SITE_ORIGIN } from "../src/content/downloads";
import { versionedDmgFileName } from "../src/lib/dmgName";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const button = () => host.querySelector("button")!;
const menu = () => host.querySelector('[role="menu"]');
const items = () => Array.from(host.querySelectorAll<HTMLElement>('[role="menuitem"]'));
const key = (el: Element | Document, k: string) =>
  act(() => void el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(DownloadMenu)));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("header Download menu", () => {
  it("renders a closed menu button", () => {
    expect(button().textContent).toContain("Download");
    expect(button().getAttribute("aria-haspopup")).toBe("menu");
    expect(button().getAttribute("aria-expanded")).toBe("false");
    expect(menu()).toBeNull();
  });

  it("opens on click with the macOS link and disabled planned items", () => {
    act(() => button().click());
    expect(button().getAttribute("aria-expanded")).toBe("true");
    const [mac, linux, win] = items();
    expect(items()).toHaveLength(3);
    expect(mac!.tagName).toBe("A");
    expect(mac!.getAttribute("href")).toBe(`/downloads/${versionedDmgFileName(APP_VERSION)}?v=${APP_VERSION}`);
    expect(mac!.hasAttribute("download")).toBe(true);
    expect(mac!.textContent).toContain("macOS App");
    expect(mac!.textContent).toContain("Intel & Apple Silicon");
    expect(mac!.textContent).not.toMatch(/right-click/i);
    for (const [el, label] of [[linux, "Linux (planned)"], [win, "Windows (planned)"]] as const) {
      expect(el!.tagName).not.toBe("A");
      expect(el!.getAttribute("href")).toBeNull();
      expect(el!.getAttribute("aria-disabled")).toBe("true");
      expect(el!.textContent).toBe(label);
    }
    expect(document.activeElement).toBe(mac);
  });

  it("arrow keys move focus; Escape closes and returns focus to the button", () => {
    key(button(), "ArrowDown");
    expect(menu()).not.toBeNull();
    key(menu()!, "ArrowDown");
    expect(document.activeElement).toBe(items()[1]);
    key(menu()!, "End");
    expect(document.activeElement).toBe(items()[2]);
    key(menu()!, "ArrowDown");
    expect(document.activeElement).toBe(items()[0]);
    key(document, "Escape");
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  it("closes on an outside click or tap, not on a click inside", () => {
    act(() => button().click());
    act(() => void items()[1]!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(menu()).not.toBeNull();
    act(() => void document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(menu()).toBeNull();
    act(() => button().click());
    act(() => void document.body.dispatchEvent(new Event("touchstart", { bubbles: true })));
    expect(menu()).toBeNull();
  });
});

describe("Download menu in the desktop app", () => {
  it("opens the public DMG URL through open_external instead of a local link", async () => {
    const calls: { cmd: string; args: unknown }[] = [];
    const w = window as unknown as Record<string, unknown>;
    w.__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: unknown) => void calls.push({ cmd, args }),
      transformCallback: () => 0,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: "2.2", dmg: "ZipoFile_v2_2.dmg" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      act(() => button().click());
      const mac = items()[0]!;
      const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
      act(() => void mac.dispatchEvent(ev));
      expect(ev.defaultPrevented).toBe(true);
      await new Promise((r) => setTimeout(r, 50));
      expect(calls).toEqual([{ cmd: "open_external", args: { url: `${SITE_ORIGIN}/downloads/ZipoFile_v2_2.dmg?v=2.2` } }]);
      expect(mac.getAttribute("href")).toBe(`${SITE_ORIGIN}/downloads/${versionedDmgFileName(APP_VERSION)}?v=${APP_VERSION}`);
      expect(readFileSync(join(__dirname, "../src-tauri/src/lib.rs"), "utf8")).toContain("https://zipofile.com/downloads/");
    } finally {
      delete w.__TAURI_INTERNALS__;
    }
  });
});

describe("download artifacts", () => {
  it("tauri.conf.json semver matches display version", () => {
    const conf = JSON.parse(readFileSync(join(__dirname, "../src-tauri/tauri.conf.json"), "utf8"));
    expect(conf.version).toBe(`${APP_VERSION}.0`);
  });
  it("every available download exists in public/ and is a non-trivial file", () => {
    for (const d of DOWNLOADS) {
      if (!d.available) continue;
      const p = join(__dirname, "../public", d.href.split("?")[0]);
      expect(existsSync(p), p).toBe(true);
      expect(statSync(p).size).toBeGreaterThan(1_000_000);
    }
  });
});
