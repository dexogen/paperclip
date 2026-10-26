import { i18n } from "@/i18n";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import {
  describeInteractionResolutionFailure,
  interactionResolutionErrorCode,
  interactionResolutionErrorMessage,
  isInteractionAudienceDenial,
} from "./interaction-resolution-error";

const addressedAudience = { shortSummary: "Only CodexCoder or the board can respond", isOpen: false };
const humanOnlyAudience = { shortSummary: "Only the board can respond", isOpen: false };
const openAudience = { shortSummary: "Anyone can respond", isOpen: true };

/** Shapes an `ApiError` the way `errorHandler` serializes an `HttpError`. */
function denial(status: number, code: string, message: string) {
  return new ApiError(message, status, { error: message, code, details: { code } });
}

describe("interactionResolutionErrorCode", () => {
  it("reads the top-level code the API returns", () => {
    expect(interactionResolutionErrorCode(denial(403, "interaction_human_only", "human-only"))).toBe(
      "interaction_human_only",
    );
  });

  it("falls back to the code nested in details", () => {
    const error = new ApiError("nope", 403, { error: "nope", details: { code: "interaction_addressee_mismatch" } });
    expect(interactionResolutionErrorCode(error)).toBe("interaction_addressee_mismatch");
  });

  it("returns null for an error with no structured body", () => {
    expect(interactionResolutionErrorCode(new Error("network down"))).toBeNull();
  });
});

describe("isInteractionAudienceDenial", () => {
  it("recognizes every audience denial code the evaluator can return", () => {
    for (const code of [
      "interaction_human_only",
      "interaction_creator_excluded",
      "interaction_addressee_mismatch",
      "interaction_governed_action_denied",
      "interaction_run_attribution_required",
      "interaction_scope_denied",
    ]) {
      expect(isInteractionAudienceDenial(denial(403, code, "denied"))).toBe(true);
    }
  });

  it("treats an uncoded 403 as an authorization refusal", () => {
    expect(isInteractionAudienceDenial(new ApiError("Forbidden", 403, { error: "Forbidden" }))).toBe(true);
  });

  it("does not treat a server fault or a settled card as an audience denial", () => {
    expect(isInteractionAudienceDenial(new ApiError("boom", 500, { error: "boom" }))).toBe(false);
    expect(isInteractionAudienceDenial(denial(409, "interaction_already_resolved", "already resolved"))).toBe(false);
  });
});

