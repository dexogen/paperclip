import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { Blocks } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConnectionProvenanceChip({
  connection,
  className,
}: {
  connection: {
    config?: Record<string, unknown> | null;
    credentialSource?: string;
    externalCredential?: { connectorUid?: string } | null;
  } | null | undefined;
  className?: string;
}) {
  useFullAppsTranslation();
  const chipClass = cn(
    "inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
    className,
  );
  if (connection?.credentialSource === "vercel_connect") {
    const connectorUid = connection.externalCredential?.connectorUid;
    return (
      <span
        className={chipClass}
        title={connectorUid ? fullAppsT("fullApps.credentials_managed_by_vercel_connect_aebe29", { value1: connectorUid }) : fullAppsT("fullApps.credentials_managed_by_vercel_connect_25308b")}
      >
        <Blocks className="h-3 w-3" />{fullAppsT("fullApps.via_vercel_connect_d34e03")}</span>
    );
  }

  return null;
}
