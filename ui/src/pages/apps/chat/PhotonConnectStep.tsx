import { renderAppDisplayText } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  chatEndpointsApi,
  type ChatEndpoint,
  type ChatEndpointSetupAction,
} from "@/api/chatEndpoints";
import { sanitizedSetupErrorDisplay } from "./chat-setup-error";

export function PhotonConnectStep({
  endpoint,
  agentName,
  repairing,
  pending,
  onAction,
}: {
  endpoint: ChatEndpoint;
  agentName: string;
  repairing: boolean;
  pending: boolean;
  onAction(
    action: ChatEndpointSetupAction,
    values?: Record<string, string>,
  ): void;
}) {
  useFullAppsTranslation();
  const [projectId, setProjectId] = useState(endpoint.providerAccountId ?? "");
  const [projectSecret, setProjectSecret] = useState("");
  const [lineId, setLineId] = useState("");
  const inspection = useMutation({
    mutationFn: () =>
      chatEndpointsApi.inspectPhoton(endpoint.id, {
        projectId: projectId.trim(),
        projectSecret,
      }),
    onSuccess: (result) => {
      const eligible = result.lines.filter((line) => line.eligible);
      setLineId(eligible.length === 1 ? eligible[0].lineId : "");
    },
  });
  const resetInspection = () => {
    inspection.reset();
    setLineId("");
  };
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">{fullAppsT("fullApps.connect_imessage_photon_32def6")}</h1>
        <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.connect_to_photon_cloud_pro_supports_direct_messages_b64f7a" components={{ part1: <>{agentName}</> }} /></p>
        <p className="text-sm">
          <a
            className="underline"
            href="https://app.photon.codes/"
            target="_blank"
            rel="noreferrer"
          >{fullAppsT("fullApps.photon_dashboard_5da11f")}</a>
          {" · "}
          <a
            className="underline"
            href="https://photon.codes/docs/spectrum-ts/providers/imessage/connection-and-routing"
            target="_blank"
            rel="noreferrer"
          >{fullAppsT("fullApps.photon_line_setup_d3a4d1")}</a>
        </p>
      </div>
      {repairing && (
        <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.reconnect_keeps_this_project_and_leave_the_secret_bl_d3f2d7" components={{ part1: <>{" "}</>, part2: <>{endpoint.photonAllocation === "shared" ? fullAppsT("fullApps.shared_dm_allocation_10e5a4") : endpoint.botExternalId ?? fullAppsT("fullApps.dedicated_number_4475cb")}</> }} /></p>
      )}
      <label className="grid gap-2 text-sm font-medium">{fullAppsT("companySettings.observability.projectId")}<Input
          value={projectId}
          autoComplete="off"
          disabled={pending || inspection.isPending || !!endpoint.botExternalId}
          onChange={(event) => {
            setProjectId(event.target.value);
            resetInspection();
          }}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">{fullAppsT("fullApps.project_secret_e34f01")}<Input
          type="password"
          value={projectSecret}
          autoComplete="new-password"
          disabled={pending || inspection.isPending}
          onChange={(event) => {
            setProjectSecret(event.target.value);
            resetInspection();
          }}
        />
      </label>
      <Button
        variant="outline"
        disabled={
          pending || inspection.isPending || !projectId.trim() || !projectSecret
        }
        onClick={() => inspection.mutate()}
      >
        {inspection.isPending ? fullAppsT("fullApps.inspecting_photon_7906bc") : fullAppsT("fullApps.inspect_photon_project_f3ed32")}
      </Button>
      {inspection.isError && (
        <p role="alert" className="text-sm text-destructive">
          {renderAppDisplayText(sanitizedSetupErrorDisplay(inspection.error, { projectSecret }))}
        </p>
      )}
      {inspection.data && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium"><FullAppsTrans i18nKey="fullApps.in_1c37be" components={{ part1: <>{inspection.data.allocation === "shared" ? fullAppsT("fullApps.shared_dms_d71f88") : fullAppsT("fullApps.dedicated_numbers_4c9a8c")}</>, part2: <>{inspection.data.projectName}</> }} /></legend>
          {!inspection.data.eligible && (
            <p role="alert" className="text-sm text-destructive">
              {inspection.data.allocation === "shared"
                ? fullAppsT("fullApps.this_shared_project_already_belongs_to_another_chann_2dd07c")
                : fullAppsT("fullApps.no_eligible_dedicated_number_is_available_check_the__56febe")}
            </p>
          )}
          {inspection.data.allocation === "shared" && inspection.data.eligible && (
            <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.direct_messages_only_enroll_each_test_sender_in_your_9cc8aa")}</p>
          )}
          {inspection.data.lines.map((line) => (
            <label
              key={line.lineId}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name="photon-line"
                value={line.lineId}
                checked={lineId === line.lineId}
                disabled={
                  !line.eligible ||
                  pending ||
                  (!!endpoint.botExternalId &&
                    endpoint.botExternalId !== line.phoneNumber)
                }
                onChange={() => setLineId(line.lineId)}
              />
              <span>
                {line.phoneNumber}
                {line.unavailableReason ? ` — ${line.unavailableReason}` : ""}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <div>
        <Button
          disabled={
            pending ||
            inspection.isPending ||
            (!(inspection.data?.eligible && (inspection.data.allocation === "shared" || lineId)) && !(repairing && !projectSecret))
          }
          onClick={() =>
            onAction(
              repairing ? "reconnect" : "configure",
              inspection.data?.eligible && inspection.data.allocation === "shared"
                ? { projectId: projectId.trim(), projectSecret, allocation: "shared" }
                : lineId
                ? { projectId: projectId.trim(), projectSecret, lineId, allocation: "dedicated" }
                : undefined,
            )
          }
        >
          {pending
            ? fullAppsT("onboarding.progress.connecting")
            : repairing
              ? fullAppsT("fullApps.reconnect_photon_7d2393")
              : inspection.data?.allocation === "shared" ? fullAppsT("fullApps.connect_shared_dms_889e11") : fullAppsT("fullApps.connect_selected_number_1a1bb1")}
        </Button>
      </div>
    </div>
  );
}
