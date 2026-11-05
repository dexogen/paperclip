import { t as translateUi } from "@/i18n";
import { useTranslation } from "@/i18n";
import { describeError } from "@/api/errors";
import { useQuery } from "@tanstack/react-query";
import { grokBotApi } from "@/api/grokBot";
import { Link } from "@/lib/router";
/** Reports observed Paperclip activity; this is not a provider availability indicator. */
export function GrokBotWorkSummary({ companyId, agentId }: { companyId: string; agentId: string }) {
  const { t, i18n } = useTranslation();
  const state = useQuery({ queryKey: ["grok-binding", companyId, agentId], queryFn: ({ signal }) => grokBotApi.connection(companyId, agentId, signal), refetchInterval: 10000 });
  const data = state.data, binding = data?.binding, routine = binding?.routine;
  return <div className="space-y-2 text-sm">
    {state.error && <p role="alert" className="text-destructive">{translateUi("interfaceUpdates.connection_status_could_not_be_refreshed_31cfa60e")} {describeError(state.error).body}</p>}
    <p>{data?.recoveryNeeded ? translateUi("agentConnectionUi.grok.recoveryNeeded") : binding?.assignment?.status === "offered" ? translateUi("agentConnectionUi.grok.awaitingAcknowledgement") : binding?.assignment ? translateUi("agentConnectionUi.grok.working") : routine?.verified ? translateUi("agentConnectionUi.grok.noActiveSession") : translateUi("agentConnectionUi.grok.incomplete")}</p>
    {data?.currentTask && <Link className="underline" to={`/issues/${data.currentTask.id}`}>{data.currentTask.identifier}: {data.currentTask.title}</Link>}
    <p className="text-muted-foreground">{data?.queuedTaskCount == null ? t("agentConnectionUi.grok.checking") : t("agentConnectionUi.grok.queued", { count: data.queuedTaskCount })}</p>
    <p className="text-muted-foreground">{routine?.lastContactAt ? t("agentConnectionUi.grok.lastContact", { date: new Date(routine.lastContactAt).toLocaleString(i18n.resolvedLanguage) }) : t("agentConnectionUi.grok.noContact")}</p>
    <p className="text-xs text-muted-foreground">{t("agentConnectionUi.grok.activityDescription")}</p>
  </div>;
}
