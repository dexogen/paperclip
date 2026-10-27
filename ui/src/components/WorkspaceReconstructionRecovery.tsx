import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ExecutionBlocker } from "@paperclipai/shared";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { NativeSelect } from "./ui/select";

export function WorkspaceReconstructionRecovery({ issueId, blocker, canManage, onRecorded }: {
  issueId: string; blocker: ExecutionBlocker; canManage: boolean; onRecorded: () => void;
}) {
  useFullSharedTranslation();
  const id = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const [missingWork, setMissingWork] = useState("");
  const [outcomeEvidence, setOutcomeEvidence] = useState("");
  const [actionOutcome, setActionOutcome] = useState<"completed" | "not_performed" | "mixed">("mixed");
  const [acknowledged, setAcknowledged] = useState(false);
  const files = useQuery({ queryKey: queryKeys.issues.attachments(issueId),
    queryFn: () => issuesApi.listAttachments(issueId), enabled: canManage });
  const currentSelection = selected.filter(id => files.data?.some(file => file.id === id));
  const submit = useMutation({
    mutationFn: () => issuesApi.reconstructWorkspace(issueId, {
      actionId: blocker.recoveryActionId!, runId: blocker.runId!, expectedStatusVersion: blocker.workspaceRecoveryStatusVersion!,
      attachmentIds: currentSelection, missingWork: missingWork.trim(), actionOutcome, outcomeEvidence: outcomeEvidence.trim(), acknowledgeLostWork: true,
    }), onSuccess: onRecorded,
  });
  return <details className="w-full">
    <summary className="cursor-pointer">{fullSharedT("fullShared.continue_from_saved_sources_8e121d")}</summary>
    <p>{fullSharedT("fullShared.the_original_workspace_was_destroyed_before_its_edit_4eb3a1")}</p>
    {canManage ? <div className="flex flex-col gap-2">
      <p>{fullSharedT("fullShared.select_task_attachments_to_rebuild_from_and_record_w_81eba3")}</p>
      <fieldset disabled={submit.isPending} className="flex flex-col gap-2">
        <legend>{fullSharedT("fullShared.saved_source_attachments_905d68")}</legend>
        {files.data?.map(file => <div key={file.id} className="flex items-center gap-2">
          <Checkbox id={`${id}-${file.id}`} checked={selected.includes(file.id)} onCheckedChange={checked =>
            setSelected(current => checked === true ? [...current, file.id] : current.filter(value => value !== file.id))} />
          <Label htmlFor={`${id}-${file.id}`}><FullSharedTrans i18nKey="fullShared.bytes_0753a2" components={{ part1: <>{file.originalFilename ?? fullSharedTailT("fullSharedTail.attachment")}</>, part2: <>{file.byteSize}</> }} /></Label>
        </div>)}
        {files.isPending && <p>{fullSharedT("fullShared.loading_saved_attachments_32fa1e")}</p>}
        {files.data?.length === 0 && <p>{fullSharedT("fullShared.attach_the_surviving_source_files_to_this_task_first_40213a")}</p>}
        <Label htmlFor={`${id}-missing`}>{fullSharedT("fullShared.missing_work_and_reconstruction_plan_72180f")}</Label>
        <Textarea id={`${id}-missing`} maxLength={12000} value={missingWork} onChange={event => setMissingWork(event.target.value)} />
        <Label htmlFor={`${id}-outcome`}>{fullSharedT("fullShared.previously_completed_external_actions_992994")}</Label>
        <NativeSelect id={`${id}-outcome`} value={actionOutcome} onChange={event => setActionOutcome(event.target.value as typeof actionOutcome)}>
          <option value="mixed">{fullSharedT("fullShared.some_completed_some_not_performed_ce9ef1")}</option>
          <option value="not_performed">{fullSharedT("fullShared.none_performed_380c78")}</option>
          <option value="completed">{fullSharedT("fullShared.all_completed_1c935e")}</option>
        </NativeSelect>
        <Label htmlFor={`${id}-evidence`}>{fullSharedT("fullShared.evidence_and_actions_that_must_not_be_repeated_9f1e6f")}</Label>
        <Textarea id={`${id}-evidence`} maxLength={12000} value={outcomeEvidence} onChange={event => setOutcomeEvidence(event.target.value)} />
        <div className="flex items-center gap-2">
          <Checkbox id={`${id}-ack`} checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} />
          <Label htmlFor={`${id}-ack`}>{fullSharedT("fullShared.continue_from_these_sources_the_missing_edits_have_n_d3b054")}</Label>
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button disabled={submit.isPending || !acknowledged || currentSelection.length === 0 || missingWork.trim().length < 20 || outcomeEvidence.trim().length < 20}
          onClick={() => submit.mutate()}>{submit.isPending ? fullSharedT("fullShared.queuing_37255b") : fullSharedT("fullShared.rebuild_and_continue_f95a0b")}</Button>
      </div>
      {files.isError && <p role="alert" className="text-destructive">{files.error.message}</p>}
      {submit.isError && <p role="alert" className="text-destructive">{submit.error.message}</p>}
    </div> : <p>{fullSharedT("fullShared.a_board_member_with_runtime_access_can_continue_from_bff7d5")}</p>}
  </details>;
}
