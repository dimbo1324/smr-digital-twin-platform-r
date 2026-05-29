package model

import "time"

type HistorianStatusValue string

const (
	HistorianStatusDisabled              HistorianStatusValue = "disabled"
	HistorianStatusConnected             HistorianStatusValue = "connected"
	HistorianStatusDegraded              HistorianStatusValue = "degraded"
	HistorianStatusUnavailableFallback   HistorianStatusValue = "unavailable_fallback"
	HistorianModeInMemory                string               = "in_memory"
	HistorianModePersistent              string               = "persistent"
	HistorianStoragePostgresTimescale    string               = "postgresql/timescaledb"
	HistorianStorageInMemory             string               = "in_memory"
	HistorianSimulationOnlyDataStatement string               = "The historian stores synthetic simulation data for demo, learning and portfolio purposes only."
)

type HistorianStatus struct {
	Enabled               bool                 `json:"enabled"`
	Mode                  string               `json:"mode"`
	Status                HistorianStatusValue `json:"status"`
	Database              string               `json:"database"`
	WriteIntervalMS       int                  `json:"writeIntervalMs"`
	TelemetrySampleMS     int                  `json:"telemetrySampleMs"`
	LastSuccessfulWriteAt *time.Time           `json:"lastSuccessfulWriteAt,omitempty"`
	LastErrorAt           *time.Time           `json:"lastErrorAt,omitempty"`
	LastErrorMessage      string               `json:"lastErrorMessage,omitempty"`
	FallbackActive        bool                 `json:"fallbackActive"`
	RetentionEnabled      bool                 `json:"retentionEnabled"`
	RawRetention          string               `json:"rawRetention,omitempty"`
	DownsamplingEnabled   bool                 `json:"downsamplingEnabled"`
	SupportedResolutions  []string             `json:"supportedResolutions,omitempty"`
	AggregateStatus       string               `json:"aggregateStatus,omitempty"`
	SimulationOnly        bool                 `json:"simulationOnly"`
	SafetyDisclaimer      string               `json:"safetyDisclaimer"`
}
