import type { DeploymentExposure, DeploymentMode } from "@paperclipai/shared";
import { useTranslation } from "@/i18n";
import { Badge } from "@/components/ui/badge";

export function ModeBadge({
  deploymentMode,
  deploymentExposure,
}: {
  deploymentMode?: DeploymentMode;
  deploymentExposure?: DeploymentExposure;
}) {
  const { t } = useTranslation();
  if (!deploymentMode) return null;

  const isPublic = deploymentExposure === "public";
  const label =
    deploymentMode === "local_trusted"
      ? t("accessMode.local")
      : isPublic ? t("accessMode.public") : t("accessMode.private");

  return <Badge variant="outline">{label}</Badge>;
}
