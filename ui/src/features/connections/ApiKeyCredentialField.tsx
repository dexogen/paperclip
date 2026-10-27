import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Providers supply only credentials the current user is authorized to use.
 * Values are opaque connection references, never secret values. */
export function ApiKeyCredentialField({ options, connectionId, onConnectionChange, value, onChange,
  disabled, loading, error, providerName, keysUrl, label = fullAppsT("fullApps.api_key_16f0ee") }: {
  options: { id: string; label: string; disabled?: boolean }[];
  connectionId: string | null;
  onConnectionChange(id: string): void;
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  providerName: string;
  keysUrl: string;
  label?: string;
}) {
  useFullAppsTranslation();
  const id = useId();
  const choices = connectionId && !options.some(option => option.id === connectionId)
    ? [{ id: connectionId, label: loading ? fullAppsT("fullApps.checking_saved_api_key_1e9c2c") : fullAppsT("fullApps.previously_selected_key_unavailable_84dee9"), disabled: true }, ...options] : options;
  return <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {choices.length > 0 && <select id={id} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={connectionId ?? ""} disabled={disabled} onChange={event => onConnectionChange(event.target.value)}>
      {choices.map(option => <option key={option.id} value={option.id} disabled={option.disabled}>{option.label}</option>)}
      <option value="">{fullAppsT("onboarding.credentials.newKey")}</option>
    </select>}
    {!connectionId && <Input id={choices.length ? `${id}-new` : id} aria-label={choices.length ? fullAppsT("fullApps.new_api_key_e520a0") : undefined}
      type="password" autoComplete="off" value={value} disabled={disabled}
      onChange={event => { onConnectionChange(""); onChange(event.target.value); }} placeholder={fullAppsT("fullApps.paste_your_api_key_e5b2da", { value1: providerName })} />}
    {loading && <p role="status" className="text-sm text-muted-foreground">{fullAppsT("onboarding.credentials.checking")}</p>}
    {error && <p role="alert" className="text-sm text-destructive"><FullAppsTrans i18nKey="fullApps.could_not_load_saved_api_keys_475829" components={{ part1: <>{error}</> }} /></p>}
    <a href={keysUrl} target="_blank" rel="noreferrer" className="text-sm underline"><FullAppsTrans i18nKey="fullApps.get_an_api_key_367035" components={{ part1: <>{providerName}</> }} /></a>
  </div>;
}
