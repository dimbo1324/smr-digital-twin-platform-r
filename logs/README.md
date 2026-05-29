# Local Log Artifacts

This directory is reserved for local and CI diagnostic artifacts produced by smoke tests and helper scripts.

Expected generated structure:

- `logs/local/`
- `logs/smoke/`
- `logs/docker/`
- `logs/ci/`
- `logs/milestones/`

Generated files under those folders are ignored by Git and can be safely deleted. The committed files are only this README and `.gitkeep`.

Repository hygiene checks include a generated-artifact guard (`node scripts/check-generated-artifacts.mjs`) to prevent accidentally committing smoke logs, Playwright reports, coverage output, temporary reports, or local build artifacts.

These artifacts contain synthetic simulation diagnostics only. They do not contain real plant data, they are not a production observability stack, and they are not a certified audit trail.

Useful commands:

```sh
node scripts/smoke/historian-db-smoke.mjs
node scripts/smoke/mqtt-bridge-smoke.mjs
node scripts/smoke/observability-smoke.mjs
node scripts/smoke/load-and-soak-baseline.mjs --duration-ms 180000
node scripts/logs/clean-logs.mjs
```

The observability smoke writes artifacts under `logs/smoke/<timestamp>_observability-smoke/`, including Compose status/logs, API and simulation metrics samples, Prometheus target/query responses, Grafana health, and a summary. These files are generated diagnostics and must not be committed.

The load-and-soak baseline writes artifacts under `logs/smoke/<timestamp>_load-and-soak-baseline/`, including latency summaries, error summaries, baseline/final metric snapshots, metric samples, command/scenario/report summaries, Prometheus query results, Compose status/logs, API and simulation metrics samples, and debug context. It validates only sustained synthetic demo activity and must not be treated as production load evidence.

The historian DB smoke writes artifacts under `logs/smoke/<timestamp>_historian-db-smoke/`, including raw telemetry history, 1-minute aggregate telemetry history, command/event persistence checks, Compose status/logs, and a summary. These files describe synthetic simulation data only and must not be committed.

Playwright browser, accessibility, and visual regression artifacts are generated separately by the web app tooling under `apps/web/playwright-report/` and `apps/web/test-results/` when enabled. Those generated reports are also ignored by Git. Visual baseline screenshots live with the web tests and are committed intentionally when updated.
