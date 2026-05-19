package engine

import (
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

type state struct {
	snapshot       model.TelemetrySnapshot
	activeScenario model.ScenarioName
	valve          valveRuntime
	pump           pumpRuntime
	control        controlRuntime
	pid            pidRuntime
	commands       []model.Command
	events         []model.Event
	running        bool
	tickCount      int64
	commandSeq     int64
	eventSeq       int64
}

type pidRuntime struct {
	config              model.PIDConfig
	state               model.PIDState
	lastOutputEventPct  float64
	saturationEventOpen bool
}

type controlRuntime struct {
	mode      model.ControlMode
	authority model.ControlAuthority
	reason    string
	updatedAt time.Time
	updatedBy string
}

type valveRuntime struct {
	tag                   string
	state                 model.ValveState
	positionPercent       float64
	targetPositionPercent float64
	lastCommandID         string
	activeCommandID       string
	updatedAt             time.Time
}

type pumpRuntime struct {
	tag             string
	state           model.PumpState
	rpm             float64
	targetRPM       float64
	transitionUntil time.Time
	lastCommandID   string
	activeCommandID string
	updatedAt       time.Time
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
			LoopTemperatureC:       286.4,
			LoopPressureMPa:        15.1,
			LoopFlowKGS:            118,
			TankLevelPct:           72,
			ValvePositionPct:       64,
			ValveState:             string(model.ValveStateStopped),
			PumpState:              string(model.PumpStateRunning),
			PumpRPM:                1800,
			HeatExchangerState:     "Online",
			PIDControllerMode:      string(model.ControlModeManual),
			PIDSetpointC:           286,
			PIDProcessValueC:       286.4,
			PIDErrorC:              -0.4,
			PIDOutputPct:           64,
			PIDStatus:              "Manual",
			Timestamp:              now,
			Mode:                   model.ModeNormal,
			Health:                 model.HealthOK,
			SimulationOnly:         true,
			Scenario:               string(model.ScenarioNormal),
		},
		activeScenario: model.ScenarioNormal,
		valve: valveRuntime{
			tag:                   "V-101",
			state:                 model.ValveStateStopped,
			positionPercent:       64,
			targetPositionPercent: 64,
			updatedAt:             now,
		},
		pump: pumpRuntime{
			tag:       "P-101",
			state:     model.PumpStateRunning,
			rpm:       1800,
			targetRPM: 1800,
			updatedAt: now,
		},
		control: controlRuntime{
			mode:      model.ControlModeManual,
			authority: model.ControlAuthorityUser,
			reason:    "Operator manual control",
			updatedAt: now,
			updatedBy: "system",
		},
		pid: pidRuntime{
			config: model.PIDConfig{
				ControllerTag:          "TIC-101",
				ProcessVariableTag:     "TT-101",
				ManipulatedVariableTag: "V-101.POS",
				Setpoint:               286,
				Kp:                     0.8,
				Ki:                     0.05,
				Kd:                     0.1,
				OutputMin:              0,
				OutputMax:              100,
				IntegralMin:            -100,
				IntegralMax:            100,
				SampleTimeMS:           1000,
				Enabled:                true,
			},
			state: model.PIDState{
				Setpoint:      286,
				ProcessValue:  286.4,
				Error:         -0.4,
				PreviousError: -0.4,
				Output:        64,
				LastOutput:    64,
				OutputBias:    64,
				LastUpdateAt:  now,
				Status:        "Manual",
			},
			lastOutputEventPct: 64,
		},
	}
}
