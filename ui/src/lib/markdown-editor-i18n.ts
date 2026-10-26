import type { TFunction } from "i18next";

export function translateMarkdownEditor(
  t: TFunction,
  key: string,
  fallback: string,
  interpolations: Record<string, unknown> = {},
): string {
  switch (key) {
    case "codeBlock.inlineLanguage": return t("taskDetailCommon.mdx.codeBlock.inlineLanguage");
    case "codeBlock.selectLanguage": return t("taskDetailCommon.mdx.codeBlock.selectLanguage");
    case "codeblock.delete": return t("taskDetailCommon.mdx.codeblock.delete");
    case "contentArea.editableMarkdown": return t("taskDetailCommon.mdx.contentArea.editableMarkdown");
    case "createLink.cancelTooltip": return t("taskDetailCommon.mdx.createLink.cancelTooltip");
    case "createLink.saveTooltip": return t("taskDetailCommon.mdx.createLink.saveTooltip");
    case "createLink.text": return t("taskDetailCommon.mdx.createLink.text");
    case "createLink.textTooltip": return t("taskDetailCommon.mdx.createLink.textTooltip");
    case "createLink.title": return t("taskDetailCommon.mdx.createLink.title");
    case "createLink.titleTooltip": return t("taskDetailCommon.mdx.createLink.titleTooltip");
    case "createLink.url": return t("taskDetailCommon.mdx.createLink.url");
    case "createLink.urlPlaceholder": return t("taskDetailCommon.mdx.createLink.urlPlaceholder");
    case "dialogControls.cancel": return t("taskDetailCommon.mdx.dialogControls.cancel");
    case "dialogControls.save": return t("taskDetailCommon.mdx.dialogControls.save");
    case "imageEditor.deleteImage": return t("taskDetailCommon.mdx.imageEditor.deleteImage");
    case "imageEditor.editImage": return t("taskDetailCommon.mdx.imageEditor.editImage");
    case "linkPreview.copied": return t("taskDetailCommon.mdx.linkPreview.copied");
    case "linkPreview.copyToClipboard": return t("taskDetailCommon.mdx.linkPreview.copyToClipboard");
    case "linkPreview.edit": return t("taskDetailCommon.mdx.linkPreview.edit");
    case "linkPreview.open": return t("taskDetailCommon.mdx.linkPreview.open", { url: interpolations.url });
    case "linkPreview.remove": return t("taskDetailCommon.mdx.linkPreview.remove");
    case "table.alignCenter": return t("taskDetailCommon.mdx.table.alignCenter");
    case "table.alignLeft": return t("taskDetailCommon.mdx.table.alignLeft");
    case "table.alignRight": return t("taskDetailCommon.mdx.table.alignRight");
    case "table.columnMenu": return t("taskDetailCommon.mdx.table.columnMenu");
    case "table.deleteColumn": return t("taskDetailCommon.mdx.table.deleteColumn");
    case "table.deleteRow": return t("taskDetailCommon.mdx.table.deleteRow");
    case "table.deleteTable": return t("taskDetailCommon.mdx.table.deleteTable");
    case "table.insertColumnLeft": return t("taskDetailCommon.mdx.table.insertColumnLeft");
    case "table.insertColumnRight": return t("taskDetailCommon.mdx.table.insertColumnRight");
    case "table.insertRowAbove": return t("taskDetailCommon.mdx.table.insertRowAbove");
    case "table.insertRowBelow": return t("taskDetailCommon.mdx.table.insertRowBelow");
    case "table.rowMenu": return t("taskDetailCommon.mdx.table.rowMenu");
    case "table.textAlignment": return t("taskDetailCommon.mdx.table.textAlignment");
    case "uploadImage.addViaUrlInstructions": return t("taskDetailCommon.mdx.uploadImage.addViaUrlInstructions");
    case "uploadImage.addViaUrlInstructionsNoUpload": return t("taskDetailCommon.mdx.uploadImage.addViaUrlInstructionsNoUpload");
    case "uploadImage.alt": return t("taskDetailCommon.mdx.uploadImage.alt");
    case "uploadImage.autoCompletePlaceholder": return t("taskDetailCommon.mdx.uploadImage.autoCompletePlaceholder");
    case "uploadImage.dialogTitle": return t("taskDetailCommon.mdx.uploadImage.dialogTitle");
    case "uploadImage.height": return t("taskDetailCommon.mdx.uploadImage.height");
    case "uploadImage.title": return t("taskDetailCommon.mdx.uploadImage.title");
    case "uploadImage.uploadInstructions": return t("taskDetailCommon.mdx.uploadImage.uploadInstructions");
    case "uploadImage.width": return t("taskDetailCommon.mdx.uploadImage.width");
    default:
      return Object.entries(interpolations).reduce(
        (text, [name, value]) => text.replaceAll(`{{${name}}}`, () => String(value)),
        fallback,
      );
  }
}
