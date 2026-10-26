import { renderAppError } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toolsApi } from "@/api/tools";
import { useAccountIdentity } from "@/api/companies-query";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ToolConnection } from "@paperclipai/shared";

export function ArcadeDiscoverySetup({ connection, onClose }: { connection: ToolConnection; onClose: () => void }) {
  useFullAppsTranslation();
  const [apiKey, setApiKey] = useState("");
  const [userId, setUserId] = useState("");
  const queries = useQueryClient();
  const { userId: viewingUserId, settled } = useAccountIdentity();
  const save = useMutation({ mutationFn: async () => {
      const result = await toolsApi.configureArcadeDiscovery(connection.id, { apiKey: apiKey.trim(), userId: userId.trim() });
      queries.setQueryData(queryKeys.tools.aggregatorApps(connection.id, viewingUserId), result);
    },
    onSuccess: onClose,
  });
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>{fullAppsT("fullApps.sync_arcade_accounts_23ac5c")}</DialogTitle>
      <DialogDescription><FullAppsTrans i18nKey="fullApps.see_apps_available_through_your_gateway_works_withou_24ced0" components={{ part1: <>{connection.name}</> }} /></DialogDescription>
    </DialogHeader>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <div className="space-y-2"><Label htmlFor="arcade-discovery-key">{fullAppsT("fullApps.project_api_key_6bfda6")}</Label>
        <p className="text-xs text-muted-foreground"><FullAppsTrans i18nKey="fullApps.create_a_key_in_for_the_same_project_as_this_gateway_f441d8" components={{ part1: <a className="underline" href="https://app.arcade.dev" target="_blank" rel="noopener noreferrer">Arcade</a> }} /></p>
        <Input id="arcade-discovery-key" type="password" autoComplete="off" required value={apiKey} onChange={event => setApiKey(event.target.value)} />
      </div>
      <div className="space-y-2"><Label htmlFor="arcade-discovery-user">{fullAppsT("fullApps.arcade_user_id_d06ee4")}</Label>
        <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.use_the_end_user_id_configured_for_this_gateway_s_si_40f288")}</p>
        <Input id="arcade-discovery-user" autoComplete="off" required value={userId} onChange={event => setUserId(event.target.value)} />
      </div>
      {save.isError ? <p role="alert" className="text-sm text-destructive">{save.error instanceof Error ? renderAppError(save.error) : fullAppsT("fullApps.couldn_t_save_account_sync_try_again_a3341a")}</p> : null}
      <DialogFooter className="sm:justify-between"><Button type="button" variant="ghost" disabled={save.isPending} onClick={onClose}>{fullAppsT("fullApps.cancel_19766e")}</Button>
        <Button type="submit" disabled={!settled || save.isPending || !apiKey.trim() || !userId.trim()}>{save.isPending ? fullAppsT("fullApps.saving_23e392") : fullAppsT("fullApps.save_and_sync_61cc38")}</Button>
      </DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
