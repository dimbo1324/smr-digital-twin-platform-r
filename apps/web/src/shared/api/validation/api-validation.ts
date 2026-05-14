import type { ErrorObject, ValidateFunction } from "ajv";
import { getApiValidationMode } from "@/shared/api/validation/validation-config";
import { ApiValidationError } from "@/shared/api/validation/validation-error";
import { apiSchemas, type ApiSchemaName } from "@/shared/api/validation/schemas";

export interface ApiValidationContext {
  endpoint: string;
  schemaName: ApiSchemaName;
  direction: "request" | "response";
}

const validators = new Map<ApiSchemaName, ValidateFunction>();

type AjvInstance = {
  compile: (schema: object) => ValidateFunction;
};

type AjvConstructor = new (options: {
  allErrors: boolean;
  unknownFormats: "ignore";
}) => AjvInstance;

let ajvPromise: Promise<AjvInstance> | undefined;

export async function validateApiRequest(
  schemaName: ApiSchemaName | undefined,
  payload: unknown,
  endpoint: string,
) {
  await validateApiPayload(payload, { endpoint, schemaName, direction: "request" });
}

export async function validateApiResponse(
  schemaName: ApiSchemaName | undefined,
  payload: unknown,
  endpoint: string,
) {
  await validateApiPayload(payload, { endpoint, schemaName, direction: "response" });
}

async function validateApiPayload(
  payload: unknown,
  context: Omit<ApiValidationContext, "schemaName"> & { schemaName?: ApiSchemaName },
) {
  const mode = getApiValidationMode();
  if (mode === "off" || !context.schemaName) {
    return;
  }

  const validate = await getValidator(context.schemaName);
  if (validate(payload)) {
    return;
  }

  const error = new ApiValidationError({
    ...context,
    schemaName: context.schemaName,
    validationErrors: formatAjvErrors(validate.errors ?? []),
    payloadPreview: previewPayload(payload),
  });

  if (mode === "strict") {
    throw error;
  }

  console.warn(error.message, {
    endpoint: error.endpoint,
    schemaName: error.schemaName,
    direction: error.direction,
    validationErrors: error.validationErrors,
    payloadPreview: error.payloadPreview,
  });
}

async function getValidator(schemaName: ApiSchemaName) {
  const cached = validators.get(schemaName);
  if (cached) {
    return cached;
  }

  const ajv = await getAjv();
  const schema = toDraft7Schema(apiSchemas[schemaName]);
  const validate = ajv.compile(schema as object);
  validators.set(schemaName, validate);
  return validate;
}

async function getAjv() {
  if (!ajvPromise) {
    ajvPromise = import("ajv").then((module) => {
      const Ajv = resolveAjvConstructor(module);
      return new Ajv({
        allErrors: true,
        unknownFormats: "ignore",
      });
    });
  }

  return ajvPromise;
}

function resolveAjvConstructor(module: unknown): AjvConstructor {
  const candidate =
    module && typeof module === "object" && "default" in module
      ? (module as { default: unknown }).default
      : module;
  return candidate as AjvConstructor;
}

function toDraft7Schema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(toDraft7Schema);
  }

  if (schema && typeof schema === "object") {
    const next: Record<string, unknown> = {};
    Object.entries(schema as Record<string, unknown>).forEach(([key, value]) => {
      if (key === "$schema" || key === "$id") {
        return;
      }
      const nextKey = key === "$defs" ? "definitions" : key;
      const nextValue =
        key === "$ref" && typeof value === "string"
          ? value.replace("#/$defs/", "#/definitions/")
          : toDraft7Schema(value);
      next[nextKey] = nextValue;
    });
    return next;
  }

  return schema;
}

function formatAjvErrors(errors: ErrorObject[]) {
  return errors.map((error) => ({
    path: error.dataPath || error.schemaPath,
    message: error.message ?? "failed validation",
    keyword: error.keyword,
  }));
}

function previewPayload(payload: unknown) {
  try {
    const serialized = JSON.stringify(payload);
    if (!serialized) {
      return payload;
    }
    return serialized.length > 1_000 ? `${serialized.slice(0, 1_000)}...` : payload;
  } catch {
    return "[unserializable payload]";
  }
}
