// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { SkillImportProgress } from "./SkillImportProgress";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("skill import progress localization", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await i18n.changeLanguage("ru");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    act(() => root.unmount());
    container.remove();
    await i18n.changeLanguage("en");
  });

  function render(fileCount: number) {
    act(() => root.render(
      <SkillImportProgress
        repository="owner/Release-Engineering"
        importing
        count={1}
        found={[{
          path: "skills/release-check",
          name: "Release Check",
          description: "User-authored description",
          fileCount,
          error: null,
        }]}
      />,
    ));
  }

  it.each([
    [0, "0 файлов"], [1, "1 файл"], [2, "2 файла"], [5, "5 файлов"],
    [11, "11 файлов"], [21, "21 файл"], [22, "22 файла"], [25, "25 файлов"],
    [1.5, "1.5 файла"],
  ])("renders the file count %s in Russian", (count, expected) => {
    render(count as number);
    expect(container.textContent).toContain(expected);
    expect(container.textContent).toContain("Release Check");
    expect(container.textContent).toContain("skills/release-check");
  });

  it("updates an active import when the language changes without changing source content", async () => {
    render(2);
    expect(container.querySelector('[aria-label="Ход импорта"]')).not.toBeNull();
    expect(container.textContent).toContain("Импорт навыков: 1");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.querySelector('[aria-label="Import progress"]')).not.toBeNull();
    expect(container.textContent).toContain("Importing 1 skill");
    expect(container.textContent).toContain("2 files");
    expect(container.textContent).toContain("owner/Release-Engineering");
    expect(container.textContent).toContain("Release Check");
  });
});
