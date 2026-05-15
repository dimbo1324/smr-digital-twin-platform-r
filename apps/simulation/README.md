# SMR Twin Simulation Service

Go simulation-only telemetry engine for the SMR Twin Platform MVP. It generates deterministic synthetic telemetry, in-memory history, alarm lifecycle state, recent events, and scenario states for the backend API.

The service exposes two synthetic telemetry layers:

- SMR Unit Overview for high-level unit metrics.
- Thermal Process Loop MVP for `T-101`, `P-101`, `V-101`, `HX-101`, `TT-101`, `PT-101`, `FT-101`, `LT-101`, and `TIC-101` UI alignment.

This service is not connected to real equipment. It does not implement real nuclear operating procedures, safety automation, or plant control.

The current command layer is simulation-only. Commands mutate only in-memory `V-101` and `P-101` state and are recorded in an in-memory command/event trail.

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

## Endpoints

```bash
curl http://localhost:8081/health
curl http://localhost:8081/api/v1/simulation/status
curl http://localhost:8081/api/v1/simulation/assets
curl http://localhost:8081/api/v1/simulation/telemetry/latest
curl "http://localhost:8081/api/v1/simulation/telemetry/history?window=15m"
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

- `normal`
- `startup`
- `load_ramp`
- `sensor_drift`
- `pump_degradation`
- `high_temperature`
- `pressure_deviation`
- `trip`

All scenarios are synthetic demonstrations for portfolio and UI validation.
Starting and stopping a predefined scenario writes `SCENARIO_STARTED` and `SCENARIO_COMPLETED` records to the same in-memory event stream used by commands and alarms.

## Alarm Lifecycle

The simulation service keeps alarm instances in memory:

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

The service validates targets, command types, and valve position payloads before mutating state. Rejected commands are recorded in the recent command/event trail.

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

Both endpoints accept an optional `limit` query parameter from `1` to `200` and return newest records first. This trail is in-memory only and resets when the simulation service restarts. It is not a persistent compliance audit store.

## Test

```bash
go test ./...
```
