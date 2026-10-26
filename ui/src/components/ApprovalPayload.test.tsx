// @vitest-environment jsdom

import { i18n } from "@/i18n";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApprovalPayloadRenderer, approvalLabel } from "./ApprovalPayload";
import { ThemeProvider } from "../context/ThemeContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("approvalLabel", () => {
  it("uses payload titles for generic board approvals", () => {
    expect(
      approvalLabel("request_board_approval", {
        title: "Reply with an ASCII frog",
      }),
    ).toBe("Board Approval: Reply with an ASCII frog");
  });
});

describe("ApprovalPayloadRenderer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("renders request_board_approval payload fields without falling back to raw JSON", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ThemeProvider>
          <ApprovalPayloadRenderer
            type="request_board_approval"
            payload={{
              title: "Reply with an ASCII frog",
              summary: "Board asked for approval before posting the frog.",
              recommendedAction: "Approve the frog reply.",
              nextActionOnApproval: "Post the frog comment on the issue.",
              risks: ["The frog might be too powerful."],
              proposedComment: "(o)<",
            }}
          />
        </ThemeProvider>,
      );
    });

    expect(container.textContent).toContain("Reply with an ASCII frog");
    expect(container.textContent).toContain("Board asked for approval before posting the frog.");
    expect(container.textContent).toContain("Approve the frog reply.");
    expect(container.textContent).toContain("Post the frog comment on the issue.");
    expect(container.textContent).toContain("The frog might be too powerful.");
    expect(container.textContent).toContain("(o)<");
    expect(container.textContent).not.toContain("\"recommendedAction\"");

    act(() => {
      root.unmount();
    });
  });

  it("renders markdown in board approval prose fields", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ThemeProvider>
          <ApprovalPayloadRenderer
            type="request_board_approval"
            payload={{
              title: "Reply with an ASCII frog",
              summary: "**Bold** and `code` and [a link](https://example.com).",
              recommendedAction: "Approve the **frog** reply.",
              nextActionOnApproval: "Post the `frog` comment.",
              risks: ["The **frog** might be too powerful."],
            }}
          />
        </ThemeProvider>,
      );
    });

    const bodies = container.querySelectorAll(".paperclip-markdown");
    expect(bodies.length).toBe(4);

    const summary = bodies[0];
    expect(summary.querySelector("strong")?.textContent).toBe("Bold");
    expect(summary.querySelector("code")?.textContent).toBe("code");
    const link = summary.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com");
    expect(link?.textContent).toBe("a link");

    // The raw markdown characters must not survive into the rendered text.
    expect(container.textContent).not.toContain("**Bold**");
    expect(container.textContent).not.toContain("[a link](https://example.com)");

    expect(bodies[1].querySelector("strong")?.textContent).toBe("frog");
    expect(bodies[2].querySelector("code")?.textContent).toBe("frog");
    expect(bodies[3].querySelector("strong")?.textContent).toBe("frog");

    act(() => {
      root.unmount();
    });
  });

  it("does not nest a second bullet when a risk is authored as a markdown list item", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ThemeProvider>
          <ApprovalPayloadRenderer
            type="request_board_approval"
            payload={{
              title: "Reply with an ASCII frog",
              risks: [
                "- **Leading dash** risk.",
                "* Leading star risk.",
                "• Leading dot risk.",
                "1. Leading number risk.",
                "2) Leading paren risk.",
              ],
            }}
          />
        </ThemeProvider>,
      );
    });

    const bodies = container.querySelectorAll(".paperclip-markdown");
    expect(bodies.length).toBe(5);
    for (const body of bodies) {
      expect(body.querySelector("ul")).toBeNull();
      expect(body.querySelector("ol")).toBeNull();
      expect(body.querySelector("li")).toBeNull();
    }

    expect(bodies[0].querySelector("strong")?.textContent).toBe("Leading dash");
    expect(container.textContent).toContain("Leading star risk.");
    expect(container.textContent).toContain("Leading dot risk.");
    expect(container.textContent).toContain("Leading number risk.");
    expect(container.textContent).toContain("Leading paren risk.");
    expect(container.textContent).not.toContain("- **Leading dash**");

    act(() => {
      root.unmount();
    });
  });

  it("renders every risk when two entries collapse to the same text after marker stripping", () => {
    const root = createRoot(container);
    const errors: unknown[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };

    try {
      act(() => {
        root.render(
          <ThemeProvider>
            <ApprovalPayloadRenderer
              type="request_board_approval"
              payload={{
                title: "Reply with an ASCII frog",
                risks: ["- Low probability", "* Low probability"],
              }}
            />
          </ThemeProvider>,
        );
      });

      expect(container.querySelectorAll(".paperclip-markdown").length).toBe(2);
      expect(errors).toEqual([]);
    } finally {
      console.error = originalError;
      act(() => {
        root.unmount();
      });
    }
  });

  it("can hide the repeated title when the card header already shows it", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ThemeProvider>
          <ApprovalPayloadRenderer
            type="request_board_approval"
            hidePrimaryTitle
            payload={{
              title: "Reply with an ASCII frog",
              summary: "Board asked for approval before posting the frog.",
            }}
          />
        </ThemeProvider>,
      );
    });

    expect(container.textContent).toContain("Board asked for approval before posting the frog.");
    expect(container.textContent).not.toContain("TitleReply with an ASCII frog");

    act(() => {
      root.unmount();
    });
  });
});

