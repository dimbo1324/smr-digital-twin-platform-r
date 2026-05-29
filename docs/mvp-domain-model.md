# MVP Domain Model

## Purpose

This document defines the current MVP domain vocabulary for SMR Twin Platform. It keeps the project aligned around what is implemented now, what is synthetic/demo fallback, and what is planned next.

SMR Twin Platform is a simulation-only digital twin platform for SMR energy systems. No real plant control is implemented or intended.

Core API DTOs are also represented in the machine-readable contract layer:

- `packages/schemas/openapi.yaml`
- `packages/schemas/schemas/*.schema.json`
- `apps/web/src/shared/api/generated/schema.ts`

The generated frontend types are used for core API shapes such as `Asset`, `TelemetryPoint`, telemetry history responses, `Command`, `AlarmInstance`, `Event`, `SystemStatus`, `Scenario`, and response metadata. Runtime schema validation is implemented in the frontend HTTP client for selected dev/test API boundaries, and CI checks OpenAPI parsing, JSON Schema compilation, generated TypeScript drift, and runtime validation coverage. Generated Go server code and Go runtime validation from JSON Schema are not implemented yet.

The MQTT bridge exposes synthetic simulation data through publish-only JSON envelopes. MQTT status is part of the API contract, but MQTT command ingestion is intentionally not implemented.

The demo Auth/RBAC layer exposes static demo users, roles, permissions, and a current session through the API gateway. It demonstrates role-aware restrictions for synthetic simulator actions only and is not production authentication.

The frontend data layer consumes those generated types through a typed REST client and TanStack Query hooks. REST polling remains the current real-time mechanism; WebSocket/SSE transport is planned for a later milestone.

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
| `TIC-101` | Temperature Controller | controller | Manual/auto/disabled arbitration and simulation-only PID |

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
| `TIC-101.MODE` | Control Mode | text | empty | simulation via API |
| `TIC-101.SETPOINT` | PID Setpoint | numeric | `C` | simulation via API |
| `TIC-101.PV` | PID Process Value | numeric | `C` | simulation via API |
| `TIC-101.ERROR` | PID Error | numeric | `C` | simulation via API |
| `TIC-101.OUTPUT` | PID Output | numeric | `%` | simulation via API |
| `TIC-101.P_TERM` | PID P Term | numeric | `%` | simulation via API |
| `TIC-101.I_TERM` | PID I Term | numeric | `%` | simulation via API |
| `TIC-101.D_TERM` | PID D Term | numeric | `%` | simulation via API |
| `TIC-101.STATUS` | PID Status | text | empty | simulation via API |

Telemetry quality values:

- `GOOD`
- `BAD`
- `UNCERTAIN`

## Control Mode / Arbitration Model

`TIC-101` is the simulation-only controller for the synthetic `TT-101 -> V-101.POS` loop. PID calculations are implemented for training/demo use only and apply only to in-memory simulation state.

ControlMode:

- `MANUAL`
- `AUTO`
- `DISABLED`

ControlAuthority:

- `USER`
- `SCENARIO`
- `PID`
- `SYSTEM`
- `NONE`

Current semantics:

1. `MANUAL`: direct user/frontend `V-101` commands are allowed.
2. `AUTO`: direct user/frontend `V-101` commands are rejected because `V-101` is owned by simulation-only PID authority.
3. `DISABLED`: direct user/frontend `V-101` commands are rejected because control output is disabled.
4. `P-101` remains manually controllable in this milestone.

Mode changes emit `CONTROL_MODE_CHANGED` and `CONTROL_AUTHORITY_CHANGED`. Arbitration rejections emit `COMMAND_REJECTED_BY_ARBITRATION` and leave a rejected command record with a structured reject reason.

PIDConfig:

- `setpoint`
- `kp`
- `ki`
- `kd`
- `outputMin`
- `outputMax`
- `integralMin`
- `integralMax`
- `sampleTimeMs`

PIDStatus:

- `processValue`
- `error`
- `pTerm`
- `iTerm`
- `dTerm`
- `output`
- `saturated`
- `active`
- `mode`
- `authority`

PID setpoint/tuning changes emit `PID_SETPOINT_CHANGED` and `PID_TUNING_CHANGED`. Output updates are rate-limited by threshold events and saturation events so the unified event stream is not spammed every tick.

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

Current implementation is simulation-only. Active alarm state is in-memory, while alarm history can be persisted by the optional historian when connected. Shelving and production-grade operator workflow are planned for later milestones.

## Event / Audit Model

The current in-memory event/audit shape is:

- `id`
- `type`
- `source`
- `severity`
- `message`
- `targetTag`
- `commandId`
- `alarmId`
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
- `CONTROL_MODE_CHANGED`
- `CONTROL_AUTHORITY_CHANGED`
- `COMMAND_REJECTED_BY_ARBITRATION`

Current severities:

- `INFO`
- `WARNING`
- `ERROR`
- `CRITICAL`

The current implementation stores recent command, alarm, PID, control, scenario, and simulation events in memory and exposes them through the Events page. The optional historian persists event records when connected, but this is not an immutable or compliance-grade audit store.

