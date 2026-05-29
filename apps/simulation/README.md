# SMR Twin Simulation Service

Go simulation-only telemetry engine for the SMR Twin Platform MVP. It generates deterministic synthetic telemetry, in-memory fallback history, optional PostgreSQL/TimescaleDB historian records, alarm lifecycle state, recent events, control mode arbitration, a synthetic TIC-101 PID loop, publish-only MQTT messages, Prometheus metrics for local demo observability, and scenario states for the backend API.

The service exposes two synthetic telemetry layers:

- SMR Unit Overview for high-level unit metrics.
- Thermal Process Loop MVP for `T-101`, `P-101`, `V-101`, `HX-101`, `TT-101`, `PT-101`, `FT-101`, `LT-101`, and `TIC-101` UI alignment.

This service is not connected to real equipment. It does not implement real nuclear operating procedures, safety automation, or plant control.

## Local Metrics

The simulation service exposes Prometheus text metrics at:

```bash
curl http://localhost:8081/metrics
```

Metrics cover simulation ticks, command counts, active alarms, event counts, historian writes/queue health, MQTT publish counters, PID output/error, valve position, and pump state. They are intended for the optional local Prometheus/Grafana demo stack only and are not a production observability contract.

The repository-level observability smoke (`node scripts/smoke/observability-smoke.mjs`) checks this endpoint, Prometheus target health, domain metric queries, and Grafana health. It validates local/demo observability for synthetic simulation data only and is not safety-critical monitoring.

The current command layer is simulation-only. Commands mutate only in-memory `V-101` and `P-101` state and are recorded in the recent command/event trail. Those records are persisted when the optional historian is enabled and connected.

`TIC-101` owns a simulation-only PID loop for the synthetic `TT-101 -> V-101.POS` process. `MANUAL` allows direct `V-101` commands, `AUTO` lets PID apply an in-memory valve target, and `DISABLED` blocks direct valve commands. This is not real plant control.

## Run

```bash
go run ./cmd/simulation
```

Default port: `8081`.

## Environment

| Variable | Default |
| --- | --- |
| `SIM_APP_NAME` | `smr-twin-simulation` |
| `SIM_ENV` | `development` |
| `SIM_HOST` | `0.0.0.0` |
| `SIM_PORT` | `8081` |
| `SIM_LOG_LEVEL` | `info` |
| `SIM_TICK_MS` | `1000` |
| `SIM_HISTORY_SIZE` | `3600` |
| `SIM_SEED` | `42` |
| `SIM_VERSION` | `0.1.0` |
| `HISTORIAN_ENABLED` | `false` when `DATABASE_URL` is absent |
| `DATABASE_URL` | unset |
| `HISTORIAN_REQUIRED` | `false` |
| `HISTORIAN_MIGRATIONS_PATH` | `../../infra/db/migrations` |
| `HISTORIAN_WRITE_INTERVAL_MS` | `1000` |
| `HISTORIAN_TELEMETRY_SAMPLE_MS` | `1000` |
| `HISTORIAN_MAX_BATCH_SIZE` | `500` |
| `HISTORIAN_OPERATION_TIMEOUT_MS` | `500` |
| `MQTT_ENABLED` | `false` |
| `MQTT_REQUIRED` | `false` |
| `MQTT_BROKER_URL` | `tcp://mqtt:1883` |
| `MQTT_CLIENT_ID` | `smr-simulation-publisher` |
| `MQTT_TOPIC_PREFIX` | `smr/site-001/unit-001` |
| `MQTT_QOS` | `0` |
| `MQTT_RETAIN` | `false` |
| `MQTT_PUBLISH_INTERVAL_MS` | `1000` |
| `MQTT_CONNECT_TIMEOUT_MS` | `5000` |
| `MQTT_WRITE_TIMEOUT_MS` | `3000` |

## Endpoints

