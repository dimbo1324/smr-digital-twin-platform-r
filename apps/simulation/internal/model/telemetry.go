package model

import "time"

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
	ValveState             string    `json:"valveState"`
	PumpState              string    `json:"pumpState"`
	PumpRPM                float64   `json:"pumpRpm"`
	HeatExchangerState     string    `json:"heatExchangerState"`
	PIDControllerMode      string    `json:"pidControllerMode"`
	Timestamp              time.Time `json:"timestamp"`
	Mode                   Mode      `json:"mode"`
	Health                 Health    `json:"health"`
	SimulationOnly         bool      `json:"simulationOnly"`
	Scenario               string    `json:"scenario"`
}
