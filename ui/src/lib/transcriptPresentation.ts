import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
type TranscriptDensity = "comfortable" | "compact";

type TranscriptActivity = {
  activityId?: string;
  name: string;
  status: "running" | "completed";
};

export interface ToolInputDetail {
  label: string;
  value: string;
  tone?: "default" | "code";
  display?: { label: string; value: string };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}...` : value;
}

function humanizeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stripWrappedShell(command: string): string {
  const trimmed = compactWhitespace(command);
  const shellWrapped = trimmed.match(/^(?:(?:\/bin\/)?(?:zsh|bash|sh)|cmd(?:\.exe)?(?:\s+\/d)?(?:\s+\/s)?(?:\s+\/c)?)\s+(?:-lc|\/c)\s+(.+)$/i);
  const inner = shellWrapped?.[1] ?? trimmed;
  const quoted = inner.match(/^(['"])([\s\S]*)\1$/);
  return compactWhitespace(quoted?.[2] ?? inner);
}

function formatUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function summarizeRecord(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return truncate(compactWhitespace(value), 120);
    }
  }
  return null;
}

function parseStructuredToolResult(result: string | undefined) {
  if (!result) return null;
  const lines = result.split(/\r?\n/);
  const metadata = new Map<string, string>();
  let bodyStartIndex = lines.findIndex((line) => line.trim() === "");
  if (bodyStartIndex === -1) bodyStartIndex = lines.length;

  for (let index = 0; index < bodyStartIndex; index += 1) {
    const match = lines[index]?.match(/^([a-z_]+):\s*(.+)$/i);
    if (match) {
      metadata.set(match[1].toLowerCase(), compactWhitespace(match[2]));
    }
  }

  const body = lines.slice(Math.min(bodyStartIndex + 1, lines.length))
    .map((line) => compactWhitespace(line))
    .filter(Boolean)
    .join("\n");

  return {
    command: metadata.get("command") ?? null,
    status: metadata.get("status") ?? null,
    exitCode: metadata.get("exit_code") ?? null,
    body,
  };
}

export function formatToolPayload(value: unknown): string {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return formatUnknown(value);
}

export function parseToolPayload(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function isCommandTool(name: string, input: unknown): boolean {
  if (name === "command_execution" || name === "shell" || name === "shellToolCall" || name === "bash") {
    return true;
  }
  if (typeof input === "string") {
    return /\b(?:bash|zsh|sh|cmd|powershell)\b/i.test(input);
  }
  const record = asRecord(input);
  return Boolean(record && (typeof record.command === "string" || typeof record.cmd === "string"));
}

export function displayToolName(name: string, input: unknown, t: TFunction = i18n.getFixedT("en")): string {
  if (isCommandTool(name, input)) return t("runUi.transcript.executing");
  return humanizeLabel(name);
}

export function summarizeToolInput(
  name: string,
  input: unknown,
  density: TranscriptDensity = "comfortable",
  t: TFunction = i18n.getFixedT("en"),
): string {
  const compactMax = density === "compact" ? 72 : 120;
  if (typeof input === "string") {
    const normalized = isCommandTool(name, input) ? stripWrappedShell(input) : compactWhitespace(input);
    return truncate(normalized, compactMax);
  }
  const record = asRecord(input);
  if (!record) {
    const serialized = compactWhitespace(formatUnknown(input));
    return serialized ? truncate(serialized, compactMax) : t("runUi.transcript.inspect", { name });
  }

  const command = typeof record.command === "string"
    ? record.command
    : typeof record.cmd === "string"
      ? record.cmd
      : null;
  const humanDescription =
    summarizeRecord(record, ["description", "summary", "reason", "goal", "intent", "action", "task"])
    ?? null;
  if (humanDescription) {
    return truncate(humanDescription, compactMax);
  }
  if (command && isCommandTool(name, record)) {
    return truncate(stripWrappedShell(command), compactMax);
  }

  const direct =
    summarizeRecord(record, ["path", "filePath", "file_path", "query", "url", "prompt", "message"])
    ?? summarizeRecord(record, ["pattern", "name", "title", "target", "tool", "command", "cmd"])
    ?? null;
  if (direct) return truncate(direct, compactMax);

  if (Array.isArray(record.paths) && record.paths.length > 0) {
    const first = record.paths.find((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (first) {
      return truncate(t("runUi.transcript.paths", { count: record.paths.length, first }), compactMax);
    }
  }

  const keys = Object.keys(record);
  if (keys.length === 0) return t("runUi.transcript.noInput", { name });
  if (keys.length === 1) return truncate(t("runUi.transcript.payload", { key: keys[0] }), compactMax);
  return truncate(t("runUi.transcript.fields", { count: keys.length, keys: keys.slice(0, 3).join(", ") }), compactMax);
}

function readToolDetailValue(value: unknown, max = 200): string | null {
  if (typeof value === "string") {
    const normalized = compactWhitespace(value);
    return normalized ? truncate(normalized, max) : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

export function describeToolInput(name: string, input: unknown, t?: TFunction): ToolInputDetail[] {
  if (typeof input === "string") {
    const summary = compactWhitespace(isCommandTool(name, input) ? stripWrappedShell(input) : input);
    return summary ? [{ label: isCommandTool(name, input) ? "Command" : "Input", value: truncate(summary, 200), tone: "code", ...(t ? { display: { label: isCommandTool(name, input) ? t("runUi.transcript.detail.command") : t("runUi.transcript.detail.input"), value: truncate(summary, 200) } } : {}) }] : [];
  }

  const record = asRecord(input);
  if (!record) return [];

  const details: ToolInputDetail[] = [];
  const displayLabels = new Map<ToolInputDetail, (t: TFunction) => string>();
  let pathsDetail: ToolInputDetail | undefined;
  const seen = new Set<string>();
  const pushDetail = (label: string, value: string | null, displayLabel: (t: TFunction) => string, tone: ToolInputDetail["tone"] = "default") => {
    if (!value) return;
    const key = `${label}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    const detail = { label, value, tone };
    details.push(detail);
    displayLabels.set(detail, displayLabel);
    return detail;
  };

  pushDetail(
    "Intent",
    summarizeRecord(record, ["description", "summary", "reason", "goal", "intent", "action", "task"]) ?? null,
    (t: TFunction) => t("runUi.transcript.detail.intent"),
  );
  pushDetail("Path", readToolDetailValue(record.path) ?? readToolDetailValue(record.filePath) ?? readToolDetailValue(record.file_path), (t: TFunction) => t("runUi.transcript.detail.path"));
  pushDetail("Directory", readToolDetailValue(record.cwd), (t: TFunction) => t("runUi.transcript.detail.directory"));
  pushDetail("Query", readToolDetailValue(record.query), (t: TFunction) => t("runUi.transcript.detail.query"));
  pushDetail("Target", readToolDetailValue(record.url) ?? readToolDetailValue(record.target), (t: TFunction) => t("runUi.transcript.detail.target"));
  pushDetail("Prompt", readToolDetailValue(record.prompt) ?? readToolDetailValue(record.message), (t: TFunction) => t("runUi.transcript.detail.prompt"));
  pushDetail("Pattern", readToolDetailValue(record.pattern), (t: TFunction) => t("runUi.transcript.detail.pattern"));
  pushDetail("Name", readToolDetailValue(record.name) ?? readToolDetailValue(record.title), (t: TFunction) => t("runUi.transcript.detail.name"));

  if (Array.isArray(record.paths) && record.paths.length > 0) {
    const paths = record.paths
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .slice(0, 3)
      .join(", ");
    if (paths) {
      const suffix = record.paths.length > 3 ? `, +${record.paths.length - 3} more` : "";
      pathsDetail = pushDetail("Paths", `${paths}${suffix}`, (t: TFunction) => t("runUi.transcript.detail.paths"));
    }
  }

  const command = typeof record.command === "string"
    ? record.command
    : typeof record.cmd === "string"
      ? record.cmd
      : null;
  if (command && isCommandTool(name, record) && !details.some((detail) => detail.label === "Intent")) {
    pushDetail("Command", truncate(stripWrappedShell(command), 200), (t: TFunction) => t("runUi.transcript.detail.command"), "code");
  }

  if (!t) return details;
  return details.map(detail => ({
    ...detail,
    display: {
      label: displayLabels.get(detail)!(t),
      value: detail === pathsDetail && Array.isArray(record.paths) && record.paths.length > 3
        ? record.paths.filter((value): value is string => typeof value === "string" && value.trim().length > 0).slice(0, 3).join(", ") + t("runUi.transcript.morePaths", { count: record.paths.length - 3 })
        : detail.value,
    },
  }));
}

