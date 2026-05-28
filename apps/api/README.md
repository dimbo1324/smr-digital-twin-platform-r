# SMR Twin API

Backend API gateway for **SMR Twin Platform**, a simulation-only digital twin platform for a small modular reactor energy loop. This service exposes REST endpoints for the frontend HMI, proxies the Go simulation service, and provides labelled in-memory fallback data when the simulation service is unavailable. It also exposes the simulation historian status. It does not connect to real equipment and does not implement real plant control.

## Scope

Current milestone:

- healthcheck endpoint
- platform status endpoint
- simulation-backed assets and clearly labelled in-memory fallback assets
- simulation-backed latest telemetry and clearly labelled in-memory fallback telemetry
- optional simulation service gateway integration
- telemetry history, alarms, and scenario proxy endpoints
- simulation-only command proxy endpoints for `V-101` and `P-101`
- simulation-only control mode and PID endpoints for `TIC-101`
- alarm lifecycle proxy endpoints for active, history, and acknowledge workflows
- recent command/alarm/event proxy endpoints, DB-backed when the simulation historian is connected and in-memory otherwise
- historian status proxy endpoint
- publish-only MQTT bridge status proxy endpoint
- demo Auth/RBAC endpoints and backend enforcement for protected simulation-only actions
- simulation-only report export endpoint for JSON/CSV summaries
- Prometheus `/metrics` endpoint for local demo observability
- SMR Unit Overview and Thermal Process Loop telemetry through `/api/v1/telemetry/latest`
- OpenAPI/JSON Schema contract documentation under `packages/schemas`
- structured request logging
- CORS for the Vite frontend dev server
- graceful HTTP shutdown

Out of scope for this step:

- MQTT command ingestion or MQTT-based control
- WebSocket/SSE streaming
- production authentication, passwords, OAuth/JWT, or production RBAC
- production audit/compliance storage
- regulatory report export
- production observability, tracing, or alerting stack
- real plant integration

## Run Locally

```bash
go run ./cmd/api
```

The API listens on `0.0.0.0:8080` by default.

From the repository root:

```bash
make api-run
```

## Build And Test

```bash
go test ./...
go build ./cmd/api
```

From the repository root:

```bash
make api-test
make api-build
```

## Environment Variables

| Variable | Default |
| --- | --- |
| `API_APP_NAME` | `smr-twin-api` |
| `API_ENV` | `development` |
| `API_HTTP_HOST` | `0.0.0.0` |
| `API_HTTP_PORT` | `8080` |
| `API_LOG_LEVEL` | `info` |
| `API_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` |
| `API_VERSION` | `0.1.0` |
| `SIMULATION_ENABLED` | `true` |
| `SIMULATION_BASE_URL` | `http://localhost:8081` |
| `SIMULATION_TIMEOUT_MS` | `1500` |

## Endpoints

The implemented gateway endpoints are documented in the repository contract:

- `packages/schemas/openapi.yaml`
- `packages/schemas/schemas/*.schema.json`

The OpenAPI contract is currently used for documentation, generated frontend TypeScript types, and frontend dev/test runtime validation. This service does not yet use generated Go server stubs or Go runtime validation from JSON Schema.

```bash
curl http://localhost:8080/health
curl http://localhost:8080/metrics
curl http://localhost:8080/api/v1/system/status
curl http://localhost:8080/api/v1/auth/session
curl http://localhost:8080/api/v1/auth/users
curl http://localhost:8080/api/v1/assets
curl http://localhost:8080/api/v1/telemetry/latest
curl "http://localhost:8080/api/v1/telemetry/history?window=15m"
curl http://localhost:8080/api/v1/control/status
curl -X POST http://localhost:8080/api/v1/control/mode \
  -H "Content-Type: application/json" \
  -H "X-Demo-User: demo-supervisor" \
  -d '{"mode":"AUTO","requestedBy":"demo-operator","reason":"Enable simulation-only PID demo"}'
curl http://localhost:8080/api/v1/pid/status
curl -X PATCH http://localhost:8080/api/v1/pid/config \
  -H "Content-Type: application/json" \
  -H "X-Demo-User: demo-engineer" \
  -d '{"setpoint":288,"kp":0.9,"ki":0.05,"kd":0.1,"requestedBy":"demo-operator"}'
curl http://localhost:8080/api/v1/historian/status
curl http://localhost:8080/api/v1/mqtt/status
curl http://localhost:8080/api/v1/alarms/active
curl http://localhost:8080/api/v1/alarms/history
curl -X POST http://localhost:8080/api/v1/alarms/alarm-id/acknowledge \
  -H "Content-Type: application/json" \
  -H "X-Demo-User: demo-supervisor" \
  -d '{"acknowledgedBy":"demo-operator","comment":"Acknowledged from Alarms page"}'
curl -X POST http://localhost:8080/api/v1/commands \
  -H "Content-Type: application/json" \
  -H "X-Demo-User: demo-operator" \
  -d '{"targetTag":"V-101","commandType":"OPEN","payload":{"reason":"operator_demo"}}'
curl "http://localhost:8080/api/v1/commands/recent?limit=50"
curl "http://localhost:8080/api/v1/events/recent?limit=50"
curl "http://localhost:8080/api/v1/reports/simulation-summary?window=1h"
curl "http://localhost:8080/api/v1/reports/simulation-summary?window=1h&format=csv"
curl http://localhost:8080/api/v1/simulation/scenarios
curl -X POST http://localhost:8080/api/v1/simulation/scenarios/high_temperature/start
curl -X POST http://localhost:8080/api/v1/simulation/scenarios/stop
curl -X POST http://localhost:8080/api/v1/simulation/reset
```

