# SMR Twin Simulation Service

Go simulation-only telemetry engine for the SMR Twin Platform MVP. It generates deterministic synthetic telemetry, in-memory history, alarm lifecycle state, in-memory alarm events, and scenario states for the backend API.

This service is not connected to real equipment. It does not implement real nuclear operating procedures, safety automation, or plant control.

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
| `SIM_ALARM_EVENT_HISTORY_SIZE` | `1000` |
| `SIM_SEED` | `42` |
| `SIM_VERSION` | `0.1.0` |

## Endpoints

```bash
curl http://localhost:8081/health
curl http://localhost:8081/api/v1/simulation/status
curl http://localhost:8081/api/v1/simulation/assets
curl http://localhost:8081/api/v1/simulation/telemetry/latest
curl "http://localhost:8081/api/v1/simulation/telemetry/history?window=15m"
curl http://localhost:8081/api/v1/simulation/alarms
curl http://localhost:8081/api/v1/simulation/alarms/active
curl http://localhost:8081/api/v1/simulation/alarms/events
curl http://localhost:8081/api/v1/simulation/alarms/alarm-PRIMARY_TEMPERATURE_HIGH_WARNING
curl -X POST http://localhost:8081/api/v1/simulation/alarms/alarm-PRIMARY_TEMPERATURE_HIGH_WARNING/acknowledge \
  -H "Content-Type: application/json" \
  -d '{"actor":"demo-operator","note":"Acknowledged during simulation review"}'
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

## Alarm Lifecycle

Alarm statuses:

- `ACTIVE` - synthetic condition is present and unacknowledged.
- `ACKNOWLEDGED` - demo operator acknowledged the alarm while the synthetic condition may still be present.
- `CLEARED` - synthetic condition returned to the configured safe band.

Event types:

- `ALARM_RAISED`
- `ALARM_ACKNOWLEDGED`
- `ALARM_CLEARED`
- `ALARM_REACTIVATED`
- `SCENARIO_STARTED`
- `SCENARIO_STOPPED`
- `SIMULATION_RESET`

The event log is an in-memory ring buffer. It is intended for demo/session review only and is not a persistent operational log.

## Test

```bash
go test ./...
```
