import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, DollarSign, PlayCircle, ReceiptText } from "lucide-react";
import type { CostByAgent, CostByAgentModel } from "@paperclipai/shared";
import { costsApi } from "../api/costs";
import { CostAmount } from "../components/CostAmount";
import { EmptyState } from "../components/EmptyState";
import { MetricCard } from "../components/MetricCard";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { useDateRange, PRESET_KEYS, PRESET_LABELS } from "../hooks/useDateRange";
import { queryKeys } from "../lib/queryKeys";
import { billingTypeDisplayName, formatCents, formatTokens, providerDisplayName } from "../lib/utils";

export function agentCostRow(rows: readonly CostByAgent[] | undefined, agentId: string): CostByAgent | null {
  return rows?.find((row) => row.agentId === agentId) ?? null;
}

export function agentModelCostRows(rows: readonly CostByAgentModel[] | undefined, agentId: string): CostByAgentModel[] {
  return (rows ?? [])
    .filter((row) => row.agentId === agentId)
    .sort((a, b) => b.costCents - a.costCents);
}

export function AgentCostsPanel({ agentId, agentName, companyId }: { agentId: string; agentName: string; companyId: string }) {
  useUiTranslation();
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, from, to, customReady } = useDateRange();
  const reportFrom = ["custom", "mtd", "ytd"].includes(preset) ? from || undefined : undefined;
  const reportTo = preset === "custom" ? to || undefined : preset;
  const spend = useQuery({
    queryKey: [...queryKeys.costs(companyId, reportFrom, reportTo), "agent", agentId],
    queryFn: async () => {
      const [byAgent, byAgentModel] = await Promise.all([
        costsApi.byAgent(companyId, from || undefined, to || undefined),
        costsApi.byAgentModel(companyId, from || undefined, to || undefined),
      ]);
      return { row: agentCostRow(byAgent, agentId), models: agentModelCostRows(byAgentModel, agentId) };
    },
    enabled: customReady,
    refetchInterval: 30_000,
  });
  const row = spend.data?.row ?? null;
  const models = spend.data?.models ?? [];
  const totalTokens = useMemo(
    () => (row ? row.inputTokens + row.cachedInputTokens + row.outputTokens : 0),
    [row],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={translateUi("interfaceUpdates.cost_period_8e4e3bd5")}>
        {PRESET_KEYS.map((key) => (
          <Button key={key} variant={preset === key ? "secondary" : "ghost"} size="sm" onClick={() => setPreset(key)} aria-pressed={preset === key}>
            {PRESET_LABELS[key]}
          </Button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
          <input type="date" aria-label={translateUi("interfaceUpdates.from_21819769")} value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
          <span className="text-sm text-muted-foreground">{translateUi("interfaceUpdates.to_663ea1bf")}</span>
          <input type="date" aria-label={translateUi("decisionsUi.date.to")} value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
        </div>
      ) : null}
      {!customReady ? (
        <p className="text-sm text-muted-foreground">{translateUi("costsUi.selectDates")}</p>
      ) : spend.isLoading ? (
        <PageSkeleton variant="costs" />
      ) : spend.error && !spend.data ? (
        <p role="alert" className="text-sm text-destructive">{agentName}{translateUi("interfaceUpdates.s_costs_could_not_be_loaded_please_try_again_short_339f150c")}</p>
      ) : !row ? (
        <EmptyState icon={DollarSign} message={translateUi("interfaceUpdates.no_cost_events_for_value_in_this_period_ff612674", { value1: (agentName) })} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard appearance="card" icon={ReceiptText} value={formatCents(row.costCents)} label={translateUi("fullPages.spend")} description={translateUi("interfaceUpdates.value_ledger_events_81e8d921", { value1: (row.eventCount) })} />
            <MetricCard appearance="card" icon={Coins} value={formatTokens(totalTokens)} label={translateUi("fullPages.tokens")} description={translateUi("interfaceUpdates.in_value_value_cached_out_value_ebe9982b", { value1: (formatTokens(row.inputTokens + row.cachedInputTokens)), value2: (formatTokens(row.cachedInputTokens)), value3: (formatTokens(row.outputTokens)) })} />
            <MetricCard appearance="card" icon={PlayCircle} value={row.apiRunCount + row.subscriptionRunCount} label={translateUi("skillsGap.runs")} description={translateUi("interfaceUpdates.value_api_value_subscription_61b60653", { value1: (row.apiRunCount), value2: (row.subscriptionRunCount) })} />
          </div>
          <section className="space-y-3" aria-labelledby="agent-cost-models-heading">
            <h3 id="agent-cost-models-heading" className="text-sm font-medium text-foreground">{translateUi("interfaceUpdates.by_model_2fbd410f")}</h3>
            {models.length === 0 ? (
              <p className="text-sm text-muted-foreground">{translateUi("interfaceUpdates.no_model_breakdown_for_this_period_b136e20b")}</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {models.map((model) => {
                  const share = row.costCents > 0 ? Math.round((model.costCents / row.costCents) * 100) : 0;
                  return (
                    <li key={`${model.provider}:${model.model}:${model.billingType}`} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-foreground">
                          {providerDisplayName(model.provider)}
                          <span className="mx-1 text-muted-foreground">/</span>
                          <span className="font-mono">{model.model}</span>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {providerDisplayName(model.biller)} · {billingTypeDisplayName(model.billingType)}
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <CostAmount
                          costCents={model.costCents}
                          eventCount={model.eventCount}
                          estimatedEventCount={model.estimatedEventCount}
                          suffix={<span className="ml-1 font-normal text-muted-foreground">({share}%)</span>}
                        />
                        <div className="text-xs text-muted-foreground">
                          {formatTokens(model.inputTokens + model.cachedInputTokens + model.outputTokens)} {translateUi("agentDetailUi.run.tokens")}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
