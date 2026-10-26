// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanySearchResult } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { SearchResultRow } from "./SearchResultRow";
import { ZeroResultsRecovery } from "./ZeroResultsRecovery";

vi.mock("@/lib/router", async () => {
  const router = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...router, Link: ({ disableIssueQuicklook: _, ...props }: React.ComponentProps<typeof router.Link> & { disableIssueQuicklook?: boolean }) => <router.Link {...props} /> };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement, root: Root;
const time = "2026-10-26T09:00:00.000Z";
function result(type: CompanySearchResult["type"], field: string = type): CompanySearchResult {
  const text = `Literal <b> & ${type} русский`;
  return {
    id: type, type, score: 10, title: text, href: `/PAP/issues/PAP-1#${field}`, matchedFields: [field], sourceLabel: "Custom raw label",
    snippet: text, snippets: [{ field, label: "Custom document <b> & title", text, highlights: [{ start: 0, end: 7 }] }], updatedAt: time, previewImageUrl: null,
    ...(type === "issue" ? { issue: { id: "issue", identifier: "PAP-1", title: text, status: "todo" as const, priority: "medium" as const, assigneeAgentId: null, assigneeUserId: null, projectId: null, updatedAt: time } } : {}),
    ...(type === "artifact" ? { artifact: { id: "artifact", source: "document" as const, mediaKind: "document" as const, issueId: "issue", issueIdentifier: "PAP-1", issueTitle: "Literal task", projectId: null, projectName: null, updatedAt: time } } : {}),
  };
}
beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.spyOn(Date, "now").mockReturnValue(new Date(time).getTime() + 2 * 60_000);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); await i18n.changeLanguage("en");
});
describe("localized search results", () => {
  it("keeps all result types, custom document labels, snippets, anchors and highlight text literal across locale changes", async () => {
    const records = [result("issue", "comment"), result("issue", "document"), result("artifact"), result("agent"), result("project"), result("issue", "custom_field")];
    await act(async () => root.render(<MemoryRouter>{records.map((item, index) => <SearchResultRow key={index} result={item} />)}</MemoryRouter>));
    const links = Array.from(container.querySelectorAll("a"));
    const hrefs = links.map(link => link.getAttribute("href"));
    const highlights = Array.from(container.querySelectorAll("mark")).map(mark => mark.textContent);
    for (const locale of ["ru", "en"]) {
      await act(async () => { await i18n.changeLanguage(locale); });
      expect(Array.from(container.querySelectorAll("a"))).toEqual(links);
      expect(links.map(link => link.getAttribute("href"))).toEqual(hrefs);
      expect(Array.from(container.querySelectorAll("mark")).map(mark => mark.textContent)).toEqual(highlights);
      for (const type of ["issue", "artifact", "agent", "project"]) expect(container.textContent).toContain(`Literal <b> & ${type} русский`);
      expect(container.querySelector('span[title="Custom document <b> & title"]')).not.toBeNull();
      expect(container.textContent).toContain("Custom document <b> & title");
      expect(container.querySelector("b")).toBeNull();
      expect(container.textContent).toContain(locale === "ru" ? "Комментарий" : "Comment");
      expect(container.textContent).toContain(locale === "ru" ? "Документ" : "Doc");
      expect(container.textContent).toContain(locale === "ru" ? "Артефакт" : "Artifact");
      expect(container.textContent).toContain(locale === "ru" ? "Агент" : "Agent");
      expect(container.textContent).toContain(locale === "ru" ? "Проект" : "Project");
      expect(container.textContent).toContain(locale === "ru" ? "2 мин" : "2m");
    }
  });

  it.each([[1, "результат"], [2, "результата"], [5, "результатов"], [21, "результат"]])("renders Russian recovery count %s and removes the same filter dimension", async (count, noun) => {
    const changed = vi.fn(), cleared = vi.fn();
    await i18n.changeLanguage("ru");
    await act(async () => root.render(<ZeroResultsRecovery
      query="Literal <b> & query"
      filters={{ status: ["todo"], projectId: "project-a" }}
      zeroResults={{ unfilteredTotal: count as number, loosenSuggestions: [{ filter: "projectId", values: ["project-a"], resultCount: count as number, additionalCount: count as number }] }}
      lookups={{ agentName: () => undefined, userName: () => undefined, projectName: () => "Literal <b> & project", labelName: () => undefined, currentUserId: null }}
      onChange={changed} onClearAll={cleared}
    />));
    expect(container.textContent).toContain(`+${count} ${noun}`);
    expect(container.textContent).toContain("Literal <b> & query");
    expect(container.textContent).toContain("Literal <b> & project");
    expect(container.querySelector("b")).toBeNull();
    const remove = Array.from(container.querySelectorAll("button")).find(button => button.textContent?.includes("Literal <b> & project"))!;
    await act(async () => remove.click());
    expect(changed).toHaveBeenCalledExactlyOnceWith({ status: ["todo"] });
    expect(cleared).not.toHaveBeenCalled();
  });
});
