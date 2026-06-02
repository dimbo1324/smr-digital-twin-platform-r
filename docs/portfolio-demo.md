# Portfolio Demo Guide

This guide helps present SMR Digital Twin Platform as a simulation-only industrial software portfolio project. It is not a real plant system, not production authentication, not a production audit archive, and not regulatory nuclear reporting.

If you need a concise recruiter/interviewer overview, start with the [Recruiter Case Study](recruiter-case-study.md).

## Audience Angles

| Audience                    | Emphasize                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| Recruiter or hiring manager | End-to-end ownership: frontend HMI, Go services, Docker, CI, tests, docs.                             |
| Backend engineer            | API gateway boundaries, RBAC enforcement, simulation proxying, report aggregation, OpenAPI contracts. |
| Frontend engineer           | HMI workflows, TanStack Query data layer, runtime validation, component/E2E/a11y/visual tests.        |
| Automation or IIoT engineer | Simulation-only command workflow, alarm lifecycle, historian, MQTT publish-only bridge.               |
| Platform or DevOps engineer | Docker Compose, smoke/load-soak tests, Prometheus/Grafana local observability, CI quality gates.      |

## 5-Minute Walkthrough

1. Start with Dashboard. Point out synthetic telemetry, historian/MQTT status, recent commands/events, active alarms, and the safety boundary.
2. Move to Process. As `Demo Operator`, send a simulation-only valve or pump command.
3. Switch to `Demo Supervisor` or `Demo Admin` and change `TIC-101` to `AUTO`. Explain that PID now owns `V-101.POS`, so direct valve commands are rejected by arbitration.
4. Trigger a synthetic scenario and show Alarms plus Events. Acknowledge an alarm and watch lifecycle/event records update.
5. Open Trends and explain persistent historian vs in-memory fallback source labels.
6. Open Reports, choose a simulation-only template/section set, and export JSON/CSV/PDF. State clearly that templates are presentation layouts, not regulatory report formats.
7. Open Scenario Authoring, select a synthetic template, validate the YAML draft locally and through the backend validation endpoint, save it in the browser-local workspace, import/export YAML, and state clearly that the UI creates local drafts only; it does not persist to the backend, deploy scenarios, or control equipment.
8. Show Prometheus/Grafana if the observability profile is running.
9. Mention MQTT topics are publish-only synthetic data and do not accept commands.
10. Finish with GitHub Actions: API, simulation, web, E2E, accessibility, keyboard, visual regression, historian smoke, MQTT smoke, observability smoke, short load-and-soak baseline, race/coverage, and dependency scans.

## 15-Minute Technical Walkthrough

1. **Architecture:** Frontend calls only `apps/api`; the simulation service owns synthetic state and integration outputs.
2. **Contracts:** Show `packages/schemas/openapi.yaml`, generated frontend types, and runtime validation.
3. **RBAC:** Show `apps/api/internal/auth` and frontend role-aware disabled states. Explain it is demo RBAC only.
4. **Simulation:** Show domain helpers in `apps/simulation/internal/process`, `actuators`, and `pidcontrol`, then the engine coordinator.
5. **Scenarios:** Show `apps/simulation/config/scenarios/*.yaml` and explain declarative synthetic scenario metadata/effects.
6. **Scenario Authoring:** Show `/scenario-authoring`, create a YAML draft, save it locally, import/export YAML, and explain that a developer must review and commit exported YAML before the simulator can load it.
7. **Historian:** Show migrations and smoke test. Explain raw synthetic telemetry, 1-minute aggregate history, and non-audit limitations.
8. **MQTT:** Show publish-only bridge and smoke script. No MQTT command ingestion exists.
9. **Reports:** Show API aggregation in `apps/api/internal/simulation/reports.go` and the Reports page.
10. **Observability:** Show `/metrics`, Prometheus config, and Grafana dashboard provisioning.
11. **Quality:** Show CI workflow, component tests, Playwright Chromium regression, Chromium/Firefox smoke, a11y, keyboard, visual regression, smoke tests, and the load-and-soak baseline.

## UI Talking Points

