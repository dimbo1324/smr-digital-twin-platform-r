# Demo Release Notes

Version: `v0.1.0-demo`

Date: 2026-06-01

## Summary

This demo baseline presents SMR Digital Twin Platform as a simulation-only IIoT / Digital Twin portfolio project for synthetic SMR-style thermal process workflows. It includes a React HMI, Go API gateway, Go simulation service, YAML scenario registry, historian storage, MQTT publish-only bridge, JSON/CSV/PDF report export, local/demo observability, Scenario Authoring draft/export UI, final screenshots, and CI quality gates.

It is not a real plant system, not a production SCADA platform, not production authentication, not a production audit archive, and not regulatory nuclear reporting.

## Implemented Capabilities

- Dashboard, Process, Alarms, Events, Trends, Reports, Settings, and Scenario Authoring pages.
- Simulation-only `V-101` valve and `P-101` pump command workflows.
- `TIC-101` simulation-only PID with `MANUAL`, `AUTO`, and `DISABLED` arbitration.
- Synthetic alarm lifecycle and unified event stream.
- Validated source-controlled YAML scenario registry.
- Scenario Authoring workspace for local YAML draft creation, preview, validation, copy, and download.
- PostgreSQL/TimescaleDB historian path for synthetic data with raw and 1-minute aggregate telemetry history.
- MQTT publish-only bridge for synthetic telemetry/status/event payloads.
- JSON/CSV/PDF simulation summary export.
- Local/demo Prometheus and Grafana observability baseline.
- OpenAPI / JSON Schema / generated TypeScript / runtime validation contract workflow.
- Component, E2E, accessibility, keyboard, multi-browser smoke, visual regression, smoke, load-and-soak, security, and repository hygiene checks.
- Final demo screenshots under `docs/assets/screenshots/`.

## Demo-Only Limitations

- Scenario Authoring exports YAML drafts only. It does not persist drafts, mutate the runtime registry, deploy scenarios, or control equipment.
- Demo RBAC uses static header-selected demo users. It is not production authentication and has no passwords, OAuth/JWT, persistent users, or real plant access control.
- Reports are simulation-only summaries. They are not regulatory, safety, compliance, production audit, or nuclear compliance reports.
- Historian data is synthetic only. It is not immutable audit storage and does not provide regulatory retention.
- MQTT is publish-only. There is no MQTT command ingestion and no actuator control topic path.
- Observability is local/demo only. It is not production monitoring, alerting, tracing, or safety-critical observability.
- The simulator is synthetic and is not a real reactor physics model.

## Safety Boundary

All data and actions are simulation-only and synthetic. The platform has no PLC/SCADA connectivity, no real plant control, no physical actuator path, no production audit immutability, and no regulatory reporting claim.

## How To Run The Demo

```bash
docker compose up --build
```

Open:

- HMI: `http://localhost:5173`
- API: `http://localhost:8080`
- Simulation diagnostics: `http://localhost:8081`

Optional local/demo observability:

```bash
docker compose --profile observability up --build
```

## Quality Gates Included

- Repository hygiene and generated artifact checks.
- API and simulation Go test/vet/race/coverage in CI.
- Frontend format, contract, typecheck, lint, component tests, and build.
- Playwright E2E, accessibility, keyboard, Chromium/Firefox multi-browser smoke, and visual regression.
- Docker Compose config validation.
- Historian DB, MQTT bridge, observability, and load-and-soak smoke jobs.
- Security/dependency scans.

## Known Limitations

- REST polling is used for live UI updates; WebSocket/SSE is not implemented.
- Scenario Authoring is draft/export only and has no save workspace.
- No production authentication, production audit immutability, or production deployment hardening.
- No real plant connectivity, no MQTT command ingestion, and no PLC/SCADA integration.

## Recommended Next Milestones

- `feat/scenario-authoring-save-workspace`
- `feat/report-template-customization`
- `refactor/openapi-generated-go-client`
- `docs/recruiter-case-study-page`
- `test/load-profile-thresholds-hardening`
