# Safety Boundary

SMR Twin Platform is a simulation-only digital twin portfolio project.

The simulation engine:

- generates synthetic telemetry only;
- uses synthetic thresholds and synthetic alarms;
- does not contain real nuclear operating procedures;
- does not issue commands to real equipment;
- does not implement safety-critical automation;
- must not be connected to real plant control networks.

Scenario controls in the UI start and stop demonstration states inside `apps/simulation`. They are not real control commands and must not be interpreted as operating instructions.

Process controls for assets such as `V-101` and `P-101` use a simulation-only command layer. These commands:

- mutate only in-memory simulation state;
- do not leave the local software stack;
- do not connect to physical actuators, PLCs, DCS systems, or plant networks;
- include explicit command source and requester metadata;
- are recorded in a demo command/event trail that can be persisted by the optional historian.

The current command trail is not a compliance audit store. The optional PostgreSQL/TimescaleDB historian stores only synthetic demo data and does not provide immutability, regulatory retention, or production audit guarantees.

Simulation report export is for portfolio/demo summaries of synthetic data only. JSON and CSV reports are not regulatory reports, not production audit exports, and not nuclear compliance artifacts.

The local Prometheus/Grafana observability stack is a development diagnostic aid only. It does not provide production alerting, secure operations monitoring, or safety-critical plant observability.

Demo RBAC restricts synthetic simulation actions inside the portfolio platform. It is header-based, uses static demo users, has no passwords, has no OAuth/JWT production identity flow, and does not provide real plant access control. It helps demonstrate role-aware HMI behavior; it must not be treated as certified or production-grade security.

Alarm and event operations are also simulation-only. Acknowledging an alarm only changes a synthetic alarm instance created by `apps/simulation`; it does not confirm, silence, or clear a real plant condition. Cleared alarm history and recent events are demo workflow records, not a regulated operational archive, even when persisted by the historian.

Manual, auto, and disabled control modes are simulation-only state on `TIC-101`. Switching modes changes only in-memory command arbitration for the simulated `V-101` valve. `AUTO` mode lets the synthetic `TIC-101` PID controller apply an in-memory `V-101.POS` target. This PID is educational simulation logic only; it is not safety automation or real controller behavior.

The MQTT bridge is publish-only. MQTT topics contain synthetic telemetry, events, alarms, command status, PID/control status, historian status, and system status for demo and integration testing purposes only. The bridge does not subscribe to command topics, does not accept actuator commands, does not connect to PLC/SCADA systems, and cannot control equipment. The local anonymous Mosquitto configuration is a development/demo broker, not a production security configuration.
