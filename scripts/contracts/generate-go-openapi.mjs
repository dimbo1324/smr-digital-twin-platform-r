#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const openApiPath = path.resolve("packages/schemas/openapi.yaml");
const outputPath = path.resolve("apps/api/internal/openapi/generated/openapi.gen.go");
const check = process.argv.includes("--check");

const openApi = JSON.parse(readFileSync(openApiPath, "utf8"));
const schemas = openApi.components?.schemas ?? {};
const source = formatGo(renderGoFile(schemas));

if (check) {
  const existing = readFileSync(outputPath, "utf8");
  if (existing !== source) {
    console.error("Generated OpenAPI Go baseline is stale. Run:");
    console.error("  node scripts/contracts/generate-go-openapi.mjs");
    process.exit(1);
  }
  console.log("OpenAPI-generated Go baseline is current.");
  process.exit(0);
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, source);
console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);

function renderGoFile(componentSchemas) {
  const parts = [
    `// Code generated from packages/schemas/openapi.yaml. DO NOT EDIT.\n`,
    `package generated\n\n`,
    `import (\n`,
    `\t"bytes"\n`,
    `\t"context"\n`,
    `\t"encoding/json"\n`,
    `\t"net/http"\n`,
    `\t"strings"\n`,
    `)\n\n`,
    `type Client struct {\n\tBaseURL string\n\tHTTPClient *http.Client\n}\n\n`,
    `func NewClient(baseURL string, httpClient *http.Client) *Client {\n\tif httpClient == nil {\n\t\thttpClient = http.DefaultClient\n\t}\n\treturn &Client{BaseURL: strings.TrimRight(baseURL, "/"), HTTPClient: httpClient}\n}\n\n`,
    `func (c *Client) NewRequest(ctx context.Context, method string, path string, body any) (*http.Request, error) {\n\tvar reader *bytes.Reader\n\tif body == nil {\n\t\treader = bytes.NewReader(nil)\n\t} else {\n\t\tpayload, err := json.Marshal(body)\n\t\tif err != nil {\n\t\t\treturn nil, err\n\t\t}\n\t\treader = bytes.NewReader(payload)\n\t}\n\trequest, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, reader)\n\tif err != nil {\n\t\treturn nil, err\n\t}\n\trequest.Header.Set("Accept", "application/json")\n\tif body != nil {\n\t\trequest.Header.Set("Content-Type", "application/json")\n\t}\n\treturn request, nil\n}\n\n`,
  ];
  for (const [name, schema] of Object.entries(componentSchemas).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    parts.push(renderSchema(name, schema));
  }
  return parts.join("");
}

function renderSchema(name, schema) {
  const typeName = goName(name);
  if (schema.type === "object" && schema.properties) {
    const required = new Set(schema.required ?? []);
    const fields = Object.entries(schema.properties)
      .map(([propertyName, propertySchema]) => renderField(propertyName, propertySchema, required))
      .join("");
    return `type ${typeName} struct {\n${fields}}\n\n`;
  }
  return `type ${typeName} ${goType(schema, true)}\n\n`;
}

function renderField(propertyName, schema, required) {
  const fieldName = goName(propertyName);
  const optional = !required.has(propertyName);
  const jsonTag = optional ? `${propertyName},omitempty` : propertyName;
  return `\t${fieldName} ${goType(schema, false)} \`json:"${jsonTag}"\`\n`;
}

function goType(schema, topLevel) {
  if (!schema) {
    return "any";
  }
  if (schema.$ref) {
    return goName(schema.$ref.split("/").at(-1));
  }
  if (schema.const !== undefined && schema.type === "boolean") {
    return "bool";
  }
  if (Array.isArray(schema.enum) && schema.type === "string") {
    return "string";
  }
  if (schema.oneOf || schema.anyOf || schema.allOf) {
    return "map[string]any";
  }
  switch (schema.type) {
    case "array":
      return `[]${goType(schema.items, false)}`;
    case "boolean":
      return "bool";
    case "integer":
      return "int";
    case "number":
      return "float64";
    case "object":
      if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        return `map[string]${goType(schema.additionalProperties, false)}`;
      }
      if (schema.properties && !topLevel) {
        return "map[string]any";
      }
      return "map[string]any";
    case "string":
      return "string";
    default:
      return "any";
  }
}

function goName(raw) {
  const words = String(raw)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const name = words.map((word) => word[0].toUpperCase() + word.slice(1)).join("");
  return reserved(name || "Value");
}

function reserved(name) {
  return ["Error", "String", "Type"].includes(name) ? `${name}Value` : name;
}

function formatGo(source) {
  return execFileSync("gofmt", [], { encoding: "utf8", input: source });
}
