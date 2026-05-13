package model

import "time"

type EventType string

const (
	EventTypeCommandReceived        EventType = "COMMAND_RECEIVED"
	EventTypeCommandAccepted        EventType = "COMMAND_ACCEPTED"
	EventTypeCommandRejected        EventType = "COMMAND_REJECTED"
	EventTypeCommandStarted         EventType = "COMMAND_STARTED"
	EventTypeCommandCompleted       EventType = "COMMAND_COMPLETED"
	EventTypeCommandFailed          EventType = "COMMAND_FAILED"
	EventTypeEquipmentStateChanged  EventType = "EQUIPMENT_STATE_CHANGED"
	EventTypeAlarmActivated         EventType = "ALARM_ACTIVATED"
	EventTypeAlarmAcknowledged      EventType = "ALARM_ACKNOWLEDGED"
	EventTypeAlarmCleared           EventType = "ALARM_CLEARED"
	EventTypeSystemStatusChanged    EventType = "SYSTEM_STATUS_CHANGED"
	EventTypeSimulationStateUpdated EventType = "SIMULATION_STATE_UPDATED"
	EventTypeScenarioStarted        EventType = "SCENARIO_STARTED"
	EventTypeScenarioCompleted      EventType = "SCENARIO_COMPLETED"
)

type EventSeverity string

const (
	EventSeverityInfo     EventSeverity = "INFO"
	EventSeverityWarning  EventSeverity = "WARNING"
	EventSeverityError    EventSeverity = "ERROR"
	EventSeverityCritical EventSeverity = "CRITICAL"
)

type Event struct {
	ID        string            `json:"id"`
	Type      EventType         `json:"type"`
	Source    string            `json:"source"`
	Severity  EventSeverity     `json:"severity"`
	Message   string            `json:"message"`
	TargetTag string            `json:"targetTag,omitempty"`
	CommandID string            `json:"commandId,omitempty"`
	AlarmID   string            `json:"alarmId,omitempty"`
	Timestamp time.Time         `json:"timestamp"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}