The event schema describes the unified event stream only. It does not imply persistent audit storage or compliance-grade retention.

## Demo Auth / RBAC Model

Role:

- `VIEWER`
- `ENGINEER`
- `OPERATOR`
- `SUPERVISOR`
- `ADMIN`

Permission examples:

- `SEND_COMMAND`
- `CHANGE_CONTROL_MODE`
- `UPDATE_PID_CONFIG`
- `ACKNOWLEDGE_ALARM`
- `RUN_SCENARIO`
- `VIEW_DIAGNOSTICS`
- `VIEW_MQTT_STATUS`
- `VIEW_HISTORIAN_STATUS`
- `ADMIN_DEMO_SESSION`

DemoUser:

- `id`
- `displayName`
- `role`
- `permissions`
- `badgeLabel`
- `description`

AuthSession:

- `userId`
- `displayName`
- `role`
- `permissions`
- `source: demo`
- `simulationOnly: true`
- `disclaimer`

The frontend sends `X-Demo-User` to the API gateway. Missing or unknown users fall back to `demo-operator` for local demo compatibility. The API gateway enforces protected write/action endpoints and returns `RBAC_FORBIDDEN` for denied actions. This layer is demo-only and does not include passwords, OAuth/JWT, persistent users, or production access-control guarantees.

## Persistent Historian Records

The optional historian stores synthetic simulation records when PostgreSQL/TimescaleDB is enabled:

- `TelemetryHistoryRecord`: timestamped tag values, quality, source, area, asset tag, and metadata.
- `CommandHistoryRecord`: command identity, target, type, source, requester, status, timestamps, payload, result, and error details.
- `EventLogRecord`: unified event stream records for commands, alarms, scenarios, control mode, PID, and simulation activity.
- `AlarmHistoryRecord`: synthetic alarm lifecycle state, severity, timestamps, acknowledgement metadata, last value, threshold, and metadata.
- `HistorianStatus`: enabled mode, connected/degraded/unavailable state, fallback flag, timing settings, and last write/error metadata.
- `TelemetryHistoryAggregate`: 1-minute synthetic telemetry buckets used by Trends when PostgreSQL/TimescaleDB is connected.
- `HistorianRetentionStatus`: demo retention/downsampling metadata such as raw retention, supported resolutions, and aggregate status.

When the historian is disabled or unavailable, the simulation service keeps the existing in-memory fallback behavior. The historian is for demo and portfolio data only, not regulated plant audit storage. The 30-day raw retention metadata and 1-minute downsampling path apply only to synthetic telemetry and do not provide production audit immutability or regulatory retention.

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

Current scenarios are predefined as embedded YAML configuration and synthetic:

- `normal`
- `startup`
- `load_ramp`
- `sensor_drift`
- `pump_degradation`
- `high_temperature`
- `pressure_deviation`
- `trip`

The YAML registry lives under `apps/simulation/config/scenarios/` and validates IDs, metadata, duration strings, severity, expected alarms, report tags, safety notes, enabled state, version, duplicate IDs, and constrained synthetic effects. It is not a scripting language or real operating procedure system.

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
- In-memory fallback command history and event/audit trail, with optional historian persistence.
- Alarm lifecycle with active, acknowledged, and cleared synthetic instances.
- Events page backed by the unified recent event stream.
- Dashboard overview backed by live API status, synthetic telemetry, active alarms, command history, and recent events.
- Process asset cards backed by `/api/v1/assets`.
- Trends summary cards backed by latest API telemetry.
- Frontend HMI shell.
- API gateway to simulation service.
- Active alarm generation and display.
- Persistent historian-backed history for trends when enabled, with in-memory fallback.
- 1-minute aggregated historian telemetry for longer Trends windows when the persistent historian is connected.
- Scenario start/stop/reset endpoints.
- Manual/auto/disabled `TIC-101` mode and `V-101` command arbitration.
- Simulation-only `TIC-101` PID controller.
- Publish-only MQTT bridge and `MQTTStatus` endpoint.
- Demo Auth/RBAC users, permissions, role switcher, session endpoint, and protected action enforcement.
- Simulation-only JSON/CSV/PDF report summaries through the API gateway and Reports page.
- Local demo observability metrics for API and simulation services.

Partial:

- Alarm shelving.
- Events, because persistence exists but compliance-grade audit retention, pagination, and policy are not implemented.
- Assets.
- Trends, because only raw and 1-minute aggregate resolutions are implemented; additional aggregate windows remain future work.
- Process UI controls, because only `V-101` and `P-101` simulation commands are implemented.

Not implemented:

- MQTT command ingestion or MQTT-based control.
- Production-grade command/audit storage.
- Production authentication or production RBAC.
- Excel report export and regulatory/compliance reporting.

## Planned Extensions

- Event/audit pagination and retention policy.
- Alarm shelving and richer operator workflow.
- Production MQTT broker hardening, auth/ACL/TLS, and optional command-ingestion design.
- Excel report export if it stays explicitly simulation-only and non-regulatory.
