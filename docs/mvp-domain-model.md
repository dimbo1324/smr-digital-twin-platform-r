# MVP Domain Model

## Purpose

This document defines the current MVP domain vocabulary for SMR Twin Platform. It keeps the project aligned around what is implemented now, what is synthetic/mock, and what is planned next.

SMR Twin Platform is a simulation-only digital twin platform for SMR energy systems. No real plant control is implemented or intended.

## Safety Boundary

- All telemetry is synthetic.
- All assets are simulated.
- There is no connection to real plant networks, controllers, sensors, or actuators.
- The platform must not describe itself as a production nuclear control system.
- Future command APIs must target simulated assets only and must keep command source, status, result, and audit data explicit.

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
| `P-101` | Pump | pump | Future pump state machine |
| `V-101` | Control Valve | valve | Future valve command target |
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

Current implementation has API fallback process-loop assets and simulation-generated unit overview assets. A persistent asset registry is planned.

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

`area` and `assetTag` are planned contract extensions for richer filtering and asset binding.

Current process-loop telemetry:

| Tag | Name | Type | Unit | Current source |
| --- | --- | --- | --- | --- |
| `TT-101` | Loop Temperature | numeric | `C` | simulation via API |
| `PT-101` | Loop Pressure | numeric | `MPa` | simulation via API |
| `FT-101` | Loop Flow | numeric | `kg/s` | simulation via API |
| `LT-101` | Tank Level | numeric | `%` | simulation via API |
| `V-101.POS` | Valve Position | numeric | `%` | simulation via API |
| `P-101.STATE` | Pump State | text | empty | simulation via API |
| `HX-101.STATE` | Heat Exchanger State | text | empty | simulation via API |
| `TIC-101.MODE` | PID Controller Mode | text | empty | simulation via API |

Telemetry quality values:

- `GOOD`
- `BAD`
- `UNCERTAIN`

## Alarm Model

The MVP alarm shape is:

- `id`
- `tag` or `assetId`
- `severity`
- `status`
- `message`
- `activeAt` or `startedAt`
- `acknowledgedAt`
- `clearedAt`
- `source`

Current implementation supports generated active alarms and basic active alarm display. Acknowledgement, cleared history, shelving, and operator workflow are planned for later milestones.

## Event Model

The planned event shape is:

- `id`
- `type`
- `source`
- `severity`
- `message`
- `timestamp`
- `metadata`

Current implementation has mock event previews in the dashboard only. A full event service and event log page are planned.

## Command Model

The command model is planned next and is not fully implemented in this milestone.

Planned command envelope:

- `commandId`
- `targetTag`
- `commandType`
- `source`
- `payload`
- `requestedAt`
- `acceptedAt`
- `status`
- `result`

Planned command sources:

- `USER`
- `PID`
- `SCENARIO`
- `SAFETY_LIMITER`

The next milestone should implement a simulation-only command layer for `V-101` and `P-101` with event and audit trail records.

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
- Frontend HMI shell.
- API gateway to simulation service.
- Active alarm generation and display.
- In-memory history for trends.
- Scenario start/stop/reset endpoints.

Partial:

- Alarm lifecycle.
- Events.
- Assets.
- Trends.
- Process UI controls.

Not implemented:

- Command layer.
- PID control.
- MQTT.
- Persistent historian.
- Report export.
- Auth/RBAC.

## Planned Extensions

- Simulation-only `V-101` valve command and state machine.
- Simulation-only `P-101` pump command and state machine.
- Event/audit trail for all command attempts.
- Alarm acknowledgement and cleared history.
- MQTT telemetry bridge.
- PID controller and manual/auto command arbitration.
- Persistent historian and report export.
