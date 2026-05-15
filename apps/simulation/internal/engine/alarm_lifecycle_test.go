package engine

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestAlarmActivatesWithoutDuplicateAndCreatesEvent(t *testing.T) {
	engine := newTestEngine()
	highTemperature := engine.Snapshot()
	highTemperature.PrimaryTemperatureC = 307
	highTemperature.Timestamp = time.Now().UTC()

	evaluateAlarmSnapshot(engine, highTemperature)
	evaluateAlarmSnapshot(engine, highTemperature)

	active := engine.ActiveAlarms()
	if len(active) == 0 {
		t.Fatal("expected active alarm")
	}
	if countEvents(engine, model.EventTypeAlarmActivated) != 1 {
		t.Fatalf("expected one ALARM_ACTIVATED event, got %d", countEvents(engine, model.EventTypeAlarmActivated))
	}
}

func TestAlarmAcknowledgeCreatesEvent(t *testing.T) {
	engine := newTestEngine()
	highTemperature := engine.Snapshot()
	highTemperature.PrimaryTemperatureC = 307
	highTemperature.Timestamp = time.Now().UTC()
	evaluateAlarmSnapshot(engine, highTemperature)

	alarm := engine.ActiveAlarms()[0]
	acknowledged, err := engine.AcknowledgeAlarm(alarm.ID, model.AlarmAcknowledgeRequest{
		AcknowledgedBy: "test-operator",
		Comment:        "seen in test",
	})
	if err != nil {
		t.Fatalf("acknowledge alarm: %v", err)
	}
	if acknowledged.Status != model.AlarmStatusAcknowledged {
		t.Fatalf("expected ACKNOWLEDGED, got %s", acknowledged.Status)
	}
	if acknowledged.AcknowledgedAt == nil {
		t.Fatal("expected acknowledgedAt")
	}
	if acknowledged.AcknowledgedBy != "test-operator" {
		t.Fatalf("expected acknowledgedBy test-operator, got %s", acknowledged.AcknowledgedBy)
	}
	if countEvents(engine, model.EventTypeAlarmAcknowledged) != 1 {
		t.Fatalf("expected ALARM_ACKNOWLEDGED event")
	}
}

func TestAcknowledgeAlarmRejectsOverlongComment(t *testing.T) {
	engine := newTestEngine()
	highTemperature := engine.Snapshot()
	highTemperature.PrimaryTemperatureC = 307
	highTemperature.Timestamp = time.Now().UTC()
	evaluateAlarmSnapshot(engine, highTemperature)

	alarm := engine.ActiveAlarms()[0]
	_, err := engine.AcknowledgeAlarm(alarm.ID, model.AlarmAcknowledgeRequest{
		AcknowledgedBy: "test-operator",
		Comment:        strings.Repeat("x", maxAckCommentLen+1),
	})
	if err == nil {
		t.Fatal("expected overlong comment validation error")
	}
	var alarmErr *AlarmError
	if !errors.As(err, &alarmErr) {
		t.Fatalf("expected AlarmError, got %T", err)
	}
	if alarmErr.Code != "INVALID_PAYLOAD" {
		t.Fatalf("expected INVALID_PAYLOAD, got %s", alarmErr.Code)
	}
}

func TestAlarmClearMovesToHistoryAndCreatesEvent(t *testing.T) {
	engine := newTestEngine()
	snapshot := engine.Snapshot()
	snapshot.PrimaryTemperatureC = 307
	snapshot.Timestamp = time.Now().UTC()
	evaluateAlarmSnapshot(engine, snapshot)
	alarm := engine.ActiveAlarms()[0]

	if _, err := engine.AcknowledgeAlarm(alarm.ID, model.AlarmAcknowledgeRequest{AcknowledgedBy: "test-operator"}); err != nil {
		t.Fatalf("acknowledge alarm: %v", err)
	}

	snapshot.PrimaryTemperatureC = 295
	snapshot.Timestamp = snapshot.Timestamp.Add(time.Second)
	evaluateAlarmSnapshot(engine, snapshot)

	if len(engine.ActiveAlarms()) != 0 {
		t.Fatalf("expected no active alarms, got %d", len(engine.ActiveAlarms()))
	}
	history := engine.AlarmHistory()
	if len(history) != 1 {
		t.Fatalf("expected one alarm in history, got %d", len(history))
	}
	if history[0].Status != model.AlarmStatusCleared {
		t.Fatalf("expected CLEARED history alarm, got %s", history[0].Status)
	}
	if history[0].ClearedAt == nil {
		t.Fatal("expected clearedAt")
	}
	if countEvents(engine, model.EventTypeAlarmCleared) != 1 {
		t.Fatalf("expected ALARM_CLEARED event")
	}
}

func TestAcknowledgeUnknownAndClearedAlarm(t *testing.T) {
	engine := newTestEngine()
	if _, err := engine.AcknowledgeAlarm("missing", model.AlarmAcknowledgeRequest{}); err == nil {
		t.Fatal("expected unknown alarm error")
	}

	snapshot := engine.Snapshot()
	snapshot.PrimaryTemperatureC = 307
	snapshot.Timestamp = time.Now().UTC()
	evaluateAlarmSnapshot(engine, snapshot)
	alarm := engine.ActiveAlarms()[0]
	snapshot.PrimaryTemperatureC = 295
	snapshot.Timestamp = snapshot.Timestamp.Add(time.Second)
	evaluateAlarmSnapshot(engine, snapshot)

	if _, err := engine.AcknowledgeAlarm(alarm.ID, model.AlarmAcknowledgeRequest{}); err == nil {
		t.Fatal("expected cleared alarm acknowledge error")
	}
}

func evaluateAlarmSnapshot(engine *Engine, snapshot model.TelemetrySnapshot) {
	engine.mu.Lock()
	defer engine.mu.Unlock()
	engine.applyAlarmChangesLocked(engine.evaluator.Evaluate(snapshot))
}

func countEvents(engine *Engine, eventType model.EventType) int {
	count := 0
	for _, event := range engine.RecentEvents() {
		if event.Type == eventType {
			count++
		}
	}
	return count
}
