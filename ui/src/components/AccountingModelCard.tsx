import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { Database, Gauge, ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SURFACES = [
  {
    get title() { return fullSharedT("fullShared.inference_ledger_41faba"); },
    get description() { return fullSharedT("fullShared.request_scoped_usage_and_billed_runs_from_cost_event_80135f"); },
    icon: Database,
    points: ["tokens + billed dollars", "provider, biller, model", "subscription and overage aware"],
    tone: "from-sky-500/12 via-sky-500/6 to-transparent",
  },
  {
    get title() { return fullSharedT("costsUi.financeLedger"); },
    get description() { return fullSharedT("fullShared.account_level_charges_that_are_not_one_prompt_respon_5f1e31"); },
    icon: ReceiptText,
    points: ["top-ups, refunds, fees", "Bedrock provisioned or training charges", "credit expiries and adjustments"],
    tone: "from-amber-500/14 via-amber-500/6 to-transparent",
  },
  {
    get title() { return fullSharedT("fullShared.live_quotas_d7cd0a"); },
    get description() { return fullSharedT("fullShared.provider_or_biller_windows_that_can_stop_traffic_in__c4f514"); },
    icon: Gauge,
    points: ["provider quota windows", "biller credit systems", "errors surfaced directly"],
    tone: "from-emerald-500/14 via-emerald-500/6 to-transparent",
  },
] as const;

export function AccountingModelCard() {
  useFullSharedTranslation();
  return (
    <Card className="relative overflow-hidden border-border/70">
      <div className="absolute inset-0 bg-(image:--gradient-extract-3)" />
      <CardHeader className="relative px-5 pt-5 pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-(--tracking-caps) text-muted-foreground">{fullSharedT("fullShared.accounting_model_811f1f")}</CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-6">{fullSharedT("fullShared.paperclip_now_separates_request_level_inference_usag_ac0ede")}</CardDescription>
      </CardHeader>
      <CardContent className="relative grid gap-3 px-5 pb-5 md:grid-cols-3">
        {SURFACES.map((surface) => {
          const Icon = surface.icon;
          return (
            <div
              key={surface.title}
              className={`rounded-2xl border border-border/70 bg-gradient-to-br ${surface.tone} p-4 shadow-sm`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/80">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{surface.title}</div>
                  <div className="text-xs text-muted-foreground">{surface.description}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {surface.points.map((point) => (
                  <div key={point}>{point}</div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
