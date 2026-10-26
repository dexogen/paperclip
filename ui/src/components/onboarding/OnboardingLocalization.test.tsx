// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLocale, t } from "../../i18n";
import { ProviderSubscriptionCard, OnboardingCardField, LocalProviderLoginInstructions } from "../AdapterLoginChrome";
import { SavedProviderKeySelect } from "./SavedProviderKeySelect";
import { Stepper } from "./Stepper";
import { CredentialModeLink } from "./CredentialModeLink";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("onboarding localization", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await setLocale("ru");
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    await setLocale("en");
  });

  it("switches authentication instructions while preserving authorization URLs and entered codes", async () => {
    const authorizationUrl = "https://provider.example/authorize?opaque=original";
    await act(async () => root.render(
      <ProviderSubscriptionCard providerName="Claude" authorizationUrl={authorizationUrl} mode="submitted_code">
        <OnboardingCardField value="original-code-123" onChange={() => {}} onSubmit={() => {}} />
      </ProviderSubscriptionCard>,
    ));
    expect(container.textContent).toBe("Войдите в Claude, затем вернитесь и введите код авторизации");
    expect(container.querySelector("a")?.getAttribute("href")).toBe(authorizationUrl);
    const input = container.querySelector("input")!;
    expect(input.getAttribute("aria-label")).toBe("Код авторизации");
    expect(input.placeholder).toBe("Вставьте код авторизации");
    expect(input.value).toBe("original-code-123");
    await act(async () => { await setLocale("en"); });
    expect(container.textContent).toBe("Sign in to Claude then come back and enter authorization code");
    expect(input.getAttribute("aria-label")).toBe("Authorization code");
    expect(input.value).toBe("original-code-123");
  });

  it("keeps provider diagnostics and terminal commands intact", async () => {
    const command = "grok auth login --profile original";
    await act(async () => root.render(<LocalProviderLoginInstructions adapterType="grok_local" login={{
      isolated: true, command, preparing: false, status: "sign_in_required", error: null, retry: vi.fn(),
    }} />));
    expect(container.textContent).toContain(command);
    expect(container.textContent).toContain("Выполните команду в терминале");
    expect(container.querySelector('[aria-label="Скопировать команду входа"]')).not.toBeNull();
    await act(async () => root.render(<LocalProviderLoginInstructions adapterType="grok_local" login={{
      isolated: true, command, preparing: false, status: "sign_in_required", error: "provider: AUTH_DENIED original", retry: vi.fn(),
    }} />));
    expect(container.textContent).toContain("provider: AUTH_DENIED original");
    expect(container.textContent).toContain("Начать вход заново");
  });

  it("localizes progress and saved credentials without translating account labels", async () => {
    const onChange = vi.fn();
    await act(async () => root.render(<>
      <Stepper step={2} />
      <CredentialModeLink mode="subscription" onChange={onChange} />
      <SavedProviderKeySelect options={[{ id: "key-1", label: "Owner's production key", binding: { type: "plain", value: "opaque" } }]} value="key-1" onChange={onChange} loading={false} error={true} />
    </>));
    expect(container.textContent).toContain("Шаг 2 из 3");
    expect(container.querySelector('[aria-label="Создайте первого агента"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Использовать API-ключ"]')).not.toBeNull();
    expect(container.querySelector("select")?.getAttribute("aria-label")).toBe("Сохранённый API-ключ");
    expect(container.querySelector("option")?.textContent).toBe("Owner's production key");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Не удалось загрузить некоторые сохранённые ключи");
    expect(container.textContent).toContain("Использовать этот сохранённый ключ для агента.");
  });

  it.each([
    [0, "Доступно 0 сохранённых API-ключей."],
    [1, "Доступен 1 сохранённый API-ключ."],
    [2, "Доступно 2 сохранённых API-ключа."],
    [5, "Доступно 5 сохранённых API-ключей."],
    [11, "Доступно 11 сохранённых API-ключей."],
    [21, "Доступен 21 сохранённый API-ключ."],
    [22, "Доступно 22 сохранённых API-ключа."],
    [25, "Доступно 25 сохранённых API-ключей."],
    [1.5, "Доступно 1.5 сохранённого API-ключа."],
  ])("uses Russian plural forms for %s saved credentials", (count, expected) => {
    expect(t("onboarding.credentials.savedAvailable", { count })).toBe(expected);
  });
});
