package actuators

import (
	"testing"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestValveRestStateAndMovement(t *testing.T) {
	if !ValveIsMoving(model.ValveStateOpening) {
		t.Fatal("expected opening valve to be moving")
	}
	if got := ValveRestState(100); got != model.ValveStateOpen {
		t.Fatalf("expected open rest state, got %s", got)
	}
	if got := NextValvePosition(10, 30, 20, 0.5); got != 20 {
		t.Fatalf("expected valve to move to 20, got %.2f", got)
	}
}

func TestPumpTransitionCompletesAtDeadline(t *testing.T) {
	now := time.Date(2026, 5, 27, 0, 0, 0, 0, time.UTC)
	pending := NextPumpTransition(model.PumpStateStarting, 0, 1800, 1, now, now.Add(time.Second))
	if pending.Done || pending.State != model.PumpStateStarting {
		t.Fatalf("expected pending STARTING transition, got %+v", pending)
	}
	done := NextPumpTransition(model.PumpStateStarting, 1200, 1800, 1, now, now)
	if !done.Done || done.State != model.PumpStateRunning || done.RPM != 1800 {
		t.Fatalf("expected completed RUNNING transition, got %+v", done)
	}
}
