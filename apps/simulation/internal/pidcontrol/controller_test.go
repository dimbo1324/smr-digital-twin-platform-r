package pidcontrol

import (
	"testing"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestCalculateActiveStateClampsOutputAndMarksSaturation(t *testing.T) {
	cfg := model.PIDConfig{
		Setpoint:     310,
		Kp:           20,
		Ki:           5,
		OutputMin:    0,
		OutputMax:    100,
		IntegralMin:  -100,
		IntegralMax:  100,
		SampleTimeMS: 1000,
	}
	state := model.PIDState{OutputBias: 50, Output: 50}

	next := CalculateActiveState(cfg, state, 270, 1)

	if !next.Active || !next.Saturated {
		t.Fatalf("expected active saturated PID state, got %+v", next)
	}
	if next.Output != 100 {
		t.Fatalf("expected output clamp to 100, got %.2f", next.Output)
	}
	if next.Status != "Saturated" {
		t.Fatalf("expected saturated status, got %s", next.Status)
	}
}
