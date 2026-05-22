package engine

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"sync"
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
	defer engine.Stop(context.Background())

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

func TestValveCompletionPersistsAndPublishesFinalCommandStatus(t *testing.T) {
	repo := &fakeHistorianRepository{status: model.HistorianStatus{Enabled: true, Mode: model.HistorianModePersistent, Status: model.HistorianStatusConnected}}
	mqtt := &fakeMQTTPublisher{status: model.MQTTStatus{Enabled: true, Connected: true, Status: "connected"}}
	engine := New(Config{
		TickInterval:              10 * time.Millisecond,
		HistorySize:               32,
		Seed:                      42,
		Historian:                 repo,
		HistorianOperationTimeout: time.Second,
		MQTTPublisher:             mqtt,
	}, slog.Default())
	defer engine.Stop(context.Background())

	command, err := engine.SubmitCommand(commandRequest("V-101", model.CommandTypeOpen))
	if err != nil {
		t.Fatalf("submit command: %v", err)
	}

	tickMany(engine, 3)

	if got := latestCommand(engine, command.ID).Status; got != model.CommandStatusCompleted {
		t.Fatalf("expected in-memory command completed, got %s", got)
	}
	waitForSavedCommandStatus(t, repo, command.ID, model.CommandStatusCompleted)
	waitForPublishedCommandStatus(t, mqtt, command.ID, model.CommandStatusCompleted)

	completedBefore := countCommandEvents(engine.RecentEvents(), command.ID, model.EventTypeCommandCompleted)
	tickMany(engine, 3)
	completedAfter := countCommandEvents(engine.RecentEvents(), command.ID, model.EventTypeCommandCompleted)
	if completedBefore != 1 || completedAfter != completedBefore {
		t.Fatalf("expected one completion event, got before=%d after=%d", completedBefore, completedAfter)
	}
}

func TestPumpCompletionPersistsAndPublishesFinalCommandStatus(t *testing.T) {
	repo := &fakeHistorianRepository{status: model.HistorianStatus{Enabled: true, Mode: model.HistorianModePersistent, Status: model.HistorianStatusConnected}}
	mqtt := &fakeMQTTPublisher{status: model.MQTTStatus{Enabled: true, Connected: true, Status: "connected"}}
	engine := New(Config{
		TickInterval:              10 * time.Millisecond,
		HistorySize:               32,
		Seed:                      42,
		Historian:                 repo,
		HistorianOperationTimeout: time.Second,
		MQTTPublisher:             mqtt,
	}, slog.Default())
	defer engine.Stop(context.Background())

	command, err := engine.SubmitCommand(commandRequest("P-101", model.CommandTypeStop))
	if err != nil {
		t.Fatalf("submit command: %v", err)
	}

	tickMany(engine, 3)

	if got := latestCommand(engine, command.ID).Status; got != model.CommandStatusCompleted {
		t.Fatalf("expected in-memory command completed, got %s", got)
	}
	waitForSavedCommandStatus(t, repo, command.ID, model.CommandStatusCompleted)
	waitForPublishedCommandStatus(t, mqtt, command.ID, model.CommandStatusCompleted)

	completedBefore := countCommandEvents(engine.RecentEvents(), command.ID, model.EventTypeCommandCompleted)
	tickMany(engine, 3)
	completedAfter := countCommandEvents(engine.RecentEvents(), command.ID, model.EventTypeCommandCompleted)
	if completedBefore != 1 || completedAfter != completedBefore {
		t.Fatalf("expected one completion event, got before=%d after=%d", completedBefore, completedAfter)
	}
}

func TestHistoryWithSourceDistinguishesPersistentEmptyAndReadFailure(t *testing.T) {
	emptyRepo := &fakeHistorianRepository{status: model.HistorianStatus{Enabled: true, Mode: model.HistorianModePersistent, Status: model.HistorianStatusConnected}}
	emptyEngine := New(Config{Historian: emptyRepo, HistorianOperationTimeout: time.Second}, slog.Default())
	defer emptyEngine.Stop(context.Background())
	result := emptyEngine.HistoryWithSource(time.Minute)
	if result.Source != "persistent_connected_empty_memory_fallback" || result.Degraded {
		t.Fatalf("expected connected-empty fallback source without degraded flag, got source=%s degraded=%t", result.Source, result.Degraded)
	}

	failedRepo := &fakeHistorianRepository{
		status:   model.HistorianStatus{Enabled: true, Mode: model.HistorianModePersistent, Status: model.HistorianStatusDegraded},
		queryErr: errors.New("read failed"),
	}
	failedEngine := New(Config{Historian: failedRepo, HistorianOperationTimeout: time.Second}, slog.Default())
	defer failedEngine.Stop(context.Background())
	result = failedEngine.HistoryWithSource(time.Minute)
	if result.Source != "persistent_read_failed_in_memory_fallback" || !result.Degraded {
		t.Fatalf("expected read-failed fallback source with degraded flag, got source=%s degraded=%t", result.Source, result.Degraded)
	}
}