```bash
curl http://localhost:8081/health
curl http://localhost:8081/metrics
curl http://localhost:8081/api/v1/simulation/status
curl http://localhost:8081/api/v1/simulation/assets
curl http://localhost:8081/api/v1/simulation/telemetry/latest
curl "http://localhost:8081/api/v1/simulation/telemetry/history?window=15m"
curl "http://localhost:8081/api/v1/simulation/telemetry/history?window=24h&resolution=1m"
curl http://localhost:8081/api/v1/simulation/control/status
curl -X POST http://localhost:8081/api/v1/simulation/control/mode \
  -H "Content-Type: application/json" \
  -d '{"mode":"MANUAL","requestedBy":"demo-operator"}'
curl http://localhost:8081/api/v1/simulation/pid/status
curl -X PATCH http://localhost:8081/api/v1/simulation/pid/config \
  -H "Content-Type: application/json" \
  -d '{"setpoint":288,"kp":0.9,"ki":0.05,"kd":0.1,"requestedBy":"demo-operator"}'
curl http://localhost:8081/api/v1/simulation/historian/status
curl http://localhost:8081/api/v1/simulation/mqtt/status
curl http://localhost:8081/api/v1/simulation/alarms/active
curl http://localhost:8081/api/v1/simulation/alarms/history
curl -X POST http://localhost:8081/api/v1/simulation/alarms/alarm-id/acknowledge \
  -H "Content-Type: application/json" \
  -d '{"acknowledgedBy":"demo-operator","comment":"Acknowledged from Alarms page"}'
curl -X POST http://localhost:8081/api/v1/simulation/commands \
  -H "Content-Type: application/json" \
  -d '{"targetTag":"V-101","commandType":"SET_POSITION","source":"frontend","requestedBy":"demo-engineer","payload":{"positionPercent":75}}'
curl "http://localhost:8081/api/v1/simulation/commands/recent?limit=50"
curl "http://localhost:8081/api/v1/simulation/events/recent?limit=50"
curl http://localhost:8081/api/v1/simulation/scenarios
curl -X POST http://localhost:8081/api/v1/simulation/scenarios/high_temperature/start
curl -X POST http://localhost:8081/api/v1/simulation/scenarios/stop
curl -X POST http://localhost:8081/api/v1/simulation/reset
```

## Scenarios

Scenario definitions are embedded YAML files under `apps/simulation/config/scenarios/`.

Current scenario IDs:

- `normal`
- `startup`
- `load_ramp`
- `sensor_drift`
- `pump_degradation`
- `high_temperature`
- `pressure_deviation`
- `trip`

All scenarios are synthetic demonstrations for portfolio and UI validation.
Starting and stopping a predefined scenario writes `SCENARIO_STARTED` and `SCENARIO_COMPLETED` records to the same event stream used by commands and alarms.

Each YAML scenario includes an ID, name, description, category, severity, duration, tags, expected alarms, report tags, a simulation-only safety note, enabled flag, version, and a constrained `effects` block. The registry validates required fields, duration syntax, supported severities, supported effect behaviors, duplicate IDs, and disabled scenarios before the API exposes the scenario list.

This registry is not a scripting language and not a real operating procedure system. Effects are interpreted by the synthetic simulation engine only.

## Alarm Lifecycle

The simulation service keeps active alarm state in memory and persists alarm lifecycle records when the optional historian is connected:

- `ACTIVE`: a synthetic rule condition is currently true.
- `ACKNOWLEDGED`: a demo operator acknowledged an active alarm.
- `CLEARED`: the synthetic condition returned to normal and the instance moved to history.

Endpoints:

- `GET /api/v1/simulation/alarms/active`
- `GET /api/v1/simulation/alarms/history`
- `POST /api/v1/simulation/alarms/{alarmID}/acknowledge`

Alarm actions create events in the same recent event stream as command events:

- `ALARM_ACTIVATED`
- `ALARM_ACKNOWLEDGED`
- `ALARM_CLEARED`

This is an operator workflow simulator only. It is not a real plant alarm system.

## Persistent Historian

When `HISTORIAN_ENABLED=true` and `DATABASE_URL` is reachable, the simulation service runs SQL migrations from `HISTORIAN_MIGRATIONS_PATH` and writes synthetic telemetry, command, event, and alarm history records to PostgreSQL/TimescaleDB. Telemetry writes also maintain a 1-minute aggregate table (`telemetry_history_1m`) for synthetic trend downsampling. Docker Compose uses local demo credentials and mounts the migrations into the container at `/migrations`.

If the database is disabled or unavailable, the service continues with in-memory fallback state unless `HISTORIAN_REQUIRED=true`.

Historian status is exposed through:

- `GET /api/v1/simulation/historian/status`

History can be queried as raw samples or 1-minute aggregate samples:

```bash
curl "http://localhost:8081/api/v1/simulation/telemetry/history?window=1h"
curl "http://localhost:8081/api/v1/simulation/telemetry/history?window=24h&resolution=1m"
```

