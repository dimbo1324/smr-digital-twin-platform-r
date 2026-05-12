package model

import "time"

type AssetStatus string

const (
	AssetStatusOK      AssetStatus = "OK"
	AssetStatusWarning AssetStatus = "WARNING"
	AssetStatusAlarm   AssetStatus = "ALARM"
	AssetStatusOffline AssetStatus = "OFFLINE"
)

type AssetMetric struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type Asset struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Type        string        `json:"type"`
	SafetyClass string        `json:"safetyClass"`
	Status      AssetStatus   `json:"status"`
	KeyMetrics  []AssetMetric `json:"keyMetrics"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}
