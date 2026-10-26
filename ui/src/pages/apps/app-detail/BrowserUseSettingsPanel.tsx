import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  ConnectionGrantsResponse,
  ToolConnection,
} from "@paperclipai/shared";
import { browserUseApi } from "@/api/browser-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

function CredentialSettings({
  companyId,
  grantId,
}: {
  companyId: string;
  grantId: string;
}) {
  useFullAppsTranslation();
  const id = useId();
  const saved = useQuery({
    queryKey: ["browser-use-cloud-settings", grantId],
    queryFn: () => browserUseApi.settings(companyId, grantId),
  });
  const profiles = useQuery({
    queryKey: ["browser-use-cloud-profiles", grantId],
    queryFn: () => browserUseApi.profiles(companyId, grantId),
    retry: false,
  });
  const [allowed, setAllowed] = useState<string[]>([]);
  const [limit, setLimit] = useState("");
  useEffect(() => {
    if (saved.data) {
      setAllowed(saved.data.allowedProfileIds);
      setLimit(saved.data.maxCostUsd?.toString() ?? "");
    }
  }, [saved.data]);
  const save = useMutation({
    mutationFn: () =>
      browserUseApi.saveSettings(companyId, grantId, {
        allowedProfileIds: allowed,
        maxCostUsd: limit ? Number(limit) : null,
      }),
    onSuccess: () => {
      void saved.refetch();
    },
  });
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${id}-limit`}>{fullAppsT("fullApps.maximum_cost_per_browser_run_usd_b822c9")}</Label>
        <Input
          id={`${id}-limit`}
          type="number"
          min="0"
          step="0.01"
          value={limit}
          placeholder={fullAppsT("fullApps.use_the_remaining_paperclip_budget_40c92f")}
          onChange={(e) => setLimit(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.the_agent_can_choose_a_lower_limit_paperclip_also_ap_9063e2")}</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{fullAppsT("fullApps.allowed_saved_profiles_f8d4da")}</legend>
        <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.fresh_browsers_are_the_default_selected_profiles_let_69a925" components={{ part1: <>{" "}</>, part2: <a
            href="https://cloud.browser-use.com"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Browser Use Cloud
          </a> }} /></p>
        {profiles.data?.map((p) => (
          <Label key={p.id} className="flex items-center gap-2">
            <Checkbox
              checked={allowed.includes(p.id)}
              onCheckedChange={(checked) =>
                setAllowed((previous) =>
                  checked
                    ? [...previous, p.id]
                    : previous.filter((id) => id !== p.id),
                )
              }
            />
            {p.name ?? p.id}
          </Label>
        ))}
        {profiles.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.no_saved_profiles_700c63")}</p>
        )}
        {profiles.isLoading && (
          <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.loading_profiles_16b0bb")}</p>
        )}
        {profiles.isError && (
          <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.could_not_load_profiles_a6c9d7")}{" "}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void profiles.refetch()}
            >{fullAppsT("newIssue.retry")}</Button>
          </p>
        )}
      </fieldset>
      {saved.isError || save.isError ? (
        <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.could_not_save_or_load_browser_settings_check_your_c_45cef7")}</p>
      ) : null}
      {save.isSuccess && (
        <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.browser_settings_saved_654337")}</p>
      )}
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={
            !saved.data ||
            save.isPending ||
            Boolean(
              limit && (!Number.isFinite(Number(limit)) || Number(limit) <= 0),
            )
          }
          onClick={() => save.mutate()}
        >{fullAppsT("fullApps.save_browser_settings_554278")}</Button>
      </div>
    </div>
  );
}
export function BrowserUseSettingsPanel({
  connection,
  grants,
}: {
  connection: ToolConnection;
  grants?: ConnectionGrantsResponse;
}) {
  useFullAppsTranslation();
  const eligible =
    grants?.grants.filter(
      (g) =>
        g.status === "active" &&
        ((g.kind === "organization" && g.capabilities?.canEditAudience) ||
          g.subjectUserId === grants.currentUserId ||
          g.createdByUserId === grants.currentUserId),
    ) ?? [];
  const [selected, setSelected] = useState("");
  const grantId = selected || eligible[0]?.id;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{fullAppsT("fullApps.browser_settings_294350")}</h2>
      {eligible.length > 1 && (
        <Label className="flex flex-col gap-2">{fullAppsT("fullApps.credential_b1c42b")}<select
            value={grantId}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border bg-background p-2"
          >
            {eligible.map((g, i) => (
              <option key={g.id} value={g.id}><FullAppsTrans i18nKey="fullApps.credential_c0fda8" components={{ part1: <>{g.kind === "user" ? fullAppsT("fullApps.personal_845f92") : fullAppsT("fullApps.shared_e3c4b3")}</>, part2: <>{i + 1}</> }} /></option>
            ))}
          </select>
        </Label>
      )}
      {grantId ? (
        <CredentialSettings
          key={grantId}
          companyId={connection.companyId}
          grantId={grantId}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.the_credential_owner_or_a_shared_connection_manager__54287e")}</p>
      )}
    </section>
  );
}
