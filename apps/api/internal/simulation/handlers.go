package simulation

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/assets"
	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/http"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/system"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/telemetry"
)

type Gateway struct {
	client            *Client
	fallbackAssets    *assets.Service
	fallbackTelemetry *telemetry.Service
	systemService     *system.Service
	logger            *slog.Logger
}

func NewGateway(client *Client, fallbackAssets *assets.Service, fallbackTelemetry *telemetry.Service, systemService *system.Service, logger *slog.Logger) *Gateway {
	return &Gateway{client: client, fallbackAssets: fallbackAssets, fallbackTelemetry: fallbackTelemetry, systemService: systemService, logger: logger}
}

func (g *Gateway) SystemStatus(w http.ResponseWriter, r *http.Request) {
	status, err := g.systemService.Status(r.Context())
	if err == nil {
		if simStatus, simErr := g.client.Status(r.Context()); simErr == nil {
			status.SimulationConnected = true
			status.SimulationMode = simStatus.Mode
			status.SimulationHealth = simStatus.Health
			status.LastSimulationTimestamp = simStatus.LastSimulationTimestamp
			status.SimulationService.Status = "connected"
		} else {
			status.SimulationConnected = false
			status.SimulationService.Status = "not_connected"
		}
	}
	if err != nil {
		httpapi.WriteError(w, r, http.StatusInternalServerError, "SYSTEM_STATUS_FAILED", "Failed to read system status")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{})
}

func (g *Gateway) Assets(w http.ResponseWriter, r *http.Request) {
	if simAssets, err := g.client.Assets(r.Context()); err == nil {
		httpapi.WriteData(w, r, http.StatusOK, simAssets, httpapi.MetaOptions{Count: len(simAssets), Source: "simulation"})
		return
	}
	items, err := g.fallbackAssets.List(r.Context())
	if err != nil {
		httpapi.WriteError(w, r, http.StatusInternalServerError, "ASSETS_LIST_FAILED", "Failed to list assets")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, items, httpapi.MetaOptions{Count: len(items), Source: "memory", Degraded: true})
}

func (g *Gateway) LatestTelemetry(w http.ResponseWriter, r *http.Request) {
	if snapshot, err := g.client.LatestTelemetry(r.Context()); err == nil {
		points := telemetryPointsFromSnapshot(snapshot)
		httpapi.WriteData(w, r, http.StatusOK, points, httpapi.MetaOptions{Count: len(points), Source: "simulation"})
		return
	}
	points, err := g.fallbackTelemetry.Latest(r.Context())
	if err != nil {
		httpapi.WriteError(w, r, http.StatusInternalServerError, "TELEMETRY_LATEST_FAILED", "Failed to read latest telemetry")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, points, httpapi.MetaOptions{Count: len(points), Source: "memory", Degraded: true})
}

func (g *Gateway) TelemetryHistory(w http.ResponseWriter, r *http.Request) {
	window := r.URL.Query().Get("window")
	history, err := g.client.TelemetryHistory(r.Context(), window)
	if err != nil {
		httpapi.WriteError(w, r, http.StatusServiceUnavailable, "SIMULATION_UNAVAILABLE", "Simulation history is unavailable")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, history, httpapi.MetaOptions{Count: len(history), Source: "simulation"})
}

func (g *Gateway) ActiveAlarms(w http.ResponseWriter, r *http.Request) {
	alarms, err := g.client.ActiveAlarms(r.Context())
	if err != nil {
		httpapi.WriteData(w, r, http.StatusOK, []Alarm{}, httpapi.MetaOptions{Count: 0, Source: "memory", Degraded: true})
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, alarms, httpapi.MetaOptions{Count: len(alarms), Source: "simulation"})
}

func (g *Gateway) AlarmHistory(w http.ResponseWriter, r *http.Request) {
	alarms, err := g.client.AlarmHistory(r.Context())
	if err != nil {
		httpapi.WriteData(w, r, http.StatusOK, []Alarm{}, httpapi.MetaOptions{Count: 0, Source: "memory", Degraded: true})
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, alarms, httpapi.MetaOptions{Count: len(alarms), Source: "simulation"})
}

