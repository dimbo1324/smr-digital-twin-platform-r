package telemetry

import "time"

type Quality string

const (
	QualityGood      Quality = "GOOD"
	QualityBad       Quality = "BAD"
	QualityUncertain Quality = "UNCERTAIN"
)

type TelemetryPoint struct {
	Tag       string    `json:"tag"`
	Name      string    `json:"name"`
	Value     *float64  `json:"value,omitempty"`
	ValueText *string   `json:"valueText,omitempty"`
	Unit      string    `json:"unit"`
	Quality   Quality   `json:"quality"`
	Timestamp time.Time `json:"timestamp"`
	Source    string    `json:"source"`
}
