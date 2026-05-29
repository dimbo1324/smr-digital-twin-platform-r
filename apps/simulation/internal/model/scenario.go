package model

type ScenarioName string

const (
	ScenarioNormal            ScenarioName = "normal"
	ScenarioStartup           ScenarioName = "startup"
	ScenarioLoadRamp          ScenarioName = "load_ramp"
	ScenarioSensorDrift       ScenarioName = "sensor_drift"
	ScenarioPumpDegradation   ScenarioName = "pump_degradation"
	ScenarioHighTemperature   ScenarioName = "high_temperature"
	ScenarioPressureDeviation ScenarioName = "pressure_deviation"
	ScenarioTrip              ScenarioName = "trip"
)

type ScenarioInfo struct {
	Name           ScenarioName `json:"name"`
	Title          string       `json:"title"`
	Description    string       `json:"description"`
	Category       string       `json:"category,omitempty"`
	Severity       string       `json:"severity,omitempty"`
	Duration       string       `json:"duration,omitempty"`
	Tags           []string     `json:"tags,omitempty"`
	ExpectedAlarms []string     `json:"expectedAlarms,omitempty"`
	ReportTags     []string     `json:"reportTags,omitempty"`
	SafetyNote     string       `json:"safetyNote,omitempty"`
	Enabled        bool         `json:"enabled"`
	Version        int          `json:"version,omitempty"`
	SimulationOnly bool         `json:"simulationOnly"`
}

type SimulationStatus struct {
	Running                 bool         `json:"running"`
	Mode                    Mode         `json:"mode"`
	Health                  Health       `json:"health"`
	ActiveScenario          ScenarioName `json:"activeScenario"`
	TickMS                  int          `json:"tickMs"`
	HistorySize             int          `json:"historySize"`
	SnapshotCount           int          `json:"snapshotCount"`
	LastSimulationTimestamp string       `json:"lastSimulationTimestamp"`
	SimulationOnly          bool         `json:"simulationOnly"`
}
