import { useTranslation } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { grokBotApi } from "@/api/grokBot";
import { Link } from "@/lib/router";
/** Reports observed Paperclip activity; this is not a provider availability indicator. */
export function GrokBotWorkSummary({ companyId, agentId }: { companyId: string; agentId: string }) {
  const { t, i18n } = useTranslation();
  const state = useQuery({ queryKey: ["grok-binding", companyId, agentId], queryFn: ({ signal }) => grokBotApi.connection(companyId, agentId, signal), retry: false, refetchInterval: 10000 });
  const data = state.data, binding = data?.binding, routine = binding?.routine;
  return <div className="space-y-2 text-sm">
    {state.error && <p role="alert" className="text-destructive">{t("agentConnectionUi.grok.refreshError", { message: state.error.message })}</p>}
    <p>{data?.recoveryNeeded ? t("agentConnectionUi.grok.recoveryNeeded") : binding?.assignment?.status === "offered" ? t("agentConnectionUi.grok.awaitingAcknowledgement") : binding?.assignment ? t("agentConnectionUi.grok.working") : routine?.verified ? t("agentConnectionUi.grok.noActiveSession") : t("agentConnectionUi.grok.incomplete")}</p>
    {data?.currentTask && <Link className="underline" to={`/issues/${data.currentTask.id}`}>{data.currentTask.identifier}: {data.currentTask.title}</Link>}
    <p className="text-muted-foreground">{data?.queuedTaskCount == null ? t("agentConnectionUi.grok.checking") : t("agentConnectionUi.grok.queued", { count: data.queuedTaskCount })}</p>
    <p className="text-muted-foreground">{routine?.lastContactAt ? t("agentConnectionUi.grok.lastContact", { date: new Date(routine.lastContactAt).toLocaleString(i18n.resolvedLanguage) }) : t("agentConnectionUi.grok.noContact")}</p>
    <p className="text-xs text-muted-foreground">{t("agentConnectionUi.grok.activityDescription")}</p>
  </div>;
}
