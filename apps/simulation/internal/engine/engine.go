package engine

import (
	"context"
	"errors"
	"log/slog"
	"math/rand"
	"sync"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/alarms"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/historian"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/history"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/metrics"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/scenarios"
)

type Config struct {
	TickInterval              time.Duration
	HistorySize               int
	Seed                      int64
	Historian                 historian.Repository
	HistorianStatus           model.HistorianStatus
	HistorianOperationTimeout time.Duration
	HistorianTelemetrySample  time.Duration
	MQTTPublisher             MQTTPublisher
	MQTTPublishInterval       time.Duration
	MQTTStatus                model.MQTTStatus
}

type MQTTPublisher interface {
	PublishTelemetrySnapshot(model.TelemetrySnapshot)
	PublishEvent(model.Event)
	PublishActiveAlarms([]model.Alarm)
	PublishCommand(model.Command)
	PublishPIDStatus(model.PIDStatus)
	PublishControlStatus(model.ControlStatus)
	PublishHistorianStatus(model.HistorianStatus)
	PublishSimulationStatus(model.SimulationStatus)
	Status() model.MQTTStatus
	Close()
}

type Engine struct {
	mu                        sync.RWMutex
	cfg                       Config
	logger                    *slog.Logger
	state                     state
	history                   *history.RingBuffer
	historian                 historian.Repository
	historianWriter           *historianWriter
	historianStatus           model.HistorianStatus
	historianOperationTimeout time.Duration
	historianTelemetrySample  time.Duration
	lastHistorianSample       time.Time
	mqttPublisher             MQTTPublisher
	mqttStatus                model.MQTTStatus
	mqttPublishInterval       time.Duration
	lastMQTTPublish           time.Time
	evaluator                 *alarms.Evaluator
	random                    *rand.Rand
	cancel                    context.CancelFunc
}

