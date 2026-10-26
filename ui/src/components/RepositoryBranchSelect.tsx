import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { GitBranch, LoaderCircle } from 'lucide-react';
import { SearchableSelect, type SearchableSelectGroup, type SearchableSelectOption } from '@/components/SearchableSelect';
import { Button } from '@/components/ui/button';

export interface RepositoryBranch {
  name: string;
  isDefault?: boolean;
}

interface BranchOption extends SearchableSelectOption {
  isDefault?: boolean;
  entered?: boolean;
}

export function RepositoryBranchSelect({ value, branches, loading, error, disabled, onChange, onRetry }: {
  value: string;
  branches: readonly RepositoryBranch[];
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onChange: (branch: string) => void;
  onRetry?: () => void;
}) {
  useFullSharedTranslation();
  const uniqueBranches = [...new Map(branches.map(branch => [branch.name, branch])).values()];
  const options: BranchOption[] = uniqueBranches.map(branch => ({ key: branch.name, value: branch.name, label: branch.name, searchText: branch.isDefault ? 'default branch' : undefined, isDefault: branch.isDefault }));
  if (value && !options.some(option => option.value === value)) options.push({ key: value, value, label: value });
  const groups: SearchableSelectGroup<string, BranchOption>[] = [
    { id: 'default', label: fullSharedT("skillsGap.defaultBranch"), options: options.filter(option => option.isDefault) },
    { id: 'branches', label: fullSharedT("fullShared.branches_2eee03"), options: options.filter(option => !option.isDefault) },
  ];
  return <div className="flex min-w-0 flex-col gap-2">
    <SearchableSelect<string, BranchOption>
      value={value} groups={groups} disabled={disabled} triggerAriaLabel={fullSharedT("taskProperties.fields.branch")} mobileTitle={fullSharedT("fullShared.choose_a_branch_16a1b6")}
      placeholder={fullSharedT("fullShared.choose_a_branch_16a1b6")} searchPlaceholder={fullSharedTailT("fullSharedTail.searchBranch")}
      emptyMessage={loading ? fullSharedT("fullShared.branches_are_loading_you_can_still_enter_a_name_0f26f9") : fullSharedT("fullShared.no_matching_branches_enter_a_branch_name_to_use_it_b68a24")}
      onValueChange={branch => onChange(branch)}
      deriveGroups={(query, current) => {
        const name = query.trim();
        return name && !options.some(option => option.value === name)
          ? [...current, { id: 'entered', options: [{ key: `entered:${name}`, value: name, label: name, entered: true }] }]
          : current;
      }}
      renderOption={option => <>
        <GitBranch className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate" title={option.value}>{option.entered ? fullSharedT("fullShared.use_895d5c", { value1: option.value }) : option.label}</span>
        {option.isDefault && <span className="text-xs text-muted-foreground">{fullSharedT("providerSetup.model.default")}</span>}
      </>}
    />
    {loading && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />{fullSharedT("fullShared.loading_branches_55704e")}</p>}
    {error && <div className="flex flex-wrap items-center gap-2"><p role="alert" className="text-sm text-destructive"><FullSharedTrans i18nKey="fullShared.you_can_still_enter_a_branch_name_a050ef" components={{ part1: <>{error}</> }} /></p>
      {onRetry && <Button type="button" size="sm" variant="ghost" disabled={loading || disabled} onClick={onRetry}>{fullSharedT("fullShared.try_again_d8b839")}</Button>}
    </div>}
  </div>;
}