func (g *Gateway) AcknowledgeAlarm(w http.ResponseWriter, r *http.Request) {
	var request AlarmAcknowledgeRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		httpapi.WriteError(w, r, http.StatusBadRequest, "MALFORMED_JSON", "Alarm acknowledge request body is invalid JSON")
		return
	}
	if request.AcknowledgedBy == "" {
		request.AcknowledgedBy = "demo-operator"
	}

	alarm, err := g.client.AcknowledgeAlarm(r.Context(), r.PathValue("alarmID"), request)
	if err != nil {
		g.writeSimulationCommandError(w, r, err)
		return
	}

	httpapi.WriteData(w, r, http.StatusOK, alarm, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) Scenarios(w http.ResponseWriter, r *http.Request) {
	scenarios, err := g.client.Scenarios(r.Context())
	if err != nil {
		httpapi.WriteError(w, r, http.StatusServiceUnavailable, "SIMULATION_UNAVAILABLE", "Simulation scenarios are unavailable")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, scenarios, httpapi.MetaOptions{Count: len(scenarios), Source: "simulation"})
}

func (g *Gateway) StartScenario(w http.ResponseWriter, r *http.Request) {
	status, err := g.client.StartScenario(r.Context(), r.PathValue("scenarioName"))
	if err != nil {
		httpapi.WriteError(w, r, http.StatusBadGateway, "SCENARIO_START_FAILED", "Failed to start simulation scenario")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) StopScenario(w http.ResponseWriter, r *http.Request) {
	status, err := g.client.StopScenario(r.Context())
	if err != nil {
		httpapi.WriteError(w, r, http.StatusBadGateway, "SCENARIO_STOP_FAILED", "Failed to stop simulation scenario")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) Reset(w http.ResponseWriter, r *http.Request) {
	status, err := g.client.Reset(r.Context())
	if err != nil {
		httpapi.WriteError(w, r, http.StatusBadGateway, "SIMULATION_RESET_FAILED", "Failed to reset simulation")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) SubmitCommand(w http.ResponseWriter, r *http.Request) {
	var request CommandRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		httpapi.WriteError(w, r, http.StatusBadRequest, "MALFORMED_JSON", "Command request body is invalid JSON")
		return
	}

	if request.Source == "" {
		request.Source = "frontend"
	}
	if request.RequestedBy == "" {
		request.RequestedBy = "demo-engineer"
	}
	if request.CorrelationID == "" {
		request.CorrelationID = httpapi.RequestIDFromContext(r.Context())
	}

	command, err := g.client.SubmitCommand(r.Context(), request)
	if err != nil {
		g.writeSimulationCommandError(w, r, err)
		return
	}

	httpapi.WriteData(w, r, http.StatusOK, command, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) RecentCommands(w http.ResponseWriter, r *http.Request) {
	commands, err := g.client.RecentCommands(r.Context())
	if err != nil {
		g.writeSimulationCommandError(w, r, err)
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, commands, httpapi.MetaOptions{Count: len(commands), Source: "simulation"})
}

func (g *Gateway) RecentEvents(w http.ResponseWriter, r *http.Request) {
	events, err := g.client.RecentEvents(r.Context())
	if err != nil {
		g.writeSimulationCommandError(w, r, err)
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, events, httpapi.MetaOptions{Count: len(events), Source: "simulation"})
}

func (g *Gateway) writeSimulationCommandError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, ErrDisabled) {
		httpapi.WriteError(w, r, http.StatusServiceUnavailable, "SIMULATION_UNAVAILABLE", "Simulation service is disabled")
		return
	}
	if responseErr, ok := IsResponseError(err); ok {
		status := responseErr.StatusCode
		if status == 0 {
			status = http.StatusBadGateway
		}
		httpapi.WriteError(w, r, status, responseErr.Code, responseErr.Message)
		return
	}
	httpapi.WriteError(w, r, http.StatusBadGateway, "SIMULATION_UNAVAILABLE", "Simulation service is not reachable")
}

func telemetryPointsFromSnapshot(s TelemetrySnapshot) []telemetry.TelemetryPoint {
	return []telemetry.TelemetryPoint{
		numberPoint("SMR-POWER", "Reactor Power", s.ReactorPowerPct, "%", s.Timestamp),
		numberPoint("THERMAL-MW", "Thermal Power", s.ThermalPowerMW, "MW", s.Timestamp),
		numberPoint("ELECTRIC-MW", "Electric Power", s.ElectricPowerMW, "MW", s.Timestamp),
		numberPoint("TT-PRIMARY", "Primary Temperature", s.PrimaryTemperatureC, "C", s.Timestamp),
		numberPoint("TT-SECONDARY", "Secondary Temperature", s.SecondaryTemperatureC, "C", s.Timestamp),
		numberPoint("PT-PRIMARY", "Primary Pressure", s.PrimaryPressureMPa, "MPa", s.Timestamp),
		numberPoint("PT-SECONDARY", "Secondary Pressure", s.SecondaryPressureMPa, "MPa", s.Timestamp),
		numberPoint("FT-COOLANT", "Coolant Flow", s.CoolantFlowPct, "%", s.Timestamp),
		numberPoint("LT-SG", "Steam Generator Level", s.SteamGeneratorLevelPct, "%", s.Timestamp),
		numberPoint("TURBINE-RPM", "Turbine Speed", s.TurbineRPM, "rpm", s.Timestamp),
		numberPoint("GEN-LOAD", "Generator Load", s.GeneratorLoadPct, "%", s.Timestamp),
		numberPoint("COND-VAC", "Condenser Vacuum", s.CondenserVacuumKPa, "kPa", s.Timestamp),
		numberPoint("FW-FLOW", "Feedwater Flow", s.FeedwaterFlowPct, "%", s.Timestamp),
		numberPoint("VIBRATION", "Vibration", s.VibrationMMS, "mm/s", s.Timestamp),
		numberPoint("RAD-FIELD", "Synthetic Radiation Field", s.RadiationLevelUSvH, "uSv/h", s.Timestamp),
		numberPoint("AVAILABILITY", "Availability", s.AvailabilityPct, "%", s.Timestamp),
		numberPoint("EFFICIENCY", "Efficiency", s.EfficiencyPct, "%", s.Timestamp),
		textPoint("SIM-MODE", "Simulation Mode", s.Mode, s.Timestamp),
		textPoint("SIM-HEALTH", "Simulation Health", s.Health, s.Timestamp),
		numberPoint("TT-101", "Loop Temperature", s.LoopTemperatureC, "C", s.Timestamp),
		numberPoint("PT-101", "Loop Pressure", s.LoopPressureMPa, "MPa", s.Timestamp),
		numberPoint("FT-101", "Loop Flow", s.LoopFlowKGS, "kg/s", s.Timestamp),
		numberPoint("LT-101", "Tank Level", s.TankLevelPct, "%", s.Timestamp),
		numberPoint("V-101.POS", "Valve Position", s.ValvePositionPct, "%", s.Timestamp),
		textPointWithQuality("V-101.STATE", "Valve State", valueOrFallback(s.ValveState, "STOPPED"), telemetry.QualityGood, s.Timestamp),
		textPointWithQuality("P-101.STATE", "Pump State", valueOrFallback(s.PumpState, "Mock"), telemetry.QualityGood, s.Timestamp),
		numberPoint("P-101.RPM", "Pump Speed", s.PumpRPM, "rpm", s.Timestamp),
		textPointWithQuality("HX-101.STATE", "Heat Exchanger State", valueOrFallback(s.HeatExchangerState, "Mock Duty"), telemetry.QualityGood, s.Timestamp),
		textPointWithQuality("TIC-101.MODE", "PID Controller Mode", valueOrFallback(s.PIDControllerMode, "Disabled"), telemetry.QualityUncertain, s.Timestamp),
	}
}

func numberPoint(tag, name string, value float64, unit string, timestamp time.Time) telemetry.TelemetryPoint {
	v := value
	return telemetry.TelemetryPoint{Tag: tag, Name: name, Value: &v, Unit: unit, Quality: telemetry.QualityGood, Timestamp: timestamp, Source: "simulation"}
}

func textPoint(tag, name, value string, timestamp time.Time) telemetry.TelemetryPoint {
	return textPointWithQuality(tag, name, value, telemetry.QualityGood, timestamp)
}

func textPointWithQuality(tag, name, value string, quality telemetry.Quality, timestamp time.Time) telemetry.TelemetryPoint {
	v := value
	return telemetry.TelemetryPoint{Tag: tag, Name: name, ValueText: &v, Unit: "", Quality: quality, Timestamp: timestamp, Source: "simulation"}
}

func valueOrFallback(value, fallback string) string {
	if value == "" {
		return fallback
	}

	return value
}
