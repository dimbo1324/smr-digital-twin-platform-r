package engine

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestEngineStartsAndProducesSnapshot(t *testing.T) {
	engine := newTestEngine()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := engine.Start(ctx); err != nil {
		t.Fatalf("start engine: %v", err)
	}
	defer func() { _ = engine.Stop(context.Background()) }()

	snapshot := engine.Snapshot()
	if snapshot.Timestamp.IsZero() {
		t.Fatal("expected snapshot timestamp")
	}
	if snapshot.Health != model.HealthOK {
		t.Fatalf("expected health OK, got %s", snapshot.Health)
	}
}

func TestSnapshotTimestampUpdatesAfterTick(t *testing.T) {
	engine := newTestEngine()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	_ = engine.Start(ctx)
	defer func() { _ = engine.Stop(context.Background()) }()

	first := engine.Snapshot().Timestamp
	time.Sleep(40 * time.Millisecond)
	second := engine.Snapshot().Timestamp

	if !second.After(first) {
		t.Fatalf("expected timestamp to advance: first=%s second=%s", first, second)
	}
}

func TestValuesStayWithinSyntheticRanges(t *testing.T) {
	engine := newTestEngine()
	for i := 0; i < 200; i++ {
		engine.mu.Lock()
		engine.tickLocked(time.Now().Add(time.Duration(i) * time.Second))
		snapshot := engine.state.snapshot
		engine.mu.Unlock()

		if snapshot.ReactorPowerPct < 0 || snapshot.ReactorPowerPct > 100 {
			t.Fatalf("reactor power out of range: %f", snapshot.ReactorPowerPct)
		}
		if snapshot.PrimaryPressureMPa < 0 || snapshot.PrimaryPressureMPa > 18 {
			t.Fatalf("primary pressure out of range: %f", snapshot.PrimaryPressureMPa)
		}
		if snapshot.LoopFlowKGS < 0 || snapshot.LoopFlowKGS > 150 {
			t.Fatalf("process-loop flow out of range: %f", snapshot.LoopFlowKGS)
		}
		if snapshot.ValvePositionPct < 0 || snapshot.ValvePositionPct > 100 {
			t.Fatalf("valve position out of range: %f", snapshot.ValvePositionPct)
		}
	}
}

func TestProcessLoopTelemetryIsPopulated(t *testing.T) {
	engine := newTestEngine()
	tickMany(engine, 3)

	snapshot := engine.Snapshot()
	if snapshot.LoopTemperatureC == 0 {
		t.Fatal("expected loop temperature")
	}
	if snapshot.LoopPressureMPa == 0 {
		t.Fatal("expected loop pressure")
	}
	if snapshot.LoopFlowKGS == 0 {
		t.Fatal("expected loop flow")
	}
	if snapshot.TankLevelPct == 0 {
		t.Fatal("expected tank level")
	}
	if snapshot.ValvePositionPct == 0 {
		t.Fatal("expected valve position")
	}
	if snapshot.PumpState == "" {
		t.Fatal("expected pump state")
	}
	if snapshot.HeatExchangerState == "" {
		t.Fatal("expected heat exchanger state")
	}
	if snapshot.PIDControllerMode == "" {
		t.Fatal("expected PID controller mode")
	}
}

func TestHighTemperatureScenarioCreatesAlarm(t *testing.T) {
	engine := newTestEngine()
	if err := engine.SetScenario(model.ScenarioHighTemperature); err != nil {
		t.Fatalf("set scenario: %v", err)
	}
	tickMany(engine, 90)

	if len(engine.ActiveAlarms()) == 0 {
		t.Fatal("expected active alarm for high temperature scenario")
	}
}

func TestPumpDegradationLowersFlowAndCreatesWarning(t *testing.T) {
	engine := newTestEngine()
	if err := engine.SetScenario(model.ScenarioPumpDegradation); err != nil {
		t.Fatalf("set scenario: %v", err)
	}
	tickMany(engine, 80)

	snapshot := engine.Snapshot()
	if snapshot.CoolantFlowPct >= 70 {
		t.Fatalf("expected degraded flow below 70, got %f", snapshot.CoolantFlowPct)
	}
	if len(engine.ActiveAlarms()) == 0 {
		t.Fatal("expected active warning alarm")
	}
}

func TestTripScenarioSetsModeAndHealth(t *testing.T) {
	engine := newTestEngine()
	if err := engine.SetScenario(model.ScenarioTrip); err != nil {
		t.Fatalf("set scenario: %v", err)
	}
	tickMany(engine, 10)

	snapshot := engine.Snapshot()
	if snapshot.Mode != model.ModeTrip {
		t.Fatalf("expected TRIP mode, got %s", snapshot.Mode)
	}
	if snapshot.Health != model.HealthTrip {
		t.Fatalf("expected TRIP health, got %s", snapshot.Health)
	}
}

func TestScenarioLifecycleCreatesEvents(t *testing.T) {
	engine := newTestEngine()
	if err := engine.SetScenario(model.ScenarioTrip); err != nil {
		t.Fatalf("set scenario: %v", err)
	}
	if err := engine.ClearScenario(); err != nil {
		t.Fatalf("clear scenario: %v", err)
	}

	events := engine.RecentEvents()
	if !eventTypeExists(events, model.EventTypeScenarioStarted) {
		t.Fatal("expected scenario started event")
	}
	if !eventTypeExists(events, model.EventTypeScenarioCompleted) {
		t.Fatal("expected scenario completed event")
	}
}

func TestRecentEventsLimitNewestFirst(t *testing.T) {
	engine := newTestEngine()
	if err := engine.SetScenario(model.ScenarioHighTemperature); err != nil {
		t.Fatalf("set scenario: %v", err)
	}
	if err := engine.ClearScenario(); err != nil {
		t.Fatalf("clear scenario: %v", err)
	}

	events := engine.RecentEventsLimited(1)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != model.EventTypeScenarioCompleted {
		t.Fatalf("expected newest scenario completed event, got %s", events[0].Type)
	}
}

func TestUnknownScenarioReturnsError(t *testing.T) {
	engine := newTestEngine()
	if err := engine.SetScenario("unknown"); err == nil {
		t.Fatal("expected unknown scenario error")
	}
}

func eventTypeExists(events []model.Event, eventType model.EventType) bool {
	for _, event := range events {
		if event.Type == eventType {
			return true
		}
	}
	return false
}

func newTestEngine() *Engine {
	return New(Config{TickInterval: 10 * time.Millisecond, HistorySize: 32, Seed: 42}, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func tickMany(engine *Engine, count int) {
	for i := 0; i < count; i++ {
		engine.mu.Lock()
		engine.tickLocked(time.Now().Add(time.Duration(i) * time.Second))
		engine.mu.Unlock()
	}
}
