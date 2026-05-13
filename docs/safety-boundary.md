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
- are recorded in an in-memory command/event audit trail for demo purposes.

The current command trail is not a persistent compliance audit store. Persistent audit, auth/RBAC, and external integrations are planned separately and must preserve the simulation-only boundary.