export function summarizeToolResult(
  result: string | undefined,
  isError: boolean | undefined,
  density: TranscriptDensity = "comfortable",
  t: TFunction = i18n.getFixedT("en"),
): string {
  if (!result) return isError ? t("runUi.transcript.failed") : t("runUi.transcript.waiting");
  const structured = parseStructuredToolResult(result);
  if (structured) {
    if (structured.body) {
      return truncate(structured.body.split("\n")[0] ?? structured.body, density === "compact" ? 84 : 140);
    }
    if (structured.status === "completed") return t("runUi.transcript.completed");
    if (structured.status === "failed" || structured.status === "error") {
      return structured.exitCode ? t("runUi.transcript.failedExit", { code: structured.exitCode }) : t("runUi.transcript.failedShort");
    }
  }
  const lines = result
    .split(/\r?\n/)
    .map((line) => compactWhitespace(line))
    .filter(Boolean);
  const firstLine = lines[0] ?? result;
  return truncate(firstLine, density === "compact" ? 84 : 140);
}

export function parseSystemActivity(text: string): TranscriptActivity | null {
  const match = text.match(/^item (started|completed):\s*([a-z0-9_-]+)(?:\s+\(id=([^)]+)\))?$/i);
  if (!match) return null;
  return {
    status: match[1].toLowerCase() === "started" ? "running" : "completed",
    name: humanizeLabel(match[2] ?? "Activity"),
    activityId: match[3] || undefined,
  };
}

export function shouldHideNiceModeStderr(text: string): boolean {
  const normalized = compactWhitespace(text).toLowerCase();
  return normalized.startsWith("[paperclip] skipping saved session resume");
}

export function summarizeNotice(text: string, max = 160): string {
  return truncate(compactWhitespace(text), max);
}
