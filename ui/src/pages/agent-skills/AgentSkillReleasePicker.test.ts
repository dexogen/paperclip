import { describe, expect, it } from "vitest";
import type { CompanySkillVersion } from "@paperclipai/shared";
import { i18n } from "../../i18n";
import {
  formatReleaseDate,
  releaseName,
  releaseOptionLabel,
  releaseShortLabel,
} from "./AgentSkillReleasePicker";

function makeRelease(overrides: Partial<CompanySkillVersion> = {}): CompanySkillVersion {
  return {
    id: "v7-roster",
    companyId: "company-1",
    companySkillId: "skill-1",
    revisionNumber: 7,
    label: "V7 — Roster champion",
    releaseId: "v7-roster",
    releaseName: "V7 — Roster champion",
    releasedAt: "2026-07-21" as unknown as CompanySkillVersion["releasedAt"],
    fileInventory: [],
    authorAgentId: null,
    authorUserId: null,
    createdAt: new Date("2026-07-21T00:00:00Z"),
    ...overrides,
  };
}

describe("formatReleaseDate", () => {
  it("returns a plain calendar date verbatim", () => {
    expect(formatReleaseDate("2026-07-21" as never)).toBe("2026-07-21");
  });

  it("collapses a full timestamp to its calendar day", () => {
    // Anchored to local noon. `formatReleaseDate` reads the *local* calendar
    // fields (getFullYear/getMonth/getDate), so a UTC anchor does not hold the
    // day regardless of offset as it once claimed here — noon UTC is 02:00 on
    // the 16th at UTC+14, and the assertion failed there.
    const localNoon = new Date(2026, 6, 15, 12, 0, 0, 0);
    expect(formatReleaseDate(localNoon.toISOString() as never)).toBe("2026-07-15");
  });

  it("returns null for missing or unparseable input", () => {
    expect(formatReleaseDate(null)).toBeNull();
    expect(formatReleaseDate("not-a-date" as never)).toBeNull();
  });
});

describe("releaseOptionLabel", () => {
  it("renders name and released date", () => {
    expect(releaseOptionLabel(makeRelease())).toBe("V7 — Roster champion · released 2026-07-21");
  });

  it("falls back gracefully without a date", () => {
    expect(releaseOptionLabel(makeRelease({ releasedAt: null }))).toBe("V7 — Roster champion");
  });
});

describe("releaseName", () => {
  it("returns the full release name without the date suffix", () => {
    expect(releaseName(makeRelease())).toBe("V7 — Roster champion");
  });

  it("falls back through label and releaseId", () => {
    expect(releaseName(makeRelease({ releaseName: null, label: "Fallback label" }))).toBe(
      "Fallback label",
    );
    expect(
      releaseName(makeRelease({ releaseName: null, label: null, releaseId: "raw-id" })),
    ).toBe("raw-id");
  });
});

describe("releaseShortLabel", () => {
  it("uses the token before the em-dash separator", () => {
    expect(releaseShortLabel(makeRelease())).toBe("V7");
  });

  it("uses the whole name when there is no separator", () => {
    expect(releaseShortLabel(makeRelease({ releaseName: "Champion", label: null }))).toBe("Champion");
  });
});

it("localizes only owned release captions and preserves raw names and calendar dates", () => {
  const ru = i18n.getFixedT("ru");
  const raw = makeRelease({ releaseName: "Release <b>raw</b>" });
  expect(releaseOptionLabel(raw, ru)).toBe("Release <b>raw</b> · дата выпуска: 2026-07-21");
  expect(releaseName(raw, ru)).toBe("Release <b>raw</b>");
  expect(releaseShortLabel(raw, ru)).toBe("Release <b>raw</b>");
  const absent = makeRelease({ releaseName: null, label: null, releaseId: null });
  expect(releaseName(absent, ru)).toBe("Выпуск");
  expect(releaseShortLabel(absent, ru)).toBe("Выпуск");
  expect(releaseName(absent)).toBe("Release");
  expect(releaseName(makeRelease({ releaseName: "Release" }), ru)).toBe("Release");
});
