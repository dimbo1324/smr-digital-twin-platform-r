export interface ApiValidationIssue {
  path: string;
  message: string;
  keyword?: string;
}

export class ApiValidationError extends Error {
  readonly endpoint: string;
  readonly schemaName: string;
  readonly direction: "request" | "response";
  readonly validationErrors: ApiValidationIssue[];
  readonly payloadPreview?: unknown;

  constructor({
    endpoint,
    schemaName,
    direction,
    validationErrors,
    payloadPreview,
  }: {
    endpoint: string;
    schemaName: string;
    direction: "request" | "response";
    validationErrors: ApiValidationIssue[];
    payloadPreview?: unknown;
  }) {
    super(
      `API ${direction} validation failed for ${endpoint} against ${schemaName}: ${validationErrors
        .map((error) => `${error.path || "/"} ${error.message}`)
        .join("; ")}`,
    );
    this.name = "ApiValidationError";
    this.endpoint = endpoint;
    this.schemaName = schemaName;
    this.direction = direction;
    this.validationErrors = validationErrors;
    this.payloadPreview = payloadPreview;
  }
}
