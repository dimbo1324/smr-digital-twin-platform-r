package system

import (
	"context"
	"time"
)

const safetyDisclaimer = "Simulation-only interface. No real plant control."

type Service struct {
	cfg ServiceConfig
}

func NewService(cfg ServiceConfig) *Service {
	return &Service{cfg: cfg}
}

func (s *Service) Status(_ context.Context) (Status, error) {
	latency := 0
	return Status{
		Platform:        "SMR Twin Platform",
		Mode:            "simulation_only",
		Environment:     s.cfg.Environment,
		ControlBoundary: "no_live_control",
		DataSource:      "mock",
		BackendAPI: ComponentStatus{
			Status:    "connected",
			LatencyMS: &latency,
		},
		MQTTBroker: ComponentStatus{
			Status: "not_connected",
		},
		SimulationService: ComponentStatus{
			Status: "not_connected",
		},
		Historian: ComponentStatus{
			Status: "not_connected",
		},
		SafetyDisclaimer: safetyDisclaimer,
		Version:          s.cfg.Version,
		Timestamp:        time.Now().UTC(),
	}, nil
}
