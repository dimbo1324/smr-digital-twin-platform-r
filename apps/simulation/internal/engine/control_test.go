package engine

import (
	"errors"
	"testing"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestDefaultControlModeIsManual(t *testing.T) {
	engine := newTestEngine()

	status := engine.ControlStatus()
	if status.Mode != model.ControlModeManual {
		t.Fatalf("expected MANUAL mode, got %s", status.Mode)
	}
	if status.Authority != model.ControlAuthorityUser {
		t.Fatalf("expected USER authority, got %s", status.Authority)
	}
	if engine.Snapshot().PIDControllerMode != string(model.ControlModeManual) {
		t.Fatalf("expected TIC-101.MODE MANUAL, got %s", engine.Snapshot().PIDControllerMode)
	}
}

func TestSetControlModeAutoAndDisabled(t *testing.T) {
	engine := newTestEngine()

	auto, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeAuto, RequestedBy: "operator", Reason: "test auto"})
	if err != nil {
		t.Fatalf("set auto: %v", err)
	}
	if auto.Mode != model.ControlModeAuto || auto.Authority != model.ControlAuthorityPID {
		t.Fatalf("expected AUTO/PID, got %s/%s", auto.Mode, auto.Authority)
	}
	if engine.Snapshot().PIDControllerMode != string(model.ControlModeAuto) {
		t.Fatalf("expected AUTO telemetry, got %s", engine.Snapshot().PIDControllerMode)
	}

	disabled, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeDisabled})
	if err != nil {
		t.Fatalf("set disabled: %v", err)
	}
	if disabled.Mode != model.ControlModeDisabled || disabled.Authority != model.ControlAuthorityNone {
		t.Fatalf("expected DISABLED/NONE, got %s/%s", disabled.Mode, disabled.Authority)
	}
}

func TestInvalidControlModeRejected(t *testing.T) {
	engine := newTestEngine()

	_, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlMode("REMOTE")})
	if err == nil {
		t.Fatal("expected invalid mode error")
	}
	var commandErr *CommandError
	if !errors.As(err, &commandErr) {
		t.Fatalf("expected CommandError, got %T", err)
	}
	if commandErr.Code != "INVALID_CONTROL_MODE" {
		t.Fatalf("expected INVALID_CONTROL_MODE, got %s", commandErr.Code)
	}
}

func TestValveUserCommandRejectedInAutoAndDisabled(t *testing.T) {
	engine := newTestEngine()

	if _, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeAuto}); err != nil {
		t.Fatalf("set auto: %v", err)
	}
	request := commandRequest("V-101", model.CommandTypeSetPosition)
	position := 75.0
	request.Payload.PositionPercent = &position
	command, err := engine.SubmitCommand(request)
	if err == nil {
		t.Fatal("expected AUTO arbitration rejection")
	}
	if command.Status != model.CommandStatusRejected {
		t.Fatalf("expected rejected command, got %s", command.Status)
	}
	if command.RejectReason != string(model.CommandRejectControlModeAuto) {
		t.Fatalf("expected CONTROL_MODE_AUTO, got %s", command.RejectReason)
	}
	if !hasEventType(engine.RecentEvents(), model.EventTypeCommandRejectedByArbitration) {
		t.Fatal("expected COMMAND_REJECTED_BY_ARBITRATION event")
	}

	if _, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeDisabled}); err != nil {
		t.Fatalf("set disabled: %v", err)
	}
	command, err = engine.SubmitCommand(commandRequest("V-101", model.CommandTypeOpen))
	if err == nil {
		t.Fatal("expected DISABLED arbitration rejection")
	}
	if command.RejectReason != string(model.CommandRejectControlDisabled) {
		t.Fatalf("expected CONTROL_DISABLED, got %s", command.RejectReason)
	}
}

func TestPumpCommandAllowedWhenValveControlAuto(t *testing.T) {
	engine := newTestEngine()
	if _, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeAuto}); err != nil {
		t.Fatalf("set auto: %v", err)
	}

	command, err := engine.SubmitCommand(commandRequest("P-101", model.CommandTypeStop))
	if err != nil {
		t.Fatalf("expected pump command allowed, got %v", err)
	}
	if command.Status != model.CommandStatusInProgress {
		t.Fatalf("expected pump command in progress, got %s", command.Status)
	}
}

func TestControlModeChangeCreatesEvents(t *testing.T) {
	engine := newTestEngine()
	if _, err := engine.SetControlMode(model.ModeChangeRequest{Mode: model.ControlModeAuto}); err != nil {
		t.Fatalf("set auto: %v", err)
	}
	events := engine.RecentEvents()
	if !hasEventType(events, model.EventTypeControlModeChanged) {
		t.Fatal("expected CONTROL_MODE_CHANGED event")
	}
	if !hasEventType(events, model.EventTypeControlAuthorityChanged) {
		t.Fatal("expected CONTROL_AUTHORITY_CHANGED event")
	}
}

func hasEventType(events []model.Event, eventType model.EventType) bool {
	for _, event := range events {
		if event.Type == eventType {
			return true
		}
	}
	return false
}
