// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n, setLocale } from "@/i18n";
import { JsonSchemaForm, formatJsonSchemaValidationIssue, validateField, validateJsonSchemaForm, validateJsonSchemaFormIssues, type JsonSchemaFormErrors, type JsonSchemaNode } from "./JsonSchemaForm";
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

it("keeps nested raw schema content, draft focus, and custom errors while formatting owned saved issues", async () => {
  const changed = vi.fn();
  const schema: JsonSchemaNode = { type: "object", required: ["own"], properties: {
    own: { type: "string", title: "User <b>& title</b>", description: "This field is required", minLength: 5 },
    raw: { type: "string", title: "Provider field" },
    extra: { type: "string", title: "Custom option", "x-paperclip-advanced": true, "x-paperclip-group": "More options" },
  } };
  function Harness() {
    const [values, setValues] = useState<Record<string, unknown>>({ own: "draft", extra: "literal" });
    const [errors, setErrors] = useState<JsonSchemaFormErrors>({});
    return <><JsonSchemaForm schema={schema} values={values} errors={errors} onChange={next => { changed(next); setValues(next); }} />
      <button onClick={() => setErrors({ ...validateJsonSchemaFormIssues(schema, values), "/raw": "This field is required" })}>Validate fixture</button></>;
  }
  await act(async () => root.render(<Harness />));
  const input = container.querySelector<HTMLInputElement>('[aria-label="User <b>& title</b>"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "abc");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "Advanced options")!.click());
  await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "Validate fixture")!.click());
  input.focus(); input.setSelectionRange(1, 2);
  await act(async () => setLocale("ru"));
  expect(container.textContent).toContain("Минимальная длина — 5 символов");
  expect(container.textContent).toContain("This field is required");
  expect(container.textContent).toContain("More options");
  expect(container.textContent).toContain("User <b>& title</b>");
  expect(container.querySelector("b")).toBeNull();
  expect(container.querySelector('input[aria-label="User <b>& title</b>"]')).toBe(input);
  expect(document.activeElement).toBe(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([1, 2]);
  expect(changed).toHaveBeenCalledTimes(1);
  await act(async () => setLocale("en"));
  expect(container.textContent).toContain("Must be at least 5 characters");
  expect(changed).toHaveBeenCalledTimes(1);
});

it("preserves legacy validation paths including arrays, slashes and tildes", async () => {
  const schema: JsonSchemaNode = { type: "object", required: ["a/b~c"], properties: {
    "a/b~c": { type: "string" },
    list: { type: "array", items: { type: "object", required: ["x/y~"], properties: { "x/y~": { type: "string" } } } },
    "pattern~": { type: "string", pattern: "^literal<&>$" },
  } };
  const values = { list: [{}], "pattern~": "mismatch" };
  const legacy = validateJsonSchemaForm(schema, values);
  const issues = validateJsonSchemaFormIssues(schema, values);
  expect(Object.keys(issues)).toEqual(Object.keys(legacy));
  expect(Object.keys(issues)).toEqual(["/a/b~c", "/list/0/x/y~", "/pattern~"]);
  expect(Object.fromEntries(Object.entries(issues).map(([path, issue]) => [path, formatJsonSchemaValidationIssue(issue)]))).toEqual(legacy);
  expect(formatJsonSchemaValidationIssue(issues["/pattern~"], i18n.getFixedT("ru"))).toContain("^literal<&>$");
  await setLocale("ru");
  expect(validateField(undefined, { type: "string" }, true)).toBe("This field is required");
  expect(validateJsonSchemaForm(schema, values)).toEqual(legacy);
});

it.each([{ count: 1, suffix: "символ" }, { count: 2, suffix: "символа" }, { count: 5, suffix: "символов" }, { count: 21, suffix: "символ" }])("formats a Russian maximum of $count without changing the validation rule", ({ count, suffix }) => {
  const schema: JsonSchemaNode = { type: "object", properties: { text: { type: "string", maxLength: count } } };
  const issues = validateJsonSchemaFormIssues(schema, { text: "x".repeat(count + 1) });
  expect(formatJsonSchemaValidationIssue(issues["/text"], i18n.getFixedT("ru"))).toBe(`Максимальная длина — ${count} ${suffix}`);
  expect(validateJsonSchemaFormIssues(schema, { text: "x".repeat(count) })).toEqual({});
});

it("keeps legacy singular strings while formatting new issue details with English singular grammar", async () => {
  const cases: Array<{ schema: JsonSchemaNode; value: unknown; legacy: string; display: string }> = [
    { schema: { type: "string", minLength: 1 }, value: [], legacy: "Must be at least 1 characters", display: "Must be at least 1 character" },
    { schema: { type: "string", maxLength: 1 }, value: "ab", legacy: "Must be at most 1 characters", display: "Must be at most 1 character" },
    { schema: { type: "array", items: { type: "string" }, minItems: 1 }, value: [], legacy: "Must have at least 1 items", display: "Must have at least 1 item" },
    { schema: { type: "array", items: { type: "string" }, maxItems: 1 }, value: ["a", "b"], legacy: "Must have at most 1 items", display: "Must have at most 1 item" },
  ];
  await setLocale("ru");
  for (const { schema, value, legacy, display } of cases) {
    const objectSchema: JsonSchemaNode = { type: "object", properties: { field: schema } };
    expect(validateField(value, schema, false)).toBe(legacy);
    expect(validateJsonSchemaForm(objectSchema, { field: value })).toEqual({ "/field": legacy });
    const issue = validateJsonSchemaFormIssues(objectSchema, { field: value })["/field"];
    expect(formatJsonSchemaValidationIssue(issue)).toBe(display);
  }
});
