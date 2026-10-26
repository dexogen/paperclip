import type { Announcement } from "@paperclipai/shared";
import type { TFunction } from "i18next";

/** Translate only the reviewed copy of this first-party publication.
 * Changed publications and arbitrary feed content retain their source text.
 * IDs, destinations, media and dismissal identity always remain unchanged.
 */
export function localizeAnnouncement(announcement: Announcement, t: TFunction): Announcement {
  if (
    announcement.id !== "2026-09-14-connectors"
    || announcement.eyebrow !== "Introducing Connectors"
    || announcement.title !== "Give your agents the access they need"
    || announcement.description !== "Connect Gmail, GitHub, Notion, and more. Choose which agents get access, which accounts they use, and which actions they can take."
    || announcement.primaryAction.label !== "Explore connectors"
  ) return announcement;

  return {
    ...announcement,
    eyebrow: t("authGap.announcement.connectorsEyebrow"),
    title: t("authGap.announcement.connectorsTitle"),
    description: t("authGap.announcement.connectorsDescription"),
    primaryAction: { ...announcement.primaryAction, label: t("authGap.announcement.exploreConnectors") },
  };
}
