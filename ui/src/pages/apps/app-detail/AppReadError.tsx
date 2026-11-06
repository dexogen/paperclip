import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/lib/router";
import { QueryErrorState, type QueryViewSize, type QueryViewState } from "@/components/QueryView";

export function AppReadError({ failure, onRetry, action = "load tools for this app", size = "panel" }: {
  failure: QueryViewState<unknown>;
  onRetry?: () => void;
  action?: string;
  size?: QueryViewSize;
}) {
  return <div className={size === "page" ? undefined : "py-8"}>
    <QueryErrorState size={size} error={failure.error} action={action}
      onRetry={() => { failure.retry(); onRetry?.(); }} retrying={failure.isFetching} />
  </div>;
}

export function AppNotFound() {
  useUiTranslation();
  const navigate = useNavigate();
  return <div className="max-w-3xl p-6">
    <p className="text-sm text-muted-foreground">{translateUi("fullApps.we_couldn_t_find_that_app_3dffbb")}</p>
    <Button className="mt-4" variant="outline" onClick={() => navigate("/apps")}>{translateUi("fullApps.back_to_connectors_4bb96f")}</Button>
  </div>;
}
