import type { components } from "@/shared/api/generated/schema";
import {
  validateApiRequest,
  validateApiResponse,
} from "@/shared/api/validation/api-validation";
import type { ApiSchemaName } from "@/shared/api/validation/schemas";
import { getSelectedDemoUserId } from "@/entities/auth/model/storage";

type ApiMeta = components["schemas"]["ApiMeta"];

export interface ApiEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_API_BASE_URL = "http://localhost:8080";

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export async function apiGet<T>(
  path: string,
  options: { signal?: AbortSignal; responseSchema?: ApiSchemaName } = {},
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "GET",
    headers: apiHeaders(),
    signal: options.signal,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  await validateApiResponse(options.responseSchema, payload.data, path);
  return payload;
}

export async function apiPost<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  options: { signal?: AbortSignal; requestSchema?: ApiSchemaName; responseSchema?: ApiSchemaName } = {},
): Promise<ApiEnvelope<TResponse>> {
  if (body !== undefined) {
    await validateApiRequest(options.requestSchema, body, path);
  }

  const headers = apiHeaders();
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const payload = (await response.json()) as ApiEnvelope<TResponse>;
  await validateApiResponse(options.responseSchema, payload.data, path);
  return payload;
}

export async function apiPatch<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  options: { signal?: AbortSignal; requestSchema?: ApiSchemaName; responseSchema?: ApiSchemaName } = {},
): Promise<ApiEnvelope<TResponse>> {
  if (body !== undefined) {
    await validateApiRequest(options.requestSchema, body, path);
  }

  const headers = apiHeaders();
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "PATCH",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const payload = (await response.json()) as ApiEnvelope<TResponse>;
  await validateApiResponse(options.responseSchema, payload.data, path);
  return payload;
}

function apiHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "X-Demo-User": getSelectedDemoUserId(),
  };
}

async function toApiError(response: Response): Promise<ApiClientError> {
  try {
    const payload = (await response.json()) as {
      error?: { code?: string; message?: string; details?: unknown };
    };
    if (payload.error?.message) {
      return new ApiClientError(
        payload.error.message,
        response.status,
        payload.error.code,
        payload.error.details,
      );
    }
  } catch {
    // Fall through to the generic error below.
  }

  return new ApiClientError(`API request failed with status ${response.status}`, response.status);
}
