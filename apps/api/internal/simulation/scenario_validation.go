package simulation

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/http"
	"go.yaml.in/yaml/v2"
)

const maxScenarioValidationContentBytes = 64 << 10

var scenarioIDPattern = regexp.MustCompile(`^[a-z][a-z0-9_-]*$`)

type scenarioDraftYAML struct {
	ID             string              `yaml:"id"`
	Name           string              `yaml:"name"`
	Description    string              `yaml:"description"`
	Category       string              `yaml:"category"`
	Severity       string              `yaml:"severity"`
	Duration       string              `yaml:"duration"`
	Tags           []string            `yaml:"tags"`
	ExpectedAlarms []string            `yaml:"expectedAlarms"`
	ReportTags     []string            `yaml:"reportTags"`
	SafetyNote     string              `yaml:"safetyNote"`
	Enabled        *bool               `yaml:"enabled"`
	Version        int                 `yaml:"version"`
	Effects        scenarioEffectsYAML `yaml:"effects"`
}

type scenarioEffectsYAML struct {
	Behavior                        string   `yaml:"behavior"`
	Mode                            string   `yaml:"mode"`
	TargetPowerPct                  *float64 `yaml:"targetPowerPct"`
	AmplitudePct                    *float64 `yaml:"amplitudePct"`
	PeriodTicks                     *int     `yaml:"periodTicks"`
	PrimaryTemperatureC             *float64 `yaml:"primaryTemperatureC"`
	PrimaryTemperatureBaseC         *float64 `yaml:"primaryTemperatureBaseC"`
	PrimaryTemperatureDriftPerTickC *float64 `yaml:"primaryTemperatureDriftPerTickC"`
	PrimaryTemperatureMaxDriftC     *float64 `yaml:"primaryTemperatureMaxDriftC"`
	PrimaryPressureMPa              *float64 `yaml:"primaryPressureMPa"`
	FlowPct                         *float64 `yaml:"flowPct"`
	LevelPct                        *float64 `yaml:"levelPct"`
}

func (g *Gateway) ValidateScenarioDraft(w http.ResponseWriter, r *http.Request) {
	request, ok := httpapi.DecodeJSONBody[ScenarioValidationRequest](
		w,
		r,
		maxScenarioValidationContentBytes+1024,
		"scenario validation request must be valid JSON",
	)
	if !ok {
		return
	}

	format := strings.ToLower(strings.TrimSpace(request.Format))
	if format == "" {
		format = "yaml"
	}
	if format != "yaml" && format != "yml" {
		httpapi.WriteError(w, r, http.StatusBadRequest, "UNSUPPORTED_SCENARIO_FORMAT", "scenario validation supports YAML drafts only")
		return
	}
	if len(request.Content) > maxScenarioValidationContentBytes {
		httpapi.WriteError(w, r, http.StatusRequestEntityTooLarge, "SCENARIO_VALIDATION_CONTENT_TOO_LARGE", "scenario YAML draft is too large")
		return
	}

	result := g.validateScenarioYAML(r, request.Content)
	httpapi.WriteData(w, r, http.StatusOK, result, httpapi.MetaOptions{Source: "api"})
}

func (g *Gateway) validateScenarioYAML(r *http.Request, content string) ScenarioValidationResult {
	result := ScenarioValidationResult{
		Errors:            []string{},
		Warnings:          []string{},
		SimulationOnly:    true,
		PersistsToBackend: false,
		DeploysToRuntime:  false,
	}

	var draft scenarioDraftYAML
	if err := yaml.UnmarshalStrict([]byte(content), &draft); err != nil {
		result.Errors = append(result.Errors, "YAML could not be parsed as a supported simulation scenario draft: "+err.Error())
		result.Valid = false
		return result
	}

	result.Scenario = ScenarioValidationSummary{
		ID:       strings.TrimSpace(draft.ID),
		Name:     strings.TrimSpace(draft.Name),
		Category: strings.TrimSpace(draft.Category),
		Severity: strings.TrimSpace(draft.Severity),
		Duration: strings.TrimSpace(draft.Duration),
		Tags:     append([]string(nil), draft.Tags...),
	}

	validateScenarioDraftFields(&result, draft)
	g.appendDuplicateScenarioWarning(r, &result)

	result.Valid = len(result.Errors) == 0
	return result
}

