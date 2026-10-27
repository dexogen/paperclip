import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { getAppStoreDefinition } from "@paperclipai/shared";
import { ApiKeyCredentialField } from "./ApiKeyCredentialField";

export const AGENTMAIL_API_KEYS_URL = getAppStoreDefinition("agentmail")!.methods[0]!.consoleLinks!.keys!;

export function AgentMailApiKeyField({ value, onChange, disabled = false, label = fullAppsT("fullApps.api_key_16f0ee") }: {
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
  label?: string;
}) {
  useFullAppsTranslation();
  return <ApiKeyCredentialField providerName="AgentMail" keysUrl={AGENTMAIL_API_KEYS_URL}
    options={[]} connectionId="" onConnectionChange={() => {}} value={value} onChange={onChange}
    disabled={disabled} label={label} />;
}
