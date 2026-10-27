import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { fastResponsesApi } from "@/api/fast-responses";
import { DecisionHistoryTable } from "@/components/decision-models/DecisionHistory";
import { Button } from "@/components/ui/button";
import { useFastResponsesEnabled } from "@/hooks/useFastResponsesEnabled";
export function FastResponseHistory({
  companyId,
  from,
  to,
}: {
  companyId: string;
  from?: string | null;
  to?: string | null;
}) {
  useFullSharedTranslation();
  const { enabled } = useFastResponsesEnabled();
  const query = useQuery({
    queryKey: ["fast-response-history", companyId, from, to],
    queryFn: () =>
      fastResponsesApi.history(companyId, from ?? undefined, to ?? undefined),
    refetchInterval: (q) =>
      q.state.data?.some(
        (r) =>
          ["pending", "running"].includes(r.status) ||
          ["pending", "streaming", "retry"].includes(r.publicationStatus),
      )
        ? 3000
        : false,
  });
  if (query.isPending)
    return (
      <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.loading_fast_responses_f3e996")}</p>
    );
  if (query.error)
    return (
      <div role="alert">
        <p className="text-sm text-destructive">{fullSharedT("fullShared.could_not_load_fast_responses_dacc16")}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>{fullSharedT("fullShared.try_again_d8b839")}</Button>
      </div>
    );
  return <DecisionHistoryTable entries={query.data ?? []} fastResponse fastResponsesEnabled={enabled} />;
}
