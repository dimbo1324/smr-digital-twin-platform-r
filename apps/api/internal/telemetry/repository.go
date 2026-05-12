package telemetry

import "context"

type Repository interface {
	Latest(ctx context.Context) ([]TelemetryPoint, error)
}