func New(cfg Config, logger *slog.Logger) *Engine {
	if cfg.TickInterval <= 0 {
		cfg.TickInterval = time.Second
	}
	if cfg.HistorySize <= 0 {
		cfg.HistorySize = 3600
	}
	if cfg.HistorianOperationTimeout <= 0 {
		cfg.HistorianOperationTimeout = 500 * time.Millisecond
	}
	if cfg.HistorianTelemetrySample <= 0 {
		cfg.HistorianTelemetrySample = time.Second
	}
	if cfg.MQTTPublishInterval <= 0 {
		cfg.MQTTPublishInterval = time.Second
	}

	now := time.Now().UTC()
	ring := history.NewRingBuffer(cfg.HistorySize)
	initial := initialState(now)
	ring.Add(initial.snapshot)

	var writer *historianWriter
	if cfg.Historian != nil {
		writer = newHistorianWriter(cfg.Historian, cfg.HistorianOperationTimeout, logger)
	}

	return &Engine{
		cfg:                       cfg,
		logger:                    logger,
		state:                     initial,
		history:                   ring,
		historian:                 cfg.Historian,
		historianWriter:           writer,
		historianStatus:           cfg.HistorianStatus,
		historianOperationTimeout: cfg.HistorianOperationTimeout,
		historianTelemetrySample:  cfg.HistorianTelemetrySample,
		mqttPublisher:             cfg.MQTTPublisher,
		mqttStatus:                cfg.MQTTStatus,
		mqttPublishInterval:       cfg.MQTTPublishInterval,
		evaluator:                 alarms.NewEvaluator(),
		random:                    rand.New(rand.NewSource(cfg.Seed)),
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
	if e.historian != nil {
		if e.historianWriter != nil {
			e.historianWriter.Close()
		}
		e.historian.Close()
	}
	if e.mqttPublisher != nil {
		e.mqttPublisher.Close()
	}
	e.logger.Info("simulation_engine_stopped")
	return nil
}

func (e *Engine) Snapshot() model.TelemetrySnapshot {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return cloneSnapshot(e.state.snapshot)
}

func (e *Engine) History(window time.Duration) []model.TelemetrySnapshot {
	return e.HistoryWithSource(window).Values
}

type HistoryResult struct {
	Values   []model.TelemetrySnapshot
	Source   string
	Degraded bool
}

func (e *Engine) HistoryWithSource(window time.Duration) HistoryResult {
	return e.HistoryWithResolution(window, "raw")
}

func (e *Engine) HistoryWithResolution(window time.Duration, resolution string) HistoryResult {
	if resolution == "" {
		resolution = "raw"
	}
	if e.historian != nil {
		ctx, cancel := context.WithTimeout(context.Background(), e.historianOperationTimeout)
		defer cancel()
		if resolution == "1m" {
			values, err := e.historian.QueryAggregatedTelemetryHistory(ctx, window, resolution, time.Now().UTC())
			if err == nil && len(values) > 0 {
				return HistoryResult{Values: values, Source: "persistent_historian_1m"}
			}
			memoryValues := e.memoryHistory(window)
			if err == nil {
				return HistoryResult{Values: memoryValues, Source: "persistent_aggregate_empty_memory_fallback"}
			}
			return HistoryResult{Values: memoryValues, Source: "persistent_aggregate_failed_in_memory_fallback", Degraded: true}
		}
		values, err := e.historian.QueryTelemetryHistory(ctx, window, time.Now().UTC())
		if err == nil && len(values) > 0 {
			return HistoryResult{Values: values, Source: "persistent_historian"}
		}
		memoryValues := e.memoryHistory(window)
		if err == nil {
			return HistoryResult{Values: memoryValues, Source: "persistent_connected_empty_memory_fallback"}
		}
		return HistoryResult{Values: memoryValues, Source: "persistent_read_failed_in_memory_fallback", Degraded: true}
	}
	return HistoryResult{Values: e.memoryHistory(window), Source: "in_memory_fallback"}
}

func (e *Engine) memoryHistory(window time.Duration) []model.TelemetrySnapshot {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.history.Window(window, e.state.snapshot.Timestamp)
}

func (e *Engine) HistorianStatus() model.HistorianStatus {
	if e.historian != nil {
		return e.historian.Status()
	}
	return e.historianStatus
}

func (e *Engine) MQTTStatus() model.MQTTStatus {
	if e.mqttPublisher != nil {
		return e.mqttPublisher.Status()
	}
	return e.mqttStatus
}

func (e *Engine) SetScenario(scenario model.ScenarioName) error {
	if !scenarios.Exists(scenario) {
		return ErrUnknownScenario
	}

	e.mu.Lock()
	defer e.mu.Unlock()
	now := time.Now().UTC()
	e.state.activeScenario = scenario
	e.state.snapshot.Scenario = string(scenario)
	e.appendEventLocked(
		model.EventTypeScenarioStarted,
		model.EventSeverityInfo,
		"scenario-engine",
		"Predefined simulation scenario started.",
		"simulation",
		"",
		now,
		map[string]string{"scenario": string(scenario)},
	)
	e.logger.Info("simulation_scenario_started", slog.String("scenario", string(scenario)))
	return nil
}

func (e *Engine) ClearScenario() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	now := time.Now().UTC()
	previous := e.state.activeScenario
	e.state.activeScenario = model.ScenarioNormal
	e.state.snapshot.Scenario = string(model.ScenarioNormal)
	if previous != model.ScenarioNormal {
		e.appendEventLocked(
			model.EventTypeScenarioCompleted,
			model.EventSeverityInfo,
			"scenario-engine",
			"Predefined simulation scenario stopped.",
			"simulation",
			"",
			now,
			map[string]string{"scenario": string(previous)},
		)
	}
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
	e.evaluator.Reset()
	e.tickLocked(now)
	e.appendEventLocked(
		model.EventTypeSimulationStateUpdated,
		model.EventSeverityInfo,
		"system",
		"In-memory simulation state reset.",
		"simulation",
		"",
		now,
		map[string]string{"action": "reset"},
	)
	e.logger.Info("simulation_reset_executed")
}

