import { i18n, t } from "@/i18n";
import { APP_DEFINITIONS, aiConnectionCatalogSlug, aiConnectionMetadataSchema, type AppDefinition, type ToolApplication, type ToolConnection } from "@paperclipai/shared";
import { aiConnectionRouterSlug, aiConnectionRouterPluginKey } from "@paperclipai/shared";

export type AppGalleryDisplayEntry = AppDefinition & {
  key?: string;
  logoUrl?: string;
  tagline?: string;
  branding?: AppDefinition["branding"];
};

export function appDefinitionSlug(entry: AppGalleryDisplayEntry | null | undefined): string {
  return entry?.slug ?? entry?.key ?? "";
}

const english = i18n.getFixedT("en");

export function vercelConnectAvailabilityReason(reason: string | null | undefined): string | undefined {
  if (reason === english("appCatalog.vercelOidcRequired")) return t("appCatalog.vercelOidcRequired");
  if (reason === english("appCatalog.vercelDisabled")) return t("appCatalog.vercelDisabled");
  return reason ?? undefined;
}

export function appAvailabilityReason(app: AppDefinition): string | undefined {
  const reason = app.availability?.reason;
  if (app.aiConnectionRouter) {
    if (reason === english("appCatalog.routingDisabled")) return t("appCatalog.routingDisabled");
    if (reason === english("fullShared.enable_the_connection_pool_plugin_in_plugins_1bbd62")) {
      return t("fullShared.enable_the_connection_pool_plugin_in_plugins_1bbd62");
    }
  }
  return reason;
}

export function appDefinitionName(entry: AppGalleryDisplayEntry | null | undefined): string {
  return entry?.name ?? appDefinitionSlug(entry) ?? "App";
}

const bundledApps = new Map<string, AppDefinition>(APP_DEFINITIONS.map((app) => [app.slug, app]));

// Only the bundled description belongs to Paperclip. Preserve operator and
// third-party copy, including catalog overrides that share a built-in slug.
export function appDefinitionDescription(entry: AppGalleryDisplayEntry | null | undefined): string {
  const slug = appDefinitionSlug(entry);
  const definition = bundledApps.get(slug);
  const source = entry?.description ?? entry?.tagline ?? "";
  const fromRegistry = entry?.displaySource?.registry === "paperclip-app-definitions" && entry.displaySource.version === 1;
  if (!definition || (entry !== definition && !fromRegistry) || definition.description !== source) return source;
  if (source === `Connect ${definition.name}'s provider-hosted MCP server.`) {
    return t("appCatalog.providerHosted", { name: definition.name });
  }
  switch (slug) {
    case "1password": return t("appCatalog.1password");
    case "agentmail": return t("fullApps.give_agents_email_inboxes_and_handle_each_conversati_d29107");
    case "anthropic": return t("appCatalog.anthropic");
    case "api-key-generic": return t("appCatalog.api-key-generic");
    case "arcade": return t("appCatalog.arcade");
    case "bedrock": return t("appCatalog.bedrock");
    case "braintrust": return t("appCatalog.braintrust");
    case "browser-use-cloud": return t("appCatalog.browser-use-cloud");
    case "calendly": return t("appCatalog.calendly");
    case "chat-completions-api": return t("appCatalog.chat-completions-api");
    case "clickup": return t("appCatalog.clickup");
    case "cognee": return t("appCatalog.cognee");
    case "composio": return t("appCatalog.composio");
    case "context7": return t("appCatalog.context7");
    case "daytona": return t("appCatalog.daytona");
    case "discord": return t("appCatalog.discord");
    case "ditto": return t("appCatalog.ditto");
    case "enterpret": return t("appCatalog.enterpret");
    case "exa": return t("appCatalog.exa");
    case "executor": return t("appCatalog.executor");
    case "firecrawl": return t("appCatalog.firecrawl");
    case "fireflies": return t("appCatalog.fireflies");
    case "gauge": return t("appCatalog.gauge");
    case "github": return t("appCatalog.github");
    case "github-code-review-bot": return t("fullApps.have_an_agent_review_pull_requests_and_respond_to_gi_d0bfaf");
    case "gmail": return t("appCatalog.gmail");
    case "google": return t("appCatalog.google");
    case "google-calendar": return t("appCatalog.google-calendar");
    case "google-chat": return t("appCatalog.google-chat");
    case "google-docs": return t("appCatalog.google-docs");
    case "google-drive": return t("appCatalog.google-drive");
    case "google-people": return t("appCatalog.google-people");
    case "google-sheets": return t("appCatalog.google-sheets");
    case "google-slides": return t("appCatalog.google-slides");
    case "google-workspace": return t("appCatalog.google-workspace");
    case "google-workspace-search": return t("appCatalog.google-workspace-search");
    case "gsc-wizard": return t("appCatalog.gsc-wizard");
    case "honcho": return t("appCatalog.honcho");
    case "imessage-photon": return t("appCatalog.imessage-photon");
    case "klaviyo": return t("appCatalog.klaviyo");
    case "linear": return t("appCatalog.linear");
    case "local": return t("appCatalog.local");
    case "mem0": return t("appCatalog.mem0");
    case "messages-api": return t("appCatalog.messages-api");
    case "microsoft-teams": return t("appCatalog.microsoft-teams");
    case "monday": return t("appCatalog.monday");
    case "neon": return t("appCatalog.neon");
    case "notion": return t("appCatalog.notion");
    case "oauth-generic": return t("appCatalog.oauth-generic");
    case "openai": return t("appCatalog.openai");
    case "openrouter": return t("appCatalog.openrouter");
    case "paperclip-notebook": return t("appCatalog.paperclip-notebook");
    case "parallel-search": return t("appCatalog.parallel-search");
    case "posthog": return t("appCatalog.posthog");
    case "railway": return t("appCatalog.railway");
    case "responses-api": return t("appCatalog.responses-api");
    case "sentry": return t("appCatalog.sentry");
    case "shopify": return t("appCatalog.shopify");
    case "slack": return t("appCatalog.slack");
    case "speko": return t("appCatalog.speko");
    case "supabase": return t("appCatalog.supabase");
    case "superagent": return t("appCatalog.superagent");
    case "supermemory": return t("appCatalog.supermemory");
    case "tavily": return t("appCatalog.tavily");
    case "telegram": return t("appCatalog.telegram");
    case "telem": return t("appCatalog.telem");
    case "unikraft": return t("appCatalog.unikraft");
    case "vercel": return t("appCatalog.vercel");
    case "windsor-ai": return t("appCatalog.windsor-ai");
    case "xai": return t("appCatalog.xai");
    case "zapier": return t("appCatalog.zapier");
    case "zep": return t("appCatalog.zep");
    default: return source;
  }
}

