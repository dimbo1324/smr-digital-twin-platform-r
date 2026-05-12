package simulation

import "time"

type envelope[T any] struct {
	Data T `json:"data"`
	Meta struct {
		Timestamp      time.Time `json:"timestamp"`
		Source         string    `json:"source"`
		SimulationOnly bool      `json:"simulationOnly"`
		Count          int       `json:"count,omitempty"`
	} `json:"meta"`
}

type TelemetrySnapshot struct {
	ReactorPowerPct        float64   `json:"reactorPowerPct"`
	ThermalPowerMW         float64   `json:"thermalPowerMw"`
	ElectricPowerMW        float64   `json:"electricPowerMw"`
	PrimaryTemperatureC    float64   `json:"primaryTemperatureC"`
	SecondaryTemperatureC  float64   `json:"secondaryTemperatureC"`
	PrimaryPressureMPa     float64   `json:"primaryPressureMPa"`
	SecondaryPressureMPa   float64   `json:"secondaryPressureMPa"`
	CoolantFlowPct         float64   `json:"coolantFlowPct"`
	SteamGeneratorLevelPct float64   `json:"steamGeneratorLevelPct"`
	TurbineRPM             float64   `json:"turbineRpm"`
	GeneratorLoadPct       float64   `json:"generatorLoadPct"`
	CondenserVacuumKPa     float64   `json:"condenserVacuumKPa"`
	FeedwaterFlowPct       float64   `json:"feedwaterFlowPct"`
	VibrationMMS           float64   `json:"vibrationMmS"`
	RadiationLevelUSvH     float64   `json:"radiationLevelUSvH"`
	AvailabilityPct        float64   `json:"availabilityPct"`
	EfficiencyPct          float64   `json:"efficiencyPct"`
	LoopTemperatureC       float64   `json:"loopTemperatureC"`
	LoopPressureMPa        float64   `json:"loopPressureMPa"`
	LoopFlowKGS            float64   `json:"loopFlowKgS"`
	TankLevelPct           float64   `json:"tankLevelPct"`
	ValvePositionPct       float64   `json:"valvePositionPct"`
	PumpState              string    `json:"pumpState"`
	HeatExchangerState     string    `json:"heatExchangerState"`
	PIDControllerMode      string    `json:"pidControllerMode"`
	Timestamp              time.Time `json:"timestamp"`
	Mode                   string    `json:"mode"`
	Health                 string    `json:"health"`
	SimulationOnly         bool      `json:"simulationOnly"`
	Scenario               string    `json:"scenario"`
}

type Asset struct {
	ID          string        `json:"id"`
	Tag         string        `json:"tag,omitempty"`
	Name        string        `json:"name"`
	Type        string        `json:"type"`
	Area        string        `json:"area,omitempty"`
	Unit        string        `json:"unit,omitempty"`
	SafetyClass string        `json:"safetyClass"`
	Status      string        `json:"status"`
	Description string        `json:"description,omitempty"`
	KeyMetrics  []AssetMetric `json:"keyMetrics"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

type AssetMetric struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type Alarm struct {
	ID        string     `json:"id"`
	AssetID   string     `json:"assetId"`
	Code      string     `json:"code"`
	Title     string     `json:"title"`
	Message   string     `json:"message"`
	Severity  string     `json:"severity"`
	Status    string     `json:"status"`
	Value     float64    `json:"value"`
	Threshold float64    `json:"threshold"`
	Unit      string     `json:"unit"`
	StartedAt time.Time  `json:"startedAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	ClearedAt *time.Time `json:"clearedAt,omitempty"`
}

type ScenarioInfo struct {
	Name           string `json:"name"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	SimulationOnly bool   `json:"simulationOnly"`
}

type Status struct {
	Running                 bool   `json:"running"`
	Mode                    string `json:"mode"`
	Health                  string `json:"health"`
	ActiveScenario          string `json:"activeScenario"`
	TickMS                  int    `json:"tickMs"`
	HistorySize             int    `json:"historySize"`
	SnapshotCount           int    `json:"snapshotCount"`
	LastSimulationTimestamp string `json:"lastSimulationTimestamp"`
	SimulationOnly          bool   `json:"simulationOnly"`
}
