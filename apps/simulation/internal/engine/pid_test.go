package engine

import (
	"errors"
	"math"
	"testing"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/process"
)

func TestDefaultPIDStatusExistsInactiveInManual(t *testing.T) {
	engine := newTestEngine()

	status := engine.PIDStatus()
	if !status.PIDImplemented {
		t.Fatal("expected PID implemented")
	}
	if status.Active {
		t.Fatal("expected PID inactive in MANUAL")
	}
	if status.Mode != model.ControlModeManual {
		t.Fatalf("expected MANUAL mode, got %s", status.Mode)
	}
}

func TestPIDConfigUpdateValidationAndEvents(t *testing.T) {
	engine := newTestEngine()
	setpoint := 288.0
	kp := 1.2
	ki := 0.08
	kd := 0.2

	status, err := engine.UpdatePIDConfig(model.PIDConfigUpdateRequest{
		Setpoint: &setpoint,
		Kp:       &kp,
		Ki:       &ki,
		Kd:       &kd,
	})
	if err != nil {
		t.Fatalf("update pid config: %v", err)
	}
	if status.Setpoint != setpoint || status.Kp != kp || status.Ki != ki || status.Kd != kd {
		t.Fatalf("unexpected pid status: %+v", status)
	}
	events := engine.RecentEvents()
	if !hasEventType(events, model.EventTypePIDSetpointChanged) {
		t.Fatal("expected PID_SETPOINT_CHANGED event")
	}
	if !hasEventType(events, model.EventTypePIDTuningChanged) {
		t.Fatal("expected PID_TUNING_CHANGED event")
	}

	invalidSetpoint := 500.0
	if _, err := engine.UpdatePIDConfig(model.PIDConfigUpdateRequest{Setpoint: &invalidSetpoint}); err == nil {
		t.Fatal("expected invalid setpoint rejection")
	}
	negativeGain := -0.1
	if _, err := engine.UpdatePIDConfig(model.PIDConfigUpdateRequest{Kp: &negativeGain}); err == nil {
		t.Fatal("expected negative gain rejection")
	}
	min := 80.0
	max := 20.0
	if _, err := engine.UpdatePIDConfig(model.PIDConfigUpdateRequest{OutputMin: &min, OutputMax: &max}); err == nil {
		t.Fatal("expected invalid output limit rejection")
	}
}

func TestPIDActiveOnlyInAutoAndAppliesValveTarget(t *testing.T) {
	engine := newTestEngine()
	setpoint := 300.0
	if _, err := engine.UpdatePIDConfig(model.PIDConfigUpdateRequest{Setpoint: &setpoint}); err != nil {
		t.Fatalf("update pid config: %v", err)
	}

	tickMany(engine, 2)
	manualStatus := engine.PIDStatus()
	if manualStatus.Active {
		t.Fatal("expected PID inactive in MANUAL")
	}
	manualTarget := engine.state.valve.targetPositionPercent

	if _, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeAuto}); err != nil {
		t.Fatalf("set auto: %v", err)
	}
	tickMany(engine, 3)

	autoStatus := engine.PIDStatus()
	if !autoStatus.Active {
		t.Fatal("expected PID active in AUTO")
	}
	if autoStatus.Output < 0 || autoStatus.Output > 100 {
		t.Fatalf("expected clamped output, got %.2f", autoStatus.Output)
	}
	if process.AlmostEqual(engine.state.valve.targetPositionPercent, manualTarget) {
		t.Fatalf("expected PID to update valve target from %.2f", manualTarget)
	}
	if engine.Snapshot().PIDOutputPct != autoStatus.Output {
		t.Fatalf("expected PID telemetry output %.2f, got %.2f", autoStatus.Output, engine.Snapshot().PIDOutputPct)
	}

	if _, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeDisabled}); err != nil {
		t.Fatalf("set disabled: %v", err)
	}
	tickMany(engine, 1)
	if engine.PIDStatus().Active {
		t.Fatal("expected PID inactive in DISABLED")
	}
}

func TestPIDOutputAndIntegralAreClamped(t *testing.T) {
	engine := newTestEngine()
	setpoint := 310.0
	kp := 100.0
	ki := 100.0
	if _, err := engine.UpdatePIDConfig(model.PIDConfigUpdateRequest{Setpoint: &setpoint, Kp: &kp, Ki: &ki}); err != nil {
		t.Fatalf("update pid config: %v", err)
	}
	if _, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeAuto}); err != nil {
		t.Fatalf("set auto: %v", err)
	}
	tickMany(engine, 20)

	status := engine.PIDStatus()
	if status.Output != 100 {
		t.Fatalf("expected saturated output 100, got %.2f", status.Output)
	}
	if math.Abs(status.Integral) > 100 {
		t.Fatalf("expected integral clamp within +/-100, got %.2f", status.Integral)
	}
	if !status.Saturated {
		t.Fatal("expected saturated status")
	}
	if !hasEventType(engine.RecentEvents(), model.EventTypePIDOutputSaturated) {
		t.Fatal("expected PID_OUTPUT_SATURATED event")
	}
}

func TestPIDRejectsNaNConfig(t *testing.T) {
	engine := newTestEngine()
	value := math.NaN()
	_, err := engine.UpdatePIDConfig(model.PIDConfigUpdateRequest{Setpoint: &value})
	if err == nil {
		t.Fatal("expected NaN rejection")
	}
	var commandErr *CommandError
	if !errors.As(err, &commandErr) {
		t.Fatalf("expected CommandError, got %T", err)
	}
}

func TestEnteringAutoInitializesPIDBiasFromValvePosition(t *testing.T) {
	engine := newTestEngine()
	engine.mu.Lock()
	engine.state.valve.positionPercent = 37
	engine.state.valve.targetPositionPercent = 37
	engine.mu.Unlock()

	if _, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeAuto}); err != nil {
		t.Fatalf("set auto: %v", err)
	}
	status := engine.PIDStatus()
	if math.Abs(status.Output-37) > 0.01 {
		t.Fatalf("expected initial output near valve position 37, got %.2f", status.Output)
	}
}

func TestPIDNoInfValuesAfterTicks(t *testing.T) {
	engine := newTestEngine()
	if _, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeAuto}); err != nil {
		t.Fatalf("set auto: %v", err)
	}
	for i := 0; i < 10; i++ {
		engine.mu.Lock()
		engine.tickLocked(time.Now())
		engine.mu.Unlock()
	}
	status := engine.PIDStatus()
	values := []float64{status.Output, status.Error, status.PTerm, status.ITerm, status.DTerm, status.Integral, status.Derivative}
	for _, value := range values {
		if math.IsNaN(value) || math.IsInf(value, 0) {
			t.Fatalf("expected finite PID status, got %+v", status)
		}
	}
}
