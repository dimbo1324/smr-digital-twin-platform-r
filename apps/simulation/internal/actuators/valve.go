package actuators

import (
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/process"
)

func ValveIsMoving(state model.ValveState) bool {
	return state == model.ValveStateOpening || state == model.ValveStateClosing || state == model.ValveStateMovingToPosition
}

func ValveRestState(position float64) model.ValveState {
	switch {
	case position <= 0:
		return model.ValveStateClosed
	case position >= 100:
		return model.ValveStateOpen
	default:
		return model.ValveStateStopped
	}
}

func NextValvePosition(previous, target, speedPctPerSec, deltaSeconds float64) float64 {
	step := speedPctPerSec * deltaSeconds
	if previous < target {
		return process.Clamp(previous+step, previous, target)
	}
	return process.Clamp(previous-step, target, previous)
}