export function appDefinitionLogoUrl(entry: AppGalleryDisplayEntry | null | undefined): string | undefined {
  return entry?.branding?.logoUrl ?? entry?.logoUrl;
}

export function appDefinitionDarkLogoUrl(entry: AppGalleryDisplayEntry | null | undefined): string | undefined {
  return entry?.branding?.darkLogoUrl;
}

export function appApplicationSourceSlug(application: ToolApplication | null | undefined): string | null {
  if (!application) return null;
  const metadata = application.metadata;
  const source = metadata?.sourceTemplateKey ?? metadata?.galleryKey;
  if (typeof source === "string" && source.trim()) return source.trim();
  const key = application.applicationKey?.trim();
  if (!key) return null;
  const router = key.match(/^plugin:(.+):ai-router$/);
  if (router) return aiConnectionRouterSlug(router[1]);
  const galleryPrefix = "app-gallery:";
  if (key.startsWith(galleryPrefix)) {
    const slug = key.slice(galleryPrefix.length).split(":")[0] || null;
    // Curated apps deliberately group multiple accounts by provider. Generic
    // URL apps use `link` only as a synthetic key, so grouping on it would make
    // every unrelated MCP server in the company look like the same app.
    return slug === "link" ? null : slug;
  }
  return key;
}

export function appConnectionSourceSlug(connection: ToolConnection | null | undefined): string | null {
  if (!connection) return null;
  if (connection.connectionPurpose === "ai") {
    const metadata = aiConnectionMetadataSchema.safeParse(connection.config?.ai);
    if (metadata.success) return aiConnectionCatalogSlug(metadata.data.provider, metadata.data.routing);
  }
  const router = aiConnectionRouterPluginKey(connection);
  if (router) return aiConnectionRouterSlug(router);
  const source = connection.config?.sourceTemplateKey ?? connection.transportConfig?.sourceTemplateKey;
  return typeof source === "string" && source.trim() ? source.trim() : null;
}

export function galleryEntryFor(
  apps: AppGalleryDisplayEntry[],
  connection: ToolConnection | undefined,
  application: ToolApplication | undefined,
): AppGalleryDisplayEntry | null {
  if (!connection) return null;
  const sourceSlug = appApplicationSourceSlug(application) ?? appConnectionSourceSlug(connection);
  if (sourceSlug) {
    const keyed = apps.find((app) => appDefinitionSlug(app) === sourceSlug);
    if (keyed) return keyed;
  }
  const name = connection.name.toLowerCase();
  return apps.find((app) => appDefinitionName(app).toLowerCase() === name) ??
    apps.find((app) => appDefinitionSlug(app) === name) ??
    null;
}
