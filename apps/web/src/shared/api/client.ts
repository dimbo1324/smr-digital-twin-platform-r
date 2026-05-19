import type { components } from "@/shared/api/generated/schema";
export {
  ApiClientError,
  ApiClientError as ApiError,
  apiGet,
  apiPatch,
  apiPost,
  getApiBaseUrl,
  type ApiEnvelope,
} from "@/shared/api/http-client";

export type ApiMeta = components["schemas"]["ApiMeta"];
