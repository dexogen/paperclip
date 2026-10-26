// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, useTranslation } from "@/i18n";
import { useComposerStop } from "./useComposerStop";

let root: Root; let host: HTMLDivElement; let control: ReturnType<typeof useComposerStop>;
function Harness({ stop }: { stop: () => Promise<void> }) {
  const { t } = useTranslation(); control = useComposerStop(stop, false, t);
  return <div><button disabled={control.stopping} onClick={() => void control.stop()}>Stop</button><output>{control.error}</output></div>;
}
beforeEach(async () => { await i18n.changeLanguage("en"); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); await i18n.changeLanguage("en"); });
describe("localized composer stop", () => {
  it("retains the in-flight guard across locale changes and renders its fallback without repeating stop", async () => {
    let reject!: (cause: unknown) => void;
    const stop = vi.fn(() => new Promise<void>((_, no) => { reject = no; }));
    await act(async () => { root.render(<Harness stop={stop} />); });
    await act(async () => { void control.stop(); void control.stop(); });
    await act(async () => { await i18n.changeLanguage("ru"); void control.stop(); });
    expect(stop).toHaveBeenCalledTimes(1); expect(host.querySelector("button")?.disabled).toBe(true);
    await act(async () => { reject(null); });
    expect(host.querySelector("output")?.textContent).toBe("Не удалось остановить. Повторите попытку.");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(host.querySelector("output")?.textContent).toBe("Unable to stop. Try again.");
    expect(stop).toHaveBeenCalledTimes(1); expect(host.querySelector("button")?.disabled).toBe(false);
  });
  it("preserves a raw error even when it equals the English fallback", async () => {
    const stop = vi.fn().mockRejectedValue(new Error("Unable to stop. Try again."));
    await act(async () => { root.render(<Harness stop={stop} />); });
    await act(async () => { await control.stop(); });
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(host.querySelector("output")?.textContent).toBe("Unable to stop. Try again."); expect(stop).toHaveBeenCalledTimes(1);
  });
});
