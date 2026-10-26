// @vitest-environment jsdom

import { act, useState } from "react";
import { setLocale } from "@/i18n";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { StatusCardSettingsForm, defaultSettingsValue, type StatusCardSettingsValue } from "./StatusCardSettingsForm";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  flushSync(() => root.unmount());
  container.remove();
});

function render(value: StatusCardSettingsValue) {
  flushSync(() =>
    root.render(
      <TooltipProvider>
        <StatusCardSettingsForm value={value} onChange={() => {}} />
      </TooltipProvider>,
    ),
  );
}

describe("StatusCardSettingsForm cost preview", () => {
  it("renders a one-line manual estimate by default", () => {
    render(defaultSettingsValue());
    // The label + bare cost render inline; the descriptive detail moves to a
    // hover tooltip (portalled, only mounted while open) so it is not in the DOM.
    expect(container.textContent).toContain("Estimated cost");
    expect(container.textContent).toContain("4.5k tok");
    expect(container.textContent).not.toContain("per refresh");
  });

  it("shows the bare cost for an interval policy", () => {
    render({
      ...defaultSettingsValue(),
      refreshPolicy: { mode: "interval", intervalMinutes: 30, triggers: defaultSettingsValue().refreshPolicy.triggers },
    });
    // "updates/day" / "every 30 min" now live in the tooltip; only the cost shows inline.
    expect(container.textContent).toContain("Estimated cost");
    expect(container.textContent).toContain("tok");
    expect(container.textContent).not.toContain("updates/day");
  });
});

describe("StatusCardSettingsForm advanced group", () => {
  it("hides the Advanced group in manual mode", () => {
    render(defaultSettingsValue());
    expect(container.textContent).not.toContain("Advanced");
    expect(container.textContent).not.toContain("Count as a change");
  });

  it("reveals the collapsed Advanced group when auto-updating", () => {
    render({
      ...defaultSettingsValue(),
      refreshPolicy: { mode: "interval", intervalMinutes: 30, triggers: defaultSettingsValue().refreshPolicy.triggers },
    });
    // The disclosure trigger is present; its contents stay collapsed until opened.
    expect(container.textContent).toContain("Advanced");
    expect(container.textContent).not.toContain("Count as a change");
  });
});


describe("StatusCardSettingsForm locale changes", () => {
  it("updates labels and token formatting without losing a controlled policy draft", async () => {
    function Draft() {
      const [value, setValue] = useState<StatusCardSettingsValue>({
        ...defaultSettingsValue(),
        refreshPolicy: { ...defaultSettingsValue().refreshPolicy, mode: "reactive", maxUpdatesPerHour: 17 },
      });
      return <TooltipProvider><StatusCardSettingsForm value={value} onChange={setValue} /></TooltipProvider>;
    }
    try {
      await act(async () => { await setLocale("en"); root.render(<Draft />); });
      const field = container.querySelector<HTMLInputElement>('input[aria-label="Max updates per hour"]');
      expect(field?.value).toBe("17");
      await act(async () => { await setLocale("ru"); });
      expect(container.textContent).not.toContain("Estimated cost");
      expect(container.querySelector('input')).toBe(field);
      expect(field?.value).toBe("17");
      expect(field?.getAttribute("aria-label")).not.toBe("Max updates per hour");
      await act(async () => { await setLocale("en"); });
      expect(container.textContent).toContain("Estimated cost");
      expect(field?.getAttribute("aria-label")).toBe("Max updates per hour");
      expect(field?.value).toBe("17");
    } finally {
      await act(async () => { await setLocale("en"); });
    }
  });
});
