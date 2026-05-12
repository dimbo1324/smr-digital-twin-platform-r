package engine

import (
	"context"
	"errors"
	"log/slog"
	"math/rand"
	"sync"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/alarms"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/history"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/scenarios"
)

type Config struct {
	TickInterval          time.Duration
	HistorySize           int
	AlarmEventHistorySize int
	Seed                  int64
}

type Engine struct {
	mu      sync.RWMutex
	cfg     Config
	logger  *slog.Logger
	state   state
	history *history.RingBuffer
	alarms  *alarms.Manager
	random  *rand.Rand
	cancel  context.CancelFunc
}

func New(cfg Config, logger *slog.Logger) *Engine {
	if cfg.TickInterval <= 0 {
		cfg.TickInterval = time.Second
	}
	if cfg.HistorySize <= 0 {
		cfg.HistorySize = 3600
	}

	now := time.Now().UTC()
	ring := history.NewRingBuffer(cfg.HistorySize)
	initial := initialState(now)
	ring.Add(initial.snapshot)

	return &Engine{
		cfg:     cfg,
		logger:  logger,
		state:   initial,
		history: ring,
		alarms:  alarms.NewManager(cfg.AlarmEventHistorySize, logger),
		random:  rand.New(rand.NewSource(cfg.Seed)),
	}
}

func (e *Engine) Start(ctx context.Context) error {
	e.mu.Lock()
	if e.state.running {
		e.mu.Unlock()
		return nil
	}
	runCtx, cancel := context.WithCancel(ctx)
	e.cancel = cancel
	e.state.running = true
	e.tickLocked(time.Now().UTC())
	e.mu.Unlock()

	go e.loop(runCtx)
	e.logger.Info("simulation_engine_started", slog.Duration("tick_interval", e.cfg.TickInterval), slog.Int("history_size", e.cfg.HistorySize))
	return nil
}

func (e *Engine) Stop(_ context.Context) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.cancel != nil {
		e.cancel()
	}
	e.state.running = false
	e.logger.Info("simulation_engine_stopped")
	return nil
}

func (e *Engine) Snapshot() model.TelemetrySnapshot {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return cloneSnapshot(e.state.snapshot)
}

func (e *Engine) History(window time.Duration) []model.TelemetrySnapshot {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.history.Window(window, e.state.snapshot.Timestamp)
}

func (e *Engine) SetScenario(scenario model.ScenarioName) error {
	if !scenarios.Exists(scenario) {
		return ErrUnknownScenario
	}

	e.mu.Lock()
	defer e.mu.Unlock()
	e.state.activeScenario = scenario
	e.state.snapshot.Scenario = string(scenario)
	e.alarms.AddEvent(model.AlarmEvent{
		Type:           model.EventScenarioStarted,
		Message:        "Synthetic simulation scenario started.",
		CreatedAt:      time.Now().UTC(),
		Scenario:       string(scenario),
		SimulationOnly: true,
	})
	e.logger.Info("simulation_scenario_started", slog.String("scenario", string(scenario)))
	return nil
}

func (e *Engine) ClearScenario() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.state.activeScenario = model.ScenarioNormal
	e.state.snapshot.Scenario = string(model.ScenarioNormal)
	e.alarms.AddEvent(model.AlarmEvent{
		Type:           model.EventScenarioStopped,
		Message:        "Synthetic simulation scenario stopped.",
		CreatedAt:      time.Now().UTC(),
		Scenario:       string(model.ScenarioNormal),
		SimulationOnly: true,
	})
	e.logger.Info("simulation_scenario_stopped")
	return nil
}

func (e *Engine) Reset() {
	e.mu.Lock()
	defer e.mu.Unlock()
	now := time.Now().UTC()
	e.state = initialState(now)
	e.state.running = true
	e.history = history.NewRingBuffer(e.cfg.HistorySize)
	e.alarms.Reset()
	e.tickLocked(now)
	e.logger.Info("simulation_reset_executed")
}

func (e *Engine) Status() model.SimulationStatus {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return model.SimulationStatus{
		Running:                 e.state.running,
		Mode:                    e.state.snapshot.Mode,
		Health:                  e.state.snapshot.Health,
		ActiveScenario:          e.state.activeScenario,
		TickMS:                  int(e.cfg.TickInterval / time.Millisecond),
		HistorySize:             e.cfg.HistorySize,
		SnapshotCount:           e.history.Len(),
		LastSimulationTimestamp: e.state.snapshot.Timestamp.Format(time.RFC3339),
		SimulationOnly:          true,
	}
}

func (e *Engine) ActiveAlarms() []model.Alarm {
	return e.alarms.ActiveAlarms()
}

func (e *Engine) Alarms() []model.Alarm {
	return e.alarms.AllAlarms()
}

func (e *Engine) Alarm(id string) (model.Alarm, bool) {
	return e.alarms.Alarm(id)
}

func (e *Engine) AlarmEvents(limit int) []model.AlarmEvent {
	return e.alarms.Events(limit)
}