it("localizes known approval types while retaining subjects, unknown types and English defaults", () => {
  const payload = { title: "Board <b>literal</b>" };
  expect(approvalLabel("request_board_approval", payload, i18n.getFixedT("ru"))).toBe("Согласование оператора: Board <b>literal</b>");
  expect(approvalLabel("custom_type", payload, i18n.getFixedT("ru"))).toBe("custom_type: Board <b>literal</b>");
  expect(approvalLabel("request_board_approval", payload)).toBe("Board Approval: Board <b>literal</b>");
});

it("updates payload captions and USD display without translating stored fields or remounting prose", async () => {
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  const payload = Object.freeze({ name: "Agent <strong>literal</strong>", role: "engineer", title: "Literal title", capabilities: "Custom skills", desiredSkills: ["skill/path"], adapterType: "codex_local" });
  try {
    await i18n.changeLanguage("en");
    await act(async () => { root.render(<ThemeProvider>
      <ApprovalPayloadRenderer type="hire_agent" payload={payload} />
      <ApprovalPayloadRenderer type="budget_override_required" payload={{ scopeName: "Named scope", windowKind: "calendar_month_utc", metric: "billed_cents", budgetAmount: 12345, observedAmount: 6789 }} />
      <ApprovalPayloadRenderer type="request_board_approval" payload={{ summary: "**Custom** prose", nextActionOnApproval: "User instruction" }} />
    </ThemeProvider>); });
    const prose = container.querySelector(".paperclip-markdown");
    expect(prose?.querySelector("strong")?.textContent).toBe("Custom");
    expect(container.textContent).toContain("$123.45");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("Возможности");
    expect(container.textContent).toContain("Навыки");
    expect(container.textContent).toContain("После одобрения");
    expect(container.textContent).toContain("Лимит: 123,45");
    expect(container.textContent).toContain("$");
    for (const raw of ["Agent <strong>literal</strong>", "engineer", "Literal title", "skill/path", "codex_local", "Named scope", "calendar_month_utc", "billed_cents", "User instruction"]) expect(container.textContent).toContain(raw);
    expect(container.querySelector(".paperclip-markdown")).toBe(prose);
    expect(container.querySelectorAll("strong")).toHaveLength(1);
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("$123.45");
    expect(container.querySelector(".paperclip-markdown")).toBe(prose);
  } finally {
    await act(async () => { root.unmount(); }); container.remove(); await i18n.changeLanguage("en");
  }
});

it("distinguishes a hire's job title from a request title while preserving its value", async () => {
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      await i18n.changeLanguage("en");
      root.render(<ApprovalPayloadRenderer type="hire_agent" payload={{ name: "Editor", title: "Senior <b>Editor</b>" }} />);
    });
    expect(container.textContent).toContain("TitleSenior <b>Editor</b>");
    const value = [...container.querySelectorAll("span")].find((span) => span.textContent === "Senior <b>Editor</b>")!;
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("ДолжностьSenior <b>Editor</b>");
    expect(container.contains(value)).toBe(true);
    expect(container.querySelector("b")).toBeNull();
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("TitleSenior <b>Editor</b>");
  } finally {
    await act(async () => { root.unmount(); await i18n.changeLanguage("en"); });
    container.remove();
  }
});
