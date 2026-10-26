import { useTranslation } from "../i18n";
import type { AgentRunner, AgentRunnerChoice } from "@paperclipai/shared";
import { Field } from "./agent-config-primitives";
import { SelectPopover } from "./ui/select";
import { Button } from "./ui/button";

export function AgentRunnerSelect({
  value,
  onChange,
  defaultRunner,
  supportedRunners = ["legacy"],
  disabled,
  pending,
  error,
  onRetry,
}: {
  value: AgentRunnerChoice;
  onChange: (value: AgentRunnerChoice) => void;
  defaultRunner?: AgentRunner;
  supportedRunners?: readonly AgentRunner[];
  disabled?: boolean;
  pending?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const paperclipDefault = defaultRunner === "paperclip";
  const legacyDefault = defaultRunner === "legacy";
  return (
    <Field label={t("runtimeSelect.label")}>
      <SelectPopover
        aria-label={t("runtimeSelect.label")}
        disabled={disabled}
        value={value}
        displayValue={value === "auto" ? (defaultRunner ? t("runtimeSelect.default", { runner: defaultRunner === "paperclip" ? "Paperclip Runner" : t("runtimeSelect.legacy") }) : pending ? t("runtimeSelect.checking") : t("runtimeSelect.unavailable")) : undefined}
        onValueChange={next => onChange(next as AgentRunnerChoice)}
        options={[
          { value: "paperclip", label: paperclipDefault ? t("runtimeSelect.default", { runner: "Paperclip Runner" }) : t("runtimeSelect.paperclip"), disabled: !supportedRunners.includes("paperclip") && value !== "paperclip" },
          { value: "legacy", label: legacyDefault ? t("runtimeSelect.default", { runner: t("runtimeSelect.legacy") }) : t("runtimeSelect.legacy"), disabled: !supportedRunners.includes("legacy") && value !== "legacy" },
        ]}
      />
      {error && <div className="mt-2 space-y-2">
        <p role="alert" className="text-sm text-destructive">{error}</p>
        {onRetry && <Button type="button" variant="outline" size="sm" disabled={pending || disabled} onClick={onRetry}>{t("runtimeSelect.retry")}</Button>}
      </div>}
    </Field>
  );
}
