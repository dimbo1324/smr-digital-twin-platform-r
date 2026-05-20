# Local Log Artifacts

This directory is reserved for local and CI diagnostic artifacts produced by smoke tests and helper scripts.

Expected generated structure:

- `logs/local/`
- `logs/smoke/`
- `logs/docker/`
- `logs/ci/`
- `logs/milestones/`

Generated files under those folders are ignored by Git and can be safely deleted. The committed files are only this README and `.gitkeep`.

These artifacts contain synthetic simulation diagnostics only. They do not contain real plant data, they are not a production observability stack, and they are not a certified audit trail.

Useful commands:

```sh
node scripts/smoke/historian-db-smoke.mjs
node scripts/logs/clean-logs.mjs
```
