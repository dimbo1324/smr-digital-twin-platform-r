# SMR Twin Simulation Service

Go simulation-only telemetry engine for the SMR Twin Platform MVP. It generates deterministic synthetic telemetry, in-memory history, active alarms, and scenario states for the backend API.

The service exposes two synthetic telemetry layers:

- SMR Unit Overview for high-level unit metrics.
- Thermal Process Loop MVP for `T-101`, `P-101`, `V-101`, `HX-101`, `TT-101`, `PT-101`, `FT-101`, `LT-101`, and `TIC-101` UI alignment.

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

## Test

```bash
go test ./...
```