### `GET /health`

Fast liveness endpoint that does not depend on external services.

### `GET /api/v1/system/status`

Returns platform-level status for the frontend dashboard/topbar, including the simulation boundary:

```json
{
  "data": {
    "platform": "SMR Twin Platform",
    "mode": "simulation_only",
    "controlBoundary": "no_live_control",
    "dataSource": "synthetic_simulation",
    "safetyDisclaimer": "Simulation-only interface. No real plant control."
  },
  "meta": {
    "requestId": "req-example",
    "timestamp": "2026-05-04T12:00:00Z"
  }
}
```

### Demo Auth / RBAC Endpoints

Demo RBAC controls synthetic simulation actions only. It is not production authentication, does not use passwords, does not use OAuth/JWT, and must not be treated as real plant access control.

- `GET /api/v1/auth/session` returns the current demo session from the `X-Demo-User` header, or the default `demo-operator` session when the header is missing or unknown.
- `GET /api/v1/auth/users` returns the static demo user registry.

Protected write/action endpoints are enforced in the API gateway:

- `POST /api/v1/commands` requires `SEND_COMMAND`.
- `POST /api/v1/control/mode` requires `CHANGE_CONTROL_MODE`.
- `PATCH /api/v1/pid/config` requires `UPDATE_PID_CONFIG`.
- `POST /api/v1/alarms/{id}/acknowledge` requires `ACKNOWLEDGE_ALARM`.
- scenario start/stop/reset endpoints require `RUN_SCENARIO`.

Denied actions return HTTP `403` with `RBAC_FORBIDDEN`, the required permission, the current role, and `simulationOnly: true`.

### `GET /metrics`

Exposes Prometheus text metrics for local demo observability, including HTTP request counts/duration, requests in flight, RBAC forbidden counts, and simulation proxy errors. This endpoint is for local portfolio diagnostics and is not a production monitoring contract.

The repository-level observability smoke (`node scripts/smoke/observability-smoke.mjs`) verifies this endpoint directly and through Prometheus scraping. It is local/demo validation only, not production monitoring.

### `GET /api/v1/assets`

Returns the MVP process-loop assets:

- `T-101`
- `P-101`
- `V-101`
- `HX-101`
- `TT-101`
- `PT-101`
- `FT-101`
- `LT-101`
- `TIC-101`

### `GET /api/v1/telemetry/latest`

Returns simulation telemetry when `apps/simulation` is reachable. If the simulation service is unavailable, the API returns labelled in-memory fallback telemetry with `meta.degraded=true`.

The current telemetry contract includes both unit overview tags such as `SMR-POWER`, `TT-PRIMARY`, and `FT-COOLANT`, and process-loop tags such as `TT-101`, `PT-101`, `FT-101`, `LT-101`, `V-101.POS`, `V-101.STATE`, `P-101.STATE`, `P-101.RPM`, `HX-101.STATE`, and `TIC-101.MODE`.

### Alarm Lifecycle Endpoints

- `GET /api/v1/alarms/active` returns active and acknowledged synthetic alarm instances that are not cleared.
- `GET /api/v1/alarms/history` returns cleared synthetic alarm instances from the historian when available, with in-memory fallback.
- `POST /api/v1/alarms/{id}/acknowledge` acknowledges an active synthetic alarm instance.

