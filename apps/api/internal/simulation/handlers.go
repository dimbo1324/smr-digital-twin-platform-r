package simulation

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/assets"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/auth"
	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/http"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/metrics"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/system"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/telemetry"
)

const maxJSONBodyBytes = 1 << 20

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
			status.DataSource = "synthetic_simulation"
			status.SimulationService.Status = "connected"
			if historianStatus, historianErr := g.client.HistorianStatus(r.Context()); historianErr == nil {
				status.Historian.Status = historianStatus.Status
			} else {
				status.Historian.Status = "in_memory"
			}
		} else {
			status.SimulationConnected = false
			status.DataSource = "in_memory_fallback"
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
	source := history.Meta.Source
	if source == "" {
		source = "simulation"
	}
	httpapi.WriteData(w, r, http.StatusOK, history.Values, httpapi.MetaOptions{Count: len(history.Values), Source: source, Degraded: history.Meta.Degraded})
}

func (g *Gateway) ControlStatus(w http.ResponseWriter, r *http.Request) {
	status, err := g.client.ControlStatus(r.Context())
	if err != nil {
		httpapi.WriteError(w, r, http.StatusServiceUnavailable, "SIMULATION_UNAVAILABLE", "Simulation control status is unavailable")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) SetControlMode(w http.ResponseWriter, r *http.Request) {
	session, ok := requirePermission(w, r, auth.PermissionChangeControlMode)
	if !ok {
		return
	}
	request, ok := httpapi.DecodeJSONBody[ModeChangeRequest](w, r, maxJSONBodyBytes, "Control mode request body is invalid JSON")
	if !ok {
		return
	}
	if request.RequestedBy == "" {
		request.RequestedBy = session.DisplayName
	}
	status, err := g.client.SetControlMode(r.Context(), request)
	if err != nil {
		g.writeSimulationCommandError(w, r, err)
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) PIDStatus(w http.ResponseWriter, r *http.Request) {
	status, err := g.client.PIDStatus(r.Context())
	if err != nil {
		httpapi.WriteError(w, r, http.StatusServiceUnavailable, "SIMULATION_UNAVAILABLE", "Simulation PID status is unavailable")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) HistorianStatus(w http.ResponseWriter, r *http.Request) {
	status, err := g.client.HistorianStatus(r.Context())
	if err != nil {
		httpapi.WriteData(w, r, http.StatusOK, HistorianStatus{
			Enabled:          false,
			Mode:             "in_memory",
			Status:           "unavailable_fallback",
			Database:         "in_memory",
			FallbackActive:   true,
			SimulationOnly:   true,
			SafetyDisclaimer: "The historian stores synthetic simulation data for demo, learning and portfolio purposes only.",
		}, httpapi.MetaOptions{Source: "memory", Degraded: true})
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) MQTTStatus(w http.ResponseWriter, r *http.Request) {
	status, err := g.client.MQTTStatus(r.Context())
	if err != nil {
		httpapi.WriteData(w, r, http.StatusOK, MQTTStatus{
			Enabled:          false,
			Connected:        false,
			Status:           "unavailable",
			BrokerURL:        "",
			ClientID:         "",
			TopicPrefix:      "",
			SimulationOnly:   true,
			SafetyDisclaimer: "MQTT topics contain synthetic simulation payloads only. The bridge is publish-only and cannot control equipment.",
		}, httpapi.MetaOptions{Source: "memory", Degraded: true})
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) UpdatePIDConfig(w http.ResponseWriter, r *http.Request) {
	session, ok := requirePermission(w, r, auth.PermissionUpdatePIDConfig)
	if !ok {
		return
	}
	request, ok := httpapi.DecodeJSONBody[PIDConfigUpdateRequest](w, r, maxJSONBodyBytes, "PID config request body is invalid JSON")
	if !ok {
		return
	}
	if request.RequestedBy == "" {
		request.RequestedBy = session.DisplayName
	}
	status, err := g.client.UpdatePIDConfig(r.Context(), request)
	if err != nil {
		g.writeSimulationCommandError(w, r, err)
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
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
	session, ok := requirePermission(w, r, auth.PermissionAcknowledgeAlarm)
	if !ok {
		return
	}
	request, ok := httpapi.DecodeJSONBody[AlarmAcknowledgeRequest](w, r, maxJSONBodyBytes, "Alarm acknowledge request body is invalid JSON")
	if !ok {
		return
	}
	if request.AcknowledgedBy == "" {
		request.AcknowledgedBy = session.DisplayName
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
	if _, ok := requirePermission(w, r, auth.PermissionRunScenario); !ok {
		return
	}
	status, err := g.client.StartScenario(r.Context(), r.PathValue("scenarioName"))
	if err != nil {
		httpapi.WriteError(w, r, http.StatusBadGateway, "SCENARIO_START_FAILED", "Failed to start simulation scenario")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) StopScenario(w http.ResponseWriter, r *http.Request) {
	if _, ok := requirePermission(w, r, auth.PermissionRunScenario); !ok {
		return
	}
	status, err := g.client.StopScenario(r.Context())
	if err != nil {
		httpapi.WriteError(w, r, http.StatusBadGateway, "SCENARIO_STOP_FAILED", "Failed to stop simulation scenario")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) Reset(w http.ResponseWriter, r *http.Request) {
	if _, ok := requirePermission(w, r, auth.PermissionRunScenario); !ok {
		return
	}
	status, err := g.client.Reset(r.Context())
	if err != nil {
		httpapi.WriteError(w, r, http.StatusBadGateway, "SIMULATION_RESET_FAILED", "Failed to reset simulation")
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{Source: "simulation"})
}

func (g *Gateway) SubmitCommand(w http.ResponseWriter, r *http.Request) {
	session, ok := requirePermission(w, r, auth.PermissionSendCommand)
	if !ok {
		return
	}
	request, ok := httpapi.DecodeJSONBody[CommandRequest](w, r, maxJSONBodyBytes, "Command request body is invalid JSON")
	if !ok {
		return
	}

	if request.Source == "" {
		request.Source = "frontend"
	}
	if request.RequestedBy == "" {
		request.RequestedBy = session.DisplayName
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

func requirePermission(w http.ResponseWriter, r *http.Request, permission auth.Permission) (auth.Session, bool) {
	session := auth.FromRequest(r)
	if session.Has(permission) {
		return session, true
	}
	metrics.ObserveRBACForbidden(string(permission), string(session.Role))
	httpapi.WriteErrorPayload(w, r, http.StatusForbidden, httpapi.ErrorPayload{
		Code:               "RBAC_FORBIDDEN",
		Message:            "Demo user does not have permission to perform this simulation-only action.",
		RequiredPermission: string(permission),
		Role:               string(session.Role),
		SimulationOnly:     true,
	})
	return session, false
}

func (g *Gateway) RecentCommands(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseRecentLimit(w, r)
	if !ok {
		return
	}
	commands, err := g.client.RecentCommands(r.Context(), limit)
	if err != nil {
		g.writeSimulationCommandError(w, r, err)
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, commands, httpapi.MetaOptions{Count: len(commands), Source: "simulation"})
}

func (g *Gateway) RecentEvents(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseRecentLimit(w, r)
	if !ok {
		return
	}
	events, err := g.client.RecentEvents(r.Context(), limit)
	if err != nil {
		g.writeSimulationCommandError(w, r, err)
		return
	}
	httpapi.WriteData(w, r, http.StatusOK, events, httpapi.MetaOptions{Count: len(events), Source: "simulation"})
}

func parseRecentLimit(w http.ResponseWriter, r *http.Request) (int, bool) {
	raw := r.URL.Query().Get("limit")
	if raw == "" {
		return 0, true
	}
	limit, err := strconv.Atoi(raw)
	if err != nil || limit < 1 || limit > 200 {
		httpapi.WriteError(w, r, http.StatusBadRequest, "INVALID_LIMIT", "limit must be an integer between 1 and 200")
		return 0, false
	}
	return limit, true
}

func (g *Gateway) writeSimulationCommandError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, ErrDisabled) {
		metrics.ObserveSimulationProxyError("SIMULATION_DISABLED")
		httpapi.WriteError(w, r, http.StatusServiceUnavailable, "SIMULATION_UNAVAILABLE", "Simulation service is disabled")
		return
	}
	if responseErr, ok := IsResponseError(err); ok {
		status := responseErr.StatusCode
		if status == 0 {
			status = http.StatusBadGateway
		}
		metrics.ObserveSimulationProxyError(responseErr.Code)
		httpapi.WriteError(w, r, status, responseErr.Code, responseErr.Message)
		return
	}
	metrics.ObserveSimulationProxyError("SIMULATION_UNAVAILABLE")
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
		textPointWithQuality("P-101.STATE", "Pump State", valueOrFallback(s.PumpState, "Unknown"), telemetry.QualityGood, s.Timestamp),
		numberPoint("P-101.RPM", "Pump Speed", s.PumpRPM, "rpm", s.Timestamp),
		textPointWithQuality("HX-101.STATE", "Heat Exchanger State", valueOrFallback(s.HeatExchangerState, "Reduced Duty"), telemetry.QualityGood, s.Timestamp),
		textPointWithQuality("TIC-101.MODE", "PID Controller Mode", valueOrFallback(s.PIDControllerMode, "Disabled"), telemetry.QualityUncertain, s.Timestamp),
		numberPoint("TIC-101.SETPOINT", "PID Setpoint", s.PIDSetpointC, "C", s.Timestamp),
		numberPoint("TIC-101.PV", "PID Process Value", s.PIDProcessValueC, "C", s.Timestamp),
		numberPoint("TIC-101.ERROR", "PID Error", s.PIDErrorC, "C", s.Timestamp),
		numberPoint("TIC-101.OUTPUT", "PID Output", s.PIDOutputPct, "%", s.Timestamp),
		numberPoint("TIC-101.P_TERM", "PID P Term", s.PIDPTermPct, "%", s.Timestamp),
		numberPoint("TIC-101.I_TERM", "PID I Term", s.PIDITermPct, "%", s.Timestamp),
		numberPoint("TIC-101.D_TERM", "PID D Term", s.PIDDTermPct, "%", s.Timestamp),
		textPointWithQuality("TIC-101.STATUS", "PID Status", valueOrFallback(s.PIDStatus, "Manual"), telemetry.QualityGood, s.Timestamp),
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
