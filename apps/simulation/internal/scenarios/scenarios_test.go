package scenarios

import (
	"errors"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestEmbeddedScenariosLoadExpectedIDs(t *testing.T) {
	definitions, err := LoadEmbedded()
	if err != nil {
		t.Fatalf("LoadEmbedded() error = %v", err)
	}

	seen := map[model.ScenarioName]bool{}
	for _, definition := range definitions {
		seen[model.ScenarioName(definition.ID)] = true
		if definition.SafetyNote == "" {
			t.Fatalf("scenario %q is missing simulation-only safety note", definition.ID)
		}
	}

	expected := []model.ScenarioName{
		model.ScenarioNormal,
		model.ScenarioStartup,
		model.ScenarioLoadRamp,
		model.ScenarioSensorDrift,
		model.ScenarioPumpDegradation,
		model.ScenarioHighTemperature,
		model.ScenarioPressureDeviation,
		model.ScenarioTrip,
	}
	for _, id := range expected {
		if !seen[id] {
			t.Fatalf("expected embedded scenario %q to be loaded", id)
		}
	}
}

func TestLoadFSRejectsDuplicateIDs(t *testing.T) {
	_, err := LoadFS(fstest.MapFS{
		"one.yaml": {Data: []byte(validScenarioYAML("duplicate", "One"))},
		"two.yaml": {Data: []byte(validScenarioYAML("duplicate", "Two"))},
	}, ".")
	if !errors.Is(err, ErrDuplicateID) {
		t.Fatalf("LoadFS() error = %v, want duplicate id", err)
	}
}

func TestLoadFSRejectsInvalidDuration(t *testing.T) {
	_, err := LoadFS(fstest.MapFS{
		"bad.yaml": {Data: []byte(`
id: bad_duration
name: Bad Duration
description: Invalid duration should fail validation.
category: test
severity: warning
duration: definitely-not-a-duration
safetyNote: Simulation-only synthetic scenario.
enabled: true
version: 1
effects:
  behavior: nominal
  targetPowerPct: 72
  mode: NORMAL
`)},
	}, ".")
	if !errors.Is(err, ErrInvalidScenario) {
		t.Fatalf("LoadFS() error = %v, want invalid scenario", err)
	}
}

func TestParseDefinitionRejectsInvalidRequiredFields(t *testing.T) {
	tests := []struct {
		name string
		yaml string
	}{
		{
			name: "missing id",
			yaml: `
name: Missing ID
description: Missing id should fail validation.
category: test
severity: info
duration: 1m
safetyNote: Simulation-only synthetic scenario.
enabled: true
version: 1
effects:
  behavior: nominal
`,
		},
		{
			name: "missing name",
			yaml: `
id: missing_name
description: Missing name should fail validation.
category: test
severity: info
duration: 1m
safetyNote: Simulation-only synthetic scenario.
enabled: true
version: 1
effects:
  behavior: nominal
`,
		},
		{
			name: "invalid severity",
			yaml: strings.Replace(validScenarioYAML("bad_severity", "Bad Severity"), "severity: info", "severity: emergency", 1),
		},
		{
			name: "unknown behavior",
			yaml: strings.Replace(validScenarioYAML("bad_behavior", "Bad Behavior"), "behavior: nominal", "behavior: script", 1),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ParseDefinition([]byte(tc.yaml))
			if !errors.Is(err, ErrInvalidScenario) {
				t.Fatalf("ParseDefinition() error = %v, want invalid scenario", err)
			}
		})
	}
}

func TestLoadFSIgnoresDisabledScenarios(t *testing.T) {
	definitions, err := LoadFS(fstest.MapFS{
		"disabled.yaml": {Data: []byte(`
id: disabled_demo
name: Disabled Demo
description: Disabled scenario should not appear in the registry.
category: test
severity: info
duration: 1m
safetyNote: Simulation-only synthetic scenario.
enabled: false
version: 1
effects:
  behavior: nominal
  targetPowerPct: 72
  mode: NORMAL
`)},
		"enabled.yaml": {Data: []byte(validScenarioYAML("enabled_demo", "Enabled Demo"))},
	}, ".")
	if err != nil {
		t.Fatalf("LoadFS() error = %v", err)
	}
	if len(definitions) != 1 || definitions[0].ID != "enabled_demo" {
		t.Fatalf("LoadFS() definitions = %#v, want only enabled_demo", definitions)
	}
}

func TestTargetsForScenarioPreserveLegacyBehavior(t *testing.T) {
	current := model.TelemetrySnapshot{ReactorPowerPct: 30}

	startup := TargetsForScenario(model.ScenarioStartup, current, 10)
	if startup.Mode != model.ModeStartup || startup.Power != 32.5 {
		t.Fatalf("startup target = %#v, want startup mode with power 32.5", startup)
	}

	highTemperature := TargetsForScenario(model.ScenarioHighTemperature, current, 10)
	if highTemperature.Mode != model.ModeWarning || highTemperature.PrimaryTemp != 322 {
		t.Fatalf("high temperature target = %#v, want warning mode and primary temp 322", highTemperature)
	}

	trip := TargetsForScenario(model.ScenarioTrip, current, 10)
	if trip.Mode != model.ModeTrip || trip.Power != 2 || trip.Flow != 35 {
		t.Fatalf("trip target = %#v, want trip mode with low power/flow", trip)
	}
}

func validScenarioYAML(id string, name string) string {
	return `
id: ` + id + `
name: ` + name + `
description: Test scenario for YAML registry validation.
category: test
severity: info
duration: 1m
safetyNote: Simulation-only synthetic scenario.
enabled: true
version: 1
effects:
  behavior: nominal
  targetPowerPct: 72
  mode: NORMAL
`
}
