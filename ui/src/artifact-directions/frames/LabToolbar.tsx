import { t } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { DIRECTION_IDS, KIT_KEYS, KIT_META, type DirectionId } from "../kit";
import { LAB_VIEWS, type LabState, type LabTheme, type LabView } from "../lab-state";

/**
 * The lab's own chrome (`chrome=1`). Deliberately not the product's look —
 * monospace, one line — so it never reads as part of a frame.
 */

interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  useFullSharedTranslation();
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          data-size="xs"
          aria-checked={option.value === value}
          title={option.hint}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-sm px-2 py-1 leading-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            option.value === value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// The kit set has no "All": the every-kit contact sheet is URL-only (`?d=all`).
const KIT_OPTIONS: Option<DirectionId | "all">[] = DIRECTION_IDS.map((id) => ({
  value: id,
  get label() { return KIT_META[id].name; },
  get hint() { return `${KIT_META[id].tagline} (${KIT_KEYS[id]})`; },
}));
// Overview first; the vocabulary sheet (`s=kinds`) is URL-only.
const VIEW_OPTIONS: Option<LabView>[] = [
  { value: "board", get label() { return fullSharedT("runUi.inspector.overview"); }, get hint() { return t("fullDiagnostics.theKitSFourSurfacesOnOne"); } },
  { value: "thread", get label() { return t("fullDiagnostics.taskThread"); } },
  { value: "panel", get label() { return t("fullDiagnostics.rightPanel"); } },
  { value: "gallery", get label() { return t("fullDiagnostics.tabGallery"); } },
  { value: "stack", get label() { return t("fullDiagnostics.tabCloseup"); } },
];
const THEME_OPTIONS: Option<LabTheme>[] = [
  { value: "dark", get label() { return t("fullDiagnostics.dark"); }, get hint() { return t("fullDiagnostics.toggleWithT"); } },
  { value: "light", get label() { return t("fullDiagnostics.light"); }, get hint() { return t("fullDiagnostics.toggleWithT"); } },
];
const ANIM_OPTIONS: Option<"off" | "on">[] = [
  { value: "off", get label() { return t("fullDiagnostics.off"); }, get hint() { return t("fullDiagnostics.hoverAnimationsOffToggleWithA"); } },
  { value: "on", get label() { return t("fullRoutinesSecrets.on256"); }, get hint() { return t("fullDiagnostics.hoverAnimationsOnMvpV1ArtworkRises"); } },
];

const TITLE = "font-medium uppercase tracking-(--tracking-label) text-foreground";

/**
 * Two labelled rows on one grid — "Artifact directions" over "Artifact
 * surfaces" — so the labels sit flush left and the two sets start on the same
 * column. Theme and animation keep to the first row's right edge.
 */
export function LabToolbar({ state, onChange }: { state: LabState; onChange: (patch: Partial<LabState>) => void }) {
  useFullSharedTranslation();
  return (
    <div
      className="sticky top-0 z-50 grid items-center gap-x-4 gap-y-2 border-b border-border bg-background px-4 py-2 font-mono text-(length:--text-micro) text-muted-foreground"
      style={{ gridTemplateColumns: "max-content 1fr" }}
    >
      <span className={TITLE}>{t("fullDiagnostics.artifactDirections")}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented label={t("fullDiagnostics.kit")} options={KIT_OPTIONS} value={state.direction} onChange={(direction) => onChange({ direction })} />
        <div className="ml-auto flex items-center gap-4">
          <Segmented label={t("fullDiagnostics.theme")} options={THEME_OPTIONS} value={state.theme} onChange={(theme) => onChange({ theme })} />
          <span className="flex items-center gap-1.5">
            <span>{t("fullDiagnostics.animation")}</span>
            <Segmented label={t("fullDiagnostics.animation_62afd2")} options={ANIM_OPTIONS} value={state.anim ? "on" : "off"} onChange={(value) => onChange({ anim: value === "on" })} />
          </span>
        </div>
      </div>
      <span className={TITLE}>{t("fullDiagnostics.artifactSurfaces")}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented label={fullSharedT("runUi.inspector.surface")} options={VIEW_OPTIONS} value={state.view} onChange={(view) => onChange({ view })} />
        <span className="ml-auto hidden lg:inline">{t("fullDiagnostics.05KitTThemeAAnimation")}</span>
      </div>
    </div>
  );
}
