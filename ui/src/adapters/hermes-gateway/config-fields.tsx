import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { configFieldsForSection } from "../config-sections";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AdapterConfigFieldsProps, CreateConfigValues } from "../types";
import {
  DraftInput,
  DraftNumberInput,
  DraftTextarea,
  Field,
  ToggleField,
} from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

const DEFAULT_SESSION_KEY_STRATEGY = "issue";
const DEFAULT_TIMEOUT_SEC = 600;
const DEFAULT_EVENT_RECONNECT_MS = 2000;

type SecretRef = {
  type: "secret_ref";
  secretId: string;
  version?: number | "latest";
};

function isSecretRef(value: unknown): value is SecretRef {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { type?: unknown }).type === "secret_ref" &&
    typeof (value as { secretId?: unknown }).secretId === "string"
  );
}

function readCreateValue(values: CreateConfigValues | null, key: string, fallback: unknown): unknown {
  return values?.adapterSchemaValues?.[key] ?? fallback;
}

function writeCreateValue(
  values: CreateConfigValues | null,
  set: ((patch: Partial<CreateConfigValues>) => void) | null,
  key: string,
  value: unknown,
) {
  set?.({
    adapterSchemaValues: {
      ...values?.adapterSchemaValues,
      [key]: value,
    },
  });
}

function stringifyHeaders(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value, null, 2);
  }
  return "";
}

function SecretField({
  label,
  value,
  onCommit,
  placeholder,
  stored,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  stored?: boolean;
}) {
  useFullSharedTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label={visible ? fullSharedT("fullShared.hide_4734b5", { value1: label }) : fullSharedT("fullShared.show_00f1c6", { value1: label })}
        >
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <DraftInput
          value={value}
          onCommit={onCommit}
          immediate
          type={visible ? "text" : "password"}
          className={inputClass + " pl-8"}
          placeholder={stored ? fullSharedT("fullShared.stored_secret_enter_a_new_value_to_replace_it_f4a910") : placeholder}
        />
      </div>
    </Field>
  );
}

