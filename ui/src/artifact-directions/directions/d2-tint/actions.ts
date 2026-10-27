import { t } from "@/i18n";
import { t as fullSharedT } from "@/i18n";
import type { LabArtifact } from "../../kit";
import { isMarkdownFile, isTaskDocument, isTextLike } from "./kinds";

/**
 * What you can do with an artifact on each surface, in the product's wording.
 * A unit has one primary action (its whole slab) and, where the product has
 * them, secondary ones as separate targets.
 */

export type ActionIntent = "document" | "gallery" | "preview" | "tab" | "download" | "comments" | "raw" | "data" | "play" | "task" | "stack";

export interface UnitAction {
  intent: ActionIntent;
  /** Visible label, production wording. */
  label: string;
  /** Accessible name: "Download: <title>". */
  name: string;
  href: string;
}

const anchor = (prefix: string, a: LabArtifact) => `#${prefix}-${a.id}`;

/** THREAD — the one thing you do with it, reachable from anywhere on the row. */
export function threadAction(a: LabArtifact): UnitAction {
  if (isTaskDocument(a)) return { intent: "document", label: fullSharedT("taskChatUi.resource.openDocument"), name: t("fullDiagnostics.actionOpenDocument", { title: a.title }), href: anchor("document", a) };
  if (a.kind === "image" || a.kind === "video") return { intent: "gallery", label: fullSharedT("taskChatUi.resource.gallery"), name: t("fullDiagnostics.actionOpenGallery", { title: a.title }), href: anchor("gallery", a) };
  if (a.kind === "link") return { intent: "preview", label: fullSharedT("taskChatUi.resource.openPreview"), name: t("fullDiagnostics.actionOpenPreview", { title: a.title }), href: a.url ?? anchor("preview", a) };
  if (isTextLike(a)) return { intent: "tab", label: fullSharedT("taskPanels.file.openTab"), name: t("fullDiagnostics.actionOpenTab", { title: a.title }), href: anchor("file", a) };
  return downloadAction(a);
}

export function downloadAction(a: LabArtifact): UnitAction {
  return { intent: "download", label: fullSharedT("fullShared.download_d6eafe"), name: t("fullDiagnostics.actionDownload", { title: a.title }), href: anchor("download", a) };
}

/** PANEL — the product's button wording there: Read document, View image, Open video, Open link, Open file. */
export function panelAction(a: LabArtifact): UnitAction {
  if (a.kind === "document") return { intent: "document", label: fullSharedT("taskPanels.card.readDocument"), name: t("fullDiagnostics.actionReadDocument", { title: a.title }), href: anchor("document", a) };
  if (a.kind === "image") return { intent: "gallery", label: fullSharedT("taskPanels.card.viewImage"), name: t("fullDiagnostics.actionViewImage", { title: a.title }), href: anchor("gallery", a) };
  if (a.kind === "video") return { intent: "gallery", label: fullSharedT("taskPanels.card.openVideo"), name: t("fullDiagnostics.actionOpenVideo", { title: a.title }), href: anchor("gallery", a) };
  if (a.kind === "link") return { intent: "preview", label: fullSharedT("taskPanels.card.openLink"), name: t("fullDiagnostics.actionOpenLink", { title: a.title }), href: a.url ?? anchor("preview", a) };
  // "Open file" leaves the app for a new browser tab, as the shipped button does.
  return { intent: "preview", label: fullSharedT("taskPanels.card.openFile"), name: t("fullDiagnostics.actionOpenFile", { title: a.title }), href: anchor("file", a) };
}

/** PANEL — the second button on file cards. */
function panelDownload(a: LabArtifact): UnitAction {
  return { intent: "download", label: fullSharedT("taskPanels.preview.download"), name: t("fullDiagnostics.actionDownloadFile", { title: a.title }), href: anchor("download", a) };
}

/**
 * PANEL — everything else a card offers today, as icon targets beside the
 * primary: the comments chip, Open in tab and Open raw on a Markdown file;
 * View data on a sheet; Open in tab on any text-like file; Download file on
 * every file. Task documents, images, videos and links have none.
 */
export function panelSecondary(a: LabArtifact): UnitAction[] {
  if (isTaskDocument(a) || a.kind === "image" || a.kind === "video" || a.kind === "link") return [];
  const actions: UnitAction[] = [];
  if (isMarkdownFile(a) && a.commentCount != null) {
    const n = a.commentCount;
    actions.push({ intent: "comments", label: t("fullDiagnostics.comments", { count: n }), name: t("fullDiagnostics.commentAction", { count: n, title: a.title }), href: anchor("comments", a) });
  }
  if (a.kind === "sheet" && a.excerpt) actions.push({ intent: "data", label: fullSharedT("taskPanels.card.viewData"), name: t("fullDiagnostics.actionViewData", { title: a.title }), href: anchor("data", a) });
  if (isTextLike(a)) actions.push({ intent: "tab", label: fullSharedT("taskPanels.file.openTab"), name: t("fullDiagnostics.actionOpenTab", { title: a.title }), href: anchor("file", a) });
  if (isMarkdownFile(a)) actions.push({ intent: "raw", label: fullSharedT("taskPanels.file.openRaw"), name: t("fullDiagnostics.actionOpenRaw", { title: a.title }), href: anchor("raw", a) });
  actions.push(panelDownload(a));
  return actions;
}

/**
 * GALLERY — a tile is a link to the artifact where it lives: the owning task,
 * at the artifact's anchor (today's whole-card link).
 */
export function galleryAction(a: LabArtifact): UnitAction {
  return { intent: "task", label: fullSharedT("fullShared.open_in_ff4bbf", { value1: a.taskIdentifier }), name: t("fullDiagnostics.actionOpenTask", { task: a.taskIdentifier, title: a.title }), href: `#${a.taskIdentifier}-${a.id}` };
}

/**
 * GALLERY — the two icon targets a tile has today, in the product's wording:
 * "Open file in new tab" and "Download file" for anything file-backed. A link
 * opens its address; a task document has neither (it has no file).
 */
export function gallerySecondary(a: LabArtifact): UnitAction[] {
  if (isTaskDocument(a)) return [];
  if (a.kind === "link") return [{ intent: "preview", label: fullSharedT("fullShared.open_link_in_new_tab_a536d8"), name: t("fullDiagnostics.actionLinkNewTab", { title: a.title }), href: a.url ?? anchor("preview", a) }];
  return [
    { intent: "preview", label: fullSharedT("surfacesGap.artifacts.openFile"), name: t("fullDiagnostics.actionFileNewTab", { title: a.title }), href: anchor("file", a) },
    panelDownload(a),
  ];
}

/** GALLERY — a folder, or a stack of one, opens its stack. */
export function stackAction(group: { taskIdentifier: string; title: string; count: number }): UnitAction {
  const count = `${group.count} ${group.count === 1 ? "artifact" : "artifacts"}`;
  return { intent: "stack", label: t("fullDiagnostics.openStack"), name: `Open stack ${group.taskIdentifier}: ${group.title}, ${count}`, href: `#stack-${group.taskIdentifier}` };
}
