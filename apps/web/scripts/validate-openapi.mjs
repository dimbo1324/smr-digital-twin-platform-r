import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const openApiPath = resolve(import.meta.dirname, "../../../packages/schemas/openapi.yaml");
const raw = await readFile(openApiPath, "utf8");

let document;
try {
  document = JSON.parse(raw);
} catch (error) {
  console.error("OpenAPI document must be parseable JSON/YAML-compatible JSON.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const requiredTopLevel = ["openapi", "info", "paths", "components"];
for (const key of requiredTopLevel) {
  if (!document[key]) {
    console.error(`OpenAPI document is missing top-level "${key}".`);
    process.exit(1);
  }
}

if (!String(document.openapi).startsWith("3.")) {
  console.error(`Unsupported OpenAPI version: ${document.openapi}`);
  process.exit(1);
}

const schemas = document.components?.schemas;
if (!schemas || typeof schemas !== "object") {
  console.error("OpenAPI document is missing components.schemas.");
  process.exit(1);
}

const missingRefs = [];
walk(document, (value) => {
  if (value && typeof value === "object" && typeof value.$ref === "string") {
    const prefix = "#/components/schemas/";
    if (value.$ref.startsWith(prefix)) {
      const name = value.$ref.slice(prefix.length);
      if (!schemas[name]) {
        missingRefs.push(value.$ref);
      }
    }
  }
});

if (missingRefs.length > 0) {
  console.error("OpenAPI document contains unresolved component schema refs:");
  for (const ref of missingRefs) {
    console.error(`- ${ref}`);
  }
  process.exit(1);
}

console.log(`OpenAPI parsed: ${Object.keys(document.paths ?? {}).length} paths, ${Object.keys(schemas).length} schemas.`);

function walk(value, visitor) {
  visitor(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visitor);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) {
      walk(child, visitor);
    }
  }
}
