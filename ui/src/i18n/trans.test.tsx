// @vitest-environment jsdom

import { act, Fragment, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Trans as I18nextTrans } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, Trans, useTranslation } from "./index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  await i18n.changeLanguage("en");
});

describe("Trans component slots", () => {
  it("keeps empty connection counts visible across English and Russian locale changes", async () => {
    function Counts() {
      useTranslation();
      return <>
        <div data-count="all"><Trans i18nKey="fullApps.all_6dd2ac" components={{ part1: <>{0}</> }} /></div>
        <div data-count="attention"><Trans i18nKey="fullApps.needs_attention_a93cca" components={{ part1: <>{0}</> }} /></div>
        <div data-count="actions"><Trans i18nKey="fullApps.on_f626e6" components={{ part1: <>{0}</> }} /></div>
      </>;
    }
    const labels = () => [...host.querySelectorAll("[data-count]")].map((node) => node.textContent);
    await act(async () => root.render(<Counts />));
    expect(labels()).toEqual(["All (0)", "Needs attention (0)", "0 on"]);
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(labels()).toEqual(["Все (0)", "Требуют внимания (0)", "Включено: 0"]);
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(labels()).toEqual(["All (0)", "Needs attention (0)", "0 on"]);
  });

  it("keeps zero counts in array slots and native elements without losing their props", async () => {
    const onClick = vi.fn();
    const zero = <button key="selected-count" type="button" title="selected actions" onClick={onClick}>{0}</button>;
    const total = <Fragment key="total-count">{0}</Fragment>;
    const components = Object.freeze([zero, total]);
    await act(async () => root.render(<Trans defaults="Selected <0/> of <1/>" components={components} />));
    expect(host.textContent).toBe("Selected 0 of 0");
    const button = host.querySelector("button")!;
    expect(button.type).toBe("button");
    expect(button.title).toBe("selected actions");
    await act(async () => button.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(zero.props.children).toBe(0);
    expect(zero.key).toBe("selected-count");
    expect(total.props.children).toBe(0);
    expect(total.key).toBe("total-count");
  });

  it("keeps the dependency's behavior for false, null, arrays and custom component children", async () => {
    function Custom({ children }: { children?: ReactNode }) {
      return <span data-child-type={typeof children}>{JSON.stringify(children)}</span>;
    }
    const components: Record<string, ReactElement> = {
      falseValue: <span>{false}</span>,
      nullValue: <span>{null}</span>,
      missingValue: <span />,
      positive: <>{4}</>,
      negative: <>{-2}</>,
      array: <>{[0]}</>,
      custom: <Custom>{0}</Custom>,
    };
    const defaults = "<falseValue/>|<nullValue/>|<missingValue/>|<positive/>|<negative/>|<array/>|<custom/>";
    await act(async () => root.render(<>
      <section data-render="wrapped"><Trans defaults={defaults} components={components} /></section>
      <section data-render="original"><I18nextTrans defaults={defaults} components={components} /></section>
    </>));
    expect(host.querySelector('[data-render="wrapped"]')!.innerHTML)
      .toBe(host.querySelector('[data-render="original"]')!.innerHTML);
    expect(components.custom.props).toHaveProperty("children", 0);
  });

  it("preserves opaque slot text and escaping while translating the surrounding message", async () => {
    const literal = '<img src="x" onerror="alert(1)"> & {{count}} <part1/>';
    function Literal() {
      useTranslation();
      return <Trans i18nKey="fullApps.on_f626e6" components={{ part1: <>{literal}</> }} />;
    }
    await act(async () => root.render(<Literal />));
    expect(host.textContent).toBe(`${literal} on`);
    expect(host.querySelector("img, part1")).toBeNull();
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(host.textContent).toBe(`Включено: ${literal}`);
    expect(host.querySelector("img, part1")).toBeNull();
  });

  it("preserves normal translation interpolation when there is no components map", async () => {
    await act(async () => root.render(<Trans defaults="Count: {{count}}" values={{ count: 0 }} />));
    expect(host.textContent).toBe("Count: 0");
  });
});