describe("describeInteractionResolutionFailure", () => {
  it("keeps the server denial reason and names who can respond", () => {
    const failure = describeInteractionResolutionFailure(
      denial(403, "interaction_human_only", "This issue-thread interaction is human-only"),
      humanOnlyAudience,
    );

    expect(failure.kind).toBe("audience_denied");
    expect(failure.code).toBe("interaction_human_only");
    expect(failure.message).toBe(
      "This issue-thread interaction is human-only. Only the board can respond.",
    );
    // A policy denial is permanent: never invite a retry that will fail again.
    expect(failure.message).not.toMatch(/try again/i);
  });

  it("names the addressed responder for an addressee mismatch", () => {
    expect(
      interactionResolutionErrorMessage(
        denial(
          403,
          "interaction_addressee_mismatch",
          "Only the addressed agent or an authorized human may resolve this issue-thread interaction",
        ),
        addressedAudience,
      ),
    ).toContain("Only CodexCoder or the board can respond.");
  });

  it("still explains a denial when no audience is known", () => {
    const failure = describeInteractionResolutionFailure(
      denial(403, "interaction_creator_excluded", "This issue-thread interaction requires a resolver other than its creator"),
      null,
    );

    expect(failure.message).toBe(
      "This issue-thread interaction requires a resolver other than its creator.",
    );
    expect(failure.message).not.toMatch(/try again/i);
  });

  // PAP-17289: the responder clause explains a denial, so it must never
  // contradict it. An open card has no narrower audience to point at.
  it("does not append the open-default clause to a refusal it would refute", () => {
    const failure = describeInteractionResolutionFailure(
      denial(
        403,
        "interaction_addressee_mismatch",
        "Only the addressed agent can resolve this interaction",
      ),
      openAudience,
    );

    expect(failure.kind).toBe("audience_denied");
    expect(failure.message).toBe("Only the addressed agent can resolve this interaction.");
    expect(failure.message).not.toMatch(/anyone can respond/i);
  });

  it("keeps the server's own text for an uncoded 403 instead of inventing a cause", () => {
    const failure = describeInteractionResolutionFailure(
      new ApiError("Forbidden", 403, { error: "Forbidden" }),
      openAudience,
    );

    expect(failure).toMatchObject({ kind: "audience_denied", code: null, message: "Forbidden." });
    expect(failure.message).not.toMatch(/resolver audience/i);
    expect(failure.message).not.toMatch(/try again/i);
  });

  it("restates the refusal without claiming an audience cause when a 403 says nothing", () => {
    const failure = describeInteractionResolutionFailure(new ApiError("", 403, null), null);

    expect(failure.message).toBe("You do not have permission to respond to this card.");
    expect(failure.message).not.toMatch(/resolver audience/i);
  });

  it("does not ask for a retry when the card has already moved on", () => {
    const failure = describeInteractionResolutionFailure(
      denial(409, "interaction_superseded", "This confirmation was superseded by a newer request"),
      humanOnlyAudience,
    );

    expect(failure.kind).toBe("settled");
    expect(failure.message).toBe("This confirmation was superseded by a newer request.");
    expect(failure.message).not.toMatch(/try again/i);
  });

  it("keeps the retry prompt for a genuinely transient failure", () => {
    expect(
      describeInteractionResolutionFailure(new ApiError("Request failed: 503", 503, null), humanOnlyAudience),
    ).toMatchObject({ kind: "transient", message: "Request failed: 503. Try again." });
  });

  it("falls back to generic copy when nothing explains the failure", () => {
    expect(describeInteractionResolutionFailure(undefined, null)).toMatchObject({
      kind: "transient",
      message: "Couldn't submit. Try again.",
    });
  });

  it("leaves punctuation the server already wrote alone", () => {
    expect(
      interactionResolutionErrorMessage(denial(403, "interaction_human_only", "Agents cannot resolve this."), null),
    ).toBe("Agents cannot resolve this.");
  });
});

describe("localized resolution failures", () => {
  it("preserves classifications, codes and literal server evidence in Russian", () => {
    const ru = i18n.getFixedT("ru");
    const raw = "Server <b>denial</b> & evidence";
    const audience = { shortSummary: "Ответить может только оператор", isOpen: false };
    const forbidden = describeInteractionResolutionFailure(denial(403, "interaction_human_only", raw), audience, ru);
    expect(forbidden).toEqual({ kind: "audience_denied", code: "interaction_human_only", message: `${raw}. Ответить может только оператор.` });
    expect(forbidden.message).not.toContain("Повторите");
    const settled = describeInteractionResolutionFailure({ status: 409, body: { code: "interaction_already_resolved" } }, null, ru);
    expect(settled).toEqual({ kind: "settled", code: "interaction_already_resolved", message: "Этот запрос больше не ожидает решения." });
    expect(describeInteractionResolutionFailure(null, null, ru)).toEqual({ kind: "transient", code: null, message: "Не удалось отправить. Повторите попытку." });
    expect(describeInteractionResolutionFailure({ status: 403 }, null, ru).message).toBe("У вас нет права отвечать на эту карточку.");
    expect(describeInteractionResolutionFailure(null).message).toBe("Couldn't submit. Try again.");
  });
});

describe("decision count categories", () => {
  it.each([
    [0, "0 решений", "0 задач"],
    [1, "1 решение", "1 задачу"],
    [2, "2 решения", "2 задачи"],
    [5, "5 решений", "5 задач"],
    [11, "11 решений", "11 задач"],
    [21, "21 решение", "21 задачу"],
    [22, "22 решения", "22 задачи"],
    [25, "25 решений", "25 задач"],
    [1.5, "1.5 решения", "1.5 задачи"],
  ])("uses Russian plural category for %s", (count, decisions, issues) => {
    const ru = i18n.getFixedT("ru");
    expect(ru("decisionForms.interaction.applyDecisions", { count })).toBe(`Применить ${decisions}`);
    expect(ru("decisionForms.decision.cancelIssues", { count })).toBe(`Отменить ${issues}`);
  });
});
