import { describe, expect, it } from "vitest";
import { i18n } from "../../i18n";
import { buildAgentSkillSourceMeta } from "./agent-skill-source";

function source(overrides: Parameters<typeof buildAgentSkillSourceMeta>[0]) {
  return buildAgentSkillSourceMeta(overrides).label;
}

describe("buildAgentSkillSourceMeta", () => {
  it("shows GitHub skills as owner/repo text", () => {
    expect(source({
      sourceBadge: "github",
      sourceLabel: "https://github.com/acme/review-skill/tree/main/skills/review",
      sourceLocator: null,
      sourceType: "github",
    })).toBe("GitHub · acme/review-skill");
  });

  it("does not surface long filesystem labels for local skills", () => {
    expect(source({
      sourceBadge: "local",
      sourceLabel: "/Users/dev/work/paperclip/skills/private-review",
      sourceLocator: null,
      sourceType: "local_path",
    })).toBe("Local folder");
  });

  it("keeps human-readable project scan labels for local skills", () => {
    expect(source({
      sourceBadge: "local",
      sourceLabel: "Paperclip App / Engineering workspace",
      sourceLocator: null,
      sourceType: "local_path",
    })).toBe("Paperclip App / Engineering workspace");
  });

  it("does not surface long filesystem labels for catalog skills", () => {
    expect(source({
      sourceBadge: "catalog",
      sourceLabel: "/srv/paperclip/home/.paperclip/instances/default/skills/company-id/__catalog__/briefs-discover-cards--68f7e3ad47",
      sourceLocator: null,
      sourceType: "catalog",
    })).toBe("Catalog");
  });

  it("keeps human-readable catalog labels", () => {
    expect(source({
      sourceBadge: "catalog",
      sourceLabel: "Bundled catalog",
      sourceLocator: null,
      sourceType: "catalog",
    })).toBe("Bundled catalog");
  });
});

it("translates selected fallbacks while preserving source labels that resemble them", () => {
  const ru = i18n.getFixedT("ru");
  const local = { sourceBadge: "local", sourceLabel: "/hidden/path", sourceLocator: null, sourceType: "local_path" } as const;
  expect(buildAgentSkillSourceMeta(local, ru).label).toBe("Локальная папка");
  expect(buildAgentSkillSourceMeta(local).label).toBe("Local folder");
  expect(buildAgentSkillSourceMeta({ ...local, sourceLabel: "Local folder" }, ru).label).toBe("Local folder");
  const catalog = { ...local, sourceBadge: "catalog", sourceType: "catalog" } as const;
  expect(buildAgentSkillSourceMeta(catalog, ru).label).toBe("Каталог");
  expect(buildAgentSkillSourceMeta({ ...catalog, sourceLabel: "Catalog" }, ru).label).toBe("Catalog");
  const managed = { ...catalog, sourceBadge: "paperclip", sourceLabel: null } as const;
  expect(buildAgentSkillSourceMeta(managed, ru).label).toBe("Под управлением Paperclip");
  expect(buildAgentSkillSourceMeta({ ...managed, sourceLabel: "Paperclip managed" }, ru).label).toBe("Paperclip managed");
  expect(buildAgentSkillSourceMeta({ ...managed, sourceLabel: "Raw <b>literal</b>" }, ru).label).toBe("Raw <b>literal</b>");
});
