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
	Tag         string        `json:"tag"`
	Name        string        `json:"name"`
	Type        string        `json:"type"`
	Area        string        `json:"area"`
	Unit        string        `json:"unit"`
	SafetyClass string        `json:"safetyClass"`
	Status      AssetStatus   `json:"status"`
	Description string        `json:"description"`
	KeyMetrics  []AssetMetric `json:"keyMetrics"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}
