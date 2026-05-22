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
npm run api:types:check
```

The generator is intentionally lightweight and dependency-free for this milestone. It reads `packages/schemas/openapi.yaml`, which is maintained as JSON-compatible YAML, and emits TypeScript schema aliases used by the frontend API layer. `npm run api:types:check` verifies that the committed generated file is current.

## Rules

- The contract describes implemented REST endpoints only.
- Do not document MQTT command ingestion, production auth/RBAC, WebSocket/SSE, report export, or production audit/compliance features as implemented.
- Keep `Asset`, `TelemetryPoint`, `Command`, `AlarmInstance`, `Event`, `SystemStatus`, `ControlStatus`, `ModeChangeRequest`, PID schemas, `HistorianStatus`, `MQTTStatus`, `AuthSession`, and `DemoUser` aligned with the Go API and simulation service.
- Update generated frontend types whenever `openapi.yaml` changes.

## Runtime Validation

The frontend HTTP client uses selected JSON Schema files for dev/test runtime validation. It validates `data` payloads from API envelopes and risky request bodies such as simulation commands, alarm acknowledgements, control mode changes, PID config updates, and demo auth/session payloads.

From `apps/web`:

```bash
npm run api:validate-schemas
```

This compiles all `schemas/*.schema.json` files and fails fast if a schema is malformed.

When changing API payloads:

1. Update `openapi.yaml`.
2. Update the matching `schemas/*.schema.json` file.
3. Run `npm run api:types`.
4. Run `npm run api:types:check`.
5. Run `npm run api:validate-schemas`.
6. Keep runtime validation mappings in `apps/web/src/shared/api/validation/schemas.ts` aligned.

Go server code generation and Go runtime validation from JSON Schema are not implemented yet.
