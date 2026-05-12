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
	ID        string        `json:"id"`
	AssetID   string        `json:"assetId"`
	Code      string        `json:"code"`
	Title     string        `json:"title"`
	Message   string        `json:"message"`
	Severity  AlarmSeverity `json:"severity"`
	Status    AlarmStatus   `json:"status"`
	Value     float64       `json:"value"`
	Threshold float64       `json:"threshold"`
	Unit      string        `json:"unit"`
	StartedAt time.Time     `json:"startedAt"`
	UpdatedAt time.Time     `json:"updatedAt"`
	ClearedAt *time.Time    `json:"clearedAt,omitempty"`
}
