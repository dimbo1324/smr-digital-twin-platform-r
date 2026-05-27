package process

import (
	"math"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func Approach(current, target, alpha float64) float64 {
	return current + (target-current)*alpha
}

func Clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func Round(value float64) float64 {
	return math.Round(value*100) / 100
}

func AlmostEqual(left, right float64) bool {
	if left > right {
		return left-right < 0.01
	}
	return right-left < 0.01
}

func Finite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

func AvailabilityPenalty(health model.Health) float64 {
	switch health {
	case model.HealthAlarm:
		return 9
	case model.HealthWarning:
		return 3
	case model.HealthTrip:
		return 20
	default:
		return 0
	}
}
