package historian

import (
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func DisabledStatus(cfg Config) model.HistorianStatus {
	return model.HistorianStatus{
		Enabled:           false,
		Mode:              model.HistorianModeInMemory,
		Status:            model.HistorianStatusDisabled,
		Database:          model.HistorianStorageInMemory,
		WriteIntervalMS:   cfg.WriteIntervalMS(),
		TelemetrySampleMS: cfg.TelemetrySampleMS(),
		FallbackActive:    true,
		SimulationOnly:    true,
		SafetyDisclaimer:  model.HistorianSimulationOnlyDataStatement,
	}
}

func UnavailableStatus(cfg Config, message string, at time.Time) model.HistorianStatus {
	return model.HistorianStatus{
		Enabled:           cfg.Enabled,
		Mode:              model.HistorianModeInMemory,
		Status:            model.HistorianStatusUnavailableFallback,
		Database:          model.HistorianStoragePostgresTimescale,
		WriteIntervalMS:   cfg.WriteIntervalMS(),
		TelemetrySampleMS: cfg.TelemetrySampleMS(),
		LastErrorAt:       &at,
		LastErrorMessage:  message,
		FallbackActive:    true,
		SimulationOnly:    true,
		SafetyDisclaimer:  model.HistorianSimulationOnlyDataStatement,
	}
}
