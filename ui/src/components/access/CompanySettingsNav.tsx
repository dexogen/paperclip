import type { TFunction } from "i18next";
import { useTranslation } from "@/i18n";
import { PageTabBar } from "@/components/PageTabBar";
import { Tabs } from "@/components/ui/tabs";
import { useCloudInstance } from "@/hooks/useCloudInstance";
import { useHiddenSettings } from "@/hooks/useHiddenSettings";
import { INSTANCE_SETTINGS_PATH_PREFIX } from "@/lib/instance-settings";
import { useLocation, useNavigate } from "@/lib/router";

function settingsItems(t: TFunction) {
  return [
    { value: "general", label: t("settingsNav.general"), href: "/company/settings" },
    { value: "export", label: t("settingsNav.export"), href: "/company/export" },
    { value: "import", label: t("settingsNav.import"), href: "/company/import" },
    { value: "members", label: t("settingsNav.members"), href: "/company/settings/members" },
    { value: "secrets", label: t("settingsNav.secrets"), href: "/company/settings/secrets" },
    { value: "instance-profile", label: t("settingsNav.profile"), href: `${INSTANCE_SETTINGS_PATH_PREFIX}/profile` },
    { value: "instance-environments", label: t("settingsNav.environments"), href: `${INSTANCE_SETTINGS_PATH_PREFIX}/environments` },
    { value: "connections", label: t("settingsNav.connections"), href: "/company/settings/connections" },
    { value: "instance-access", label: t("settingsNav.access"), href: `${INSTANCE_SETTINGS_PATH_PREFIX}/access` },
    { value: "instance-experimental", label: t("settingsNav.experimental"), href: `${INSTANCE_SETTINGS_PATH_PREFIX}/experimental` },
    { value: "instance-plugins", label: t("settingsNav.plugins"), href: `${INSTANCE_SETTINGS_PATH_PREFIX}/plugins` },
    { value: "instance-adapters", label: t("settingsNav.adapters"), href: `${INSTANCE_SETTINGS_PATH_PREFIX}/adapters` },
  ] as const;
}

type CompanySettingsTab = ReturnType<typeof settingsItems>[number]["value"];

/** Tab values suppressed when their page is operator-hidden. */
const hiddenSettingKeyByTab: Partial<Record<CompanySettingsTab, string>> = {
  export: "company.export",
  import: "company.import",
  members: "company.members",
  secrets: "company.secrets",
  "instance-profile": "instance.profile",
  "instance-environments": "instance.environments",
  "instance-access": "instance.access",
  "instance-experimental": "instance.experimental",
  "instance-plugins": "instance.plugins",
  "instance-adapters": "instance.adapters",
};

export function getCompanySettingsTab(pathname: string): CompanySettingsTab {
  if (pathname.includes("/company/settings/connections")) {
    return "connections";
  }

  if (pathname.includes(`${INSTANCE_SETTINGS_PATH_PREFIX}/profile`)) {
    return "instance-profile";
  }

  if (pathname.includes(`${INSTANCE_SETTINGS_PATH_PREFIX}/environments`)) {
    return "instance-environments";
  }

  if (pathname.includes(`${INSTANCE_SETTINGS_PATH_PREFIX}/access`)) {
    return "instance-access";
  }

  if (pathname.includes(`${INSTANCE_SETTINGS_PATH_PREFIX}/experimental`)) {
    return "instance-experimental";
  }

  if (pathname.includes(`${INSTANCE_SETTINGS_PATH_PREFIX}/plugins`)) {
    return "instance-plugins";
  }

  if (pathname.includes(`${INSTANCE_SETTINGS_PATH_PREFIX}/adapters`)) {
    return "instance-adapters";
  }

  if (pathname.includes(`${INSTANCE_SETTINGS_PATH_PREFIX}/general`)) {
    return "general";
  }

  if (pathname.includes("/company/settings/environments")) {
    return "instance-environments";
  }

  if (pathname.includes("/company/export")) {
    return "export";
  }

  if (pathname.includes("/company/import")) {
    return "import";
  }

  if (pathname.includes("/company/settings/members") || pathname.includes("/company/settings/access")) {
    return "members";
  }

  if (pathname.includes("/company/settings/invites")) {
    // Invites live on the Members page now; the old URL redirects there.
    return "members";
  }

  if (pathname.includes("/company/settings/secrets")) {
    return "secrets";
  }

  return "general";
}

export function CompanySettingsNav() {
  const { t } = useTranslation();
  const items = settingsItems(t);
  const location = useLocation();
  const navigate = useNavigate();
  const { hidden: hiddenSettings } = useHiddenSettings();
  // Import is floored server-side on cloud-managed instances (403 cloud_managed), so the
  // tab is suppressed there rather than dead-ending.
  const isCloud = Boolean(useCloudInstance());
  const activeTab = getCompanySettingsTab(location.pathname);
  const visibleItems = items.filter((item) => {
    if (item.value === "import" && isCloud) return false;
    const hiddenKey = hiddenSettingKeyByTab[item.value];
    return !hiddenKey || !hiddenSettings.has(hiddenKey);
  });

  function handleTabChange(value: string) {
    const nextTab = visibleItems.find((item) => item.value === value);
    if (!nextTab || nextTab.value === activeTab) return;
    navigate(nextTab.href);
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageTabBar
        items={visibleItems.map(({ value, label }) => ({ value, label }))}
        value={activeTab}
        onValueChange={handleTabChange}
        align="start"
      />
    </Tabs>
  );
}
