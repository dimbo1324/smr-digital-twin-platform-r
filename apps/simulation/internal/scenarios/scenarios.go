package scenarios

import (
	"errors"
	"fmt"
	"io/fs"
	"math"
	"path/filepath"
	"sort"
	"strings"
	"time"

	scenarioconfig "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/config/scenarios"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/process"
	"go.yaml.in/yaml/v2"
)

var (
	ErrDuplicateID     = errors.New("duplicate scenario id")
	ErrInvalidScenario = errors.New("invalid scenario config")
)

type Effects struct {
	Behavior                        string   `yaml:"behavior"`
	Mode                            string   `yaml:"mode"`
	TargetPowerPct                  *float64 `yaml:"targetPowerPct"`
	AmplitudePct                    *float64 `yaml:"amplitudePct"`
	PeriodTicks                     *float64 `yaml:"periodTicks"`
	PrimaryTemperatureC             *float64 `yaml:"primaryTemperatureC"`
	PrimaryTemperatureBaseC         *float64 `yaml:"primaryTemperatureBaseC"`
	PrimaryTemperatureDriftPerTickC *float64 `yaml:"primaryTemperatureDriftPerTickC"`
	PrimaryTemperatureMaxDriftC     *float64 `yaml:"primaryTemperatureMaxDriftC"`
	SecondaryTemperatureC           *float64 `yaml:"secondaryTemperatureC"`
	PrimaryPressureMPa              *float64 `yaml:"primaryPressureMPa"`
	SecondaryPressureMPa            *float64 `yaml:"secondaryPressureMPa"`
	FlowPct                         *float64 `yaml:"flowPct"`
	LevelPct                        *float64 `yaml:"levelPct"`
	TurbineRPM                      *float64 `yaml:"turbineRPM"`
	GeneratorLoadPct                *float64 `yaml:"generatorLoadPct"`
	CondenserVacuumKPa              *float64 `yaml:"condenserVacuumKPa"`
	FeedwaterFlowPct                *float64 `yaml:"feedwaterFlowPct"`
	VibrationMMS                    *float64 `yaml:"vibrationMmS"`
	RadiationUSvH                   *float64 `yaml:"radiationUSvH"`
}

type Definition struct {
	ID             string   `yaml:"id"`
	Name           string   `yaml:"name"`
	Description    string   `yaml:"description"`
	Category       string   `yaml:"category"`
	Severity       string   `yaml:"severity"`
	Duration       string   `yaml:"duration"`
	Tags           []string `yaml:"tags"`
	ExpectedAlarms []string `yaml:"expectedAlarms"`
	ReportTags     []string `yaml:"reportTags"`
	SafetyNote     string   `yaml:"safetyNote"`
	Enabled        bool     `yaml:"enabled"`
	Version        int      `yaml:"version"`
	Effects        Effects  `yaml:"effects"`
}

type TargetValues struct {
	Power, PrimaryTemp, SecondaryTemp, PrimaryPressure, SecondaryPressure float64
	Flow, Level, RPM, Load, Vacuum, Feedwater, Vibration, Radiation       float64
	Mode                                                                  model.Mode
}

var registry = mustLoadEmbedded()

func List() []model.ScenarioInfo {
	values := make([]model.ScenarioInfo, 0, len(registry.ordered))
	for _, definition := range registry.ordered {
		values = append(values, definition.Info())
	}
	return values
}

func Exists(name model.ScenarioName) bool {
	_, ok := registry.byID[name]
	return ok
}

func DefinitionFor(name model.ScenarioName) (Definition, bool) {
	definition, ok := registry.byID[name]
	return definition, ok
}

func TargetsForScenario(name model.ScenarioName, current model.TelemetrySnapshot, tickCount int64) TargetValues {
	definition, ok := DefinitionFor(name)
	if !ok {
		definition, _ = DefinitionFor(model.ScenarioNormal)
	}
	return definition.Targets(current, tickCount)
}

