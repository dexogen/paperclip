// @vitest-environment jsdom

import { act, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { BOOTSTRAP_FALLBACK_COMMAND } from "@/bootstrapSetup";
import { BootstrapPendingPage } from "./BootstrapPendingPage";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => <a href={to} {...props}>{children}</a>,
}));

type Props = ComponentProps<typeof BootstrapPendingPage>;
const session = {
  session: { id: "session-1", userId: "operator-1" },
  user: { id: "operator-1", name: "Operator <name>", email: "operator@example.invalid", image: null },
  sentryDsn: null,
};
let container: HTMLDivElement;
let root: Root;
const claim = vi.fn();

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await i18n.changeLanguage("en");
  localStorage.clear();
  claim.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  await i18n.changeLanguage("en");
  localStorage.clear();
  container.remove();
});
async function render(props: Partial<Props> = {}) {
  await act(async () => {
    root.render(<BootstrapPendingPage claimAvailable session={session} claimState="idle" onClaim={claim} {...props} />);
  });
}
async function selectLanguage(language: "en" | "ru") {
  await act(async () => {
    const select = container.querySelector("select")!;
    select.value = language;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("bootstrap localization", () => {
  it("keeps markup-like fallback account names literal in both languages", async () => {
    const name = 'Operator <strong>name</strong> & "<identity>"';
    await render({ session: { ...session, user: { ...session.user, email: "", name } } });
    for (const language of ["ru", "en", "ru"] as const) {
      await selectLanguage(language);
      const identity = container.querySelector("span.font-medium.text-foreground")!;
      expect(identity.textContent).toBe(name);
      expect(identity.childElementCount).toBe(0);
      expect(container.textContent).toContain(`${language === "ru" ? "Выполнен вход:" : "Signed in as"} ${name}`);
      expect(claim).not.toHaveBeenCalled();
    }
  });

  it("switches the real control without claiming or changing the signed-in identity and command", async () => {
    await render();
    expect(container.textContent).toContain("Claim this instance");
    await selectLanguage("ru");
    expect(container.querySelector("h1")?.textContent).toBe("Завершите настройку Paperclip");
    expect(container.textContent).toContain("Выполнен вход: operator@example.invalid");
    expect(container.querySelector("pre")?.textContent?.trim()).toBe(BOOTSTRAP_FALLBACK_COMMAND);
    expect(container.querySelector('a[href="/auth?next=/"]')?.textContent).toBe("Сменить учётную запись");
    expect(claim).not.toHaveBeenCalled();
    await selectLanguage("en");
    expect(container.textContent).toContain("Signed in as operator@example.invalid");
    expect(claim).not.toHaveBeenCalled();
    await selectLanguage("ru");
    const button = [...container.querySelectorAll("button")].find(element => element.textContent === "Стать администратором")!;
    await act(async () => button.click());
    expect(claim).toHaveBeenCalledTimes(1);
    await render({ claimState: "claiming" });
    expect(container.querySelector("button")?.disabled).toBe(true);
    await selectLanguage("en");
    expect(container.querySelector("button")?.disabled).toBe(true);
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it("keeps public bootstrap invite-only in both languages", async () => {
    await render({ claimAvailable: false, hasActiveInvite: true });
    await selectLanguage("ru");
    expect(container.textContent).toContain("В публичном режиме нельзя назначить себя администратором через браузер");
    expect(container.textContent).toContain("Приглашение для первого администратора уже создано");
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("pre")?.textContent?.trim()).toBe(BOOTSTRAP_FALLBACK_COMMAND);
    await selectLanguage("en");
    expect(container.textContent).toContain("Browser-based claim is intentionally disabled");
    expect(container.querySelector("button")).toBeNull();
    expect(claim).not.toHaveBeenCalled();
  });

  it("keeps sign-in routing and updates a rendered claim conflict without claiming again", async () => {
    await render({ session: null });
    await selectLanguage("ru");
    expect(container.querySelector('a[href="/auth?next=/"]')?.textContent).toBe("Войти / Создать учётную запись");
    expect(claim).not.toHaveBeenCalled();
    await render({ claimError: { status: 409, message: "Provider detail" } });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("У этого экземпляра уже есть администратор.");
    await selectLanguage("en");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Someone else has already claimed this instance.");
    expect(container.textContent).not.toContain("Provider detail");
    expect(claim).not.toHaveBeenCalled();
  });
});
