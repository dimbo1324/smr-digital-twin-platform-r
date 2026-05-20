package engine

import (
	"context"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestHistorianStatusDisabledFallback(t *testing.T) {
	status := model.HistorianStatus{
		Enabled:           false,
		Mode:              model.HistorianModeInMemory,
		Status:            model.HistorianStatusDisabled,
		Database:          model.HistorianStorageInMemory,
		FallbackActive:    true,
		SimulationOnly:    true,
		SafetyDisclaimer:  model.HistorianSimulationOnlyDataStatement,
		WriteIntervalMS:   1000,
		TelemetrySampleMS: 1000,
	}
	engine := New(Config{HistorianStatus: status}, slog.Default())
	got := engine.HistorianStatus()
	if got.Status != model.HistorianStatusDisabled {
		t.Fatalf("expected disabled historian, got %s", got.Status)
	}
	if !got.FallbackActive {
		t.Fatal("expected in-memory fallback active")
	}
}

func TestHistorianReceivesCommandAndEventWrites(t *testing.T) {
	repo := &fakeHistorianRepository{status: model.HistorianStatus{Enabled: true, Mode: model.HistorianModePersistent, Status: model.HistorianStatusConnected}}
	engine := New(Config{Historian: repo, HistorianOperationTimeout: time.Second}, slog.Default())

	_, err := engine.SubmitCommand(model.CommandRequest{
		TargetTag:   "P-101",
		CommandType: model.CommandTypeStop,
		Source:      model.CommandSourceFrontend,
		RequestedBy: "test",
	})
	if err != nil {
		t.Fatalf("submit command: %v", err)
	}

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if atomic.LoadInt64(&repo.commandWrites) > 0 && atomic.LoadInt64(&repo.eventWrites) > 0 {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("expected historian command/event writes, got commands=%d events=%d", atomic.LoadInt64(&repo.commandWrites), atomic.LoadInt64(&repo.eventWrites))
}

type fakeHistorianRepository struct {
	status        model.HistorianStatus
	commandWrites int64
	eventWrites   int64
}

func (f *fakeHistorianRepository) AppendTelemetrySnapshot(context.Context, model.TelemetrySnapshot) error {
	return nil
}

func (f *fakeHistorianRepository) QueryTelemetryHistory(context.Context, time.Duration, time.Time) ([]model.TelemetrySnapshot, error) {
	return nil, nil
}

func (f *fakeHistorianRepository) SaveCommand(_ context.Context, _ model.Command) error {
	atomic.AddInt64(&f.commandWrites, 1)
	return nil
}

func (f *fakeHistorianRepository) ListRecentCommands(context.Context, int) ([]model.Command, error) {
	return nil, nil
}

func (f *fakeHistorianRepository) SaveEvent(_ context.Context, _ model.Event) error {
	atomic.AddInt64(&f.eventWrites, 1)
	return nil
}

func (f *fakeHistorianRepository) ListRecentEvents(context.Context, int) ([]model.Event, error) {
	return nil, nil
}

func (f *fakeHistorianRepository) SaveAlarm(context.Context, model.Alarm) error {
	return nil
}

func (f *fakeHistorianRepository) ListAlarmHistory(context.Context, int) ([]model.Alarm, error) {
	return nil, nil
}

func (f *fakeHistorianRepository) Status() model.HistorianStatus {
	return f.status
}

func (f *fakeHistorianRepository) Close() {}