func TestHistorianWriterDropsWritesWhenQueueIsFull(t *testing.T) {
	block := make(chan struct{})
	repo := &fakeHistorianRepository{
		status:           model.HistorianStatus{Enabled: true, Mode: model.HistorianModePersistent, Status: model.HistorianStatusConnected},
		saveCommandBlock: block,
	}
	writer := newHistorianWriter(repo, time.Second, slog.New(slog.NewTextHandler(io.Discard, nil)))

	for index := 0; index < historianWriteQueueSize+3; index++ {
		writer.EnqueueCommand(model.Command{ID: fmt.Sprintf("cmd-%d", index)})
	}

	if writer.DroppedWrites() == 0 {
		t.Fatal("expected dropped writes when historian queue is full")
	}
	close(block)
	writer.Close()
}

type fakeHistorianRepository struct {
	status           model.HistorianStatus
	queryErr         error
	saveCommandBlock <-chan struct{}
	mu               sync.Mutex
	commands         []model.Command
	events           []model.Event
	commandWrites    int64
	eventWrites      int64
}

func (f *fakeHistorianRepository) AppendTelemetrySnapshot(context.Context, model.TelemetrySnapshot) error {
	return nil
}

func (f *fakeHistorianRepository) QueryTelemetryHistory(context.Context, time.Duration, time.Time) ([]model.TelemetrySnapshot, error) {
	if f.queryErr != nil {
		return nil, f.queryErr
	}
	return nil, nil
}

func (f *fakeHistorianRepository) SaveCommand(_ context.Context, command model.Command) error {
	if f.saveCommandBlock != nil {
		<-f.saveCommandBlock
	}
	f.mu.Lock()
	f.commands = append(f.commands, command)
	f.mu.Unlock()
	atomic.AddInt64(&f.commandWrites, 1)
	return nil
}

func (f *fakeHistorianRepository) ListRecentCommands(context.Context, int) ([]model.Command, error) {
	return nil, nil
}

func (f *fakeHistorianRepository) SaveEvent(_ context.Context, event model.Event) error {
	f.mu.Lock()
	f.events = append(f.events, event)
	f.mu.Unlock()
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

func (f *fakeHistorianRepository) hasCommandStatus(commandID string, status model.CommandStatus) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, command := range f.commands {
		if command.ID == commandID && command.Status == status {
			return true
		}
	}
	return false
}

type fakeMQTTPublisher struct {
	status   model.MQTTStatus
	mu       sync.Mutex
	commands []model.Command
}

func (f *fakeMQTTPublisher) PublishTelemetrySnapshot(model.TelemetrySnapshot) {}
func (f *fakeMQTTPublisher) PublishEvent(model.Event)                         {}
func (f *fakeMQTTPublisher) PublishActiveAlarms([]model.Alarm)                {}
func (f *fakeMQTTPublisher) PublishPIDStatus(model.PIDStatus)                 {}
func (f *fakeMQTTPublisher) PublishControlStatus(model.ControlStatus)         {}
func (f *fakeMQTTPublisher) PublishHistorianStatus(model.HistorianStatus)     {}
func (f *fakeMQTTPublisher) PublishSimulationStatus(model.SimulationStatus)   {}

func (f *fakeMQTTPublisher) PublishCommand(command model.Command) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.commands = append(f.commands, command)
}

func (f *fakeMQTTPublisher) Status() model.MQTTStatus {
	return f.status
}

func (f *fakeMQTTPublisher) Close() {}

func (f *fakeMQTTPublisher) hasCommandStatus(commandID string, status model.CommandStatus) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, command := range f.commands {
		if command.ID == commandID && command.Status == status {
			return true
		}
	}
	return false
}

func waitForSavedCommandStatus(t *testing.T, repo *fakeHistorianRepository, commandID string, status model.CommandStatus) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if repo.hasCommandStatus(commandID, status) {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("expected historian command %s status %s", commandID, status)
}

func waitForPublishedCommandStatus(t *testing.T, publisher *fakeMQTTPublisher, commandID string, status model.CommandStatus) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if publisher.hasCommandStatus(commandID, status) {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("expected MQTT command %s status %s", commandID, status)
}

func countCommandEvents(events []model.Event, commandID string, eventType model.EventType) int {
	count := 0
	for _, event := range events {
		if event.CommandID == commandID && event.Type == eventType {
			count++
		}
	}
	return count
}
