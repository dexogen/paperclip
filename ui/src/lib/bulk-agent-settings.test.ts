import type { Agent, AiConnectionList } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { describe, expect, it } from "vitest";
import { bulkAgentDisabledReason, bulkAgentHarnessLabel, bulkConnectionName, mapBulkAgents, sameBinding } from "./bulk-agent-settings";

describe("bulk agent writes", () => {
  it("bounds concurrent requests and retains each success and failure in input order", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapBulkAgents([0, 1, 2, 3, 4, 5, 6], async id => {
      active++;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, id === 0 ? 15 : 1));
      active--;
      if (id === 2) throw new Error("Unavailable");
      return id;
    });
    expect(peak).toBe(4);
    expect(results.map(r => r.status === "fulfilled" ? r.value : "failed")).toEqual([0, 1, "failed", 3, 4, 5, 6]);
  });
  it("compares binding identity independently of JSON field order", () => {
    expect(sameBinding({ provider: "openai", method: "api_key", mode: "responsible_user" }, { mode: "responsible_user", method: "api_key", provider: "openai" })).toBe(true);
    expect(sameBinding(undefined, { mode: "responsible_user", method: "api_key", provider: "openai" })).toBe(false);
  });
  it("keeps fixed English helper defaults and literal connection names with explicit Russian presentation", () => {
    const agent = { adapterType: "codex_local", adapterConfig: {}, runtimeConfig: {}, status: "terminated" } as Agent;
    const ru = i18n.getFixedT("ru");
    expect(bulkAgentHarnessLabel("process")).toBe("Process");
    expect(bulkAgentHarnessLabel("process", ru)).toBe("Процесс");
    expect(bulkAgentHarnessLabel("external-custom", ru)).toBe("External-Custom");
    expect(bulkAgentDisabledReason(agent)).toBe("This agent is not available for bulk edits");
    expect(bulkAgentDisabledReason(agent, ru)).toBe("Этот агент недоступен для массового изменения");
    expect(bulkConnectionName(undefined)).toBe("Local credentials");
    expect(bulkConnectionName(undefined, undefined, ru)).toBe("Локальные учётные данные");
    const binding = { provider: "openai", method: "api_key", mode: "shared", connectionId: "connection", grantId: "grant" } as const;
    for (const name of ["Local credentials", "Assigned connection", "<strong>&", ""]) {
      const accounts = { connections: [{ id: binding.connectionId, grantId: binding.grantId, name }] } as AiConnectionList;
      expect(bulkConnectionName(binding, accounts, ru)).toBe(name);
    }
    expect(bulkConnectionName(binding, undefined, ru)).toBe("Назначенное подключение");
  });

});
