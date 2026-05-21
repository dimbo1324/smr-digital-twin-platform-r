package httpapi

import (
	"net/http"
	"time"
)

type HealthResponse struct {
	Status        string    `json:"status"`
	Service       string    `json:"service"`
	Version       string    `json:"version"`
	Environment   string    `json:"environment"`
	UptimeSeconds int64     `json:"uptimeSeconds"`
	Timestamp     time.Time `json:"timestamp"`
}

func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", s.handleHealth)
	mux.Handle("GET /api/v1/system/status", s.handlers.SystemStatus)
	mux.Handle("GET /api/v1/assets", s.handlers.Assets)
	mux.Handle("GET /api/v1/telemetry/latest", s.handlers.LatestTelemetry)
	mux.Handle("GET /api/v1/telemetry/history", s.handlers.TelemetryHistory)
	mux.Handle("GET /api/v1/control/status", s.handlers.ControlStatus)
	mux.Handle("POST /api/v1/control/mode", s.handlers.SetControlMode)
	mux.Handle("GET /api/v1/pid/status", s.handlers.PIDStatus)
	mux.Handle("PATCH /api/v1/pid/config", s.handlers.UpdatePIDConfig)
	mux.Handle("GET /api/v1/historian/status", s.handlers.HistorianStatus)
	mux.Handle("GET /api/v1/mqtt/status", s.handlers.MQTTStatus)
	mux.Handle("GET /api/v1/alarms/active", s.handlers.ActiveAlarms)
	mux.Handle("GET /api/v1/alarms/history", s.handlers.AlarmHistory)
	mux.Handle("POST /api/v1/alarms/{alarmID}/acknowledge", s.handlers.AcknowledgeAlarm)
	mux.Handle("GET /api/v1/simulation/scenarios", s.handlers.Scenarios)
	mux.Handle("POST /api/v1/simulation/scenarios/{scenarioName}/start", s.handlers.StartScenario)
	mux.Handle("POST /api/v1/simulation/scenarios/stop", s.handlers.StopScenario)
	mux.Handle("POST /api/v1/simulation/reset", s.handlers.ResetSimulation)
	mux.Handle("POST /api/v1/commands", s.handlers.SubmitCommand)
	mux.Handle("GET /api/v1/commands/recent", s.handlers.RecentCommands)
	mux.Handle("GET /api/v1/events/recent", s.handlers.RecentEvents)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		WriteError(w, r, http.StatusNotFound, "NOT_FOUND", "Route not found")
	})

	return mux
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, HealthResponse{
		Status:        "ok",
		Service:       s.cfg.AppName,
		Version:       s.cfg.Version,
		Environment:   s.cfg.Environment,
		UptimeSeconds: int64(time.Since(s.startedAt).Seconds()),
		Timestamp:     time.Now().UTC(),
	})
}
