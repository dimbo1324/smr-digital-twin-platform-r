package model

import "time"

type AlarmSeverity string

const (
	AlarmSeverityInfo     AlarmSeverity = "INFO"
	AlarmSeverityWarning  AlarmSeverity = "WARNING"
	AlarmSeverityHigh     AlarmSeverity = "HIGH"
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
	ID             string            `json:"id"`
	RuleID         string            `json:"ruleId"`
	AssetID        string            `json:"assetId"`
	Tag            string            `json:"tag"`
	Code           string            `json:"code"`
	Title          string            `json:"title"`
	Message        string            `json:"message"`
	Severity       AlarmSeverity     `json:"severity"`
	Status         AlarmStatus       `json:"status"`
	Value          float64           `json:"value"`
	LastValue      float64           `json:"lastValue"`
	Threshold      float64           `json:"threshold"`
	Unit           string            `json:"unit"`
	Source         string            `json:"source"`
	StartedAt      time.Time         `json:"startedAt"`
	ActiveAt       time.Time         `json:"activeAt"`
	UpdatedAt      time.Time         `json:"updatedAt"`
	AcknowledgedAt *time.Time        `json:"acknowledgedAt,omitempty"`
	AcknowledgedBy string            `json:"acknowledgedBy,omitempty"`
	ClearedAt      *time.Time        `json:"clearedAt,omitempty"`
	Metadata       map[string]string `json:"metadata,omitempty"`
}

type AlarmAcknowledgeRequest struct {
	AcknowledgedBy string `json:"acknowledgedBy,omitempty"`
	Comment        string `json:"comment,omitempty"`
}
