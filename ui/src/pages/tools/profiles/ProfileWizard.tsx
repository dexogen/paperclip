import { AppDisplayError } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { ToolProfileWithDetails } from "@paperclipai/shared";
import { useNavigate } from "@/lib/router";
import { toolsApi, type ToolProfileBindingInput } from "@/api/tools";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AgentMultiSelect, type AgentMultiSelectOption } from "@/components/AgentMultiSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/context/ToastContext";
import { LoadingState } from "../shared";
import {
  buildEntries,
  countAllowedTools,
  parseEntries,
  templateSelections,
  TEMPLATES,
  type AdvancedRule,
  type TemplateKey,
  type WizardSelections,
} from "./profile-model";
import { useProfilesData } from "./useProfilesData";
import { WizardToolsStep } from "./WizardToolsStep";
import { readWizardMeta, resumeStep, withWizardMeta, type WizardStep } from "./wizard-draft";

function slugifyProfileKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

const STEP_LABELS: Array<{ step: WizardStep; label: string }> = [
  { step: 1, get label() { return fullAppsT("fullApps.name_dcd1d5"); } },
  { step: 2, get label() { return fullAppsT("fullApps.choose_tools_4e3af1"); } },
  { step: 3, get label() { return fullAppsT("fullApps.assign_8ece89"); } },
];

