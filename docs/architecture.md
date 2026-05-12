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
