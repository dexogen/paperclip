import { expect, it } from "vitest";
import { githubHealthDisplay } from "../services/tool-access/connections/projection.js";

it("retains GitHub health provenance only for its original observation", () => {
  const checked = new Date("2026-10-27T09:00:00Z");
  const marker = { source: "paperclip-github", version: 1, code: "installation_suspended", message: "Owned status", checkedAt: checked.toISOString() };
  const row = { config: { sourceTemplateKey: "github", paperclipHealthDisplay: marker }, healthMessage: marker.message, healthCheckedAt: checked };
  expect(githubHealthDisplay(row)).toEqual({ source: "paperclip-github", version: 1, code: "installation_suspended" });
  expect(githubHealthDisplay({ ...row, healthMessage: "New provider status" })).toBeUndefined();
  expect(githubHealthDisplay({ ...row, healthCheckedAt: new Date(checked.getTime() + 1) })).toBeUndefined();
  expect(githubHealthDisplay({ ...row, healthCheckedAt: null })).toBeUndefined();
  expect(githubHealthDisplay({ ...row, config: { ...row.config, sourceTemplateKey: "custom" } })).toBeUndefined();
  for (const value of [undefined, {}, Object.create(marker), { ...marker, version: 2 }, { ...marker, code: "future" }]) {
    expect(githubHealthDisplay({ ...row, config: { ...row.config, paperclipHealthDisplay: value } })).toBeUndefined();
  }
});
