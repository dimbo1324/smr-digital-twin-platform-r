# MVP Domain Model

## Purpose

This document defines the current MVP domain vocabulary for SMR Twin Platform. It keeps the project aligned around what is implemented now, what is synthetic/mock, and what is planned next.

SMR Twin Platform is a simulation-only digital twin platform for SMR energy systems. No real plant control is implemented or intended.

Core API DTOs are also represented in the machine-readable contract layer:

- `packages/schemas/openapi.yaml`
- `packages/schemas/schemas/*.schema.json`
- `apps/web/src/shared/api/generated/schema.ts`

The generated frontend types are used for core API shapes such as `Asset`, `TelemetryPoint`, `Command`, `AlarmInstance`, `Event`, `SystemStatus`, `Scenario`, and response metadata. Runtime schema validation and generated Go server code are not implemented yet.

## Safety Boundary

- All telemetry is synthetic.
- All assets are simulated.
- There is no connection to real plant networks, controllers, sensors, or actuators.
- The platform must not describe itself as a production nuclear control system.
- Command APIs target simulated assets only, mutate in-memory simulation state, and keep command source, status, result, and audit data explicit.

## Domain Levels

### Level 1: SMR Unit Overview

The SMR Unit Overview is the high-level representation of synthetic unit performance. It exists to make the platform feel like an energy-system digital twin without claiming real reactor fidelity.

Current examples:

- `SMR-POWER`
- `THERMAL-MW`
- `ELECTRIC-MW`
- `TT-PRIMARY`
- `PT-PRIMARY`
- `FT-COOLANT`
- `TURBINE-RPM`
- `GEN-LOAD`

This level is useful for dashboard summaries, top-level trends, system health, and scenario demonstrations.

### Level 2: Thermal Process Loop MVP

The Thermal Process Loop MVP is the lower-level training process used for HMI, telemetry, alarms, future actuator state machines, PID, and simulation-only command workflows.

Current process path:

```text
Tank -> Pump -> Control Valve -> Heat Exchanger -> Sensors -> PID Controller
```

Current process-loop assets:

| Tag | Name | Type | Purpose |
| --- | --- | --- | --- |
| `T-101` | Tank | tank | Level/inventory display |
| `P-101` | Pump | pump | Simulation-only pump state machine and command target |
| `V-101` | Control Valve | valve | Simulation-only valve state machine and command target |
| `HX-101` | Heat Exchanger | heat-exchanger | Synthetic heat transfer display |
| `TT-101` | Loop Temperature Transmitter | sensor | Process loop temperature |
| `PT-101` | Loop Pressure Transmitter | sensor | Process loop pressure |
| `FT-101` | Loop Flow Transmitter | sensor | Process loop flow |
| `LT-101` | Tank Level Transmitter | sensor | Tank level |
| `TIC-101` | Temperature PID Controller | controller | PID placeholder, disabled now |

## Asset Model

The MVP asset shape is:

- `id`
- `tag`
- `name`
- `type`
- `area`
- `unit`
- `status`
- `description`
- `metadata`

Current implementation exposes simulation-generated assets through the API when the simulation service is reachable, with labelled in-memory fallback process-loop assets when it is not. A persistent asset registry is planned.

The OpenAPI/JSON Schema contract tracks the API-facing asset shape. Frontend UI view-models can still adapt this shape for card layout, telemetry tag mapping, and status badge variants.

## Telemetry Model

The MVP telemetry point shape is:

- `tag`
- `name`
- `value`
- `valueText`
- `unit`
- `quality`
- `timestamp`
- `source`
- `area`
- `assetTag`

Current API telemetry points include the common fields used by the frontend:

- `tag`
- `name`
- `value`
- `valueText`
- `unit`
- `quality`
- `timestamp`
- `source`

`area` and `assetTag` are included in the schema as optional contract extension fields for richer filtering and asset binding. Current API responses may omit them.

Current process-loop telemetry:

| Tag | Name | Type | Unit | Current source |
| --- | --- | --- | --- | --- |
| `TT-101` | Loop Temperature | numeric | `C` | simulation via API |
| `PT-101` | Loop Pressure | numeric | `MPa` | simulation via API |
| `FT-101` | Loop Flow | numeric | `kg/s` | simulation via API |
| `LT-101` | Tank Level | numeric | `%` | simulation via API |
| `V-101.POS` | Valve Position | numeric | `%` | simulation via API |
| `V-101.STATE` | Valve State | text | empty | simulation via API |
| `P-101.STATE` | Pump State | text | empty | simulation via API |
| `P-101.RPM` | Pump Speed | numeric | `rpm` | simulation via API |
| `HX-101.STATE` | Heat Exchanger State | text | empty | simulation via API |
| `TIC-101.MODE` | PID Controller Mode | text | empty | simulation via API |

Telemetry quality values:

- `GOOD`
- `BAD`
- `UNCERTAIN`

## Alarm Model

The MVP separates alarm rules from alarm instances.

AlarmRule:

- `id`
- `tag`
- `condition`
- `severity`
- `message`
- `enabled`
- `source`
- `description`

AlarmInstance:

- `id`
- `ruleId`
- `tag`
- `status`
- `severity`
- `message`
- `activeAt`
- `acknowledgedAt`
- `acknowledgedBy`
- `clearedAt`
- `source`
- `lastValue`
- `threshold`
- `metadata`

Alarm statuses:

- `ACTIVE`
- `ACKNOWLEDGED`
- `CLEARED`

Current lifecycle:

1. A synthetic rule condition becomes true and creates an `ACTIVE` alarm instance.
2. The condition remains true without creating duplicate instances.
3. The operator acknowledges an `ACTIVE` alarm and it becomes `ACKNOWLEDGED`.
4. The synthetic condition normalizes and the alarm becomes `CLEARED`.
5. Cleared alarms leave the active endpoint and appear in alarm history.
6. A later recurrence creates a new alarm instance.

Current implementation is in-memory and simulation-only. Shelving, persistent audit storage, and production-grade operator workflow are planned for later milestones.

## Event / Audit Model

The current in-memory event/audit shape is:

- `id`
- `type`
- `source`
- `severity`
- `message`
- `targetTag`
- `commandId`
- `timestamp`
- `metadata`

Current event types:

- `COMMAND_RECEIVED`
- `COMMAND_ACCEPTED`
- `COMMAND_REJECTED`
- `COMMAND_STARTED`
- `COMMAND_COMPLETED`
- `COMMAND_FAILED`
- `EQUIPMENT_STATE_CHANGED`
- `ALARM_ACTIVATED`
- `ALARM_ACKNOWLEDGED`
- `ALARM_CLEARED`
- `SYSTEM_STATUS_CHANGED`
- `SIMULATION_STATE_UPDATED`
- `SCENARIO_STARTED`
- `SCENARIO_COMPLETED`

Current severities:

- `INFO`
- `WARNING`
- `ERROR`
- `CRITICAL`

The current implementation stores recent command, alarm, and simulation events in memory and exposes them through the Events page. A persistent event/audit store is planned.

The event schema describes the unified event stream only. It does not imply persistent audit storage or compliance-grade retention.

## Command Model

The command model is implemented for simulation-only interaction with `V-101` and `P-101`.

Current command envelope:

- `id`
- `targetTag`
- `commandType`
- `source`
- `requestedBy`
- `payload`
- `status`
- `requestedAt`
- `acceptedAt`
- `completedAt`
- `rejectedAt`
- `resultMessage`
- `errorCode`
- `errorMessage`
- `correlationId`

Command statuses:

- `RECEIVED`
- `ACCEPTED`
- `REJECTED`
- `IN_PROGRESS`
- `COMPLETED`
- `FAILED`

Command sources:

- `frontend`
- `api`
- `scenario`
- `system`

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

Unsupported targets, unsupported command types, malformed JSON, and invalid `positionPercent` values are rejected with structured error responses.

### Valve `V-101` State Machine

Valve runtime fields:

- `tag`
- `state`
- `positionPercent`
- `targetPositionPercent`
- `lastCommandId`
- `updatedAt`

Valve states:

- `CLOSED`
- `OPENING`
- `OPEN`
- `CLOSING`
- `STOPPED`
- `MOVING_TO_POSITION`
- `FAULT`

The valve moves deterministically toward its target position in simulation ticks. `V-101.POS` and `V-101.STATE` telemetry reflect the current in-memory state.

### Pump `P-101` State Machine

Pump runtime fields:

- `tag`
- `state`
- `rpm`
- `lastCommandId`
- `updatedAt`

Pump states:

- `STOPPED`
- `STARTING`
- `RUNNING`
- `STOPPING`
- `FAULT`

The pump uses a simple transition delay for start/stop behavior. `P-101.STATE` and `P-101.RPM` telemetry reflect the current in-memory state.

## Scenario Model

Current scenarios are predefined in code and synthetic:

- `normal`
- `startup`
- `load_ramp`
- `sensor_drift`
- `pump_degradation`
- `high_temperature`
- `pressure_deviation`
- `trip`

Declarative YAML/JSON scenario definitions are planned.

## Tag Naming Convention

Process-loop tags use industrial-style identifiers:

- `T-*` for tanks.
- `P-*` for pumps.
- `V-*` for valves.
- `HX-*` for heat exchangers.
- `TT-*` for temperature transmitters.
- `PT-*` for pressure transmitters.
- `FT-*` for flow transmitters.
- `LT-*` for level transmitters.
- `TIC-*` for temperature indicating controllers.

Unit overview tags use descriptive aggregate names such as `SMR-POWER`, `TT-PRIMARY`, and `GEN-LOAD`.

## Current Implementation Status

Implemented now:

- SMR Unit Overview synthetic telemetry.
- Thermal Process Loop synthetic telemetry exposed through API latest telemetry.
- Simulation-only command layer for `V-101` and `P-101`.
- Valve and pump state machines.
- In-memory command history and event/audit trail.
- Alarm lifecycle with active, acknowledged, and cleared in-memory instances.
- Events page backed by the unified recent event stream.
- Dashboard overview backed by live API status, synthetic telemetry, active alarms, command history, and recent events.
- Process asset cards backed by `/api/v1/assets`.
- Trends summary cards backed by latest API telemetry.
- Frontend HMI shell.
- API gateway to simulation service.
- Active alarm generation and display.
- In-memory history for trends.
- Scenario start/stop/reset endpoints.

Partial:

- Alarm lifecycle persistence and shelving.
- Events, because the stream is in-memory only.
- Assets.
- Trends.
- Process UI controls, because only `V-101` and `P-101` simulation commands are implemented.

Not implemented:

- PID control.
- MQTT.
- Persistent historian.
- Persistent command/audit storage.
- Report export.
- Auth/RBAC.

## Planned Extensions

- Expanded command arbitration for user, scenario, PID, and system command sources.
- Persistent event/audit storage with pagination and retention policy.
- Alarm shelving and richer operator workflow.
- MQTT telemetry bridge.
- PID controller and manual/auto command arbitration.
- Persistent historian and report export.
