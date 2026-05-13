# Project Vision

## Product Name

SMR Twin Platform: Digital Twin for Small Modular Reactor Energy Systems

## Purpose

SMR Twin Platform is a web-based digital twin simulator for a simplified small modular reactor energy system. It is designed to demonstrate industrial software engineering skills across IIoT, real-time telemetry, simulation, HMI/SCADA-like interfaces, event-driven architecture, historical data analysis, alarm management, reporting, cybersecurity thinking, and DevOps.

The platform starts with a safe, simplified process loop:

```text
Tank -> Pump -> Control Valve -> Heat Exchanger -> Sensors -> PID Controller
```

The project should grow incrementally from this process loop toward a richer educational model of an SMR energy block. The first releases must stay focused on simulation, telemetry, visualization, scenarios, and reports rather than real plant control.

The MVP domain is intentionally split into two layers:

1. `SMR Unit Overview` — a high-level synthetic representation of unit-level performance, including aggregate power, primary-loop values, turbine/generator metrics, and overall health.
2. `Thermal Process Loop MVP` — a lower-level training process loop for actuator, PID, telemetry, alarm, and future simulation-only command development.

The current Go simulation service already provides high-level SMR unit overview telemetry. The process-loop telemetry layer is used by the HMI mnemonic and now supports simulation-only `V-101` and `P-101` command work.

## MVP Goal

Build a local web platform where a user can observe and interact with a simulated industrial process loop in the browser.

The MVP target should allow the user to:

- view an HMI-style process mnemonic;
- start and stop a simulated pump;
- open, close, stop, or position a simulated control valve;
- change a PID setpoint;
- watch real-time temperature, pressure, flow, level, pump state, and valve position values;
- inspect live charts and historical trends;
- see alarm lifecycle states;
- inspect an event log;
- run predefined scenarios such as normal operation, pump failure, valve stuck, and overheating;
- export simulation results as PDF or Excel reports.

Current implementation status is tracked in `README.md` and `docs/mvp-domain-model.md`. Some target capabilities above are intentionally planned next rather than implemented now.

## MVP Scope

The MVP includes:

- React-based frontend shell for an industrial operations cockpit.
- Static process diagram with equipment components and telemetry badges.
- Go backend skeleton with REST endpoints and structured module boundaries.
- Go simulation service for synthetic process and unit overview behaviour.
- Polling-based live telemetry through the backend API.
- In-memory telemetry history for local trend views.
- Basic generated active alarms.
- Scenario controls for predefined synthetic scenarios.
- Docker Compose environment for local development.
- Basic backend, simulation, and frontend checks.

The following are planned extensions rather than current implementation: MQTT, persistent time-series storage, full alarm lifecycle, full event log service, persistent command/audit storage, declarative scenario definitions, report export, auth/RBAC, and WebSocket/SSE transport.

## Out of Scope

The project explicitly excludes:

- no real nuclear plant control;
- no safety-critical automation;
- no real reactor operation procedures;
- no integration with real nuclear facility networks or equipment;
- no control of physical actuators;
- no claims of licensing, qualification, or regulatory readiness;
- no detailed reactor physics intended for operational use;
- no emergency operating procedure guidance;
- simulation and educational modelling only.

Any future language, UI text, API naming, or documentation must preserve this boundary. The platform may simulate operator-like workflows, but it must not present itself as a real plant control system.

## Safety And Security Constraints

The project must keep monitoring, simulation, advisory control, and real control concepts architecturally separated.

Key constraints:

- commands are only applied to simulated assets;
- command sources must be explicit, for example USER, PID, SCENARIO, or SAFETY_LIMITER;
- RBAC must prevent read-only users from issuing commands;
- all critical commands and configuration changes must be audited;
- alarm and event history must be immutable from normal application flows;
- simulation faults must be explicit and traceable;
- secrets must never be committed;
- default local credentials, when added, must be documented as development-only;
- external integrations must be disabled by default unless they are simulation-only;
- documentation must avoid real operating procedures.

