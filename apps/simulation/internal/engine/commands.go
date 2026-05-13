package engine

import (
	"fmt"
	"net/http"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

const (
	maxCommandHistory    = 100
	maxEventHistory      = 200
	valveSpeedPctPerSec  = 20.0
	pumpNominalRPM       = 1800.0
	pumpTransitionDelay  = 2 * time.Second
	commandAcceptedText  = "Command accepted by simulation engine"
	commandCompletedText = "Command completed in simulation state"
)

type CommandError struct {
	Code       string
	Message    string
	HTTPStatus int
}

func (e *CommandError) Error() string {
	return e.Message
}

func (e *Engine) SubmitCommand(request model.CommandRequest) (model.Command, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now().UTC()
	request = normalizeCommandRequest(request)
	command := e.newCommandLocked(request, now)
	e.appendCommandLocked(command)
	e.appendEventLocked(model.EventTypeCommandReceived, model.EventSeverityInfo, "simulation", "Simulation command received.", command.TargetTag, command.ID, now, nil)

	if commandErr := e.validateCommandLocked(command); commandErr != nil {
		command.Status = model.CommandStatusRejected
		command.RejectedAt = &now
		command.ErrorCode = commandErr.Code
		command.ErrorMessage = commandErr.Message
		command.ResultMessage = "Command rejected by simulation engine"
		e.replaceCommandLocked(command)
		e.appendEventLocked(model.EventTypeCommandRejected, model.EventSeverityWarning, "simulation", commandErr.Message, command.TargetTag, command.ID, now, nil)
		return command, commandErr
	}

	acceptedAt := now
	command.AcceptedAt = &acceptedAt
	command.Status = model.CommandStatusAccepted
	command.ResultMessage = commandAcceptedText
	e.replaceCommandLocked(command)
	e.appendEventLocked(model.EventTypeCommandAccepted, model.EventSeverityInfo, "simulation", commandAcceptedText, command.TargetTag, command.ID, now, nil)

	switch command.TargetTag {
	case "V-101":
		command = e.applyValveCommandLocked(command, now)
	case "P-101":
		command = e.applyPumpCommandLocked(command, now)
	}

	e.replaceCommandLocked(command)
	if command.Status == model.CommandStatusRejected {
		return command, commandError(command.ErrorCode, command.ErrorMessage, http.StatusConflict)
	}
	return command, nil
}

func (e *Engine) RecentCommands() []model.Command {
	e.mu.RLock()
	defer e.mu.RUnlock()

	commands := make([]model.Command, len(e.state.commands))
	copy(commands, e.state.commands)
	return commands
}

func (e *Engine) RecentEvents() []model.Event {
	e.mu.RLock()
	defer e.mu.RUnlock()

	events := make([]model.Event, len(e.state.events))
	copy(events, e.state.events)
	return events
}

func normalizeCommandRequest(request model.CommandRequest) model.CommandRequest {
	if request.Source == "" {
		request.Source = model.CommandSourceAPI
	}
	if request.RequestedBy == "" {
		request.RequestedBy = "simulation-api"
	}
	return request
}

func (e *Engine) newCommandLocked(request model.CommandRequest, now time.Time) model.Command {
	e.state.commandSeq++
	return model.Command{
		ID:            fmt.Sprintf("cmd-%d", e.state.commandSeq),
		TargetTag:     request.TargetTag,
		CommandType:   request.CommandType,
		Source:        request.Source,
		RequestedBy:   request.RequestedBy,
		Payload:       request.Payload,
		Status:        model.CommandStatusReceived,
		RequestedAt:   now,
		CorrelationID: request.CorrelationID,
	}
}

func (e *Engine) validateCommandLocked(command model.Command) *CommandError {
	switch command.TargetTag {
	case "V-101":
		return validateValveCommand(command)
	case "P-101":
		return validatePumpCommand(command)
	default:
		return commandError("INVALID_TARGET", "Unsupported simulation command target "+command.TargetTag, http.StatusUnprocessableEntity)
	}
}

func validateValveCommand(command model.Command) *CommandError {
	switch command.CommandType {
	case model.CommandTypeOpen, model.CommandTypeClose, model.CommandTypeStop:
		return nil
	case model.CommandTypeSetPosition:
		if command.Payload.PositionPercent == nil {
			return commandError("INVALID_PAYLOAD", "positionPercent is required for SET_POSITION", http.StatusBadRequest)
		}
		position := *command.Payload.PositionPercent
		if position < 0 || position > 100 {
			return commandError("INVALID_PAYLOAD", "positionPercent must be between 0 and 100", http.StatusBadRequest)
		}
		return nil
	default:
		return commandError("INVALID_COMMAND", fmt.Sprintf("Unsupported command type %s for target V-101", command.CommandType), http.StatusUnprocessableEntity)
	}
}

func validatePumpCommand(command model.Command) *CommandError {
	switch command.CommandType {
	case model.CommandTypeStart, model.CommandTypeStop:
		return nil
	default:
		return commandError("INVALID_COMMAND", fmt.Sprintf("Unsupported command type %s for target P-101", command.CommandType), http.StatusUnprocessableEntity)
	}
}

func commandError(code, message string, status int) *CommandError {
	return &CommandError{Code: code, Message: message, HTTPStatus: status}
}

func (e *Engine) applyValveCommandLocked(command model.Command, now time.Time) model.Command {
	switch command.CommandType {
	case model.CommandTypeOpen:
		if e.state.valve.state == model.ValveStateOpen {
			return e.rejectAcceptedCommandLocked(command, now, "INVALID_STATE", "Valve V-101 is already OPEN")
		}
		e.supersedeValveCommandLocked(command.ID, now, "Superseded by OPEN command")
		e.state.valve.targetPositionPercent = 100
		e.state.valve.state = model.ValveStateOpening
		e.state.valve.activeCommandID = command.ID
		e.state.valve.lastCommandID = command.ID
		e.state.valve.updatedAt = now
		command.Status = model.CommandStatusInProgress
		command.ResultMessage = "Valve V-101 opening in simulation"
		e.appendEventLocked(model.EventTypeCommandStarted, model.EventSeverityInfo, "simulation", command.ResultMessage, command.TargetTag, command.ID, now, nil)
		e.appendEquipmentEventLocked("Valve V-101 state changed to OPENING.", command.TargetTag, command.ID, now)
	case model.CommandTypeClose:
		if e.state.valve.state == model.ValveStateClosed {
			return e.rejectAcceptedCommandLocked(command, now, "INVALID_STATE", "Valve V-101 is already CLOSED")
		}
		e.supersedeValveCommandLocked(command.ID, now, "Superseded by CLOSE command")
		e.state.valve.targetPositionPercent = 0
		e.state.valve.state = model.ValveStateClosing
		e.state.valve.activeCommandID = command.ID
		e.state.valve.lastCommandID = command.ID
		e.state.valve.updatedAt = now
		command.Status = model.CommandStatusInProgress
		command.ResultMessage = "Valve V-101 closing in simulation"
		e.appendEventLocked(model.EventTypeCommandStarted, model.EventSeverityInfo, "simulation", command.ResultMessage, command.TargetTag, command.ID, now, nil)
		e.appendEquipmentEventLocked("Valve V-101 state changed to CLOSING.", command.TargetTag, command.ID, now)
	case model.CommandTypeStop:
		if !valveIsMoving(e.state.valve.state) {
			return e.rejectAcceptedCommandLocked(command, now, "INVALID_STATE", "Valve V-101 is not moving")
		}
		e.supersedeValveCommandLocked(command.ID, now, "Interrupted by STOP command")
		e.state.valve.targetPositionPercent = e.state.valve.positionPercent
		e.state.valve.state = model.ValveStateStopped
		e.state.valve.activeCommandID = ""
		e.state.valve.lastCommandID = command.ID
		e.state.valve.updatedAt = now
		command = completeCommand(command, now, "Valve V-101 stopped in simulation")
		e.appendEventLocked(model.EventTypeCommandCompleted, model.EventSeverityInfo, "simulation", command.ResultMessage, command.TargetTag, command.ID, now, nil)
		e.appendEquipmentEventLocked("Valve V-101 state changed to STOPPED.", command.TargetTag, command.ID, now)
	case model.CommandTypeSetPosition:
		position := *command.Payload.PositionPercent
		e.supersedeValveCommandLocked(command.ID, now, "Superseded by SET_POSITION command")
		e.state.valve.targetPositionPercent = position
		e.state.valve.lastCommandID = command.ID
		e.state.valve.updatedAt = now
		if almostEqual(e.state.valve.positionPercent, position) {
			e.state.valve.state = valveRestState(position)
			e.state.valve.activeCommandID = ""
			command = completeCommand(command, now, "Valve V-101 already at requested position")
			e.appendEventLocked(model.EventTypeCommandCompleted, model.EventSeverityInfo, "simulation", command.ResultMessage, command.TargetTag, command.ID, now, nil)
			e.appendEquipmentEventLocked("Valve V-101 position command completed.", command.TargetTag, command.ID, now)
			break
		}
		e.state.valve.state = model.ValveStateMovingToPosition
		e.state.valve.activeCommandID = command.ID
		command.Status = model.CommandStatusInProgress
		command.ResultMessage = fmt.Sprintf("Valve V-101 moving to %.1f%% in simulation", position)
		e.appendEventLocked(model.EventTypeCommandStarted, model.EventSeverityInfo, "simulation", command.ResultMessage, command.TargetTag, command.ID, now, nil)
		e.appendEquipmentEventLocked("Valve V-101 state changed to MOVING_TO_POSITION.", command.TargetTag, command.ID, now)
	}
	return command
}

func (e *Engine) applyPumpCommandLocked(command model.Command, now time.Time) model.Command {
	switch command.CommandType {
	case model.CommandTypeStart:
		if e.state.pump.state != model.PumpStateStopped {
			return e.rejectAcceptedCommandLocked(command, now, "INVALID_STATE", "Pump P-101 can only START from STOPPED")
		}
		e.state.pump.state = model.PumpStateStarting
		e.state.pump.targetRPM = pumpNominalRPM
		e.state.pump.transitionUntil = now.Add(pumpTransitionDelay)
		e.state.pump.activeCommandID = command.ID
		e.state.pump.lastCommandID = command.ID
		e.state.pump.updatedAt = now
		command.Status = model.CommandStatusInProgress
		command.ResultMessage = "Pump P-101 starting in simulation"
		e.appendEventLocked(model.EventTypeCommandStarted, model.EventSeverityInfo, "simulation", command.ResultMessage, command.TargetTag, command.ID, now, nil)
		e.appendEquipmentEventLocked("Pump P-101 state changed to STARTING.", command.TargetTag, command.ID, now)
	case model.CommandTypeStop:
		if e.state.pump.state == model.PumpStateStopped {
			return e.rejectAcceptedCommandLocked(command, now, "INVALID_STATE", "Pump P-101 is already STOPPED")
		}
		e.supersedePumpCommandLocked(command.ID, now, "Interrupted by STOP command")
		e.state.pump.state = model.PumpStateStopping
		e.state.pump.targetRPM = 0
		e.state.pump.transitionUntil = now.Add(pumpTransitionDelay)
		e.state.pump.activeCommandID = command.ID
		e.state.pump.lastCommandID = command.ID
		e.state.pump.updatedAt = now
		command.Status = model.CommandStatusInProgress
		command.ResultMessage = "Pump P-101 stopping in simulation"
		e.appendEventLocked(model.EventTypeCommandStarted, model.EventSeverityInfo, "simulation", command.ResultMessage, command.TargetTag, command.ID, now, nil)
		e.appendEquipmentEventLocked("Pump P-101 state changed to STOPPING.", command.TargetTag, command.ID, now)
	}
	return command
}

func (e *Engine) rejectAcceptedCommandLocked(command model.Command, now time.Time, code, message string) model.Command {
	command.Status = model.CommandStatusRejected
	command.RejectedAt = &now
	command.ErrorCode = code
	command.ErrorMessage = message
	command.ResultMessage = "Command rejected by simulation engine"
	e.appendEventLocked(model.EventTypeCommandRejected, model.EventSeverityWarning, "simulation", message, command.TargetTag, command.ID, now, nil)
	return command
}

func (e *Engine) appendCommandLocked(command model.Command) {
	e.state.commands = append(e.state.commands, command)
	if len(e.state.commands) > maxCommandHistory {
		e.state.commands = e.state.commands[len(e.state.commands)-maxCommandHistory:]
	}
}

func (e *Engine) replaceCommandLocked(command model.Command) {
	for index := len(e.state.commands) - 1; index >= 0; index-- {
		if e.state.commands[index].ID == command.ID {
			e.state.commands[index] = command
			return
		}
	}
	e.appendCommandLocked(command)
}

func (e *Engine) updateCommandLocked(commandID string, update func(model.Command) model.Command) {
	for index := len(e.state.commands) - 1; index >= 0; index-- {
		if e.state.commands[index].ID == commandID {
			e.state.commands[index] = update(e.state.commands[index])
			return
		}
	}
}

func (e *Engine) appendEventLocked(eventType model.EventType, severity model.EventSeverity, source, message, targetTag, commandID string, timestamp time.Time, metadata map[string]string) {
	e.state.eventSeq++
	e.state.events = append(e.state.events, model.Event{
		ID:        fmt.Sprintf("evt-%d", e.state.eventSeq),
		Type:      eventType,
		Source:    source,
		Severity:  severity,
		Message:   message,
		TargetTag: targetTag,
		CommandID: commandID,
		Timestamp: timestamp,
		Metadata:  metadata,
	})
	if len(e.state.events) > maxEventHistory {
		e.state.events = e.state.events[len(e.state.events)-maxEventHistory:]
	}
}

func (e *Engine) appendEquipmentEventLocked(message, targetTag, commandID string, timestamp time.Time) {
	e.appendEventLocked(model.EventTypeEquipmentStateChanged, model.EventSeverityInfo, "simulation", message, targetTag, commandID, timestamp, nil)
}

func (e *Engine) supersedeValveCommandLocked(nextCommandID string, now time.Time, message string) {
	if e.state.valve.activeCommandID == "" || e.state.valve.activeCommandID == nextCommandID {
		return
	}
	e.failCommandLocked(e.state.valve.activeCommandID, now, "COMMAND_SUPERSEDED", message, e.state.valve.tag)
}

func (e *Engine) supersedePumpCommandLocked(nextCommandID string, now time.Time, message string) {
	if e.state.pump.activeCommandID == "" || e.state.pump.activeCommandID == nextCommandID {
		return
	}
	e.failCommandLocked(e.state.pump.activeCommandID, now, "COMMAND_SUPERSEDED", message, e.state.pump.tag)
}

func (e *Engine) failCommandLocked(commandID string, now time.Time, code, message, targetTag string) {
	e.updateCommandLocked(commandID, func(command model.Command) model.Command {
		if command.Status == model.CommandStatusCompleted || command.Status == model.CommandStatusRejected {
			return command
		}
		command.Status = model.CommandStatusFailed
		command.CompletedAt = &now
		command.ErrorCode = code
		command.ErrorMessage = message
		command.ResultMessage = message
		return command
	})
	e.appendEventLocked(model.EventTypeCommandFailed, model.EventSeverityWarning, "simulation", message, targetTag, commandID, now, nil)
}

func completeCommand(command model.Command, now time.Time, message string) model.Command {
	command.Status = model.CommandStatusCompleted
	command.CompletedAt = &now
	command.ResultMessage = message
	return command
}

func valveIsMoving(state model.ValveState) bool {
	return state == model.ValveStateOpening || state == model.ValveStateClosing || state == model.ValveStateMovingToPosition
}

func valveRestState(position float64) model.ValveState {
	switch {
	case position <= 0:
		return model.ValveStateClosed
	case position >= 100:
		return model.ValveStateOpen
	default:
		return model.ValveStateStopped
	}
}

func almostEqual(left, right float64) bool {
	if left > right {
		return left-right < 0.01
	}
	return right-left < 0.01
}
