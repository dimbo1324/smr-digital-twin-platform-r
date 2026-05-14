# API Contract Schemas

This package contains the machine-readable contract for the current SMR Twin Platform API.

## Structure

- `openapi.yaml` is the source contract for the API gateway exposed by `apps/api`.
- `schemas/*.schema.json` contains reference JSON Schema documents for core domain DTOs.
- `apps/web/src/shared/api/generated/schema.ts` is generated from `openapi.yaml` for frontend typing.

## Generate Frontend Types

From `apps/web`:

```bash
npm run api:types
```

The generator is intentionally lightweight and dependency-free for this milestone. It reads `packages/schemas/openapi.yaml`, which is valid YAML and JSON, and emits TypeScript schema aliases used by the frontend API layer.

## Rules

- The contract describes implemented REST endpoints only.
- Do not document MQTT, persistence, PID, auth/RBAC, WebSocket/SSE, or report export as implemented.
- Keep `Asset`, `TelemetryPoint`, `Command`, `AlarmInstance`, `Event`, and `SystemStatus` aligned with the Go API and simulation service.
- Update generated frontend types whenever `openapi.yaml` changes.

Runtime request/response validation and Go server code generation are not implemented yet.
