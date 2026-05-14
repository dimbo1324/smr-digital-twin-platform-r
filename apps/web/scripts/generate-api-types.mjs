import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, "..");
const repoRoot = resolve(webRoot, "..", "..");
const openApiPath = resolve(repoRoot, "packages", "schemas", "openapi.yaml");
const outputPath = resolve(webRoot, "src", "shared", "api", "generated", "schema.ts");

const openApi = JSON.parse(await readFile(openApiPath, "utf8"));
const schemas = openApi.components?.schemas;

if (!schemas || typeof schemas !== "object") {
  throw new Error("OpenAPI document does not contain components.schemas");
}

const lines = [
  "// Generated from packages/schemas/openapi.yaml.",
  "// Do not edit manually. Run `npm run api:types` from apps/web.",
  "",
  "export interface components {",
  "  schemas: {",
];

for (const [name, schema] of Object.entries(schemas)) {
  lines.push(`    ${quoteKey(name)}: ${toType(schema, 4)};`);
}

lines.push("  };", "}", "");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${lines.join("\n")}\n`);

function toType(schema, indentLevel = 0) {
  if (!schema || typeof schema !== "object") {
    return "unknown";
  }

  if (schema.$ref) {
    return refToType(schema.$ref);
  }

  if (Array.isArray(schema.enum)) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  if (Array.isArray(schema.type)) {
    return schema.type.map((type) => primitiveType(type)).join(" | ");
  }

  switch (schema.type) {
    case "object":
      return objectType(schema, indentLevel);
    case "array":
      return `${toType(schema.items, indentLevel)}[]`;
    case "string":
    case "number":
    case "integer":
    case "boolean":
    case "null":
      return primitiveType(schema.type);
    default:
      return "unknown";
  }
}

function objectType(schema, indentLevel) {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(properties);
  const indent = " ".repeat(indentLevel);
  const childIndent = " ".repeat(indentLevel + 2);

  if (entries.length === 0) {
    if (schema.additionalProperties === true) {
      return "{ [key: string]: unknown }";
    }

    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      return `{ [key: string]: ${toType(schema.additionalProperties, indentLevel)} }`;
    }

    return "Record<string, never>";
  }

  const body = entries.map(([key, value]) => {
    const optional = required.has(key) ? "" : "?";
    return `${childIndent}${quoteKey(key)}${optional}: ${toType(value, indentLevel + 2)};`;
  });

  if (schema.additionalProperties === true || typeof schema.additionalProperties === "object") {
    body.push(`${childIndent}[key: string]: unknown;`);
  }

  return `{\n${body.join("\n")}\n${indent}}`;
}

function primitiveType(type) {
  switch (type) {
    case "integer":
      return "number";
    case "null":
      return "null";
    case "string":
    case "number":
    case "boolean":
      return type;
    default:
      return "unknown";
  }
}

function refToType(ref) {
  const prefix = "#/components/schemas/";
  if (!ref.startsWith(prefix)) {
    return "unknown";
  }

  return `components["schemas"][${JSON.stringify(ref.slice(prefix.length))}]`;
}

function quoteKey(key) {
  return JSON.stringify(key);
}
