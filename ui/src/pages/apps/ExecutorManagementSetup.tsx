import { AppDisplayError } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ToolConnection } from "@paperclipai/shared";
import { aggregatorManagementUrl } from "@paperclipai/shared/aggregator-apps";
import { toolsApi } from "@/api/tools";
import { useAccountIdentity } from "@/api/companies-query";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ExecutorManagementSetup({ connection, onClose }: { connection: ToolConnection; onClose: () => void }) {
  useFullAppsTranslation();
  const [url, setUrl] = useState(typeof connection.config?.managementUrl === "string" ? connection.config?.managementUrl : "");
  const queries = useQueryClient();
  const { userId, settled } = useAccountIdentity();
  const save = useMutation({ mutationFn: async () => {
    const managementUrl = aggregatorManagementUrl("executor", url.trim());
    if (!managementUrl) throw new AppDisplayError("fullApps.enter_an_https_console_url_without_credentials_b8db48");
    await toolsApi.updateConnection(connection.id, { config: { ...connection.config, managementUrl } });
    await queries.invalidateQueries({ queryKey: queryKeys.tools.aggregatorApps(connection.id, userId) });
    const result = await toolsApi.syncAggregatorApps(connection.id, true);
    queries.setQueryData(queryKeys.tools.aggregatorApps(connection.id, userId), result);
  }, onSuccess: async () => { await queries.invalidateQueries({ queryKey: queryKeys.tools.connections(connection.companyId) }); onClose(); } });
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>{fullAppsT("fullApps.executor_console_f02454")}</DialogTitle><DialogDescription><FullAppsTrans i18nKey="fullApps.choose_where_to_manage_accounts_for_include_your_wor_7b61df" components={{ part1: <>{connection.name}</> }} /></DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <div className="space-y-2"><Label htmlFor="executor-console-url">{fullAppsT("fullApps.console_url_2550c5")}</Label><Input id="executor-console-url" type="url" required value={url} onChange={event => setUrl(event.target.value)} /></div>
      {save.isError ? <p role="alert" className="text-sm text-destructive">{save.error.message}</p> : null}
      <DialogFooter className="sm:justify-between"><Button type="button" variant="ghost" onClick={onClose} disabled={save.isPending}>{fullAppsT("fullApps.cancel_19766e")}</Button><Button type="submit" disabled={!settled || save.isPending || !url.trim()}>{save.isPending ? fullAppsT("fullApps.saving_23e392") : fullAppsT("inboxPolicy.save")}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