func LoadEmbedded() ([]Definition, error) {
	return LoadFS(scenarioconfig.Files, scenarioconfig.Dir)
}

func LoadFS(fsys fs.FS, dir string) ([]Definition, error) {
	entries, err := fs.ReadDir(fsys, dir)
	if err != nil {
		return nil, err
	}
	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".yaml") {
			files = append(files, filepath.ToSlash(filepath.Join(dir, entry.Name())))
		}
	}
	sort.Strings(files)

	definitions := make([]Definition, 0, len(files))
	for _, file := range files {
		payload, err := fs.ReadFile(fsys, file)
		if err != nil {
			return nil, err
		}
		definition, err := ParseDefinition(payload)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", file, err)
		}
		if !definition.Enabled {
			continue
		}
		definitions = append(definitions, definition)
	}
	return definitions, ValidateDefinitions(definitions)
}

func ParseDefinition(payload []byte) (Definition, error) {
	var definition Definition
	if err := yaml.UnmarshalStrict(payload, &definition); err != nil {
		return Definition{}, err
	}
	if err := ValidateDefinition(definition); err != nil {
		return Definition{}, err
	}
	return definition, nil
}

func ValidateDefinitions(definitions []Definition) error {
	seen := map[string]struct{}{}
	for _, definition := range definitions {
		if err := ValidateDefinition(definition); err != nil {
			return err
		}
		if _, ok := seen[definition.ID]; ok {
			return fmt.Errorf("%w: %s", ErrDuplicateID, definition.ID)
		}
		seen[definition.ID] = struct{}{}
	}
	return nil
}

func ValidateDefinition(definition Definition) error {
	if definition.ID == "" {
		return fmt.Errorf("%w: id is required", ErrInvalidScenario)
	}
	if definition.Name == "" {
		return fmt.Errorf("%w: name is required", ErrInvalidScenario)
	}
	if definition.Description == "" {
		return fmt.Errorf("%w: description is required", ErrInvalidScenario)
	}
	if definition.Duration != "" {
		if _, err := time.ParseDuration(definition.Duration); err != nil {
			return fmt.Errorf("%w: invalid duration %q", ErrInvalidScenario, definition.Duration)
		}
	}
	switch definition.Severity {
	case "", "info", "warning", "critical":
	default:
		return fmt.Errorf("%w: invalid severity %q", ErrInvalidScenario, definition.Severity)
	}
	switch definition.Effects.Behavior {
	case "nominal", "startup_ramp", "load_sine", "sensor_drift", "fixed":
	default:
		return fmt.Errorf("%w: invalid effects.behavior %q", ErrInvalidScenario, definition.Effects.Behavior)
	}
	return nil
}

func (d Definition) Info() model.ScenarioInfo {
	return model.ScenarioInfo{
		Name:           model.ScenarioName(d.ID),
		Title:          d.Name,
		Description:    d.Description,
		Category:       d.Category,
		Severity:       d.Severity,
		Duration:       d.Duration,
		Tags:           append([]string(nil), d.Tags...),
		ExpectedAlarms: append([]string(nil), d.ExpectedAlarms...),
		ReportTags:     append([]string(nil), d.ReportTags...),
		SafetyNote:     d.SafetyNote,
		Enabled:        d.Enabled,
		Version:        d.Version,
		SimulationOnly: true,
	}
}

