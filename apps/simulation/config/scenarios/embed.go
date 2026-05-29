package scenarioconfig

import "embed"

// Files embeds the simulation-only scenario YAML registry used by the engine.
//
//go:embed *.yaml
var Files embed.FS

const Dir = "."
