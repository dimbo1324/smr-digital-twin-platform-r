package model

import "time"

type AlarmSeverity string

const (
	AlarmSeverityInfo     AlarmSeverity = "INFO"
	AlarmSeverityWarning  AlarmSeverity = "WARNING"
	AlarmSeverityAlarm    AlarmSeverity = "ALARM"
	AlarmSeverityCritical AlarmSeverity = "CRITICAL"
)

type AlarmStatus string

const (
	AlarmStatusActive       AlarmStatus = "ACTIVE"
	AlarmStatusAcknowledged AlarmStatus = "ACKNOWLEDGED"
	AlarmStatusCleared      AlarmStatus = "CLEARED"
)

type Alarm struct {
	ID              string        `json:"id"`
	AssetID         string        `json:"assetId"`
	NodeID          string        `json:"nodeId,omitempty"`
	Code            string        `json:"code"`
	Title           string        `json:"title"`
	Message         string        `json:"message"`
	Severity        AlarmSeverity `json:"severity"`
	Status          AlarmStatus   `json:"status"`
	Value           float64       `json:"value"`
	Threshold       float64       `json:"threshold"`
	Unit            string        `json:"unit"`
	StartedAt       time.Time     `json:"startedAt"`
	UpdatedAt       time.Time     `json:"updatedAt"`
	AcknowledgedAt  *time.Time    `json:"acknowledgedAt,omitempty"`
	AcknowledgedBy  string        `json:"acknowledgedBy,omitempty"`
	AckNote         string        `json:"ackNote,omitempty"`
	ClearedAt       *time.Time    `json:"clearedAt,omitempty"`
	OccurrenceCount int           `json:"occurrenceCount"`
	SimulationOnly  bool          `json:"simulationOnly"`
}

type AlarmEventType string

const (
	AlarmEventRaised        AlarmEventType = "ALARM_RAISED"
	AlarmEventAcknowledged  AlarmEventType = "ALARM_ACKNOWLEDGED"
	AlarmEventCleared       AlarmEventType = "ALARM_CLEARED"
	AlarmEventReactivated   AlarmEventType = "ALARM_REACTIVATED"
	EventScenarioStarted    AlarmEventType = "SCENARIO_STARTED"
	EventScenarioStopped    AlarmEventType = "SCENARIO_STOPPED"
	EventSimulationReset    AlarmEventType = "SIMULATION_RESET"
	EventSimulationDegraded AlarmEventType = "SIMULATION_DEGRADED"
)

type AlarmEvent struct {
	ID             string         `json:"id"`
	AlarmID        string         `json:"alarmId,omitempty"`
	Type           AlarmEventType `json:"type"`
	AssetID        string         `json:"assetId,omitempty"`
	NodeID         string         `json:"nodeId,omitempty"`
	Code           string         `json:"code,omitempty"`
	Severity       AlarmSeverity  `json:"severity,omitempty"`
	Message        string         `json:"message"`
	CreatedAt      time.Time      `json:"createdAt"`
	Actor          string         `json:"actor,omitempty"`
	Note           string         `json:"note,omitempty"`
	Scenario       string         `json:"scenario,omitempty"`
	SimulationOnly bool           `json:"simulationOnly"`
	Metadata       map[string]any `json:"metadata,omitempty"`
}
