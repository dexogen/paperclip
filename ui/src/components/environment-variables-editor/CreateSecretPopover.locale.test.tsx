// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setLocale } from "@/i18n";
import { SecretPopoverForm } from "./CreateSecretPopover";
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  await setLocale("en");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  await setLocale("en");
});

it("keeps source variable markup literal while store captions change", async () => {
  const submit = vi.fn();
  const cancel = vi.fn();
  await act(async () => root.render(<SecretPopoverForm mode="store" initialName="ENV<strong>raw&</strong>" initialValue="secret<&>" onSubmit={submit} onCancel={cancel} />));
  expect(container.querySelector("[data-slot=popover-description]")?.textContent).toContain("ENV<strong>raw&</strong>");
  expect(container.querySelector("strong")).toBeNull();
  const value = container.querySelector<HTMLInputElement>('[aria-label="Secret value"]')!;
  await act(async () => setLocale("ru"));
  expect(container.querySelector('[aria-label="Значение секрета"]')).toBe(value);
  expect(value.value).toBe("secret<&>");
  expect(value.readOnly).toBe(true);
  expect(container.textContent).toContain("ENV<strong>raw&</strong>");
  expect(container.querySelector("strong")).toBeNull();
  expect(submit).not.toHaveBeenCalled();
  expect(cancel).not.toHaveBeenCalled();
});

it.each([undefined, new Error("Failed to create secret")])("keeps a failed write receipt and raw error provenance on locale changes (%s)", async cause => {
  const submit = vi.fn().mockRejectedValueOnce(cause);
  await act(async () => root.render(<SecretPopoverForm mode="create" initialName="literal_key" initialValue="raw<&>" onSubmit={submit} onCancel={vi.fn()} />));
  const name = container.querySelector<HTMLInputElement>('[aria-label="Secret name"]')!;
  const action = [...container.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Create & bind")!;
  await act(async () => action.click());
  expect(submit).toHaveBeenCalledExactlyOnceWith("literal_key", "raw<&>");
  expect(container.textContent).toContain("Failed to create secret");
  name.focus(); name.setSelectionRange(1, 5);
  await act(async () => setLocale("ru"));
  expect(container.textContent).toContain(cause instanceof Error ? "Failed to create secret" : "Не удалось создать секрет");
  if (cause instanceof Error) expect(container.textContent).not.toContain("Не удалось создать секрет");
  expect(container.querySelector('[aria-label="Имя секрета"]')).toBe(name);
  expect(document.activeElement).toBe(name);
  expect([name.selectionStart, name.selectionEnd]).toEqual([1, 5]);
  await act(async () => setLocale("en"));
  expect(submit).toHaveBeenCalledTimes(1);
});
