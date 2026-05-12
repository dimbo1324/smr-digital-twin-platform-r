package engine

import (
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

type state struct {
	snapshot       model.TelemetrySnapshot
	activeScenario model.ScenarioName
	running        bool
	tickCount      int64
}

func initialState(now time.Time) state {
	return state{
		snapshot: model.TelemetrySnapshot{
			ReactorPowerPct:        72,
			ThermalPowerMW:         216,
			ElectricPowerMW:        76,
			PrimaryTemperatureC:    286,
			SecondaryTemperatureC:  222,
			PrimaryPressureMPa:     15.1,
			SecondaryPressureMPa:   6.2,
			CoolantFlowPct:         88,
			SteamGeneratorLevelPct: 62,
			TurbineRPM:             3600,
			GeneratorLoadPct:       71,
			CondenserVacuumKPa:     88,
			FeedwaterFlowPct:       76,
			VibrationMMS:           2.1,
			RadiationLevelUSvH:     0.18,
			AvailabilityPct:        99.2,
			EfficiencyPct:          34.8,
			Timestamp:              now,
			Mode:                   model.ModeNormal,
			Health:                 model.HealthOK,
			SimulationOnly:         true,
			Scenario:               string(model.ScenarioNormal),
		},
		activeScenario: model.ScenarioNormal,
	}
}
