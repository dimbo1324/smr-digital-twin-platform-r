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

Process controls for assets such as `V-101` and `P-101` are disabled until a simulation-only command layer is implemented. Future commands must target simulated assets only, include explicit command source metadata, and be recorded through event/audit flows.
