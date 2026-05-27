package process

import (
	"testing"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestLoopTargetsUsePumpAndValveState(t *testing.T) {
	if got := FlowTarget(model.PumpStateRunning, 80); got != 120 {
		t.Fatalf("expected running flow 120, got %.2f", got)
	}
	if got := FlowTarget(model.PumpStateStopped, 80); got != 0 {
		t.Fatalf("expected stopped flow 0, got %.2f", got)
	}
	if got := PressureTarget(model.PumpStateRunning, 0); got <= PressureTarget(model.PumpStateStopped, 100) {
		t.Fatalf("expected running/restricted pressure to exceed stopped/open pressure, got %.2f", got)
	}
}

func TestTemperatureTargetIsClamped(t *testing.T) {
	if got := TemperatureTarget(0); got != 292 {
		t.Fatalf("expected low-flow target 292, got %.2f", got)
	}
	if got := TemperatureTarget(1000); got != 270 {
		t.Fatalf("expected high-flow target to clamp at 270, got %.2f", got)
	}
}