export function HermesGatewayConfigFields({
  section,
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  useFullSharedTranslation();
  const storedApiKey = config.apiKey;
  const hasStoredApiKey = isSecretRef(storedApiKey) || typeof storedApiKey === "string";
  const editApiKeyValue = typeof storedApiKey === "string" ? String(eff("adapterConfig", "apiKey", storedApiKey)) : "";

  const configuredHeaders = stringifyHeaders(config.headers);
  const editHeaders = eff("adapterConfig", "headers", configuredHeaders);
  const [headersDraft, setHeadersDraft] = useState(String(editHeaders ?? ""));

  useEffect(() => {
    if (!isCreate) setHeadersDraft(String(editHeaders ?? ""));
  }, [editHeaders, isCreate]);

  const readValue = (key: string, fallback: unknown) =>
    isCreate ? readCreateValue(values, key, fallback) : eff("adapterConfig", key, (config[key] ?? fallback) as never);

  const writeValue = (key: string, value: unknown) => {
    if (isCreate) {
      writeCreateValue(values, set, key, value);
    } else {
      mark("adapterConfig", key, value);
    }
  };

  const apiBaseUrl = String(readValue("apiBaseUrl", "") ?? "");
  const paperclipApiUrl = String(readValue("paperclipApiUrl", "") ?? "");
  const sessionKeyStrategy = String(readValue("sessionKeyStrategy", DEFAULT_SESSION_KEY_STRATEGY) ?? DEFAULT_SESSION_KEY_STRATEGY);
  const timeoutSec = Number(readValue("timeoutSec", DEFAULT_TIMEOUT_SEC) ?? DEFAULT_TIMEOUT_SEC);
  const eventReconnectMs = Number(readValue("eventReconnectMs", DEFAULT_EVENT_RECONNECT_MS) ?? DEFAULT_EVENT_RECONNECT_MS);
  const allowInsecureRemoteHttp = Boolean(readValue("dangerouslyAllowInsecureRemoteHttp", false));
  const instructions = String(readValue("instructions", "") ?? "");
  const headers = isCreate
    ? String(readCreateValue(values, "headers", "") ?? "")
    : headersDraft;

  return configFieldsForSection(section, (
    <>
      <Field
        label={fullSharedT("fullShared.api_base_url_a45474")}
        hint={fullSharedT("fullShared.hermes_api_server_base_url_that_paperclip_can_reach__dde2c4")}
      >
        <DraftInput
          value={apiBaseUrl}
          onCommit={(v) => writeValue("apiBaseUrl", v || undefined)}
          immediate
          className={inputClass}
          placeholder="http://127.0.0.1:8642"
        />
      </Field>

      <SecretField
        label={fullSharedT("fullShared.api_key_16f0ee")}
        value={isCreate ? String(readCreateValue(values, "apiKey", "") ?? "") : editApiKeyValue}
        onCommit={(v) => writeValue("apiKey", v || undefined)}
        placeholder={fullSharedT("fullShared.hermes_api_server_key_not_paperclip_api_key_3d6503")}
        stored={!isCreate && hasStoredApiKey && !editApiKeyValue}
      />

      <Field
        label={fullSharedT("fullShared.paperclip_api_url_d71687")}
        hint={fullSharedT("fullShared.optional_paperclip_api_url_reachable_by_the_hermes_h_0c1c61")}
      >
        <DraftInput
          value={paperclipApiUrl}
          onCommit={(v) => writeValue("paperclipApiUrl", v || undefined)}
          immediate
          className={inputClass}
          placeholder="http://127.0.0.1:3100"
        />
      </Field>

      <Field configSection="runPolicy"
        label={fullSharedT("fullShared.session_key_strategy_1abcf8")}
        hint={fullSharedT("fullShared.controls_x_hermes_session_key_issue_scoped_prevents__08f7c6")}
      >
        <select
          value={sessionKeyStrategy}
          onChange={(event) => writeValue("sessionKeyStrategy", event.target.value)}
          className={inputClass}
        >
          <option value="issue">{fullSharedT("fullShared.issue_scoped_837400")}</option>
          <option value="agent">{fullSharedT("fullShared.agent_scoped_e098d6")}</option>
          <option value="run">{fullSharedT("fullShared.run_scoped_fdedd5")}</option>
          <option value="none">{fullSharedT("fullShared.none_dc937b")}</option>
        </select>
      </Field>

      <Field configSection="runPolicy" label={fullSharedT("fullShared.timeout_seconds_e7a1bb")}>
        <DraftNumberInput
          value={Number.isFinite(timeoutSec) ? timeoutSec : DEFAULT_TIMEOUT_SEC}
          onCommit={(v) => writeValue("timeoutSec", v)}
          immediate
          className={inputClass}
        />
      </Field>

      <Field
        label={fullSharedT("fullShared.event_reconnect_ms_4e117b")}
        hint={fullSharedT("fullShared.delay_before_reconnecting_the_hermes_sse_events_stre_cd42ff")}
      >
        <DraftNumberInput
          value={Number.isFinite(eventReconnectMs) ? eventReconnectMs : DEFAULT_EVENT_RECONNECT_MS}
          onCommit={(v) => writeValue("eventReconnectMs", v)}
          immediate
          className={inputClass}
        />
      </Field>

      <ToggleField
        label={fullSharedT("fullShared.dangerously_allow_remote_http_876d0d")}
        hint={fullSharedT("fullShared.unsafe_dev_only_escape_hatch_remote_hermes_gateways__f41b6d")}
        checked={allowInsecureRemoteHttp}
        onChange={(v) => writeValue("dangerouslyAllowInsecureRemoteHttp", v)}
      />

      <Field
        label={fullSharedT("fullShared.extra_headers_e53f03")}
        hint={fullSharedT("fullShared.optional_json_object_of_extra_nonsecret_headers_secu_501ad6")}
      >
        <textarea
          value={headers}
          onChange={(event) => {
            const next = event.target.value;
            if (isCreate) {
              writeValue("headers", next || undefined);
            } else {
              setHeadersDraft(next);
              mark("adapterConfig", "headers", next || undefined);
            }
          }}
          rows={3}
          className={inputClass}
          placeholder='{"x-custom-header": "value"}'
        />
      </Field>

      <Field label={fullSharedT("taskProperties.fields.instructions")} hint={fullSharedT("fullShared.optional_stable_hermes_instructions_sent_separately__7d641b")}>
        <DraftTextarea
          value={instructions}
          onCommit={(v) => writeValue("instructions", v || undefined)}
          immediate
          minRows={3}
        />
      </Field>
    </>
  ));
}
