package historian

import (
	"context"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

type Repository interface {
	AppendTelemetrySnapshot(ctx context.Context, snapshot model.TelemetrySnapshot) error
	QueryTelemetryHistory(ctx context.Context, window time.Duration, fallbackNow time.Time) ([]model.TelemetrySnapshot, error)
	SaveCommand(ctx context.Context, command model.Command) error
	ListRecentCommands(ctx context.Context, limit int) ([]model.Command, error)
	SaveEvent(ctx context.Context, event model.Event) error
	ListRecentEvents(ctx context.Context, limit int) ([]model.Event, error)
	SaveAlarm(ctx context.Context, alarm model.Alarm) error
	ListAlarmHistory(ctx context.Context, limit int) ([]model.Alarm, error)
	Status() model.HistorianStatus
	Close()
}
