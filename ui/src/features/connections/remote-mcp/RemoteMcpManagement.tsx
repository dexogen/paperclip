import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

/** Shared by the saved connection and its interactive review stories. */
export function RemoteMcpManagement({ providerName, connected = true, canReconnect = true, canDisconnect = true, busy = false, onReconnect, onManage, onDisconnect }: {
  providerName: string;
  connected?: boolean;
  canReconnect?: boolean;
  canDisconnect?: boolean;
  busy?: boolean;
  onReconnect: () => void;
  onManage: () => void;
  onDisconnect: () => void | Promise<unknown>;
}) {
  useFullAppsTranslation();
  const [confirming, setConfirming] = useState(false);
  return <section className="space-y-4">
    <h2 className="text-sm font-semibold">{fullAppsT("fullApps.connection_settings_b4ddb3")}</h2>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" disabled={!canReconnect || busy} onClick={onReconnect}>{fullAppsT("fullApps.reconnect_bf8a9e")}</Button>
      <Button variant="outline" onClick={onManage}><FullAppsTrans i18nKey="fullApps.manage_in_b9f854" components={{ part1: <>{providerName}</> }} /></Button>
      {connected && canDisconnect && <AlertDialog open={confirming} onOpenChange={(open) => { if (!busy) setConfirming(open); }}>
        <AlertDialogTrigger asChild><Button variant="ghost" className="text-destructive">{fullAppsT("externalAgentUi.muse.disconnect")}</Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><FullAppsTrans i18nKey="fullApps.disconnect_d91289" components={{ part1: <>{providerName}</> }} /></AlertDialogTitle>
            <AlertDialogDescription>{fullAppsT("fullApps.delete_this_connection_s_saved_credentials_and_stop__491357")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{fullAppsT("fullApps.cancel_19766e")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={async (event) => {
              event.preventDefault();
              try { await onDisconnect(); setConfirming(false); } catch { /* The controller displays the failure. */ }
            }}>{busy ? fullAppsT("fullApps.disconnecting_cb2b6a") : fullAppsT("fullApps.disconnect_connection_d830f6")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}
    </div>
  </section>;
}
