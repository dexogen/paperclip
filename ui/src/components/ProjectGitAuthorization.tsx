import { formatOwnedApiError } from "@/lib/owned-diagnostic-display";
import { useTranslation } from "@/i18n";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@paperclipai/shared";
import { projectsApi } from "@/api/projects";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function ProjectGitAuthorization({ project }: { project: Project }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const key = ["project-git-authorization", project.companyId, project.id];
  const authorization = useQuery({
    queryKey: key,
    queryFn: () => projectsApi.gitAuthorization(project.id),
  });
  const [selected, setSelected] = useState<string>("");
  const save = useMutation({
    mutationFn: (grantId: string | null) => projectsApi.setGitAuthorization(project.id, grantId),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      setSelected("");
    },
  });
  const data = authorization.data;
  const error = authorization.error || save.error;
  return (
    <section aria-label={t("projectGitAuthorization.title")} className="flex flex-col gap-3 py-4">
      <h3 className="text-sm font-medium">{t("projectGitAuthorization.title")}</h3>
      <p className="text-sm text-muted-foreground">
        {t("projectGitAuthorization.description")}
      </p>
      {data?.grantId && (
        <p role="status" className="text-sm">
          {t("projectGitAuthorization.authorized", {
            account: data.options.find((option) => option.grantId === data.grantId)?.login ??
              t("projectGitAuthorization.unavailableGrant"),
          })}
        </p>
      )}
      {data && (
        <div className="flex flex-wrap gap-2">
          <Select value={selected} onValueChange={setSelected} disabled={save.isPending}>
            <SelectTrigger aria-label={t("projectGitAuthorization.accountLabel")}>
              <SelectValue placeholder={t("projectGitAuthorization.accountPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {data.options.map((option) => (
                <SelectItem key={option.grantId} value={option.grantId}>
                  {option.login} · {option.connectionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!selected || save.isPending} onClick={() => save.mutate(selected)}>
            {t("projectGitAuthorization.authorize")}
          </Button>
          {data.grantId && (
            <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(null)}>
              {t("projectGitAuthorization.revoke")}
            </Button>
          )}
        </div>
      )}
      {data && !data.options.length && (
        <p className="text-sm text-muted-foreground">
          {t("projectGitAuthorization.connectAccount")}
        </p>
      )}
      {(authorization.error || save.error) && (
        <p role="alert" className="text-sm text-destructive">
          {error ? formatOwnedApiError(error, t) : null}
        </p>
      )}
    </section>
  );
}