Supported windows are `15m`, `1h`, `6h`, and `24h`. Supported resolutions are `raw` and `1m`; unsupported resolutions return a structured `400` response. Historian status reports demo retention/downsampling fields including `rawRetention`, `supportedResolutions`, and `aggregateStatus`.

The historian stores synthetic simulation data only. The 30-day raw retention metadata and 1-minute aggregate path are demo historian features, not production audit storage or compliance retention guarantees.

The full Docker Compose persistence path can be verified from the repository root:

```bash
node scripts/smoke/historian-db-smoke.mjs
```

The smoke uses an isolated Compose project, checks connected historian status, verifies raw and 1-minute aggregate telemetry history, writes synthetic telemetry plus a `V-101` command, restarts the simulation service, and confirms records remain available through the API.

Each run writes a sanitized local report under `logs/smoke/<timestamp>_historian-db-smoke/`. These artifacts contain synthetic simulation diagnostics only and can be removed with `node scripts/logs/clean-logs.mjs`.

## MQTT Bridge

When `MQTT_ENABLED=true`, the simulation service connects to the configured broker and publishes synthetic simulation data. Docker Compose enables this against the local Eclipse Mosquitto demo broker.

Default topic prefix:

```text
smr/site-001/unit-001
```

Published topics include:

- `telemetry/snapshot`
- `telemetry/tags/<tag>`
- `events`
- `alarms/active`
- `commands/status`
- `control/tic-101/pid/status`
- `control/tic-101/mode`
- `historian/status`
- `system/status`

Payloads use a JSON envelope with `schemaVersion`, `publishedAt`, `source`, `simulationOnly: true`, `siteId`, `unitId`, `topicType`, and `data`.

The bridge is publish-only. It does not subscribe to MQTT topics, does not ingest MQTT commands, and cannot control simulated or real equipment. If the broker is unavailable and `MQTT_REQUIRED=false`, the service continues running with degraded MQTT status.

Status endpoint:

- `GET /api/v1/simulation/mqtt/status`

Smoke test:

```bash
node scripts/smoke/mqtt-bridge-smoke.mjs
```

Each run writes a sanitized local report under `logs/smoke/<timestamp>_mqtt-bridge-smoke/`.

## Simulation Commands

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

Example request:

```json
{
  "targetTag": "V-101",
  "commandType": "SET_POSITION",
  "source": "frontend",
  "requestedBy": "demo-engineer",
  "payload": {
    "positionPercent": 75
  }
}
```

The service validates targets, command types, valve position payloads, and `TIC-101` control arbitration before mutating state. Rejected commands are recorded in the recent command/event trail.

Arbitration behavior:

- `MANUAL`: direct frontend/user valve commands are allowed.
- `AUTO`: direct frontend/user valve commands are rejected with `CONTROL_MODE_AUTO` while the synthetic PID owns `V-101.POS`.
- `DISABLED`: direct frontend/user valve commands are rejected with `CONTROL_DISABLED`.

`P-101` remains manually controllable in this milestone. Scenario/system sources are preserved as simulation overrides. Mode changes emit `CONTROL_MODE_CHANGED` and `CONTROL_AUTHORITY_CHANGED`; arbitration rejections emit `COMMAND_REJECTED_BY_ARBITRATION`. PID setpoint/tuning/output state changes emit `PID_*` events without logging every tick.

## State Machines

`V-101` valve states:

- `CLOSED`
- `OPENING`
- `OPEN`
- `CLOSING`
- `STOPPED`
- `MOVING_TO_POSITION`
- `FAULT`

`P-101` pump states:

- `STOPPED`
- `STARTING`
- `RUNNING`
- `STOPPING`
- `FAULT`

The synthetic process loop reacts to these states:

- `V-101.POS` and `V-101.STATE` reflect the valve state machine.
- `P-101.STATE` and `P-101.RPM` reflect the pump state machine.
- `FT-101` flow trends with pump state and valve position.

## Recent Commands And Events

Recent commands and events are exposed through:

- `GET /api/v1/simulation/commands/recent`
- `GET /api/v1/simulation/events/recent`

Both endpoints accept an optional `limit` query parameter from `1` to `200` and return newest records first. Records are read from the persistent historian when it is connected and fall back to in-memory history otherwise. They are not a persistent compliance audit store.

## Test

```bash
go test ./...
```
