# Architecture Notes

Current MVP runtime path:

```mermaid
flowchart LR
    Web["Frontend HMI<br/>apps/web"] --> API["Backend API Gateway<br/>apps/api"]
    API --> Simulation["Simulation Engine<br/>apps/simulation"]
    Simulation --> API
```

The frontend calls only `apps/api`. The simulation service remains an internal backend dependency so the API layer can normalize responses, expose fallback behavior, and later add auth, audit, rate limiting, and observability without changing the frontend contract.

The simulation engine is synthetic and deterministic. It generates telemetry for portfolio/demo workflows only and is not a real plant model.

## Domain Layers

The current MVP separates domain concerns into two layers:

- `SMR Unit Overview`: high-level synthetic unit metrics for dashboard, top-level status, scenarios, and trends.
- `Thermal Process Loop MVP`: lower-level process-loop assets and tags for the HMI mnemonic and future simulation-only command layer.

The API should preserve both layers. Unit overview telemetry must not replace process-loop telemetry, and process-loop UI should prefer live API values before falling back to local mock values.

## Simulation Command Flow

The current command path is REST plus polling:

```mermaid
sequenceDiagram
    participant UI as "Frontend HMI"
    participant API as "Go API"
    participant SIM as "Simulation Command Handler"
    participant ENG as "Engine State Machines"
    participant TEL as "Telemetry Snapshot"

    UI->>API: "POST /api/v1/commands"
    API->>SIM: "POST /api/v1/simulation/commands"
    SIM->>ENG: "SubmitCommand(command)"
    ENG->>ENG: "Validate and mutate in-memory V-101/P-101 state"
    ENG->>TEL: "Update synthetic process telemetry on tick"
    UI->>API: "Poll /api/v1/telemetry/latest"
    API->>SIM: "Read latest simulation telemetry"
    SIM-->>API: "V-101.POS, V-101.STATE, P-101.STATE, P-101.RPM, FT-101"
    API-->>UI: "Latest telemetry"
```

Command history and events are stored in an in-memory ring buffer inside `apps/simulation`. The API proxies recent command/event reads through:

- `GET /api/v1/commands/recent`
- `GET /api/v1/events/recent`

This is intentionally not a real control path. Commands mutate only in-memory simulated assets and exist to validate the digital twin interaction loop.

## Current Limitations

- Live UI updates use polling, not WebSocket or SSE.
- Telemetry history is in-memory.
- Active alarms are generated and displayed, but acknowledgement and cleared history are planned.
- Process commands are implemented only for simulated `V-101` and `P-101` assets.
- Command/event history is in-memory and not an immutable audit store.
- MQTT, TSDB persistence, PID control, report export, auth/RBAC, and Kubernetes are not part of the current milestone.
