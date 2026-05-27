package process

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func FlowTarget(pumpState model.PumpState, valvePositionPercent float64) float64 {
	pumpFactor := 0.0
	switch pumpState {
	case model.PumpStateRunning:
		pumpFactor = 1.0
	case model.PumpStateStarting, model.PumpStateStopping:
		pumpFactor = 0.2
	}
	return Clamp(150*pumpFactor*(valvePositionPercent/100), 0, 150)
}

func PressureTarget(pumpState model.PumpState, valvePositionPercent float64) float64 {
	pumpFactor := 0.0
	switch pumpState {
	case model.PumpStateRunning:
		pumpFactor = 1.0
	case model.PumpStateStarting, model.PumpStateStopping:
		pumpFactor = 0.35
	}
	valveRestriction := (100 - valvePositionPercent) / 100
	return Clamp(13.6+pumpFactor*1.4+valveRestriction*0.35, 0, 18)
}

func TemperatureTarget(flow float64) float64 {
	return Clamp(292-flow*0.045, 270, 310)
}
