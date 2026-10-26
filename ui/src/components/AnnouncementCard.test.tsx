// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Announcement } from "@paperclipai/shared";
import { AnnouncementCard } from "./AnnouncementCard";
import { announcementPreview, announcementAnimationPreview } from "@/lib/announcement-preview";
import { setLocale } from "@/i18n";

const connectorsPublication: Announcement = {
  id: "2026-09-14-connectors",
  eyebrow: "Introducing Connectors",
  title: "Give your agents the access they need",
  description: "Connect Gmail, GitHub, Notion, and more. Choose which agents get access, which accounts they use, and which actions they can take.",
  primaryAction: { kind: "route", path: "/apps", label: "Explore connectors" },
  secondaryLink: { kind: "external", url: "https://paperclip.ing", label: "Read publication notes" },
  image: { path: `assets/${"0".repeat(64)}.png`, alt: "Original publication image" },
};

vi.mock("@/lib/router", () => ({ Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a> }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
describe("AnnouncementCard", () => {
  beforeEach(async () => { await setLocale("en"); });
  afterEach(async () => { vi.unstubAllGlobals(); vi.restoreAllMocks(); await setLocale("en"); });
  it("localizes reviewed publication copy in place while retaining destinations, media and dismissal", async () => {
    const div = document.createElement("div"); document.body.append(div);
    const root = createRoot(div);
    const dismiss = vi.fn();
    try {
      await act(async () => root.render(<AnnouncementCard announcement={connectorsPublication} onDismiss={dismiss} />));
      const heading = div.querySelector("h2");
      const link = div.querySelector('a[href="/apps"]');
      const poster = div.querySelector("img");
      await act(async () => { await setLocale("ru"); });
      expect(div.querySelector("h2")).toBe(heading);
      expect(heading?.textContent).toBe("Предоставьте агентам нужный доступ");
      expect(div.textContent).toContain("Представляем коннекторы");
      expect(div.textContent).toContain("Подключите Gmail, GitHub, Notion и другие сервисы.");
      expect(div.querySelector('a[href="/apps"]')).toBe(link);
      expect(link?.textContent).toBe("Посмотреть коннекторы");
      expect(div.querySelector('a[href="https://paperclip.ing"]')?.textContent).toBe("Read publication notes");
      expect(div.querySelector("img")).toBe(poster);
      expect(poster?.getAttribute("src")).toBe("/api/announcements/2026-09-14-connectors/image");
      expect(poster?.getAttribute("alt")).toBe("Original publication image");
      expect(dismiss).not.toHaveBeenCalled();
      await act(async () => { await setLocale("en"); });
      expect(heading?.textContent).toBe(connectorsPublication.title);
      expect(link?.textContent).toBe("Explore connectors");
      await act(async () => { await setLocale("ru"); });
      await act(async () => div.querySelector<HTMLButtonElement>('[aria-label="Скрыть объявление"]')!.click());
      expect(dismiss).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => root.unmount()); div.remove();
    }
  });
  it.each([
    { id: "organization-owned-announcement" },
    { eyebrow: "Updated announcement" },
    { title: "Revised access policy" },
    { description: "New publication text from the feed." },
    { primaryAction: { kind: "route" as const, path: "/apps" as const, label: "Open revised announcement" } },
  ])("preserves unreviewed publication content %j", async (change) => {
    await setLocale("ru");
    const publication = { ...connectorsPublication, ...change };
    const div = document.createElement("div"); document.body.append(div);
    const root = createRoot(div);
    try {
      await act(async () => root.render(<AnnouncementCard announcement={publication} onDismiss={vi.fn()} />));
      expect(div.querySelector("h2")?.textContent).toBe(publication.title);
      expect(div.textContent).toContain(publication.eyebrow);
      expect(div.textContent).toContain(publication.description);
      expect(div.querySelector('a[href="/apps"]')?.textContent).toBe(publication.primaryAction.label);
      expect(div.querySelector('[aria-label="Скрыть объявление"]')).not.toBeNull();
    } finally {
      await act(async () => root.unmount()); div.remove();
    }
  });
  async function animatedCard() {
    const div = document.createElement("div"); document.body.append(div);
    const root = createRoot(div);
    const dismiss = vi.fn();
    await act(async () => root.render(<AnnouncementCard announcement={announcementAnimationPreview} onDismiss={dismiss} />));
    return { div, root, dismiss, cleanup: async () => { await act(async () => root.unmount()); div.remove(); } };
  }
  it("renders isolated animated media with only the announcement controls", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<div>Animated hero</div>", { headers: { "Content-Type": "text/html" } })));
    const { div, dismiss, cleanup } = await animatedCard();
    const frame = div.querySelector("iframe")!;
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(frame.getAttribute("tabindex")).toBe("-1");
    expect(frame.getAttribute("aria-hidden")).toBe("true");
    expect(frame.srcdoc).toContain("default-src 'none'");
    expect(frame.srcdoc).toContain("Animated hero");
    expect(div.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(announcementAnimationPreview.animation!.alt);
    expect(Array.from(div.querySelectorAll("button"), (button) => button.getAttribute("aria-label")))
      .toEqual(["Dismiss announcement"]);
    expect(div.querySelectorAll("a")).toHaveLength(2);
    expect(dismiss).not.toHaveBeenCalled();
    await cleanup();
  });
  it("does not load animation when reduced motion is requested", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const { div, cleanup } = await animatedCard();
    expect(fetch).not.toHaveBeenCalled();
    expect(div.querySelector("iframe")).toBeNull();
    expect(div.querySelector("img")).not.toBeNull();
    await cleanup();
  });
  it.each([404, 503])("keeps the poster and actions usable for animation HTTP %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status })));
    const { div, dismiss, cleanup } = await animatedCard();
    expect(div.querySelector("iframe")).toBeNull();
    expect(div.querySelector("img")).not.toBeNull();
    await act(async () => div.querySelector<HTMLButtonElement>('[aria-label="Dismiss announcement"]')!.click());
    expect(dismiss).toHaveBeenCalledOnce();
    await cleanup();
  });
  it("aborts a pending animation fetch when dismissed", async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_url, init) => { signal = init.signal; return new Promise(() => {}); }));
    const { div, cleanup } = await animatedCard();
    expect(div.querySelector("img")).not.toBeNull();
    await cleanup();
    expect(signal?.aborted).toBe(true);
  });
  it("renders accessible plain text, navigational actions, image fallback and dismissal", async () => {
    const div = document.createElement("div"); document.body.append(div);
    const root = createRoot(div);
    const dismiss = vi.fn();
    await act(async () => root.render(<AnnouncementCard announcement={{ ...announcementPreview, title: "<script>hello</script>" }} onDismiss={dismiss} />));
    expect(div.querySelector("script")).toBeNull();
    expect(div.querySelector("h2")?.textContent).toBe("<script>hello</script>");
    expect(div.querySelector('[role="region"]')?.getAttribute("aria-labelledby")).toBe(div.querySelector("h2")?.id);
    expect(div.querySelector('a[href="https://paperclip.ing"]')?.getAttribute("rel")).toContain("noreferrer");
    expect(div.querySelector('a[href="/projects"]')).not.toBeNull();
    await act(async () => div.querySelector("img")!.dispatchEvent(new Event("error")));
    expect(div.querySelector("img")).toBeNull();
    await act(async () => div.querySelector("button")!.click());
    expect(dismiss).toHaveBeenCalledTimes(1);
    await act(async () => div.querySelector('[role="region"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(dismiss).toHaveBeenCalledTimes(2);
    for (const link of div.querySelectorAll("a")) {
      await act(async () => link.dispatchEvent(new MouseEvent("auxclick", { button: 1, bubbles: true })));
    }
    expect(dismiss).toHaveBeenCalledTimes(4);
    await act(async () => div.querySelector("a")!.dispatchEvent(new MouseEvent("auxclick", { button: 2, bubbles: true })));
    expect(dismiss).toHaveBeenCalledTimes(4); // Opening a context menu is not navigation.
    await act(async () => root.unmount()); div.remove();
  });
});
