import { t } from "@/i18n";

export function artifactQuantity(count: number, noun: string): string {
  switch (noun) {
    case "comment": return t("fullDiagnostics.quantity_comment", { count });
    case "artifact": return t("fullDiagnostics.quantity_artifact", { count });
    case "image": return t("fullDiagnostics.quantity_image", { count });
    case "file": return t("fullDiagnostics.quantity_file", { count });
    case "attachment": return t("fullDiagnostics.quantity_attachment", { count });
    case "row": return t("fullDiagnostics.quantity_row", { count });
    case "column": return t("fullDiagnostics.quantity_column", { count });
    case "slide": return t("fullDiagnostics.quantity_slide", { count });
    case "page": return t("fullDiagnostics.quantity_page", { count });
    case "stack": return t("fullDiagnostics.quantity_stack", { count });
    case "document": return t("fullDiagnostics.quantity_document", { count });
    default: return `${count} ${noun}`;
  }
}

export function artifactUnit(count: number, noun: string): string {
  switch (noun) {
    case "comment": return t("fullDiagnostics.unit_comment", { count });
    case "artifact": return t("fullDiagnostics.unit_artifact", { count });
    case "image": return t("fullDiagnostics.unit_image", { count });
    case "file": return t("fullDiagnostics.unit_file", { count });
    case "attachment": return t("fullDiagnostics.unit_attachment", { count });
    case "row": return t("fullDiagnostics.unit_row", { count });
    case "column": return t("fullDiagnostics.unit_column", { count });
    case "slide": return t("fullDiagnostics.unit_slide", { count });
    case "page": return t("fullDiagnostics.unit_page", { count });
    case "stack": return t("fullDiagnostics.unit_stack", { count });
    case "document": return t("fullDiagnostics.unit_document", { count });
    default: return noun;
  }
}
