// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { IssueAttachment } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { issuesApi } from "@/api/issues";
import { ArtifactUploadContent } from "@/components/artifacts/ArtifactUploadControls";
import { useIssueArtifactUploads } from "./useIssueArtifactUploads";

vi.mock("@/api/issues", () => ({ issuesApi: { uploadAttachment: vi.fn(), listDocuments: vi.fn(), upsertDocument: vi.fn() } }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
let uploads: ReturnType<typeof useIssueArtifactUploads>;
function Harness() {
  uploads = useIssueArtifactUploads({ id: "task-1", companyId: "company-1" });
  return <><ArtifactUploadContent entries={uploads.entries} onRetry={uploads.retry} onDismiss={uploads.dismiss} /><p role="status">{uploads.announcement}</p></>;
}
beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage("en");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  await i18n.changeLanguage("en");
  host.remove();
  client.clear();
});
it("keeps an upload in flight and translates its completion without uploading again", async () => {
  let finish!: (attachment: IssueAttachment) => void;
  vi.mocked(issuesApi.uploadAttachment).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const file = new File(["literal content"], "Raw <name> & notes.txt", { type: "text/plain" });
  await act(async () => uploads.upload([file]));
  const entryId = uploads.entries[0].id;
  const uploadAction = uploads.upload;
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(host.textContent).toContain("Загрузка…");
  expect(uploads.entries[0].id).toBe(entryId);
  expect(uploads.upload).toBe(uploadAction);
  expect(issuesApi.uploadAttachment).toHaveBeenCalledExactlyOnceWith("company-1", "task-1", file);
  await act(async () => finish({ id: "attachment-1" } as IssueAttachment));
  expect(host.textContent).toContain("Файл Raw <name> & notes.txt добавлен к задаче.");
  expect(host.querySelector("name")).toBeNull();
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(host.textContent).toContain("Raw <name> & notes.txt added to this task.");
  expect(issuesApi.uploadAttachment).toHaveBeenCalledTimes(1);
});
it("translates a local failure live and preserves a server diagnostic on explicit retry", async () => {
  vi.mocked(issuesApi.uploadAttachment).mockRejectedValueOnce(null).mockRejectedValueOnce(new Error("server quota 409: raw detail"));
  const file = new File(["data"], "report.txt");
  await act(async () => uploads.upload([file]));
  expect(host.textContent).toContain("Upload failed. Try again.");
  const id = uploads.entries[0].id;
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(host.textContent).toContain("Не удалось загрузить файл. Повторите попытку.");
  expect(issuesApi.uploadAttachment).toHaveBeenCalledTimes(1);
  await act(async () => uploads.retry(id));
  expect(uploads.entries[0].id).toBe(id);
  expect(host.textContent).toContain("server quota 409: raw detail");
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(host.textContent).toContain("server quota 409: raw detail");
  expect(issuesApi.uploadAttachment).toHaveBeenCalledTimes(2);
  await act(async () => uploads.dismiss(id));
  expect(uploads.entries).toEqual([]);
});
