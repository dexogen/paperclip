import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import {
  applyAssigneeToken,
  assigneeToken,
  buildFilterChips,
  clearFilterDimension,
  describeLoosenSuggestion,
  parseSearchSort,
  searchSortLabel,
  updatedWithinLabel,
  type FilterChipLookups,
  type SearchFilters,
} from "./search-filters";

const lookups: FilterChipLookups = {
  currentUserId: "user-current",
  agentName: (id) => id === "agent-a" ? "Агент <b> & Agent" : undefined,
  userName: (id) => id === "user-a" ? "Имя пользователя / User" : undefined,
  projectName: (id) => id === "project-a" ? "Проект <b> & Project" : undefined,
  labelName: (id) => id === "label-a" ? "Метка / Label" : undefined,
};

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("search filter presentation", () => {
  it("translates chip captions while preserving canonical IDs, removals and custom names", () => {
    const filters: SearchFilters = {
      status: ["todo", "in_progress"], priority: ["high"], assigneeAgentId: "agent-a",
      projectId: "project-a", labelId: "label-a", updatedWithin: "7d",
    };
    const english = buildFilterChips(filters, lookups);
    const russian = buildFilterChips(filters, lookups, i18n.getFixedT("ru"));
    expect(russian.map((chip) => chip.id)).toEqual(english.map((chip) => chip.id));
    expect(russian.map((chip) => chip.label)).toEqual([
      "Статус: К выполнению", "Статус: В работе", "Приоритет: Высокий",
      "Исполнитель: Агент <b> & Agent", "Проект: Проект <b> & Project", "Метка: Метка / Label",
      "Обновлено: За последние 7 дней",
    ]);
    expect(english[0]?.label).toBe("Status: Todo");
    for (const [index, chip] of russian.entries()) {
      expect(chip.remove(filters)).toEqual(english[index]!.remove(filters));
    }
    expect(russian[0]!.remove(filters).status).toEqual(["in_progress"]);
    expect(russian.find((chip) => chip.id === "assignee")!.remove(filters).assigneeAgentId).toBeUndefined();
    expect(filters.status).toEqual(["todo", "in_progress"]);
  });

  it("keeps English helper defaults after the application changes to Russian", async () => {
    await i18n.changeLanguage("ru");
    expect(searchSortLabel("updated")).toBe("Recently updated");
    expect(updatedWithinLabel("7d")).toBe("Last 7 days");
    expect(updatedWithinLabel("2w")).toBe("Updated ≤ 2w");
    expect(updatedWithinLabel("2w", i18n.getFixedT("ru"))).toBe("За последние 2w");
    expect(buildFilterChips({ assigneeAgentId: null }, lookups)[0]?.label).toBe("Assignee: Unassigned");
    expect(searchSortLabel("updated", i18n.getFixedT("ru"))).toBe("Недавно обновлённые");
    expect(parseSearchSort(new URLSearchParams("sort=updated"))).toBe("updated");
    expect(parseSearchSort(new URLSearchParams("sort=Недавно+обновлённые"))).toBe("relevance");
  });

  it("translates recovery descriptions without replacing user-owned names or mutation dimensions", () => {
    const t = i18n.getFixedT("ru");
    expect(describeLoosenSuggestion("status", ["todo", "blocked"], lookups, t)).toBe("Статус: К выполнению, Заблокировано");
    expect(describeLoosenSuggestion("assigneeUserId", ["user-current", "user-a", "unknown"], lookups, t)).toBe("Исполнитель: Я, Имя пользователя / User, Пользователь");
    expect(describeLoosenSuggestion("projectId", ["project-a"], lookups, t)).toBe("Проект: Проект <b> & Project");
    expect(describeLoosenSuggestion("updatedAfter", ["2026-10-01"], lookups, t)).toBe("Период обновления");
    expect(clearFilterDimension({ status: ["todo"], assigneeUserId: "user-current" }, "assigneeUserId")).toEqual({ status: ["todo"] });
    const unassigned = applyAssigneeToken({ status: ["todo"], assigneeUserId: "user-current" }, "none", lookups.currentUserId);
    expect(unassigned).toEqual({ status: ["todo"], assigneeAgentId: null });
    expect(assigneeToken(unassigned, lookups.currentUserId)).toBe("none");
  });
});
