import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import type { ReactNode } from "react";
import { ChevronRight, CircleHelp } from "lucide-react";
import { slackAppConfigurationSchema, type SlackAppConfiguration } from "@paperclipai/shared";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SlackSetupAdvanced({ children, label = fullAppsT("fullApps.advanced_9f088d") }: { children: ReactNode; label?: string }) {
  useFullAppsTranslation();
  return <details className="group text-sm">
    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-muted-foreground hover:text-foreground">
      <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden="true" />{label}
    </summary>
    <div className="mt-4 space-y-4">{children}</div>
  </details>;
}

export function SlackAppDetails({ value, readOnly, onChange, onBlur }: {
  value: SlackAppConfiguration;
  readOnly: boolean;
  onChange: (value: SlackAppConfiguration) => void;
  onBlur: () => void;
}) {
  useFullAppsTranslation();
  const validation = slackAppConfigurationSchema.safeParse(value);
  return <div className="space-y-3 text-sm">
    {([
      ["appName", fullAppsT("fullApps.slack_app_name_b6896b"), 35, fullAppsT("fullApps.the_name_of_your_app_in_slack_s_app_directory_and_se_445697")],
      ["botName", fullAppsT("fullApps.bot_display_name_55564b"), 80, fullAppsT("fullApps.the_name_people_see_when_your_bot_sends_a_message_3c5872")],
      ["command", fullAppsT("fullApps.slash_command_85dec3"), 32, fullAppsT("fullApps.the_command_people_type_in_slack_to_talk_to_this_age_5853cc")],
    ] as const).map(([key, label, maxLength, help]) => <div key={key} className="grid items-center gap-2 sm:grid-cols-2">
      <div className="flex items-center gap-1.5">
        <label htmlFor={`slack-${key}`}>{label}</label>
        <Tooltip><TooltipTrigger asChild><button type="button" aria-label={fullAppsT("fullApps.help_with_cbe4af", { value1: label.toLowerCase() })} className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <CircleHelp className="size-3.5" aria-hidden="true" />
        </button></TooltipTrigger><TooltipContent className="max-w-xs">{help}</TooltipContent></Tooltip>
      </div>
      <Input id={`slack-${key}`} value={value[key]} maxLength={maxLength} readOnly={readOnly}
        aria-invalid={!validation.success && validation.error.issues.some(issue => issue.path[0] === key)}
        onChange={event => onChange({ ...value, [key]: event.target.value })} onBlur={onBlur} />
    </div>)}
    {!validation.success && <p role="alert" className="text-destructive">{validation.error.issues[0].message}</p>}
  </div>;
}
