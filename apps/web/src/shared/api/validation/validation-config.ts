export type ApiValidationMode = "off" | "warn" | "strict";

export function getApiValidationMode(): ApiValidationMode {
  const configured = import.meta.env.VITE_API_RUNTIME_VALIDATION;
  if (configured === "off" || configured === "warn" || configured === "strict") {
    return configured;
  }

  if (import.meta.env.PROD) {
    return "off";
  }

  return "warn";
}
