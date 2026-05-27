package actuators

import (
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/process"
)

type PumpTransition struct {
	State model.PumpState
	RPM   float64
	Done  bool
}

func NextPumpTransition(state model.PumpState, rpm, targetRPM, deltaSeconds float64, now, transitionUntil time.Time) PumpTransition {
	switch state {
	case model.PumpStateStarting:
		nextRPM := process.Approach(rpm, targetRPM, process.Clamp(deltaSeconds/2, 0.1, 1))
		if now.Before(transitionUntil) {
			return PumpTransition{State: state, RPM: nextRPM}
		}
		return PumpTransition{State: model.PumpStateRunning, RPM: targetRPM, Done: true}
	case model.PumpStateStopping:
		nextRPM := process.Approach(rpm, 0, process.Clamp(deltaSeconds/2, 0.1, 1))
		if now.Before(transitionUntil) {
			return PumpTransition{State: state, RPM: nextRPM}
		}
		return PumpTransition{State: model.PumpStateStopped, RPM: 0, Done: true}
	case model.PumpStateRunning:
		return PumpTransition{State: state, RPM: targetRPM}
	case model.PumpStateStopped:
		return PumpTransition{State: state, RPM: 0}
	default:
		return PumpTransition{State: state, RPM: rpm}
	}
}