- Dashboard is a status overview, not a production control room.
- The HMI supports Dark, Light, and Neutral themes, compact industrial density, a collapsible desktop navigation rail, and a mobile drawer; these preferences are browser-local and presentation-only.
- Process controls mutate synthetic `V-101` and `P-101` state only.
- `TIC-101` PID is educational simulation logic.
- Alarm acknowledgement only changes synthetic alarm instances.
- Trends show historian data when available and clearly labelled fallback when not.
- Reports are JSON/CSV/PDF summaries for demo and portfolio review only. Template customization changes presentation only and does not create regulatory, safety, compliance, or production audit formats.
- Settings communicates implemented capabilities and non-production boundaries.
- Scenario Authoring creates browser-local YAML drafts for synthetic demo scenarios; backend validation checks YAML content only and does not save to the backend, mutate the runtime registry, deploy to equipment, or create operating procedures.

## Screenshot References

Final demo screenshots are committed under `docs/assets/screenshots/`:

- [Dashboard](assets/screenshots/dashboard-dark.png)
- [Process](assets/screenshots/process-dark.png)
- [Trends](assets/screenshots/trends-dark.png)
- [Reports](assets/screenshots/reports-dark.png)
- [Scenario Authoring](assets/screenshots/scenario-authoring-dark.png)
- [Settings](assets/screenshots/settings-dark.png)

## Code Talking Points

- `apps/api` is the frontend boundary and enforces protected write/action permissions.
- `apps/simulation` owns process state, command arbitration, alarms, events, historian writes, MQTT publishing, and metrics.
- `apps/web` uses generated TypeScript contract types, runtime validation, TanStack Query hooks, and tested UI components.
- `packages/schemas` keeps OpenAPI and JSON Schema references aligned with frontend generated types and the lightweight generated Go OpenAPI baseline.
- `apps/simulation/config/scenarios` keeps synthetic scenario definitions declarative and validated.
- `apps/web/src/pages/scenario-authoring` demonstrates safe draft generation, browser-local workspace persistence, YAML import/export, local validation, and source-controlled review.
- `scripts/smoke` verifies full-stack persistence, MQTT publishing, and local/demo observability using Docker Compose.
- `scripts/smoke/load-and-soak-baseline.mjs` exercises sustained synthetic commands, scenarios, historian reads, reports, MQTT publishing, and Prometheus/Grafana health.
- `infra/observability` provisions local Prometheus and Grafana for demo diagnostics.

## Safety Boundary Script

Use this wording in demos:

> This project publishes and visualizes synthetic simulation data only. It does not connect to PLC, DCS, SCADA, plant networks, or physical actuators. Demo RBAC, reports, historian storage, MQTT publishing, and observability are portfolio/demo features, not production nuclear operations features.

## Known Limitations

- Demo RBAC only: no passwords, OAuth/JWT, persistent users, or production identity.
- No real plant control, PLC/SCADA connectivity, or safety-critical automation.
- MQTT is publish-only and has no command ingestion topics.
- Reports are JSON/CSV/PDF simulation summaries, not regulatory reports.
- Historian storage is not immutable or compliance-grade.
- Observability is local/demo Prometheus/Grafana only.
- Live UI transport is REST polling, not WebSocket/SSE.
- No Kubernetes/Helm production deployment.

## What Not To Claim

- Do not claim real plant, PLC, DCS, SCADA, or physical actuator connectivity.
- Do not claim production authentication, certified access control, or production audit immutability.
- Do not call JSON/CSV/PDF reports regulatory, safety, compliance, or nuclear compliance reports.
- Do not describe Scenario Authoring as deployment, operations procedure generation, runtime mutation, or real equipment scenario management.
- Do not imply MQTT command ingestion exists; MQTT is publish-only synthetic data.
- Do not present local Prometheus/Grafana as production monitoring or safety-critical observability.

## Useful Commands

```bash
docker compose up --build
docker compose --profile observability up --build
make demo-assets-update

cd apps/web
npm run test:e2e
npm run test:e2e:multi
npm run test:visual

node scripts/smoke/historian-db-smoke.mjs --timeout-ms 300000 --history-wait-ms 90000
node scripts/smoke/mqtt-bridge-smoke.mjs --timeout-ms 300000
node scripts/smoke/observability-smoke.mjs --timeout-ms 300000
node scripts/smoke/load-and-soak-baseline.mjs --profile quick
node scripts/smoke/load-and-soak-baseline.mjs --profile ci --dry-run --print-profile
```

## What To Show In GitHub

- `docs/assets/screenshots/` for final portfolio screenshots.
- Green CI workflow.
- `apps/web/tests/visual/__screenshots__/` for visual regression baselines.
- `apps/web/tests/e2e/` for operator workflow regression tests.
- `apps/api/internal/simulation/reports.go` for API aggregation.
- `apps/simulation/internal/engine` plus extracted domain helpers.
- `infra/observability/` for local metrics stack.
