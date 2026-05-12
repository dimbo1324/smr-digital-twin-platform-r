# Architecture Notes

Current MVP runtime path:

```mermaid
flowchart LR
    Web["Frontend HMI<br/>apps/web"] --> API["Backend API Gateway<br/>apps/api"]
    API --> Process["Process Domain Mapper<br/>nodes, edges, status, alarms"]
    Process --> SimulationClient["Simulation Client"]
    SimulationClient --> Simulation["Simulation Engine<br/>apps/simulation"]
    Simulation --> API
```

The frontend calls only `apps/api`. The simulation service remains an internal backend dependency so the API layer can normalize responses, expose fallback behavior, and later add auth, audit, rate limiting, and observability without changing the frontend contract.

The simulation engine is synthetic and deterministic. It generates telemetry for portfolio/demo workflows only and is not a real plant model.

## Process Domain Layer

`apps/api/internal/process` owns the process topology contract exposed to the frontend:

- stable process nodes such as `reactor-core`, `primary-loop`, `steam-generator`, `turbine`, `generator`, `condenser`, `feedwater-system`, and `protection-system`;
- stable process edges with flow types such as `thermal`, `primary-coolant`, `steam`, `mechanical`, `exhaust-steam`, `condensate`, `feedwater`, and `protection-signal`;
- mapper rules that attach synthetic telemetry metrics and active alarms to nodes;
- status calculation for nodes and edges;
- degraded fallback when the simulation service is unavailable.

The Process page consumes `GET /api/v1/process/topology`, not raw simulation service endpoints.
