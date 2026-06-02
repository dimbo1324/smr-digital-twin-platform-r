# API Contract Schemas

This package contains the machine-readable contract for the current SMR Twin Platform API.

## Structure

- `openapi.yaml` is the source contract for the API gateway exposed by `apps/api`.
- `schemas/*.schema.json` contains reference JSON Schema documents for core domain DTOs.
- `apps/web/src/shared/api/generated/schema.ts` is generated from `openapi.yaml` for frontend typing.
- `apps/api/internal/openapi/generated/openapi.gen.go` is a lightweight generated Go DTO/client-helper baseline used for compile-time drift reduction.

## Generate Frontend Types

From `apps/web`:

```bash
npm run api:types
npm run api:types:check
```

The generator is intentionally lightweight and dependency-free for this milestone. It reads `packages/schemas/openapi.yaml`, which is maintained as JSON-compatible YAML, and emits TypeScript schema aliases used by the frontend API layer. `npm run api:types:check` verifies that the committed generated file is current.

The TypeScript generator now fails fast on unsupported schema shapes and preserves required/optional fields, enums, arrays, records, nullable values, and nested object schemas used by the current contract.

## Generate Go OpenAPI Baseline

From the repository root:

```bash
node scripts/contracts/generate-go-openapi.mjs
node scripts/contracts/generate-go-openapi.mjs --check
```

This baseline generates DTO structs plus a small request-building client helper for contract drift reduction. It is not an OpenAPI-generated Go server, does not replace API handler tests, and does not perform Go runtime validation from JSON Schema.

## Rules

- The contract describes implemented REST endpoints only.
- Do not document MQTT command ingestion, production auth/RBAC, WebSocket/SSE, regulatory report export, or production audit/compliance features as implemented.
- Keep `Asset`, `TelemetryPoint`, telemetry history responses, `Command`, `AlarmInstance`, `Event`, `SystemStatus`, `ControlStatus`, `ModeChangeRequest`, PID schemas, `HistorianStatus`, `MQTTStatus`, `AuthSession`, `DemoUser`, and `SimulationReport` aligned with the Go API and simulation service.
- Update generated frontend types whenever `openapi.yaml` changes.
- Update the generated Go OpenAPI baseline whenever `openapi.yaml` changes.

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
8. From the repository root, run `node scripts/contracts/generate-go-openapi.mjs`.
9. Keep runtime validation mappings in `apps/web/src/shared/api/validation/schemas.ts` aligned.

CI runs the same contract checks and fails if committed generated TypeScript types or the generated Go OpenAPI baseline drift from `openapi.yaml`.

## Historian Contract Notes

Telemetry history supports `resolution=raw` and `resolution=1m` for the current demo historian. `HistorianStatus` exposes retention/downsampling metadata such as `retentionEnabled`, `rawRetention`, `downsamplingEnabled`, `supportedResolutions`, and `aggregateStatus`. These fields describe synthetic simulation historian behavior only; they are not production audit or regulatory retention guarantees.

Go server code generation and Go runtime validation from JSON Schema are not implemented yet.

## Report Contract Notes

`GET /api/v1/reports/simulation-summary` supports `format=json|csv|pdf`, `template`, `sections`, and `includeDisclaimers` query options. Template/section customization changes simulation-only report presentation only. JSON responses use the normal API envelope and runtime validation. CSV and PDF responses are documented as non-JSON media types and intentionally bypass frontend JSON runtime validation during download. All report formats are simulation-only demo summaries and are not regulatory, safety, compliance, or production audit reports.

## Scenario Validation Notes

`POST /api/v1/scenarios/validate` validates simulation-only YAML scenario drafts. It does not persist drafts, mutate the embedded runtime registry, execute scenarios, or control any real plant. The endpoint exists so the Scenario Authoring UI can compare browser-local draft validation with backend YAML validation before a developer manually reviews and commits exported YAML.