func validateScenarioDraftFields(result *ScenarioValidationResult, draft scenarioDraftYAML) {
	id := strings.TrimSpace(draft.ID)
	if id == "" {
		result.Errors = append(result.Errors, "Scenario id is required.")
	} else if !scenarioIDPattern.MatchString(id) {
		result.Errors = append(result.Errors, "Scenario id must start with a lowercase letter and use lowercase letters, numbers, dashes, or underscores.")
	}

	if strings.TrimSpace(draft.Name) == "" {
		result.Errors = append(result.Errors, "Scenario name is required.")
	}
	if strings.TrimSpace(draft.Description) == "" {
		result.Errors = append(result.Errors, "Description is required so reviewers understand the synthetic demo purpose.")
	}
	if strings.TrimSpace(draft.Category) == "" {
		result.Errors = append(result.Errors, "Category is required.")
	}
	switch strings.ToLower(strings.TrimSpace(draft.Severity)) {
	case "info", "warning", "critical":
	default:
		result.Errors = append(result.Errors, "Severity must be info, warning, or critical.")
	}
	if _, err := time.ParseDuration(strings.TrimSpace(draft.Duration)); err != nil {
		result.Errors = append(result.Errors, "Duration must be a valid Go-style duration such as 30s, 5m, or 1h.")
	}
	if draft.Version < 1 {
		result.Errors = append(result.Errors, "Version must be a positive integer.")
	}
	validateScenarioEffects(result, draft.Effects)

	safetyNote := strings.ToLower(strings.TrimSpace(draft.SafetyNote))
	if !strings.Contains(safetyNote, "simulation-only") {
		result.Errors = append(result.Errors, "Safety note must explicitly say simulation-only.")
	}
	if !strings.Contains(safetyNote, "no real plant control") {
		result.Warnings = append(result.Warnings, "Safety note should state that the draft does not control any real plant.")
	}
	if len(draft.ExpectedAlarms) == 0 {
		result.Warnings = append(result.Warnings, "No expected alarms are listed. That is acceptable for nominal demos, but note it during review.")
	}
	if len(draft.ReportTags) == 0 {
		result.Warnings = append(result.Warnings, "No report tags are listed, so the draft will be less useful in report demos.")
	}
}

func validateScenarioEffects(result *ScenarioValidationResult, effects scenarioEffectsYAML) {
	switch strings.ToLower(strings.TrimSpace(effects.Behavior)) {
	case "nominal", "startup_ramp", "load_sine", "sensor_drift", "fixed":
	default:
		result.Errors = append(result.Errors, "Effects behavior is not supported by the simulation YAML registry.")
	}
	if strings.TrimSpace(effects.Mode) == "" {
		result.Errors = append(result.Errors, "Effects mode is required.")
	}
	if effects.PeriodTicks != nil && *effects.PeriodTicks <= 0 {
		result.Errors = append(result.Errors, "Effects periodTicks must be positive when provided.")
	}
}

func (g *Gateway) appendDuplicateScenarioWarning(r *http.Request, result *ScenarioValidationResult) {
	if result.Scenario.ID == "" {
		return
	}
	scenarios, err := g.client.Scenarios(r.Context())
	if err != nil {
		result.Warnings = append(result.Warnings, "Embedded scenario registry was unavailable during duplicate-id check.")
		return
	}
	for _, scenario := range scenarios {
		if strings.EqualFold(scenario.Name, result.Scenario.ID) {
			result.Warnings = append(result.Warnings, "This id already exists in the embedded scenario registry. Exporting it requires a developer to rename or intentionally replace the source-controlled YAML.")
			return
		}
	}
}
