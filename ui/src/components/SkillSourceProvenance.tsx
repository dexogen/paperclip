import { t, useTranslation } from "@/i18n";
import type { CompanySkill } from '@paperclipai/shared';
import { Link } from '@/lib/router';
export function SkillSourceProvenance({ skill }: { skill: CompanySkill }) {
  useTranslation();
  const id = skill.metadata?.skillSourceId ?? skill.metadata?.legacySkillSourceId;
  if (typeof id !== 'string') return null;
  const state = skill.metadata?.skillSourceState;
  const label = !skill.metadata?.skillSourceId ? t("skillsGap.refreshThisSourceToSyncAllFiles") : state === 'removed' ? t("skillsGap.removedFromSourceLastInstalledVersionRetained")
    : state === 'not_syncing' ? t("skillsGap.notSyncingInstalledCopyRetained")
    : state === 'update_failed' ? t("skillsGap.updateFailedLastInstalledVersionRetained") : t("skillsGap.syncedFromGithub");
  return <div className="flex flex-col gap-1 py-3 text-xs text-muted-foreground">
    <span>{label}</span>
    <span className="break-all font-mono">{String(skill.metadata?.skillSourcePath ?? '')}{skill.sourceRef ? ` · ${skill.sourceRef.slice(0, 8)}` : ''}</span>
    <Link to={`/skills/sources/${id}`} className="text-foreground underline">{t("skillsGap.manageSource")}</Link>
  </div>;
}
