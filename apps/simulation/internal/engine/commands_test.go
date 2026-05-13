package engine

import (
	"testing"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestValveOpenCommandTransitionsToOpen(t *testing.T) {
	engine := newTestEngine()

	command, err := engine.SubmitCommand(commandRequest("V-101", model.CommandTypeOpen))
	if err != nil {
		t.Fatalf("submit command: %v", err)
	}
	if command.Status != model.CommandStatusInProgress {
		t.Fatalf("expected command in progress, got %s", command.Status)
	}

	tickMany(engine, 3)
	snapshot := engine.Snapshot()
	if snapshot.ValveState != string(model.ValveStateOpen) {
		t.Fatalf("expected valve OPEN, got %s", snapshot.ValveState)
	}
	if snapshot.ValvePositionPct != 100 {
		t.Fatalf("expected valve at 100, got %f", snapshot.ValvePositionPct)
	}
	if latestCommand(engine, command.ID).Status != model.CommandStatusCompleted {
		t.Fatalf("expected command completed, got %s", latestCommand(engine, command.ID).Status)
	}
}

func TestValveCloseCommandTransitionsToClosed(t *testing.T) {
	engine := newTestEngine()

	command, err := engine.SubmitCommand(commandRequest("V-101", model.CommandTypeClose))
	if err != nil {
		t.Fatalf("submit command: %v", err)
	}

	tickMany(engine, 5)
	snapshot := engine.Snapshot()
	if snapshot.ValveState != string(model.ValveStateClosed) {
		t.Fatalf("expected valve CLOSED, got %s", snapshot.ValveState)
	}
	if snapshot.ValvePositionPct != 0 {
		t.Fatalf("expected valve at 0, got %f", snapshot.ValvePositionPct)
	}
	if latestCommand(engine, command.ID).Status != model.CommandStatusCompleted {
		t.Fatalf("expected command completed")
	}
}

func TestValveStopStopsMovement(t *testing.T) {
	engine := newTestEngine()
	if _, err := engine.SubmitCommand(commandRequest("V-101", model.CommandTypeOpen)); err != nil {
		t.Fatalf("submit open: %v", err)
	}
	tickMany(engine, 1)

	stopCommand, err := engine.SubmitCommand(commandRequest("V-101", model.CommandTypeStop))
	if err != nil {
		t.Fatalf("submit stop: %v", err)
	}
	position := engine.Snapshot().ValvePositionPct
	tickMany(engine, 3)

	snapshot := engine.Snapshot()
	if snapshot.ValveState != string(model.ValveStateStopped) {
		t.Fatalf("expected valve STOPPED, got %s", snapshot.ValveState)
	}
	if snapshot.ValvePositionPct != position {
		t.Fatalf("expected stopped position %f, got %f", position, snapshot.ValvePositionPct)
	}
	if latestCommand(engine, stopCommand.ID).Status != model.CommandStatusCompleted {
		t.Fatalf("expected stop command completed")
	}
}

func TestValveSetPositionValidatesRange(t *testing.T) {
	engine := newTestEngine()
	position := 75.0
	request := commandRequest("V-101", model.CommandTypeSetPosition)
	request.Payload.PositionPercent = &position

	command, err := engine.SubmitCommand(request)
	if err != nil {
		t.Fatalf("submit set position: %v", err)
	}
	tickMany(engine, 2)
	if engine.Snapshot().ValvePositionPct != 75 {
		t.Fatalf("expected valve at 75, got %f", engine.Snapshot().ValvePositionPct)
	}
	if latestCommand(engine, command.ID).Status != model.CommandStatusCompleted {
		t.Fatalf("expected set position command completed")
	}

	invalid := -1.0
	request.Payload.PositionPercent = &invalid
	rejected, err := engine.SubmitCommand(request)
	if err == nil {
		t.Fatal("expected invalid position error")
	}
	if rejected.Status != model.CommandStatusRejected {
		t.Fatalf("expected rejected command, got %s", rejected.Status)
	}
}

func TestPumpStartStopTransitionsAndAffectsFlow(t *testing.T) {
	engine := newTestEngine()

	stopCommand, err := engine.SubmitCommand(commandRequest("P-101", model.CommandTypeStop))
	if err != nil {
		t.Fatalf("submit stop: %v", err)
	}
	tickMany(engine, 3)
	stopped := engine.Snapshot()
	if stopped.PumpState != string(model.PumpStateStopped) {
		t.Fatalf("expected pump STOPPED, got %s", stopped.PumpState)
	}
	if latestCommand(engine, stopCommand.ID).Status != model.CommandStatusCompleted {
		t.Fatalf("expected stop completed")
	}
	lowFlow := stopped.LoopFlowKGS

	startCommand, err := engine.SubmitCommand(commandRequest("P-101", model.CommandTypeStart))
	if err != nil {
		t.Fatalf("submit start: %v", err)
	}
	tickMany(engine, 3)
	running := engine.Snapshot()
	if running.PumpState != string(model.PumpStateRunning) {
		t.Fatalf("expected pump RUNNING, got %s", running.PumpState)
	}
	if running.PumpRPM != pumpNominalRPM {
		t.Fatalf("expected nominal rpm, got %f", running.PumpRPM)
	}
	if running.LoopFlowKGS <= lowFlow {
		t.Fatalf("expected flow to increase after pump start: stopped=%f running=%f", lowFlow, running.LoopFlowKGS)
	}
	if latestCommand(engine, startCommand.ID).Status != model.CommandStatusCompleted {
		t.Fatalf("expected start completed")
	}
}

func TestUnsupportedCommandRejectedAndCreatesEvent(t *testing.T) {
	engine := newTestEngine()

	command, err := engine.SubmitCommand(commandRequest("V-101", model.CommandTypeStart))
	if err == nil {
		t.Fatal("expected unsupported command error")
	}
	if command.Status != model.CommandStatusRejected {
		t.Fatalf("expected rejected command, got %s", command.Status)
	}
	if len(engine.RecentEvents()) == 0 {
		t.Fatal("expected command event")
	}
}

func commandRequest(target string, commandType model.CommandType) model.CommandRequest {
	return model.CommandRequest{
		TargetTag:   target,
		CommandType: commandType,
		Source:      model.CommandSourceFrontend,
		RequestedBy: "test-engineer",
		Payload: model.CommandPayload{
			Reason: "test",
		},
	}
}

func latestCommand(engine *Engine, id string) model.Command {
	for _, command := range engine.RecentCommands() {
		if command.ID == id {
			return command
		}
	}
	return model.Command{}
}
