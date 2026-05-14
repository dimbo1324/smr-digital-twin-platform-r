import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Ajv = require("ajv");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.resolve(__dirname, "../../../packages/schemas/schemas");

const ajv = new Ajv({
  allErrors: true,
  unknownFormats: "ignore",
});

let compiledCount = 0;

for (const fileName of fs.readdirSync(schemaDir).filter((file) => file.endsWith(".schema.json")).sort()) {
  const schemaPath = path.join(schemaDir, fileName);
  const schema = toDraft7Schema(JSON.parse(fs.readFileSync(schemaPath, "utf8")));
  try {
    ajv.compile(schema);
    compiledCount += 1;
  } catch (error) {
    console.error(`Schema failed to compile: ${fileName}`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.exitCode) {
  process.exit();
}

console.log(`Compiled ${compiledCount} API JSON schemas.`);

function toDraft7Schema(schema) {
  if (Array.isArray(schema)) {
    return schema.map(toDraft7Schema);
  }

  if (schema && typeof schema === "object") {
    return Object.fromEntries(
      Object.entries(schema)
        .filter(([key]) => key !== "$schema" && key !== "$id")
        .map(([key, value]) => {
          const nextKey = key === "$defs" ? "definitions" : key;
          const nextValue =
            key === "$ref" && typeof value === "string"
              ? value.replace("#/$defs/", "#/definitions/")
              : toDraft7Schema(value);
          return [nextKey, nextValue];
        }),
    );
  }

  return schema;
}