### Control Mode Endpoints

- `GET /api/v1/control/status` returns current `TIC-101` mode, authority, controlled variable, manipulated variable, and simulation-only safety disclaimer.
- `POST /api/v1/control/mode` switches `TIC-101` between `MANUAL`, `AUTO`, and `DISABLED`.

`AUTO` mode assigns `V-101` to the simulation-only `TIC-101` PID controller. Direct frontend/user `V-101` commands are rejected in `AUTO` and `DISABLED`; `P-101` commands remain manually controllable.

PID endpoints:

- `GET /api/v1/pid/status` returns current synthetic PID status, tuning, setpoint, output, terms, and saturation state.
- `PATCH /api/v1/pid/config` updates setpoint and tuning values for the in-memory simulation PID.

Example acknowledgement request:

```json
{
  "acknowledgedBy": "demo-operator",
  "comment": "Acknowledged from Alarms page"
}
```

Acknowledgement affects only in-memory simulation state. Unknown alarms return `ALARM_NOT_FOUND`; already cleared alarms return `ALARM_ALREADY_CLEARED`.

### `GET /api/v1/historian/status`

Returns the current simulation historian status. The historian stores synthetic telemetry, command, event, and alarm history records for demo and portfolio workflows only.

Possible statuses include:

- `disabled`
- `connected`
- `degraded`
- `unavailable_fallback`

If the simulation service is unavailable, the API returns a degraded in-memory fallback status instead of implying that persistent storage is connected.

### `GET /api/v1/mqtt/status`

Returns the current simulation MQTT bridge status. The bridge publishes synthetic simulation data only and is publish-only: it does not expose MQTT command ingestion, actuator control topics, or real plant connectivity.

If the simulation service is unavailable, the API returns an unavailable MQTT status instead of implying that the bridge is connected.

### `POST /api/v1/commands`

Submits a simulation-only command to `apps/simulation`. The API normalizes missing `source` to `frontend`, defaults missing `requestedBy` to the current demo session display name, and forwards the command to the simulation service after demo RBAC authorization.

Direct `V-101` commands are also checked by simulation command arbitration. In `AUTO` and `DISABLED`, the simulation service returns structured rejection errors such as `CONTROL_MODE_AUTO` or `CONTROL_DISABLED`.

Supported targets:

- `V-101`
- `P-101`

Supported `V-101` commands:

- `OPEN`
- `CLOSE`
- `STOP`
- `SET_POSITION`

Supported `P-101` commands:

- `START`
- `STOP`

Example:

```json
{
  "targetTag": "V-101",
  "commandType": "SET_POSITION",
  "payload": {
    "positionPercent": 75
  }
}
```

The command affects only in-memory simulation state. It does not control real equipment.

### `GET /api/v1/commands/recent`

Returns recent command records from the simulation service. Records are DB-backed when the historian is connected and use in-memory fallback otherwise. Optional `limit` query parameter: `1..200`; records are newest-first.

### `GET /api/v1/events/recent`

Returns recent command, alarm, equipment, scenario, PID, control, and simulation events from the simulation service. Records are DB-backed when the historian is connected and use in-memory fallback otherwise. Optional `limit` query parameter: `1..200`; records are newest-first.

### Simulation Proxy Endpoints

The frontend still calls only `apps/api`. The API proxies simulation state through:

- `GET /api/v1/telemetry/history?window=15m`
- `GET /api/v1/alarms/active`
- `GET /api/v1/simulation/scenarios`
- `POST /api/v1/simulation/scenarios/{scenarioName}/start`
- `POST /api/v1/simulation/scenarios/stop`
- `POST /api/v1/simulation/reset`

### `GET /api/v1/reports/simulation-summary`

Aggregates existing synthetic simulator data into a read-only report. Supported query parameters:

- `window=15m|1h|6h|24h`
- `format=json|csv`

The JSON response uses the normal API envelope. CSV responses use `text/csv` with `section,key,value,unit,source` rows. Reports include `simulationOnly: true` and a disclaimer because they are demo summaries only, not regulatory reports, production audit exports, or nuclear compliance artifacts.

## Future Integration Points

The package layout is intentionally split by future service boundaries:

- `internal/assets` for asset registry
- `internal/telemetry` for latest telemetry and future ingestion integration
- `internal/system` for platform/service status aggregation
- `internal/platform/postgres` as a reserved helper package for API-side PostgreSQL integration if the gateway later needs direct storage access
