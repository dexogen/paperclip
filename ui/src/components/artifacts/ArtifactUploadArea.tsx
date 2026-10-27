import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import type { ReactNode } from "react";
import { SidePanelFrame } from "@/components/side-panel/SidePanelFrame";
import { ArtifactDropzone } from "./ArtifactDropzone";
import { ArtifactUploadButton, ArtifactUploadContent, type ArtifactUploadEntry } from "./ArtifactUploadControls";
export type { ArtifactUploadEntry } from "./ArtifactUploadControls";

/** Standalone composition of the same controls used by task panel hosts. */
export function ArtifactUploadArea({ children, header, empty = false, entries = [], onUpload, onRetry, onDismiss }: {
  children?: ReactNode;
  header?: ReactNode;
  empty?: boolean;
  entries?: ArtifactUploadEntry[];
  onUpload: (files: File[]) => void;
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  useFullSharedTranslation();
  return <ArtifactDropzone onUpload={onUpload}>
    <SidePanelFrame presentation="sheet" label={fullSharedT("fullShared.task_artifacts_e186be")} header={header} trailingControls={<ArtifactUploadButton onUpload={onUpload} />}>
      <ArtifactUploadContent empty={empty} entries={entries} onRetry={onRetry} onDismiss={onDismiss}>{children}</ArtifactUploadContent>
    </SidePanelFrame>
  </ArtifactDropzone>;
}
