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

## API Contract Layer

The current contract layer is machine-readable but intentionally lightweight:

```mermaid
flowchart LR
    OpenAPI["packages/schemas/openapi.yaml"] --> Generator["apps/web npm run api:types"]
    Generator --> TSTypes["apps/web/src/shared/api/generated/schema.ts"]
    TSTypes --> FrontendAPI["Frontend API/entity type aliases"]
    GoAPI["apps/api handlers and DTOs"] -. kept aligned manually .-> OpenAPI
    SimulationDTOs["apps/simulation DTOs"] -. proxied by API .-> OpenAPI
```

`packages/schemas/openapi.yaml` documents implemented REST endpoints only. The frontend generated types reduce drift for core DTOs such as `Asset`, `TelemetryPoint`, `Command`, `AlarmInstance`, `Event`, `SystemStatus`, `Scenario`, and API envelopes.

This is not an OpenAPI-first backend rewrite. Go server stubs, generated Go clients, and runtime request/response validation are not implemented yet. The API gateway remains the runtime contract boundary for the frontend.

## Domain Layers

The current MVP separates domain concerns into two layers:

- `SMR Unit Overview`: high-level synthetic unit metrics for dashboard, top-level status, scenarios, and trends.
- `Thermal Process Loop MVP`: lower-level process-loop assets and tags for the HMI mnemonic and future simulation-only command layer.

The API should preserve both layers. Unit overview telemetry must not replace process-loop telemetry, and process-loop UI should prefer live API values before falling back to clearly labelled in-memory/demo values.

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

## Dashboard Live Overview

The Dashboard is an overview page for the local simulation platform, not a production plant operations screen.
It reads independent live API sources through REST polling:

- `GET /api/v1/system/status` for API, environment, mode, and safety boundary status.
- `GET /api/v1/telemetry/latest` for synthetic process-loop telemetry.
- `GET /api/v1/alarms/active` and `GET /api/v1/alarms/history` for active, acknowledged, and cleared alarm summaries.
- `GET /api/v1/commands/recent` for the latest simulation-only command result.
- `GET /api/v1/events/recent` for command, alarm, and simulation activity.

Each dashboard section handles loading, empty, and unavailable states independently. Remaining non-production boundaries are labelled explicitly as synthetic telemetry, in-memory storage, REST polling, and no real plant control.

The Process page reads process-loop assets through `GET /api/v1/assets` and process telemetry through `GET /api/v1/telemetry/latest`. The Trends page uses latest telemetry for summary cards and `GET /api/v1/telemetry/history` for chart data. If history is unavailable, the chart explicitly labels its static fallback curve as demo data.

## Alarm And Event Operations Flow

The current alarm workflow is also REST plus polling:

```mermaid
sequenceDiagram
    participant ENG as "Simulation Engine"
    participant ALM as "Alarm Evaluator"
    participant EVT as "Unified Event Trail"
    participant API as "Go API"
    participant UI as "Frontend HMI"

    ENG->>ALM: "Evaluate synthetic telemetry on tick"
    ALM->>ALM: "Create or update AlarmInstance"
    ALM->>EVT: "ALARM_ACTIVATED"
    UI->>API: "GET /api/v1/alarms/active"
    UI->>API: "POST /api/v1/alarms/{id}/acknowledge"
    API->>ALM: "Proxy acknowledge request"
    ALM->>EVT: "ALARM_ACKNOWLEDGED"
    ENG->>ALM: "Condition normalizes"
    ALM->>EVT: "ALARM_CLEARED"
    UI->>API: "GET /api/v1/events/recent"
```

Alarm and event storage is in-memory inside `apps/simulation`. The API is a proxy boundary for the frontend and is the intended place for future auth, RBAC, rate limiting, persistent audit writes, and contract versioning.

## Current Limitations

- Live UI updates use polling, not WebSocket or SSE.
- Telemetry history is in-memory.
- Alarm lifecycle and event history are in-memory.
- Process commands are implemented only for simulated `V-101` and `P-101` assets.
- Command/event history is in-memory and not an immutable audit store.
- MQTT, TSDB persistence, PID control, report export, auth/RBAC, and Kubernetes are not part of the current milestone.
