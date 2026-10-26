import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";

export function AiConnectionLegacyNotice({
  onAdopt,
  readOnly = false,
}: {
  onAdopt: () => void;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">
        {t("providerSetup.accounts.legacyTitle")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {t("providerSetup.accounts.legacyHint")}
      </p>
      {!readOnly && (
        <Button variant="outline" className="self-start" onClick={onAdopt}>
          {t("providerSetup.accounts.chooseManaged")}
        </Button>
      )}
    </div>
  );
}
