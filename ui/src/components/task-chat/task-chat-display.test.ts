import { describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import { formatRunDisplayText, isRetryableFailureMarker, type RunDisplaySlots } from "./task-chat-display";
import type { TaskChatMarkerItem } from "./task-chat-model";

describe("task chat display provenance", () => {
  it("keeps absent, custom and cross-slot captions literal", () => {
    const t = vi.fn(() => "translated") as unknown as TFunction;
    const raw = "Run failed";
    expect(formatRunDisplayText("markerLabel", raw, undefined, t)).toBe(raw);
    expect(formatRunDisplayText("markerLabel", raw, { code: "detail.noResponse" } as unknown as RunDisplaySlots["markerLabel"], t)).toBe(raw);
    expect(formatRunDisplayText("markerLabel", null, { code: "marker.runFailed" }, t)).toBeNull();
    expect(formatRunDisplayText("markerLabel", undefined, { code: "marker.runFailed" }, t)).toBeUndefined();
    expect(t).not.toHaveBeenCalled();
  });

  it.each([
    { code: "future.code" }, { code: "marker.runFailed", lng: "ru" },
    { code: "detail.nativeStopped", afterFinalResponse: "yes", errorCode: "raw" },
    { code: "detail.nativeTimedOut", afterFinalResponse: true, errorCode: 7 },
    { code: "detail.modelRejected", providerError: {} },
    { code: "detail.workspaceRestore", savedPlan: false, noFinalResponse: false, affectedPath: [] },
    { code: "detail.legacyFailure", failure: "runFailed", retry: "future", errorCode: "raw" },
  ])("rejects malformed display data %# without calling the translator", (message) => {
    const t = vi.fn(() => "translated") as unknown as TFunction;
    expect(formatRunDisplayText("markerDetail", "raw fallback", message as RunDisplaySlots["markerDetail"], t)).toBe("raw fallback");
    expect(t).not.toHaveBeenCalled();
  });

  it("passes literal provider errors as one explicit interpolation value", () => {
    const t = vi.fn(() => "translated") as unknown as TFunction;
    const providerError = "<strong>Denied</strong> {{nested}}";
    const descriptor = Object.freeze({ code: "detail.modelRejected" as const, providerError });
    expect(formatRunDisplayText("markerDetail", "fallback", descriptor, t)).toBe("translated");
    expect(t).toHaveBeenCalledExactlyOnceWith("runUi.detail.modelRejectedWithError", { providerError, defaultValue: "fallback" });
    expect(descriptor.providerError).toBe(providerError);
  });

  it("keeps the default English formatter and retry classifier independent of active locale", async () => {
    const marker: TaskChatMarkerItem = { id: "m", kind: "marker", variant: "interrupted", label: "Run failed", retryKind: "run_failure" };
    try {
      await i18n.changeLanguage("ru");
      expect(formatRunDisplayText("markerLabel", marker.label, { code: "marker.runFailed" })).toBe("Run failed");
      expect(isRetryableFailureMarker(marker)).toBe(true);
      expect(isRetryableFailureMarker({ ...marker, label: "Custom", retryKind: "usage_limit" })).toBe(true);
      expect(isRetryableFailureMarker({ ...marker, retryKind: null })).toBe(false);
      expect(isRetryableFailureMarker({ ...marker, retryKind: undefined })).toBe(true);
      expect(isRetryableFailureMarker({ ...marker, label: "Custom", retryKind: undefined })).toBe(false);
    } finally { await i18n.changeLanguage("en"); }
  });
});


it("keeps named human captions literal and accepts only explicit author provenance", () => {
  const ru = i18n.getFixedT("ru");
  expect(formatRunDisplayText("authorName", "You", undefined, ru)).toBe("You");
  expect(formatRunDisplayText("authorName", "User", undefined, ru)).toBe("User");
  expect(formatRunDisplayText("authorName", "Board", undefined, ru)).toBe("Board");
  expect(formatRunDisplayText("authorName", "You", { code: "author.you" }, ru)).toBe("Вы");
  expect(formatRunDisplayText("authorName", "User", { code: "author.user" }, ru)).toBe("Пользователь");
  expect(formatRunDisplayText("authorName", "Board", { code: "author.board" }, ru)).toBe("Оператор");
  expect(formatRunDisplayText("markerLabel", "You", { code: "author.you" } as never, ru)).toBe("You");
});