func (e *Engine) Status() model.SimulationStatus {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.statusLocked()
}

func (e *Engine) statusLocked() model.SimulationStatus {
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

func (e *Engine) Scenarios() []model.ScenarioInfo {
	return scenarios.List()
}

func (e *Engine) Assets() []model.Asset {
	e.mu.RLock()
	defer e.mu.RUnlock()
	s := e.state.snapshot
	now := s.Timestamp
	return []model.Asset{
		asset("reactor-core", "SMR-CORE", "Reactor Core", "reactor", "unit-overview", statusForHealth(s.Health), "Synthetic unit overview asset.", now, []model.AssetMetric{{Name: "Power", Value: s.ReactorPowerPct, Unit: "%"}, {Name: "Thermal", Value: s.ThermalPowerMW, Unit: "MW"}}),
		asset("primary-loop", "PRIMARY-LOOP", "Primary Loop", "loop", "unit-overview", statusForPrimaryLoop(s), "Synthetic primary-loop overview.", now, []model.AssetMetric{{Name: "Temperature", Value: s.PrimaryTemperatureC, Unit: "C"}, {Name: "Pressure", Value: s.PrimaryPressureMPa, Unit: "MPa"}, {Name: "Flow", Value: s.CoolantFlowPct, Unit: "%"}}),
		asset("steam-generator", "SG-OVERVIEW", "Steam Generator", "heat-exchanger", "unit-overview", statusForLevel(s), "Synthetic steam generator overview.", now, []model.AssetMetric{{Name: "Level", Value: s.SteamGeneratorLevelPct, Unit: "%"}, {Name: "Secondary temperature", Value: s.SecondaryTemperatureC, Unit: "C"}}),
		asset("turbine", "TURBINE", "Turbine", "rotating-equipment", "unit-overview", statusForVibration(s), "Synthetic turbine overview.", now, []model.AssetMetric{{Name: "RPM", Value: s.TurbineRPM, Unit: "rpm"}, {Name: "Vibration", Value: s.VibrationMMS, Unit: "mm/s"}}),
		asset("generator", "GENERATOR", "Generator", "electrical", "unit-overview", statusForHealth(s.Health), "Synthetic generator overview.", now, []model.AssetMetric{{Name: "Load", Value: s.GeneratorLoadPct, Unit: "%"}, {Name: "Power", Value: s.ElectricPowerMW, Unit: "MW"}}),
		asset("condenser", "CONDENSER", "Condenser", "balance-of-plant", "unit-overview", model.AssetStatusOK, "Synthetic condenser overview.", now, []model.AssetMetric{{Name: "Vacuum", Value: s.CondenserVacuumKPa, Unit: "kPa"}}),
		asset("feedwater-system", "FW-SYSTEM", "Feedwater System", "auxiliary", "unit-overview", model.AssetStatusOK, "Synthetic feedwater overview.", now, []model.AssetMetric{{Name: "Flow", Value: s.FeedwaterFlowPct, Unit: "%"}}),
		asset("protection-system", "PROTECTION", "Protection System", "safety-simulation", "unit-overview", statusForHealth(s.Health), "Simulation-only protection status.", now, []model.AssetMetric{{Name: "Availability", Value: s.AvailabilityPct, Unit: "%"}}),
		asset("tank-101", "T-101", "Tank", "tank", "thermal-process-loop", model.AssetStatusOK, "Synthetic process-loop tank.", now, []model.AssetMetric{{Name: "Level", Value: s.TankLevelPct, Unit: "%"}}),
		asset("pump-101", "P-101", "Pump", "pump", "thermal-process-loop", processAssetStatus(s.PumpState), "Synthetic process-loop pump.", now, []model.AssetMetric{{Name: "Flow", Value: s.LoopFlowKGS, Unit: "kg/s"}}),
		asset("valve-101", "V-101", "Control Valve", "valve", "thermal-process-loop", model.AssetStatusOK, "Synthetic process-loop control valve.", now, []model.AssetMetric{{Name: "Position", Value: s.ValvePositionPct, Unit: "%"}}),
		asset("hx-101", "HX-101", "Heat Exchanger", "heat-exchanger", "thermal-process-loop", processAssetStatus(s.HeatExchangerState), "Synthetic process-loop heat exchanger.", now, []model.AssetMetric{{Name: "Temperature", Value: s.LoopTemperatureC, Unit: "C"}}),
		asset("tt-101", "TT-101", "Loop Temperature Transmitter", "sensor", "thermal-process-loop", model.AssetStatusOK, "Synthetic process-loop temperature point.", now, []model.AssetMetric{{Name: "Temperature", Value: s.LoopTemperatureC, Unit: "C"}}),
		asset("pt-101", "PT-101", "Loop Pressure Transmitter", "sensor", "thermal-process-loop", model.AssetStatusOK, "Synthetic process-loop pressure point.", now, []model.AssetMetric{{Name: "Pressure", Value: s.LoopPressureMPa, Unit: "MPa"}}),
		asset("ft-101", "FT-101", "Loop Flow Transmitter", "sensor", "thermal-process-loop", model.AssetStatusOK, "Synthetic process-loop flow point.", now, []model.AssetMetric{{Name: "Flow", Value: s.LoopFlowKGS, Unit: "kg/s"}}),
		asset("lt-101", "LT-101", "Tank Level Transmitter", "sensor", "thermal-process-loop", model.AssetStatusOK, "Synthetic process-loop level point.", now, []model.AssetMetric{{Name: "Level", Value: s.TankLevelPct, Unit: "%"}}),
		asset("tic-101", "TIC-101", "Temperature PID Controller", "controller", "thermal-process-loop", model.AssetStatusOK, "Simulation-only PID controller for the synthetic TT-101 to V-101.POS loop.", now, []model.AssetMetric{{Name: "Setpoint", Value: s.PIDSetpointC, Unit: "C"}, {Name: "Output", Value: s.PIDOutputPct, Unit: "%"}}),
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
	startedAt := time.Now()
	e.state.tickCount++
	snapshot := e.tick(now)
	e.state.snapshot = snapshot
	e.applyAlarmChangesLocked(e.evaluator.Evaluate(snapshot))
	e.history.Add(snapshot)
	if e.historian != nil && (e.lastHistorianSample.IsZero() || now.Sub(e.lastHistorianSample) >= e.historianTelemetrySample) {
		e.lastHistorianSample = now
		e.persistTelemetryAsync(snapshot)
	}
	if e.mqttPublisher != nil && (e.lastMQTTPublish.IsZero() || now.Sub(e.lastMQTTPublish) >= e.mqttPublishInterval) {
		e.lastMQTTPublish = now
		e.publishPeriodicMQTTLocked(snapshot)
	}
	mqttStatus := e.mqttStatus
	if e.mqttPublisher != nil {
		mqttStatus = e.mqttPublisher.Status()
	}
	metrics.ObserveSnapshot(snapshot, len(e.evaluator.Active()), mqttStatus)
	metrics.ObserveTick(startedAt)
}

func (e *Engine) noise(amplitude float64) float64 {
	return (e.random.Float64()*2 - 1) * amplitude
}

func asset(id, tag, name, assetType, area string, status model.AssetStatus, description string, updatedAt time.Time, metrics []model.AssetMetric) model.Asset {
	return model.Asset{
		ID:          id,
		Tag:         tag,
		Name:        name,
		Type:        assetType,
		Area:        area,
		Unit:        "unit-001",
		SafetyClass: "simulated",
		Status:      status,
		Description: description,
		KeyMetrics:  metrics,
		UpdatedAt:   updatedAt,
	}
}

func processAssetStatus(state string) model.AssetStatus {
	switch state {
	case string(model.PumpStateStopped), "Offline":
		return model.AssetStatusOffline
	case string(model.PumpStateStarting), string(model.PumpStateStopping), "Reduced Duty":
		return model.AssetStatusWarning
	default:
		return model.AssetStatusOK
	}
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
