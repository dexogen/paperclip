import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { Trans as I18nextTrans } from "react-i18next";

function preserveZeroChild(component: ReactElement): ReactElement {
  // react-i18next treats a falsy child as absent in self-closing component slots.
  // Only normalize display primitives; custom components may need numeric props.
  if (
    isValidElement<{ children?: ReactNode }>(component)
    && (component.type === Fragment || typeof component.type === "string")
    && component.props.children === 0
  ) {
    return cloneElement(component, undefined, "0");
  }
  return component;
}

export const Trans: typeof I18nextTrans = (props) => {
  const { components } = props;
  const normalized = !components
    ? components
    : Array.isArray(components)
      ? components.map(preserveZeroChild)
      : Object.fromEntries(Object.entries(components).map(([name, component]) => [name, preserveZeroChild(component)]));
  return <I18nextTrans {...props} components={normalized} />;
};
