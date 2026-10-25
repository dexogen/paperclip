import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { posix } from "node:path";

let parse;
try {
  const uiRequire = createRequire(new URL("../../ui/package.json", import.meta.url));
  const storybookRequire = createRequire(uiRequire.resolve("storybook/internal/csf-tools"));
  ({ parse } = storybookRequire("@babel/parser"));
} catch (error) {
  throw new Error("Localization audit needs the pinned UI Storybook dependencies. Run pnpm install --frozen-lockfile (without a production-only/filter install).", { cause: error });
}

export const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const normalizeText = (value) => value.replace(/\s+/g, " ").trim();
const visibleNames = new Set([
  "title", "label", "description", "placeholder", "aria-label", "aria-description",
  "alt", "tooltip", "help", "helpText", "hint", "message", "emptyMessage", "emptyText",
  "confirmLabel", "cancelLabel", "submitLabel", "badgeLabel", "buttonText", "header",
  "loadingText", "successMessage", "errorMessage", "text", "caption",
]);
const scalarText = (node) => node?.type === "StringLiteral" ? node.value
  : node?.type === "TemplateLiteral" && node.expressions.length === 0 ? node.quasis[0].value.cooked : undefined;
const propertyName = (node) => node?.name ?? scalarText(node);

export function shouldScan(path, config) {
  if (!/\.[cm]?[jt]sx?$/.test(path) || /(?:\.d\.ts|\.(?:test|spec|stories)\.[cm]?[jt]sx?)$/.test(path)) return false;
  if (/(?:^|\/)(?:__tests__|__fixtures__|node_modules|dist|storybook)\//.test(path)) return false;
  if (!config.scanRoots.some((root) => path === root || path.startsWith(`${root}/`))) return false;
  return !(config.excludedSources ?? []).some(({ path: excluded }) => path === excluded || path.startsWith(`${excluded}/`));
}

function children(node) {
  return Object.entries(node).filter(([key]) => !["loc", "comments", "leadingComments", "trailingComments", "innerComments", "tokens", "errors"].includes(key))
    .flatMap(([, value]) => Array.isArray(value) ? value : [value]).filter((value) => value && typeof value.type === "string");
}

function staticKeys(node) {
  const value = scalarText(node);
  if (value !== undefined) return [value];
  if (node?.type === "ArrayExpression" && node.elements.every((item) => scalarText(item) !== undefined)) return node.elements.map(scalarText);
  if (node?.type === "ConditionalExpression") {
    const yes = staticKeys(node.consequent), no = staticKeys(node.alternate);
    return yes && no ? [...yes, ...no] : null;
  }
  return null;
}

export function scanSource(path, source) {
  const literals = [], references = [], dynamicKeys = [], errors = [];
  let ast;
  try {
    ast = parse(source, { sourceType: "unambiguous", plugins: ["typescript", "jsx", "decorators-legacy"], errorRecovery: true });
  } catch (error) {
    return { literals, references, dynamicKeys, errors: [{ file: path, line: error.loc?.line, message: error.message }] };
  }
  const parents = new WeakMap(), nodes = [];
  const collect = (node, parent) => { parents.set(node, parent); nodes.push(node); children(node).forEach((child) => collect(child, node)); };
  collect(ast, null);
  const textOf = (node) => source.slice(node.start, node.end);
  const ownerOf = (node) => {
    const owners = [];
    for (let current = parents.get(node); current; current = parents.get(current)) {
      if (["FunctionDeclaration", "ClassDeclaration", "VariableDeclarator"].includes(current.type) && current.id?.name) owners.push(current.id.name);
      else if (["ObjectMethod", "ClassMethod"].includes(current.type)) owners.push(propertyName(current.key) ?? "<method>");
    }
    return owners.reverse().join("/") || "<module>";
  };
  const translationNames = new Set(), i18nNames = new Set(), hooks = new Set(), namespaceByName = new Map();
  for (const node of nodes) {
    if (node.type !== "ImportDeclaration") continue;
    const specifier = node.source.value;
    const resolved = (specifier.startsWith(".") ? posix.join(posix.dirname(path), specifier) : specifier)
      .replace(/\.[cm]?[jt]sx?$/, "");
    if (!/(?:^|\/)(?:i18n(?:\/index)?|react-i18next)$/.test(resolved)) continue;
    for (const item of node.specifiers) {
      if (item.type === "ImportDefaultSpecifier") i18nNames.add(item.local.name);
      if (item.imported?.name === "t") translationNames.add(item.local.name);
      if (item.imported?.name === "i18n") i18nNames.add(item.local.name);
      if (item.imported?.name === "useTranslation") hooks.add(item.local.name);
    }
  }
  for (const node of nodes) {
    if (node.type !== "VariableDeclarator" || node.id.type !== "ObjectPattern" || node.init?.type !== "CallExpression" || !hooks.has(node.init.callee.name)) continue;
    for (const item of node.id.properties) {
      if (propertyName(item.key) === "t" && item.value?.type === "Identifier") {
        translationNames.add(item.value.name);
        namespaceByName.set(item.value.name, scalarText(node.init.arguments[0]) ?? "translation");
      }
    }
  }
  const isTranslationCall = (node) => ["CallExpression", "OptionalCallExpression"].includes(node?.type) && (
    translationNames.has(node.callee.name)
    || node.callee.type === "MemberExpression" && node.callee.property.name === "t" && i18nNames.has(node.callee.object.name));
  const parameterContract = (node) => {
    const provided = new Set(), dynamic = [];
    let hasCount = false;
    const addObject = (value, selectors = true) => {
      if (!value) return;
      if (value.type !== "ObjectExpression") {
        dynamic.push(normalizeText(textOf(value)));
        return;
      }
      for (const property of value.properties) {
        if (property.type === "SpreadElement") {
          dynamic.push(normalizeText(textOf(property)));
          continue;
        }
        const key = property.computed ? scalarText(property.key) : propertyName(property.key);
        if (key === undefined) {
          dynamic.push(normalizeText(textOf(property)));
          continue;
        }
        if (key === "replace") {
          dynamic.push(`replace option: ${normalizeText(textOf(property.value))}`);
          continue;
        }
        if (property.value?.type === "Identifier" && property.value.name === "undefined") continue;
        provided.add(key);
        if (selectors && key === "count") hasCount = true;
      }
    };
    if (node.type === "JSXAttribute") {
      const opening = parents.get(node);
      for (const attribute of opening.attributes ?? []) {
        if (attribute.type === "JSXSpreadAttribute") {
          dynamic.push(normalizeText(textOf(attribute)));
          continue;
        }
        const name = propertyName(attribute.name);
        const value = attribute.value?.type === "JSXExpressionContainer" ? attribute.value.expression : attribute.value;
        if (name === "values" || name === "tOptions") addObject(value);
        else if (name === "count" && value && !(value.type === "Identifier" && value.name === "undefined")) {
          provided.add("count");
          hasCount = true;
        }
      }
    } else {
      const argument = node.arguments[1];
      addObject(scalarText(argument) !== undefined ? node.arguments[2] : argument);
    }
    return { provided: [...provided].sort(), hasCount, dynamic: [...new Set(dynamic)].sort() };
  };
  const location = (node) => ({ file: path, line: node.loc.start.line, owner: ownerOf(node) });
  const occurrences = new Map();
  const finding = (node, kind, text) => {
    const where = location(node), fingerprint = [path, where.owner, kind, text], base = hash(fingerprint);
    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);
    return { id: hash([...fingerprint, occurrence]), ...where, kind, text };
  };
  const sinkFor = (node) => {
    if (node.type === "JSXText") return "jsx-text";
    for (let parent = parents.get(node); parent; parent = parents.get(parent)) {
      if (isTranslationCall(parent)) return null;
      if (parent.type === "TemplateLiteral") return null;
      if (parent.type === "JSXAttribute") return visibleNames.has(propertyName(parent.name)) ? `attribute:${propertyName(parent.name)}` : null;
      if (parent.type === "ObjectProperty") {
        const name = propertyName(parent.key);
        if (visibleNames.has(name)) return `property:${name}`;
        let declaration = parents.get(parent);
        while (declaration && declaration.type !== "VariableDeclarator" && !/Statement$/.test(declaration.type)) declaration = parents.get(declaration);
        return declaration?.type === "VariableDeclarator" && /(?:_LABELS|_TITLES|_DESCRIPTIONS|_MESSAGES)$/.test(declaration.id.name ?? "") ? "display-map" : null;
      }
      if (parent.type === "CallExpression") {
        const name = textOf(parent.callee);
        return /^(?:toast|notify|notification)(?:\.(?:success|error|info|warning|warn|loading|message))?$/.test(name)
          || /^(?:window\.)?(?:alert|confirm|prompt)$/.test(name)
          || /^set(?:Error|Message|Notice|Success)(?:Message|Text)?$/.test(name) ? `call:${name}` : null;
      }
      if (parent.type === "JSXExpressionContainer" && ["JSXElement", "JSXFragment"].includes(parents.get(parent)?.type)) return "jsx-expression";
      if (parent.type === "VariableDeclarator") return /(?:Label|Title|Description|Text|Message|Placeholder)$/i.test(parent.id.name ?? "") ? "display-variable" : null;
      if (/Statement$/.test(parent.type) || parent.type === "JSXOpeningElement") return null;
    }
    return null;
  };
  for (const node of nodes) {
    if (isTranslationCall(node) || node.type === "JSXAttribute" && propertyName(node.name) === "i18nKey") {
      const expression = node.type === "JSXAttribute" ? (node.value?.type === "JSXExpressionContainer" ? node.value.expression : node.value) : node.arguments[0];
      const keys = staticKeys(expression);
      const namespace = namespaceByName.get(node.callee?.name) ?? "translation";
      if (keys) {
        for (const key of keys) references.push({ ...location(node), key: namespace === "translation" ? key.replace(/^translation:/, "") : `${namespace}:${key}`, parameters: parameterContract(node) });
      } else dynamicKeys.push(finding(node, "dynamic-key", normalizeText(expression ? textOf(expression) : "<absent>")));
    }
    let text;
    if (node.type === "StringLiteral" || node.type === "JSXText") text = normalizeText(node.value);
    else if (node.type === "TemplateLiteral") text = normalizeText(node.quasis.map((part, index) =>
      (part.value.cooked ?? part.value.raw) + (node.expressions[index] ? `{{${normalizeText(textOf(node.expressions[index]))}}}` : "")).join(""));
    if (text && /\p{L}/u.test(text)) {
      const sink = sinkFor(node);
      if (sink) literals.push(finding(node, sink, text));
    }
  }
  errors.push(...ast.errors.map((error) => ({ file: path, line: error.loc?.line, message: error.message })));
  return { literals, references, dynamicKeys, errors };
}

export function compareFindings(previous, current) {
  const oldIds = new Set(previous.map((item) => item.id)), newIds = new Set(current.map((item) => item.id));
  return { added: current.filter((item) => !oldIds.has(item.id)), removed: previous.filter((item) => !newIds.has(item.id)) };
}
