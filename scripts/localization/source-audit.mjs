import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { posix } from "node:path";

let parse, traverse;
try {
  const uiRequire = createRequire(new URL("../../ui/package.json", import.meta.url));
  const storybookRequire = createRequire(uiRequire.resolve("storybook/internal/csf-tools"));
  ({ parse } = storybookRequire("@babel/parser"));
  ({ traverse } = uiRequire("storybook/internal/babel"));
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
  "disabledLabel", "actionLabel", "secondaryLabel", "labelText", "body",
  "searchPlaceholder", "loadingMessage",
]);
const displayMapName = /(?:_LABELS|_TITLES|_DESCRIPTIONS|_MESSAGES|_COPY|_NAMES)$|(?:Labels|Titles|Descriptions|Messages|Copy|Names)$/i;
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

function lexicalBindings(ast) {
  const paths = new WeakMap(), metadata = new WeakMap(), typeScopes = new WeakMap();
  const functions = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression",
    "ObjectMethod", "ClassMethod", "ClassPrivateMethod", "TSDeclareFunction"]);
  traverse(ast, { enter(path) { paths.set(path.node, path); } });
  const bindingInfo = (binding) => {
    if (!binding) return null;
    if (!metadata.has(binding)) metadata.set(binding, { kind: "ordinary" });
    return metadata.get(binding);
  };
  const valueBinding = (node, name) => bindingInfo(paths.get(node)?.scope.getBinding(name));
  const typeScopeNodes = new Set(["Program", "BlockStatement", "CatchClause", "ForStatement", "ForInStatement",
    "ForOfStatement", "SwitchStatement", "StaticBlock", "TSModuleBlock", "ClassDeclaration", "ClassExpression",
    "TSTypeAliasDeclaration", "TSInterfaceDeclaration", "TSFunctionType", "TSConstructorType",
    "TSCallSignatureDeclaration", "TSConstructSignatureDeclaration", "TSMethodSignature", ...functions]);
  const visitTypes = (node, outer) => {
    if (["ClassDeclaration", "TSTypeAliasDeclaration", "TSInterfaceDeclaration", "TSEnumDeclaration", "TSModuleDeclaration"].includes(node.type) && node.id?.name) {
      outer.names.set(node.id.name, { kind: "ordinary" });
    }
    const scope = typeScopeNodes.has(node.type) ? { parent: outer, names: new Map() } : outer;
    typeScopes.set(node, scope);
    if (["ClassDeclaration", "ClassExpression"].includes(node.type) && node.id?.name) scope.names.set(node.id.name, { kind: "ordinary" });
    for (const parameter of node.typeParameters?.params ?? []) {
      if (parameter.type === "TSTypeParameter") scope.names.set(parameter.name, { kind: "ordinary" });
    }
    if (node.type === "ImportDeclaration") {
      for (const specifier of node.specifiers) {
        scope.names.set(specifier.local.name, { kind: node.source.value === "i18next" && propertyName(specifier.imported) === "TFunction" ? "translator-type" : "ordinary" });
      }
    }
    for (const child of children(node)) visitTypes(child, scope);
  };
  visitTypes(ast, null);
  return {
    declarations: { get(node) { return valueBinding(node, node.name); } },
    functions,
    resolve(node, name, space = "values") {
      if (space === "values") return valueBinding(node, name);
      for (let scope = typeScopes.get(node); scope; scope = scope.parent) {
        if (scope.names.has(name)) return scope.names.get(name);
      }
      return null;
    },
  };
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
  let bindings;
  try {
    bindings = lexicalBindings(ast);
  } catch (error) {
    return { literals, references, dynamicKeys, errors: [{ file: path, line: error.loc?.line, message: error.message }] };
  }
  const namespaceFor = (node, typeArgument = false) => {
    if (!node || node.type === "TSUndefinedKeyword" || node.type === "Identifier" && node.name === "undefined" && !bindings.resolve(node, "undefined")) return "translation";
    return scalarText(typeArgument && node.type === "TSLiteralType" ? node.literal : node);
  };
  const isEmptyPrefix = (node, typeArgument = false) => !node || node.type === "TSUndefinedKeyword"
    || node.type === "Identifier" && node.name === "undefined" && !bindings.resolve(node, "undefined")
    || scalarText(typeArgument && node.type === "TSLiteralType" ? node.literal : node) === "";
  const hookPrefix = (options) => {
    if (!options || isEmptyPrefix(options)) return null;
    if (options.type !== "ObjectExpression") return options;
    for (const item of options.properties) {
      if (item.type === "SpreadElement") return item;
      const key = item.computed ? scalarText(item.key) : propertyName(item.key);
      if (key === undefined || key === "keyPrefix" && !isEmptyPrefix(item.value)) return item;
    }
    return null;
  };
  const markTranslator = (binding, namespace, namespaceNode, prefixNode = null) => {
    if (binding) Object.assign(binding, { kind: "translator", namespace, namespaceNode, prefixNode });
  };
  for (const node of nodes) {
    if (node.type !== "ImportDeclaration" || node.importKind === "type") continue;
    const specifier = node.source.value;
    const resolved = (specifier.startsWith(".") ? posix.join(posix.dirname(path), specifier) : specifier)
      .replace(/\.[cm]?[jt]sx?$/, "");
    if (!/(?:^|\/)(?:i18n(?:\/index)?|react-i18next)$/.test(resolved)) continue;
    for (const item of node.specifiers) {
      if (item.importKind === "type") continue;
      const binding = bindings.declarations.get(item.local);
      const imported = propertyName(item.imported);
      if (item.type === "ImportDefaultSpecifier" || imported === "i18n") binding.kind = "i18n";
      if (imported === "t") markTranslator(binding, "translation");
      if (imported === "useTranslation") binding.kind = "hook";
    }
  }
  for (const node of nodes) {
    if (bindings.functions.has(node.type)) {
      for (const parameter of node.params) {
        const binding = parameter.type === "AssignmentPattern" ? parameter.left : parameter;
        if (binding.type !== "Identifier") continue;
        const type = binding.typeAnnotation?.typeAnnotation;
        if (type?.type !== "TSTypeReference" || type.typeName.type !== "Identifier"
          || bindings.resolve(binding, type.typeName.name, "types")?.kind !== "translator-type") continue;
        const namespace = type.typeParameters?.params[0];
        const prefix = type.typeParameters?.params[1];
        markTranslator(bindings.declarations.get(binding), namespaceFor(namespace, true), namespace,
          isEmptyPrefix(prefix, true) ? null : prefix);
      }
    }
    if (node.type !== "VariableDeclarator" || node.id.type !== "ObjectPattern" || node.init?.type !== "CallExpression"
      || node.init.callee.type !== "Identifier" || bindings.resolve(node.init, node.init.callee.name)?.kind !== "hook") continue;
    for (const item of node.id.properties) {
      const value = item.value?.type === "AssignmentPattern" ? item.value.left : item.value;
      if (propertyName(item.key) === "t" && value?.type === "Identifier") {
        markTranslator(bindings.declarations.get(value), namespaceFor(node.init.arguments[0]), node.init.arguments[0],
          hookPrefix(node.init.arguments[1]));
      }
    }
  }
  const translationBinding = (node) => {
    if (!["CallExpression", "OptionalCallExpression"].includes(node?.type)) return null;
    if (node.callee.type === "Identifier") {
      const binding = bindings.resolve(node, node.callee.name);
      return binding?.kind === "translator" ? binding : null;
    }
    if (["MemberExpression", "OptionalMemberExpression"].includes(node.callee.type)
      && (node.callee.computed ? scalarText(node.callee.property) : propertyName(node.callee.property)) === "t"
      && node.callee.object.type === "Identifier" && bindings.resolve(node, node.callee.object.name)?.kind === "i18n") {
      return { namespace: "translation" };
    }
    return null;
  };
  const isTranslationCall = (node) => translationBinding(node) !== null;
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
    for (let child = node, parent = parents.get(node); parent; child = parent, parent = parents.get(parent)) {
      if (isTranslationCall(parent)) return null;
      if (parent.type === "TemplateLiteral") return null;
      // These literals select a value; they cannot themselves become display
      // copy. Keep both result branches and string concatenation in the audit.
      if (parent.type === "ConditionalExpression" && child === parent.test) return null;
      if (parent.type === "BinaryExpression" && parent.operator !== "+") return null;
      if (parent.type === "LogicalExpression" && parent.operator === "&&" && child === parent.left) return null;
      if (parent.type === "UnaryExpression" || parent.type.startsWith("TS") && !["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression"].includes(parent.type)) return null;
      if (["MemberExpression", "OptionalMemberExpression"].includes(parent.type) && child === parent.property) return null;
      if (parent.type === "JSXAttribute") return visibleNames.has(propertyName(parent.name)) ? `attribute:${propertyName(parent.name)}` : null;
      if (parent.type === "ObjectMethod" && child === parent.key) return null;
      if (parent.type === "ObjectProperty") {
        if (child === parent.key) return null;
        const name = propertyName(parent.key);
        if (visibleNames.has(name)) return `property:${name}`;
        let declaration = parents.get(parent);
        while (declaration && declaration.type !== "VariableDeclarator" && !/Statement$/.test(declaration.type)) declaration = parents.get(declaration);
        return declaration?.type === "VariableDeclarator" && displayMapName.test(declaration.id.name ?? "") ? "display-map" : null;
      }
      if (parent.type === "CallExpression") {
        if (child === parent.callee && child.type === "MemberExpression"
          && child.object.type === "ArrayExpression" && propertyName(child.property) === "map") continue;
        const name = textOf(parent.callee);
        return /^(?:toast|notify|notification)(?:\.(?:success|error|info|warning|warn|loading|message))?$/.test(name)
          || /^(?:window\.)?(?:alert|confirm|prompt)$/.test(name)
          || /^set(?:Error|Message|Notice|Success)(?:Message|Text)?$/.test(name) ? `call:${name}` : null;
      }
      if (parent.type === "JSXExpressionContainer" && ["JSXElement", "JSXFragment"].includes(parents.get(parent)?.type)) return "jsx-expression";
      if (parent.type === "VariableDeclarator") return /(?:Label|Title|Description|Text|Message|Placeholder)$/i.test(parent.id.name ?? "") ? "display-variable" : displayMapName.test(parent.id.name ?? "") ? "display-map" : null;
      if (/Statement$/.test(parent.type) || parent.type === "JSXOpeningElement") return null;
    }
    return null;
  };
  for (const node of nodes) {
    if (isTranslationCall(node) || node.type === "JSXAttribute" && propertyName(node.name) === "i18nKey") {
      const expression = node.type === "JSXAttribute" ? (node.value?.type === "JSXExpressionContainer" ? node.value.expression : node.value) : node.arguments[0];
      const keys = staticKeys(expression);
      const binding = translationBinding(node);
      const namespace = binding ? binding.namespace : "translation";
      if (binding?.prefixNode) {
        errors.push({ file: path, line: node.loc.start.line,
          message: `Translation key prefix is unsupported by static audit: ${normalizeText(textOf(binding.prefixNode))}` });
      } else if (namespace === undefined) {
        errors.push({ file: path, line: node.loc.start.line,
          message: `Translation namespace cannot be resolved statically: ${normalizeText(textOf(binding.namespaceNode))}` });
      } else if (keys) {
        for (const key of keys) references.push({ ...location(node), key: namespace === "translation" || key.includes(":") ? key.replace(/^translation:/, "") : `${namespace}:${key}`, parameters: parameterContract(node) });
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
