package process

import (
	"context"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/simulation"
)

type SimulationProvider interface {
	Status(ctx context.Context) (simulation.Status, error)
	LatestTelemetry(ctx context.Context) (simulation.TelemetrySnapshot, error)
	ActiveAlarms(ctx context.Context) ([]simulation.Alarm, error)
}

type Service struct {
	simulation SimulationProvider
}

func NewService(simulation SimulationProvider) *Service {
	return &Service{simulation: simulation}
}

func (s *Service) Topology(ctx context.Context) ProcessTopologyResponse {
	generatedAt := time.Now().UTC()
	status, statusErr := s.simulation.Status(ctx)
	snapshot, snapshotErr := s.simulation.LatestTelemetry(ctx)
	alarms, alarmsErr := s.simulation.ActiveAlarms(ctx)
	connected := statusErr == nil && snapshotErr == nil && alarmsErr == nil

	if status.Mode == "" {
		status.Mode = "UNKNOWN"
	}
	if status.Health == "" {
		status.Health = "UNKNOWN"
	}
	if snapshot.Timestamp.IsZero() {
		snapshot.Timestamp = generatedAt
		snapshot.Mode = status.Mode
		snapshot.Health = status.Health
	}
	if !connected {
		status.Mode = "OFFLINE"
		status.Health = "DEGRADED"
		alarms = nil
	}

	return mapTopology(mapperInput{
		Snapshot:            snapshot,
		Alarms:              alarms,
		Status:              status,
		SimulationConnected: connected,
		GeneratedAt:         generatedAt,
	})
}