export function ProfileWizard({
  companyId,
  profileId,
  initialTemplate,
  initialStep,
}: {
  companyId: string;
  profileId?: string;
  initialTemplate?: TemplateKey;
  initialStep?: WizardStep;
}) {
  useFullAppsTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const data = useProfilesData(companyId);
  const { appGroups, catalog, profiles, agents } = data;

  const allProfiles = profiles.data?.profiles ?? [];
  const existing = profileId ? allProfiles.find((p) => p.id === profileId) ?? null : null;

  const [step, setStep] = useState<WizardStep>(1);
  const [draftId, setDraftId] = useState<string | null>(profileId ?? null);
  const [template, setTemplate] = useState<TemplateKey | null>(initialTemplate ?? null);
  const [copyFromId, setCopyFromId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [profileKey, setProfileKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [selections, setSelections] = useState<WizardSelections>({});
  const [advancedRules, setAdvancedRules] = useState<AdvancedRule[]>([]);
  const [newToolsAction, setNewToolsAction] = useState<"deny" | "allow">("deny");
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(new Set());
  const [companyDefault, setCompanyDefault] = useState(false);

  const toggleIn = (setter: typeof setSelectedAgentIds) => (id: string) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Hydrate once when resuming an existing draft and its catalog is loaded.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !existing || appGroups.length === 0) return;
    if (existing.id !== profileId) return;
    hydrated.current = true;
    setName(existing.name);
    setDescription(existing.description ?? "");
    setProfileKey(existing.profileKey);
    setKeyEdited(true);
    setNewToolsAction(existing.defaultAction);
    const parsed = parseEntries(appGroups, existing.entries);
    setSelections(parsed.selections);
    setAdvancedRules(parsed.advancedRules);
    const meta = readWizardMeta(existing);
    setTemplate(meta?.template ?? null);
    // Drafts resume at the first unfinished step; a finished profile being
    // edited starts at step 1 so the admin can review the whole thing.
    setStep(initialStep ?? (existing.status === "draft" ? resumeStep(meta) : 1));
    const targetIds = (type: string) =>
      new Set(existing.bindings.filter((b) => b.targetType === type).map((b) => b.targetId));
    setSelectedAgentIds(targetIds("agent"));
    setSelectedProjectIds(targetIds("project"));
    setSelectedRoutineIds(targetIds("routine"));
    setCompanyDefault(existing.bindings.some((b) => b.targetType === "company"));
  }, [existing, appGroups, profileId, initialStep]);

  // Key auto-derives from the name until the admin overrides it in Advanced.
  useEffect(() => {
    if (!keyEdited) setProfileKey(slugifyProfileKey(name));
  }, [name, keyEdited]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tools.profiles(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.tools.testAgentAccesses() });
  };

  const live = useMemo(
    () => countAllowedTools(appGroups, selections, newToolsAction, catalog.length),
    [appGroups, selections, newToolsAction, catalog.length],
  );

  // Map step-1 template choice onto concrete per-app selections (needs the catalog).
  const seedSelections = (): WizardSelections => {
    if (template === "copy" && copyFromId) {
      const source = allProfiles.find((p) => p.id === copyFromId);
      if (source) return parseEntries(appGroups, source.entries).selections;
    }
    if (template && template !== "copy") return templateSelections(template, appGroups);
    return selections;
  };

  const saveDraft = useMutation({
    mutationFn: async (input: {
      goToStep: WizardStep;
      completedStep: WizardStep;
      seed?: WizardSelections;
    }) => {
      const effSelections = input.seed ?? selections;
      const entries = buildEntries(appGroups, effSelections, advancedRules, newToolsAction);
      const metadata = withWizardMeta(existing?.metadata ?? null, {
        lastCompletedStep: input.completedStep,
        template,
      });
      if (!draftId) {
        const created = await toolsApi.createProfile(companyId, {
          profileKey: profileKey || slugifyProfileKey(name) || "profile",
          name: name.trim() || "Untitled profile",
          description: description.trim() || null,
          status: "draft",
          defaultAction: newToolsAction,
          entries,
          metadata,
        });
        return { created, goToStep: input.goToStep, seed: input.seed };
      }
      const updated = await toolsApi.updateProfile(draftId, {
        profileKey: profileKey || undefined,
        name: name.trim() || "Untitled profile",
        description: description.trim() || null,
        defaultAction: newToolsAction,
        entries,
        metadata,
      });
      return { created: updated, goToStep: input.goToStep, seed: input.seed };
    },
    onSuccess: ({ created, goToStep, seed }) => {
      setDraftId(created.id);
      if (seed) setSelections(seed);
      setStep(goToStep);
      invalidate();
    },
    onError: (error: unknown) =>
      pushToast({ title: fullAppsT("taskPanels.documents.cannotSave"), body: String((error as Error)?.message ?? error), tone: "error" }),
  });

  const finish = useMutation({
    mutationFn: async () => {
      if (!draftId) throw new AppDisplayError("fullApps.no_draft_to_finish_1591d8");
      const entries = buildEntries(appGroups, selections, advancedRules, newToolsAction);
      const profile = await toolsApi.updateProfile(draftId, {
        defaultAction: newToolsAction,
        entries,
        metadata: withWizardMeta(existing?.metadata ?? null, { lastCompletedStep: 3, template }),
      });
      await reconcileBindings(companyId, profile, {
        agentIds: [...selectedAgentIds],
        projectIds: [...selectedProjectIds],
        routineIds: [...selectedRoutineIds],
        companyDefault,
      });
      return toolsApi.updateProfile(draftId, { status: "active" });
    },
    onSuccess: (profile) => {
      pushToast({ title: fullAppsT("fullApps.profile_saved_ea278d"), tone: "success" });
      invalidate();
      navigate(`/apps/advanced/profiles/${profile.id}${selectedAgentIds.size === 0 && !companyDefault ? "?created=1" : ""}`);
    },
    onError: (error: unknown) =>
      pushToast({ title: fullAppsT("fullApps.could_not_save_profile_bfe28c"), body: String((error as Error)?.message ?? error), tone: "error" }),
  });

  const saveAndExit = () => {
    const completed: WizardStep = step;
    saveDraft.mutate(
      { goToStep: step, completedStep: completed },
      {
        onSuccess: () => {
          pushToast({ title: fullAppsT("fullApps.draft_saved_5ccb8c"), body: fullAppsT("fullApps.pick_it_back_up_from_the_profiles_list_a521c6"), tone: "success" });
          navigate("/apps/advanced/profiles");
        },
      },
    );
  };

  const busy = saveDraft.isPending || finish.isPending;
  const step1Valid = name.trim().length > 0 && (template !== "copy" || Boolean(copyFromId));

  if (profileId && profiles.isLoading) return <LoadingState label={fullAppsT("fullApps.loading_draft_5bb36e")} />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-24">
      <Stepper current={step} />

      <div className="min-h-(--sz-320px)">
        {step === 1 ? (
          <StepName
            template={template}
            onTemplate={setTemplate}
            copyFromId={copyFromId}
            onCopyFrom={setCopyFromId}
            copyOptions={allProfiles.filter((p) => p.status !== "archived" && p.id !== profileId)}
            name={name}
            onName={setName}
            description={description}
            onDescription={setDescription}
            profileKey={profileKey}
            onProfileKey={(v) => {
              setKeyEdited(true);
              setProfileKey(v);
            }}
          />
        ) : null}

        {step === 2 ? (
          <WizardToolsStep
            appGroups={appGroups}
            catalogLoading={data.catalogLoading}
            selections={selections}
            onSelectionsChange={setSelections}
            advancedRules={advancedRules}
            onAdvancedRulesChange={setAdvancedRules}
            newToolsAction={newToolsAction}
            onNewToolsActionChange={setNewToolsAction}
          />
        ) : null}

        {step === 3 ? (
          <StepAssign
            agents={(agents.data ?? []).map((a) => ({ id: a.id, name: a.name, title: a.title, icon: a.icon }))}
            projects={(data.projects.data ?? []).map((p) => ({ id: p.id, name: p.name }))}
            routines={(data.routines.data ?? []).map((r) => ({ id: r.id, name: r.title }))}
            profiles={allProfiles}
            selectedAgentIds={selectedAgentIds}
            onToggleAgent={toggleIn(setSelectedAgentIds)}
            selectedProjectIds={selectedProjectIds}
            onToggleProject={toggleIn(setSelectedProjectIds)}
            selectedRoutineIds={selectedRoutineIds}
            onToggleRoutine={toggleIn(setSelectedRoutineIds)}
            companyDefault={companyDefault}
            onCompanyDefault={setCompanyDefault}
          />
        ) : null}
      </div>

      {/* Sticky footer: live count + navigation. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {step >= 2 ? (
              <span><FullAppsTrans i18nKey="fullApps.allows_of_tools_306df8" components={{ part1: <span className="font-medium text-foreground">{live.allowed}</span>, part2: <>{live.total}</>, part3: <>{" "}</> }} /></span>
            ) : null}
            {draftId ? (
              <button
                type="button"
                onClick={saveAndExit}
                disabled={busy}
                className="font-medium text-primary hover:underline disabled:opacity-50"
              >{fullAppsT("fullApps.save_finish_later_f87588")}</button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {step > 1 ? (
              <Button variant="outline" disabled={busy} onClick={() => setStep((s) => (s - 1) as WizardStep)}>{fullAppsT("onboarding.actions.back")}</Button>
            ) : (
              <Button variant="ghost" disabled={busy} onClick={() => navigate("/apps/advanced/profiles")}>{fullAppsT("fullApps.cancel_19766e")}</Button>
            )}

            {step === 1 ? (
              <Button
                disabled={!step1Valid || busy}
                onClick={() =>
                  saveDraft.mutate({ goToStep: 2, completedStep: 1, seed: seedSelections() })
                }
              ><FullAppsTrans i18nKey="fullApps.continue_bae411" components={{ part1: <>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}</> }} /></Button>
            ) : null}

            {step === 2 ? (
              <Button
                disabled={busy}
                onClick={() => saveDraft.mutate({ goToStep: 3, completedStep: 2 })}
              ><FullAppsTrans i18nKey="fullApps.continue_bae411" components={{ part1: <>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}</> }} /></Button>
            ) : null}

            {step === 3 ? (
              <Button disabled={busy} onClick={() => finish.mutate()}><FullAppsTrans i18nKey="fullApps.save_profile_a8a776" components={{ part1: <>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}</> }} /></Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Reconcile the profile's assignments against the wizard's step-3 choices. */
async function reconcileBindings(
  companyId: string,
  profile: ToolProfileWithDetails,
  desired: { agentIds: string[]; projectIds: string[]; routineIds: string[]; companyDefault: boolean },
) {
  const want = new Map<string, ToolProfileBindingInput>();
  if (desired.companyDefault) want.set(`company:${companyId}`, { targetType: "company", targetId: companyId });
  for (const id of desired.agentIds) want.set(`agent:${id}`, { targetType: "agent", targetId: id });
  for (const id of desired.projectIds) want.set(`project:${id}`, { targetType: "project", targetId: id });
  for (const id of desired.routineIds) want.set(`routine:${id}`, { targetType: "routine", targetId: id });

  // Only the target types the wizard manages are reconciled — leave any
  // issue-scoped or other bindings untouched.
  const managed = new Set(["company", "agent", "project", "routine"]);
  const have = new Set(profile.bindings.map((b) => `${b.targetType}:${b.targetId}`));

  const operations = [
    ...[...want.entries()]
      .filter(([key]) => !have.has(key))
      .map(([key, input]) => ({
        key,
        apply: () => toolsApi.bindProfile(companyId, profile.id, input),
        rollback: () => toolsApi.unbindProfile(companyId, profile.id, input),
      })),
    ...profile.bindings
      .filter((binding) => managed.has(binding.targetType) && !want.has(`${binding.targetType}:${binding.targetId}`))
      .map((binding) => {
        const input = { targetType: binding.targetType, targetId: binding.targetId } as ToolProfileBindingInput;
        return {
          key: `${binding.targetType}:${binding.targetId}`,
          apply: () => toolsApi.unbindProfile(companyId, profile.id, input),
          rollback: () => toolsApi.bindProfile(companyId, profile.id, input),
        };
      }),
  ];
  const completed: typeof operations = [];
  for (const operation of operations) {
    try {
      await operation.apply();
      completed.push(operation);
    } catch (error) {
      const rollbacks = await Promise.allSettled(completed.reverse().map((done) => done.rollback()));
      const rollbackFailures = rollbacks.filter((result) => result.status === "rejected").length;
      throw rollbackFailures > 0
        ? new AppDisplayError("fullApps.assignmentRollbackFailed", { operation: operation.key, rollbackCount: rollbackFailures }, { cause: error })
        : new AppDisplayError("fullApps.assignmentFailed", { operation: operation.key }, { cause: error });
    }
  }
}

function Stepper({ current }: { current: WizardStep }) {
  useFullAppsTranslation();
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEP_LABELS.map(({ step, label }, idx) => {
        const done = current > step;
        const active = current === step;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                active && "bg-primary text-primary-foreground",
                done && "bg-primary/20 text-primary",
                !active && !done && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : step}
            </span>
            <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
            {idx < STEP_LABELS.length - 1 ? <span className="mx-1 text-muted-foreground">→</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function StepName({
  template,
  onTemplate,
  copyFromId,
  onCopyFrom,
  copyOptions,
  name,
  onName,
  description,
  onDescription,
  profileKey,
  onProfileKey,
}: {
  template: TemplateKey | null;
  onTemplate: (key: TemplateKey) => void;
  copyFromId: string | null;
  onCopyFrom: (id: string) => void;
  copyOptions: ToolProfileWithDetails[];
  name: string;
  onName: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  profileKey: string;
  onProfileKey: (v: string) => void;
}) {
  useFullAppsTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">{fullAppsT("fullApps.start_from_eb3f51")}</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onTemplate(t.key)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-md border px-4 py-3 text-left transition-colors",
                template === t.key
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-accent/40",
              )}
            >
              <span className="text-sm font-medium text-foreground">{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.description}</span>
            </button>
          ))}
        </div>
      </div>

      {template === "copy" ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">{fullAppsT("fullApps.which_profile_2582f4")}</h3>
          {copyOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.you_don_t_have_another_profile_to_copy_yet_17721a")}</p>
          ) : (
            <div className="space-y-1.5">
              {copyOptions.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2"
                >
                  <input
                    type="radio"
                    name="copy-from"
                    checked={copyFromId === p.id}
                    onChange={() => onCopyFrom(p.id)}
                  />
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">{fullAppsT("fullApps.name_dcd1d5")}</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder={fullAppsT("fullApps.e_g_everyday_work_4bb335")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-description">{fullAppsT("fullApps.description_optional_f6cbe2")}</Label>
          <Textarea
            id="profile-description"
            value={description}
            onChange={(e) => onDescription(e.target.value)}
            placeholder={fullAppsT("fullApps.what_is_this_profile_for_73f941")}
            rows={2}
          />
        </div>
      </div>

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />{fullAppsT("fullApps.advanced_9f088d")}</CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-key">{fullAppsT("searchUi.result.identifier")}</Label>
            <Input
              id="profile-key"
              value={profileKey}
              onChange={(e) => onProfileKey(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.used_in_exports_and_the_api_auto_filled_from_the_nam_1245c6")}</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface TargetOption {
  id: string;
  name: string;
}

export function StepAssign({
  agents,
  projects = [],
  routines = [],
  profiles,
  selectedAgentIds,
  onToggleAgent,
  selectedProjectIds,
  onToggleProject,
  selectedRoutineIds,
  onToggleRoutine,
  companyDefault,
  onCompanyDefault,
}: {
  agents: AgentMultiSelectOption[];
  projects?: TargetOption[];
  routines?: TargetOption[];
  profiles: ToolProfileWithDetails[];
  selectedAgentIds: Set<string>;
  onToggleAgent: (id: string) => void;
  selectedProjectIds?: Set<string>;
  onToggleProject?: (id: string) => void;
  selectedRoutineIds?: Set<string>;
  onToggleRoutine?: (id: string) => void;
  companyDefault: boolean;
  onCompanyDefault: (v: boolean) => void;
}) {
  useFullAppsTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  // Per-agent overlap context from already-loaded bindings — no extra fetch.
  const contextByAgent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of profiles) {
      for (const b of p.bindings) {
        if (b.targetType === "agent") {
          const list = map.get(b.targetId) ?? [];
          list.push(p.name);
          map.set(b.targetId, list);
        }
      }
    }
    return map;
  }, [profiles]);

  const defaultProfileName = profiles.find((p) => p.summary.isCompanyDefault)?.name ?? null;

  return (
    <div className="space-y-5">
      <label className="flex items-start gap-3 rounded-lg border border-border p-4">
        <input
          type="checkbox"
          className="mt-1"
          checked={companyDefault}
          onChange={(e) => onCompanyDefault(e.target.checked)}
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{fullAppsT("fullApps.make_this_the_organization_default_12c00b")}</span>
          <span className="text-xs text-muted-foreground"><FullAppsTrans i18nKey="fullApps.every_agent_without_its_own_profile_uses_this_one_9960ef" components={{ part1: <>{defaultProfileName ? fullAppsT("fullApps.replaces_46699a", { value1: defaultProfileName }) : ""}</> }} /></span>
        </span>
      </label>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">{fullAppsT("fullApps.assign_to_agents_06d88b")}</h3>
        <AgentMultiSelect
          agents={agents}
          selectedAgentIds={selectedAgentIds}
          onChange={(nextAgentIds) => {
            for (const agent of agents) {
              if (selectedAgentIds.has(agent.id) !== nextAgentIds.has(agent.id)) onToggleAgent(agent.id);
            }
          }}
          getDescription={(agent) => {
            const context = contextByAgent.get(agent.id) ?? [];
            const bits = [...context];
            if (defaultProfileName) bits.push(fullAppsT("fullApps.organization_default_fb3f6d"));
            return bits.length > 0 ? fullAppsT("fullApps.message_26eba92262f6", { value1: bits.join(" · ") }) : fullAppsT("fullApps.no_profiles_yet_09bc1d");
          }}
        />
        <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.if_an_agent_has_several_profiles_it_can_use_anything_b6dd41")}</p>
      </div>

      {(projects.length > 0 || routines.length > 0) && onToggleProject && onToggleRoutine ? (
        <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className="rounded-lg border border-border">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="text-sm font-medium text-foreground">{fullAppsT("fullApps.more_targets_ce9b6d")}</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", moreOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.assign_this_profile_to_a_whole_project_or_a_schedule_9bc8b6")}</p>
            <TargetChecklist
              label={fullAppsT("sidebar.projects")}
              options={projects}
              selected={selectedProjectIds ?? new Set()}
              onToggle={onToggleProject}
            />
            <TargetChecklist
              label={fullAppsT("sidebar.routines")}
              options={routines}
              selected={selectedRoutineIds ?? new Set()}
              onToggle={onToggleRoutine}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

function TargetChecklist({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: TargetOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  useFullAppsTranslation();
  if (options.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {options.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={selected.has(option.id)} onChange={() => onToggle(option.id)} />
            {option.name}
          </label>
        ))}
      </div>
    </div>
  );
}
