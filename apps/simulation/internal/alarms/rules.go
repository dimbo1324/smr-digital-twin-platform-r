package alarms

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

type rule struct {
	code           string
	assetID        string
	title          string
	message        string
	severity       model.AlarmSeverity
	unit           string
	threshold      float64
	clearThreshold float64
	high           bool
	value          func(model.TelemetrySnapshot) float64
}

func defaultRules() []rule {
	return []rule{
		{
			code: "PRIMARY_TEMPERATURE_HIGH_WARNING", assetID: "primary-loop", title: "Primary temperature high warning",
			message: "Synthetic primary temperature is above warning band.", severity: model.AlarmSeverityWarning,
			unit: "C", threshold: 306, clearThreshold: 301, high: true, value: func(s model.TelemetrySnapshot) float64 { return s.PrimaryTemperatureC },
		},
		{
			code: "PRIMARY_TEMPERATURE_HIGH_ALARM", assetID: "primary-loop", title: "Primary temperature high alarm",
			message: "Synthetic primary temperature is above alarm band.", severity: model.AlarmSeverityAlarm,
			unit: "C", threshold: 318, clearThreshold: 310, high: true, value: func(s model.TelemetrySnapshot) float64 { return s.PrimaryTemperatureC },
		},
		{
			code: "PRIMARY_PRESSURE_HIGH_WARNING", assetID: "primary-loop", title: "Primary pressure high warning",
			message: "Synthetic primary pressure is above warning band.", severity: model.AlarmSeverityWarning,
			unit: "MPa", threshold: 16.2, clearThreshold: 15.8, high: true, value: func(s model.TelemetrySnapshot) float64 { return s.PrimaryPressureMPa },
		},
		{
			code: "PRIMARY_PRESSURE_LOW_WARNING", assetID: "primary-loop", title: "Primary pressure low warning",
			message: "Synthetic primary pressure is below warning band.", severity: model.AlarmSeverityWarning,
			unit: "MPa", threshold: 13.5, clearThreshold: 14.0, high: false, value: func(s model.TelemetrySnapshot) float64 { return s.PrimaryPressureMPa },
		},
		{
			code: "COOLANT_FLOW_LOW_WARNING", assetID: "primary-loop", title: "Coolant flow low warning",
			message: "Synthetic coolant flow is below warning band.", severity: model.AlarmSeverityWarning,
			unit: "%", threshold: 68, clearThreshold: 74, high: false, value: func(s model.TelemetrySnapshot) float64 { return s.CoolantFlowPct },
		},
		{
			code: "STEAM_GENERATOR_LEVEL_LOW_WARNING", assetID: "steam-generator", title: "Steam generator level low warning",
			message: "Synthetic steam generator level is below warning band.", severity: model.AlarmSeverityWarning,
			unit: "%", threshold: 42, clearThreshold: 47, high: false, value: func(s model.TelemetrySnapshot) float64 { return s.SteamGeneratorLevelPct },
		},
		{
			code: "STEAM_GENERATOR_LEVEL_HIGH_WARNING", assetID: "steam-generator", title: "Steam generator level high warning",
			message: "Synthetic steam generator level is above warning band.", severity: model.AlarmSeverityWarning,
			unit: "%", threshold: 78, clearThreshold: 73, high: true, value: func(s model.TelemetrySnapshot) float64 { return s.SteamGeneratorLevelPct },
		},
		{
			code: "TURBINE_VIBRATION_HIGH_WARNING", assetID: "turbine", title: "Turbine vibration high warning",
			message: "Synthetic rotating equipment vibration is above warning band.", severity: model.AlarmSeverityWarning,
			unit: "mm/s", threshold: 4.8, clearThreshold: 4.1, high: true, value: func(s model.TelemetrySnapshot) float64 { return s.VibrationMMS },
		},
		{
			code: "TRIP_ACTIVE_CRITICAL", assetID: "protection-system", title: "Synthetic trip active",
			message: "Simulation-only trip scenario is active.", severity: model.AlarmSeverityCritical,
			unit: "%", threshold: 1, clearThreshold: 0, high: true, value: func(s model.TelemetrySnapshot) float64 {
				if s.Mode == model.ModeTrip {
					return 1
				}
				return 0
			},
		},
		{
			code: "SIMULATION_SERVICE_DEGRADED", assetID: "protection-system", title: "Simulation degraded",
			message: "Synthetic simulation health is degraded.", severity: model.AlarmSeverityWarning,
			unit: "%", threshold: 1, clearThreshold: 0, high: true, value: func(s model.TelemetrySnapshot) float64 {
				if s.Health == model.HealthWarning || s.Health == model.HealthAlarm {
					return 1
				}
				return 0
			},
		},
	}
}
