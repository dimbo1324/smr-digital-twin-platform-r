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

The generator now fails fast on unsupported schema shapes and preserves required/optional fields, enums, arrays, records, nullable values, and nested object schemas used by the current contract. It is still not a replacement for OpenAPI-generated Go server stubs.

## Rules

- The contract describes implemented REST endpoints only.
- Do not document MQTT command ingestion, production auth/RBAC, WebSocket/SSE, regulatory report export, or production audit/compliance features as implemented.
- Keep `Asset`, `TelemetryPoint`, telemetry history responses, `Command`, `AlarmInstance`, `Event`, `SystemStatus`, `ControlStatus`, `ModeChangeRequest`, PID schemas, `HistorianStatus`, `MQTTStatus`, `AuthSession`, `DemoUser`, and `SimulationReport` aligned with the Go API and simulation service.
- Update generated frontend types whenever `openapi.yaml` changes.

## Runtime Validation

The frontend HTTP client uses selected JSON Schema files for dev/test runtime validation. It validates `data` payloads from API envelopes and risky request bodies such as simulation commands, alarm acknowledgements, control mode changes, PID config updates, report summaries, and demo auth/session payloads.

From `apps/web`:

```bash
npm run api:validate-openapi
npm run api:validate-schemas
npm run api:validate-contract-coverage
```

These checks parse the OpenAPI document, compile all `schemas/*.schema.json` files, and verify that core API payloads still have explicit frontend runtime validation coverage.

When changing API payloads:

1. Update `openapi.yaml`.
2. Update the matching `schemas/*.schema.json` file.
3. Run `npm run api:types`.
4. Run `npm run api:types:check`.
5. Run `npm run api:validate-openapi`.
6. Run `npm run api:validate-schemas`.
7. Run `npm run api:validate-contract-coverage`.
8. Keep runtime validation mappings in `apps/web/src/shared/api/validation/schemas.ts` aligned.

CI runs the same contract checks and fails if committed generated TypeScript types drift from `openapi.yaml`.

## Historian Contract Notes

Telemetry history supports `resolution=raw` and `resolution=1m` for the current demo historian. `HistorianStatus` exposes retention/downsampling metadata such as `retentionEnabled`, `rawRetention`, `downsamplingEnabled`, `supportedResolutions`, and `aggregateStatus`. These fields describe synthetic simulation historian behavior only; they are not production audit or regulatory retention guarantees.

Go server code generation and Go runtime validation from JSON Schema are not implemented yet.
