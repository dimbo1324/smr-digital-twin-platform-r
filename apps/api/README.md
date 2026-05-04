# SMR Twin API

Backend skeleton for **SMR Twin Platform**, a simulation-only digital twin platform for a small modular reactor energy loop. This service currently exposes REST endpoints with mock domain data for the frontend shell. It does not connect to real equipment and does not implement live control.

## Scope

Current milestone:

- healthcheck endpoint
- platform status endpoint
- in-memory asset registry mock data
- in-memory latest telemetry mock data
- structured request logging
- CORS for the Vite frontend dev server
- graceful HTTP shutdown

Out of scope for this step:

- real PostgreSQL connections
- MQTT ingestion
- WebSocket/SSE streaming
- auth/RBAC
- simulation control
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

## Endpoints

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/system/status
curl http://localhost:8080/api/v1/assets
curl http://localhost:8080/api/v1/telemetry/latest
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
    "dataSource": "mock",
    "safetyDisclaimer": "Simulation-only interface. No real plant control."
  },
  "meta": {
    "requestId": "req-example",
    "timestamp": "2026-05-04T12:00:00Z"
  }
}
```

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

Returns mock telemetry values with dynamic response timestamps. Numeric points use `value`; discrete points use `valueText`.

## Future Integration Points

The package layout is intentionally split by future service boundaries:

- `internal/assets` for asset registry
- `internal/telemetry` for latest telemetry and future ingestion integration
- `internal/system` for platform/service status aggregation
- `internal/platform/postgres` as a placeholder for the future database layer
