import type { components } from "@/shared/api/generated/schema";

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
  options: { signal?: AbortSignal } = {},
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: options.signal,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response.json() as Promise<ApiEnvelope<T>>;
}

export async function apiPost<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  options: { signal?: AbortSignal } = {},
): Promise<ApiEnvelope<TResponse>> {
  const headers: HeadersInit = {
    Accept: "application/json",
  };
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

  return response.json() as Promise<ApiEnvelope<TResponse>>;
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
