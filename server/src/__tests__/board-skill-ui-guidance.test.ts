import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (relPath: string) => readFileSync(path.join(repoRoot, relPath), "utf8");

// Chat agents answer "how do I find X?" from the board skill; without this section they
// had no source for the web UI's quick search and told people to ask in chat instead.
describe("paperclip-board skill web UI guidance", () => {
  const skill = read("skills/paperclip-board/SKILL.md");
  const palette = read("ui/src/components/CommandPalette.tsx");
  const en = JSON.parse(read("ui/src/i18n/locales/en.json"));
  const ru = JSON.parse(read("ui/src/i18n/locales/ru.json"));
  const section = skill.slice(skill.indexOf("## Finding Things in the Web UI"), skill.indexOf("## Presentation Rules"));

  it("documents the quick-search shortcut the command palette actually binds", () => {
    expect(section.length).toBeGreaterThan(0);
    expect(palette).toMatch(/e\.key === "k" && \(e\.metaKey \|\| e\.ctrlKey\)/);
    expect(section).toContain("**Cmd+K**");
    expect(section).toContain("**Ctrl+K**");
  });

  it("documents the handoff to full search and the search route it opens", () => {
    expect(palette).toMatch(/event\.key === "Enter" && \(event\.metaKey \|\| event\.ctrlKey\)/);
    const searchAllItem = palette.match(/<CommandItem\b[^>]*onSelect=\{goFullSearch\}[^>]*>([\s\S]*?)<\/CommandItem>/)?.[1];
    expect(searchAllItem).toContain('i18nKey="searchUi.palette.searchAll"');
    expect(searchAllItem).toContain("values={{ query: searchQuery }}");
    expect(en.searchUi.palette.searchAll).toMatch(/^Search all for .*\{\{query\}\}/);
    expect(ru.searchUi.palette.searchAll).toMatch(/^Искать везде.*\{\{query\}\}/);
    expect(palette).toContain("go(buildFullSearchPath(searchQuery, parserContext))");
    expect(section).toContain("**Search all**");
    expect(section).toContain("Cmd/Ctrl+Enter");
    expect(read("ui/src/App.tsx")).toContain('<Route path="search"');
    expect(section).toContain("/{prefix}/search");
  });

  it("keeps the overlay promise to the shortcut and describes the sidebar Search item as full search", () => {
    // Classic exposes the link directly. Coordinator lists it under More.
    expect(read("ui/src/components/Sidebar.tsx")).toMatch(/<SidebarNavItem\s+to="\/search"\s+label=\{t\("sidebar\.search"\)\}/);
    expect(read("ui/src/components/CoordinatorSidebar.tsx")).toMatch(/get label\(\)\s*\{\s*return translateUi\("sidebar\.search"\);\s*\},\s*to: "\/search"/);
    expect(en.sidebar.search).toBe("Search");
    expect(ru.sidebar.search).toBe("Поиск");
    expect(section).toMatch(/sidebar \*\*Search\*\* item[^\n]*opens the full search page/);
    expect(section).not.toMatch(/search icon[^\n]*opens over the current page/i);
  });

  it("does not claim operators narrow the quick-search results", () => {
    // The palette sends only the parsed free text; operators apply after the full-search handoff.
    expect(palette).toMatch(/issuesApi\.list\(selectedCompanyId!, \{ q: quickSearchQuery, limit: 10/);
    expect(section).toContain("they do not narrow the quick-search results");
  });

  it("tells the agent it cannot operate the person's browser", () => {
    expect(section).toMatch(/cannot press keys, focus fields, or open the palette/);
  });

  it("is discoverable from the skill description", () => {
    const frontmatter = skill.slice(0, skill.indexOf("\n---", 4));
    expect(frontmatter).toContain("finding things in the Paperclip web UI");
  });
});
