import type { EnvironmentProbeResult } from "@paperclipai/shared";
import type { TFunction } from "i18next";
import { i18n } from "../i18n";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasStrings(value: unknown, keys: readonly string[]): value is Record<string, string> {
  return isRecord(value) && keys.every((key) => Object.hasOwn(value, key) && typeof value[key] === "string");
}

export function formatEnvironmentProbeSummary(
  probe: EnvironmentProbeResult,
  t: TFunction = i18n.getFixedT("en"),
): string {
  const message: unknown = Object.hasOwn(probe, "summaryMessage") ? probe.summaryMessage : null;
  if (!isRecord(message) || !Object.hasOwn(message, "code")) return probe.summary;
  const params = Object.hasOwn(message, "params") ? message.params : null;
  const matches = (driver: EnvironmentProbeResult["driver"], ok: boolean) => probe.driver === driver && probe.ok === ok;
  switch (message.code) {
    case "local_available":
      if (matches("local", true)) return t("environmentProbeUi.localAvailable");
      break;
    case "sandbox_company_required":
      if (matches("sandbox", false)) return t("environmentProbeUi.sandboxCompanyRequired");
      break;
    case "sandbox_connected_named":
      if (matches("sandbox", true) && hasStrings(params, ["provider", "sandboxName"])) {
        return t("environmentProbeUi.sandboxConnectedNamed", { provider: params.provider, sandboxName: params.sandboxName });
      }
      break;
    case "sandbox_connected":
      if (matches("sandbox", true) && hasStrings(params, ["provider"])) {
        return t("environmentProbeUi.sandboxConnected", { provider: params.provider });
      }
      break;
    case "sandbox_probe_failed":
      if (matches("sandbox", false) && hasStrings(params, ["provider"])) {
        return t("environmentProbeUi.sandboxProbeFailed", { provider: params.provider });
      }
      break;
    case "sandbox_worker_required":
      if (matches("sandbox", false) && hasStrings(params, ["provider"])) {
        return t("environmentProbeUi.sandboxWorkerRequired", { provider: params.provider });
      }
      break;
    case "plugin_worker_required":
      if (matches("plugin", false) && hasStrings(params, ["pluginKey", "driverKey"])) {
        return t("environmentProbeUi.pluginWorkerRequired", { pluginKey: params.pluginKey, driverKey: params.driverKey });
      }
      break;
    case "ssh_connected":
      if (matches("ssh", true) && hasStrings(params, ["username", "host"])) {
        return t("environmentProbeUi.sshConnected", { username: params.username, host: params.host });
      }
      break;
    case "ssh_probe_failed":
      if (matches("ssh", false) && hasStrings(params, ["username", "host"])) {
        return t("environmentProbeUi.sshProbeFailed", { username: params.username, host: params.host });
      }
      break;
    case "plugin_probe_passed":
      if (matches("plugin", true) && hasStrings(params, ["providerKey"])) {
        return t("environmentProbeUi.pluginProbePassed", { providerKey: params.providerKey });
      }
      break;
    case "plugin_probe_failed":
      if (matches("plugin", false) && hasStrings(params, ["providerKey"])) {
        return t("environmentProbeUi.pluginProbeFailed", { providerKey: params.providerKey });
      }
      break;
    case "sandbox_provider_unavailable":
      if (matches("sandbox", false) && hasStrings(params, ["provider"])) {
        return t("environmentProbeUi.sandboxProviderUnavailable", { provider: params.provider });
      }
      break;
    case "sandbox_provider_probe_passed":
      if (matches("sandbox", true) && hasStrings(params, ["provider"])) {
        return t("environmentProbeUi.sandboxProviderProbePassed", { provider: params.provider });
      }
      break;
    case "sandbox_provider_probe_failed":
      if (matches("sandbox", false) && hasStrings(params, ["provider"])) {
        return t("environmentProbeUi.sandboxProviderProbeFailed", { provider: params.provider });
      }
      break;
    case "fake_sandbox_ready":
      if (matches("sandbox", true) && hasStrings(params, ["image"])) {
        return t("environmentProbeUi.fakeSandboxReady", { image: params.image });
      }
      break;
  }
  return probe.summary;
}