## Architecture Principles

### Modular Monolith First

Start with one understandable backend and clear internal modules. Avoid premature microservices, but shape module boundaries so telemetry, historian, alarm, scenario, and reporting domains can later become separate services.

### Event-Driven Core

Telemetry, commands, alarms, events, and scenario steps should be represented as explicit events or messages. The initial implementation can be simple, but topic names and event envelopes should be consistent from the start.

### Simulation Before Realism

The first physical model should be a simplified thermal-hydraulic toy model with engineering structure:

```text
flow = k * pump_speed * valve_opening
temperature_next = temperature + heat_input - cooling_factor * flow
level_next = level + inlet_flow - outlet_flow
pressure = base_pressure + resistance_factor * flow
```

The goal is coherent behaviour, not operational reactor fidelity.

### Industrial HMI Mindset

The frontend should feel like an operations cockpit rather than a generic admin dashboard. It should prioritize process state, trends, alarms, controls, events, scenarios, and system health.

### Progressive Delivery

Every few steps should produce something visible or demonstrable:

```text
structure -> frontend shell -> static HMI -> mock telemetry -> MQTT -> simulator -> historian -> alarms -> reports
```

### Observable By Default

Services should eventually expose logs, metrics, and traces. Grafana dashboards should distinguish process telemetry from platform health.

### Portable Local Development

The repository should support a local-first workflow with Docker Compose and cross-platform helper commands.

## Initial Domain Model

Core assets:

- Tank: `T-101`
- Pump: `P-101`
- Control valve: `V-101`
- Heat exchanger: `HX-101`
- Temperature transmitter: `TT-101`
- Pressure transmitter: `PT-101`
- Flow transmitter: `FT-101`
- Level transmitter: `LT-101`
- PID controller placeholder: `TIC-101`

Shared model concepts:

- `Asset`
- `Equipment`
- `Sensor`
- `Actuator`
- `TelemetryPoint`
- `TelemetryMessage`
- `AlarmRule`
- `Alarm`
- `ControlCommand`
- `Scenario`
- `Event`
- `AuditRecord`

See `docs/mvp-domain-model.md` for the current domain contract, including the split between `SMR Unit Overview` and `Thermal Process Loop MVP`.

## Messaging Model

Initial MQTT topic convention:

```text
smr/{site}/{unit}/equipment/{tag}/telemetry
smr/{site}/{unit}/equipment/{tag}/state
smr/{site}/{unit}/commands/{tag}
smr/{site}/{unit}/events
smr/{site}/{unit}/alarms
```

Telemetry messages should include:

- `message_id`
- `source`
- `tag`
- `value`
- `unit`
- `quality`
- `timestamp`
- `metadata`

Quality values should include `GOOD`, `BAD`, and `UNCERTAIN`.

## Future Modules

- Frontend HMI and engineering UI.
- API gateway and backend core.
- Asset registry.
- Simulation engine.
- Telemetry ingestion service.
- Historian service.
- Alarm service.
- Scenario service.
- Control logic service.
- Reporting service.
- User/auth service.
- Audit service.
- Notification service.
- Configuration import/export service.
- Observability stack.
- Edge simulator runtime.
- OPC UA or Modbus simulator adapters.
- Future Kafka, Redpanda, or NATS JetStream event bus integration.

## MVP Readiness Criteria

The MVP is ready when a new user can:

1. start the project locally with one command;
2. open the web UI;
3. start a simulation scenario;
4. see process values change in real time;
5. trigger or observe an alarm;
6. acknowledge an alarm;
7. inspect trends;
8. inspect event and audit logs;
9. export a report;
10. stop the environment cleanly.

Step 0 is complete when any reader can understand from this document that the project is a safe digital twin simulator and not a system for operating a real nuclear plant.
