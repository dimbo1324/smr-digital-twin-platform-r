package mqtt

import (
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

type Envelope struct {
	SchemaVersion  string    `json:"schemaVersion"`
	PublishedAt    time.Time `json:"publishedAt"`
	Source         string    `json:"source"`
	SimulationOnly bool      `json:"simulationOnly"`
	SiteID         string    `json:"siteId"`
	UnitID         string    `json:"unitId"`
	TopicType      string    `json:"topicType"`
	Data           any       `json:"data"`
}

type telemetryTagPayload struct {
	Tag       string    `json:"tag"`
	Value     any       `json:"value"`
	Unit      string    `json:"unit,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

func envelope(cfg Config, topicType string, data any, now time.Time) Envelope {
	return Envelope{
		SchemaVersion:  "1.0",
		PublishedAt:    now,
		Source:         "simulation",
		SimulationOnly: true,
		SiteID:         cfg.SiteID,
		UnitID:         cfg.UnitID,
		TopicType:      topicType,
		Data:           data,
	}
}

func activeAlarmsPayload(alarms []model.Alarm) map[string]any {
	return map[string]any{"alarms": alarms}
}

func telemetryTagPayloads(snapshot model.TelemetrySnapshot) []telemetryTagPayload {
	timestamp := snapshot.Timestamp
	return []telemetryTagPayload{
		{Tag: "TT-101", Value: snapshot.LoopTemperatureC, Unit: "C", Timestamp: timestamp},
		{Tag: "FT-101", Value: snapshot.LoopFlowKGS, Unit: "kg/s", Timestamp: timestamp},
		{Tag: "PT-101", Value: snapshot.LoopPressureMPa, Unit: "MPa", Timestamp: timestamp},
		{Tag: "V-101.POS", Value: snapshot.ValvePositionPct, Unit: "%", Timestamp: timestamp},
		{Tag: "P-101.RPM", Value: snapshot.PumpRPM, Unit: "rpm", Timestamp: timestamp},
		{Tag: "TIC-101.MODE", Value: snapshot.PIDControllerMode, Timestamp: timestamp},
		{Tag: "TIC-101.OUTPUT", Value: snapshot.PIDOutputPct, Unit: "%", Timestamp: timestamp},
	}
}