func (e *Engine) AcknowledgeAlarm(alarmID, actor, note string) (model.Alarm, error) {
	return e.alarms.Acknowledge(alarmID, actor, note)
}

func (e *Engine) Scenarios() []model.ScenarioInfo {
	return scenarios.List()
}

func (e *Engine) Assets() []model.Asset {
	e.mu.RLock()
	defer e.mu.RUnlock()
	s := e.state.snapshot
	now := s.Timestamp
	return []model.Asset{
		asset("reactor-core", "Reactor Core", "reactor", statusForHealth(s.Health), now, []model.AssetMetric{{Name: "Power", Value: s.ReactorPowerPct, Unit: "%"}, {Name: "Thermal", Value: s.ThermalPowerMW, Unit: "MW"}}),
		asset("primary-loop", "Primary Loop", "loop", statusForPrimaryLoop(s), now, []model.AssetMetric{{Name: "Temperature", Value: s.PrimaryTemperatureC, Unit: "C"}, {Name: "Pressure", Value: s.PrimaryPressureMPa, Unit: "MPa"}, {Name: "Flow", Value: s.CoolantFlowPct, Unit: "%"}}),
		asset("steam-generator", "Steam Generator", "heat-exchanger", statusForLevel(s), now, []model.AssetMetric{{Name: "Level", Value: s.SteamGeneratorLevelPct, Unit: "%"}, {Name: "Secondary temperature", Value: s.SecondaryTemperatureC, Unit: "C"}}),
		asset("turbine", "Turbine", "rotating-equipment", statusForVibration(s), now, []model.AssetMetric{{Name: "RPM", Value: s.TurbineRPM, Unit: "rpm"}, {Name: "Vibration", Value: s.VibrationMMS, Unit: "mm/s"}}),
		asset("generator", "Generator", "electrical", statusForHealth(s.Health), now, []model.AssetMetric{{Name: "Load", Value: s.GeneratorLoadPct, Unit: "%"}, {Name: "Power", Value: s.ElectricPowerMW, Unit: "MW"}}),
		asset("condenser", "Condenser", "balance-of-plant", model.AssetStatusOK, now, []model.AssetMetric{{Name: "Vacuum", Value: s.CondenserVacuumKPa, Unit: "kPa"}}),
		asset("feedwater-system", "Feedwater System", "auxiliary", model.AssetStatusOK, now, []model.AssetMetric{{Name: "Flow", Value: s.FeedwaterFlowPct, Unit: "%"}}),
		asset("protection-system", "Protection System", "safety-simulation", statusForHealth(s.Health), now, []model.AssetMetric{{Name: "Availability", Value: s.AvailabilityPct, Unit: "%"}}),
	}
}

func (e *Engine) loop(ctx context.Context) {
	ticker := time.NewTicker(e.cfg.TickInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			e.mu.Lock()
			e.tickLocked(now.UTC())
			e.mu.Unlock()
		}
	}
}

func (e *Engine) tickLocked(now time.Time) {
	e.state.tickCount++
	snapshot := e.tick(now)
	e.state.snapshot = snapshot
	e.alarms.Evaluate(snapshot)
	e.history.Add(snapshot)
}

func (e *Engine) noise(amplitude float64) float64 {
	return (e.random.Float64()*2 - 1) * amplitude
}

func asset(id, name, assetType string, status model.AssetStatus, updatedAt time.Time, metrics []model.AssetMetric) model.Asset {
	return model.Asset{ID: id, Name: name, Type: assetType, SafetyClass: "simulated", Status: status, KeyMetrics: metrics, UpdatedAt: updatedAt}
}

func statusForHealth(health model.Health) model.AssetStatus {
	switch health {
	case model.HealthTrip, model.HealthAlarm:
		return model.AssetStatusAlarm
	case model.HealthWarning:
		return model.AssetStatusWarning
	default:
		return model.AssetStatusOK
	}
}

func statusForPrimaryLoop(s model.TelemetrySnapshot) model.AssetStatus {
	if s.PrimaryTemperatureC >= 318 || s.CoolantFlowPct <= 58 {
		return model.AssetStatusAlarm
	}
	if s.PrimaryTemperatureC >= 306 || s.PrimaryPressureMPa >= 16.2 || s.CoolantFlowPct <= 68 {
		return model.AssetStatusWarning
	}
	return model.AssetStatusOK
}

func statusForLevel(s model.TelemetrySnapshot) model.AssetStatus {
	if s.SteamGeneratorLevelPct <= 42 || s.SteamGeneratorLevelPct >= 78 {
		return model.AssetStatusWarning
	}
	return model.AssetStatusOK
}

func statusForVibration(s model.TelemetrySnapshot) model.AssetStatus {
	if s.VibrationMMS >= 4.8 {
		return model.AssetStatusWarning
	}
	return model.AssetStatusOK
}

var ErrUnknownScenario = errors.New("unknown simulation scenario")
