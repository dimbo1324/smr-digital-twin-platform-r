package telemetry

import "context"

type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) Latest(ctx context.Context) ([]TelemetryPoint, error) {
	return s.repository.Latest(ctx)
}
