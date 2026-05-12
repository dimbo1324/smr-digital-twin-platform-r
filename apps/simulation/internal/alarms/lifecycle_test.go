package alarms

import (
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestAlarmLifecycleRaiseAcknowledgeClearReactivate(t *testing.T) {
	manager := newTestManager(20)
	activeSnapshot := snapshotWithTemperature(307, time.Now().UTC())

	active := manager.Evaluate(activeSnapshot)
	if len(active) != 1 {
		t.Fatalf("expected one active warning, got %d", len(active))
	}
	alarm := active[0]
	if alarm.Status != model.AlarmStatusActive {
		t.Fatalf("expected ACTIVE, got %s", alarm.Status)
	}
	if alarm.OccurrenceCount != 1 {
		t.Fatalf("expected occurrence count 1, got %d", alarm.OccurrenceCount)
	}

	manager.Evaluate(snapshotWithTemperature(308, activeSnapshot.Timestamp.Add(time.Second)))
	if raised := eventsOfType(manager.Events(10), model.AlarmEventRaised); len(raised) != 1 {
		t.Fatalf("expected one raised event across active ticks, got %d", len(raised))
	}

	acknowledged, err := manager.Acknowledge(alarm.ID, "demo-operator", "reviewed in test")
	if err != nil {
		t.Fatalf("acknowledge alarm: %v", err)
	}
	if acknowledged.Status != model.AlarmStatusAcknowledged || acknowledged.AckNote != "reviewed in test" {
		t.Fatalf("unexpected acknowledgement state: %#v", acknowledged)
	}

	manager.Evaluate(snapshotWithTemperature(309, activeSnapshot.Timestamp.Add(2*time.Second)))
	stillActive := manager.ActiveAlarms()[0]
	if stillActive.Status != model.AlarmStatusAcknowledged || stillActive.AckNote != "reviewed in test" {
		t.Fatalf("expected ack metadata to survive tick, got %#v", stillActive)
	}

	manager.Evaluate(snapshotWithTemperature(300, activeSnapshot.Timestamp.Add(3*time.Second)))
	cleared, ok := manager.Alarm(alarm.ID)
	if !ok || cleared.Status != model.AlarmStatusCleared || cleared.ClearedAt == nil {
		t.Fatalf("expected cleared alarm, got %#v found=%v", cleared, ok)
	}
	if _, err := manager.Acknowledge(alarm.ID, "demo-operator", "late ack"); err != ErrAlarmAlreadyCleared {
		t.Fatalf("expected already cleared error, got %v", err)
	}

	manager.Evaluate(snapshotWithTemperature(307, activeSnapshot.Timestamp.Add(4*time.Second)))
	reactivated := manager.ActiveAlarms()[0]
	if reactivated.ID != alarm.ID {
		t.Fatalf("expected stable alarm id %s, got %s", alarm.ID, reactivated.ID)
	}
	if reactivated.OccurrenceCount != 2 {
		t.Fatalf("expected occurrence count 2, got %d", reactivated.OccurrenceCount)
	}
	if reactivated.Status != model.AlarmStatusActive {
		t.Fatalf("expected reactivated ACTIVE, got %s", reactivated.Status)
	}

	events := manager.Events(20)
	for _, eventType := range []model.AlarmEventType{
		model.AlarmEventRaised,
		model.AlarmEventAcknowledged,
		model.AlarmEventCleared,
		model.AlarmEventReactivated,
	} {
		if found := eventsOfType(events, eventType); len(found) == 0 {
			t.Fatalf("expected event type %s in %#v", eventType, events)
		}
	}
}

func TestAlarmLifecycleValidationAndEventRingBuffer(t *testing.T) {
	manager := newTestManager(3)
	if _, err := manager.Acknowledge("missing", "demo-operator", ""); err != ErrAlarmNotFound {
		t.Fatalf("expected not found error, got %v", err)
	}

	active := manager.Evaluate(snapshotWithTemperature(307, time.Now().UTC()))
	longNote := make([]byte, 501)
	for i := range longNote {
		longNote[i] = 'x'
	}
	if _, err := manager.Acknowledge(active[0].ID, "demo-operator", string(longNote)); err != ErrInvalidAcknowledgement {
		t.Fatalf("expected invalid acknowledgement, got %v", err)
	}

	for i := 0; i < 5; i++ {
		manager.AddEvent(model.AlarmEvent{Type: model.EventScenarioStarted, Message: "event", CreatedAt: time.Now().Add(time.Duration(i) * time.Second)})
	}
	if events := manager.Events(10); len(events) != 3 {
		t.Fatalf("expected ring buffer to keep 3 events, got %d", len(events))
	}
}

func TestResetAddsSimulationResetEvent(t *testing.T) {
	manager := newTestManager(10)
	manager.Evaluate(snapshotWithTemperature(307, time.Now().UTC()))
	manager.Reset()

	if active := manager.ActiveAlarms(); len(active) != 0 {
		t.Fatalf("expected reset to clear active alarms, got %d", len(active))
	}
	if resetEvents := eventsOfType(manager.Events(10), model.EventSimulationReset); len(resetEvents) != 1 {
		t.Fatalf("expected reset event, got %d", len(resetEvents))
	}
}

func newTestManager(eventLimit int) *Manager {
	return NewManager(eventLimit, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func snapshotWithTemperature(temperature float64, ts time.Time) model.TelemetrySnapshot {
	return model.TelemetrySnapshot{
		PrimaryTemperatureC:    temperature,
		PrimaryPressureMPa:     15.1,
		CoolantFlowPct:         88,
		SteamGeneratorLevelPct: 62,
		VibrationMMS:           2.1,
		Timestamp:              ts,
		Mode:                   model.ModeNormal,
		Health:                 model.HealthOK,
		SimulationOnly:         true,
	}
}

func eventsOfType(events []model.AlarmEvent, eventType model.AlarmEventType) []model.AlarmEvent {
	var result []model.AlarmEvent
	for _, event := range events {
		if event.Type == eventType {
			result = append(result, event)
		}
	}
	return result
}