func (d Definition) Targets(current model.TelemetrySnapshot, tickCount int64) TargetValues {
	effects := d.Effects
	power := valueOr(effects.TargetPowerPct, 72)
	mode := model.Mode(effects.Mode)
	if mode == "" {
		mode = model.ModeNormal
	}
	switch effects.Behavior {
	case "startup_ramp":
		return nominalTargets(process.Clamp(current.ReactorPowerPct+2.5, 25, power), mode)
	case "load_sine":
		amplitude := valueOr(effects.AmplitudePct, 18)
		period := valueOr(effects.PeriodTicks, 25)
		return nominalTargets(power+amplitude*math.Sin(float64(tickCount)/period), mode)
	case "sensor_drift":
		target := nominalTargets(power, mode)
		base := valueOr(effects.PrimaryTemperatureBaseC, target.PrimaryTemp)
		driftPerTick := valueOr(effects.PrimaryTemperatureDriftPerTickC, 0.12)
		maxDrift := valueOr(effects.PrimaryTemperatureMaxDriftC, 12)
		target.PrimaryTemp = base + math.Min(float64(tickCount)*driftPerTick, maxDrift)
		return target
	case "fixed":
		target := nominalTargets(power, mode)
		applyOverrides(&target, effects)
		return target
	default:
		target := nominalTargets(power, mode)
		applyOverrides(&target, effects)
		return target
	}
}

type loadedRegistry struct {
	ordered []Definition
	byID    map[model.ScenarioName]Definition
}

func mustLoadEmbedded() loadedRegistry {
	definitions, err := LoadEmbedded()
	if err != nil {
		panic(err)
	}
	byID := make(map[model.ScenarioName]Definition, len(definitions))
	for _, definition := range definitions {
		byID[model.ScenarioName(definition.ID)] = definition
	}
	return loadedRegistry{ordered: orderDefinitions(definitions), byID: byID}
}

func orderDefinitions(definitions []Definition) []Definition {
	priority := map[string]int{
		string(model.ScenarioNormal):            0,
		string(model.ScenarioStartup):           1,
		string(model.ScenarioLoadRamp):          2,
		string(model.ScenarioSensorDrift):       3,
		string(model.ScenarioPumpDegradation):   4,
		string(model.ScenarioHighTemperature):   5,
		string(model.ScenarioPressureDeviation): 6,
		string(model.ScenarioTrip):              7,
	}
	ordered := append([]Definition(nil), definitions...)
	sort.SliceStable(ordered, func(i, j int) bool {
		return priority[ordered[i].ID] < priority[ordered[j].ID]
	})
	return ordered
}

func nominalTargets(power float64, mode model.Mode) TargetValues {
	return TargetValues{
		Power:             power,
		PrimaryTemp:       270 + power*0.22,
		SecondaryTemp:     205 + power*0.23,
		PrimaryPressure:   14.2 + power*0.012,
		SecondaryPressure: 5.4 + power*0.011,
		Flow:              78 + power*0.14,
		Level:             62,
		RPM:               power * 50,
		Load:              power * 0.98,
		Vacuum:            86,
		Feedwater:         66 + power*0.14,
		Vibration:         1.4 + power*0.01,
		Radiation:         0.14 + power*0.0006,
		Mode:              mode,
	}
}

func applyOverrides(target *TargetValues, effects Effects) {
	apply(&target.Power, effects.TargetPowerPct)
	apply(&target.PrimaryTemp, effects.PrimaryTemperatureC)
	apply(&target.SecondaryTemp, effects.SecondaryTemperatureC)
	apply(&target.PrimaryPressure, effects.PrimaryPressureMPa)
	apply(&target.SecondaryPressure, effects.SecondaryPressureMPa)
	apply(&target.Flow, effects.FlowPct)
	apply(&target.Level, effects.LevelPct)
	apply(&target.RPM, effects.TurbineRPM)
	apply(&target.Load, effects.GeneratorLoadPct)
	apply(&target.Vacuum, effects.CondenserVacuumKPa)
	apply(&target.Feedwater, effects.FeedwaterFlowPct)
	apply(&target.Vibration, effects.VibrationMMS)
	apply(&target.Radiation, effects.RadiationUSvH)
}

func apply(field *float64, value *float64) {
	if value != nil {
		*field = *value
	}
}

func valueOr(value *float64, fallback float64) float64 {
	if value == nil {
		return fallback
	}
	return *value
}
