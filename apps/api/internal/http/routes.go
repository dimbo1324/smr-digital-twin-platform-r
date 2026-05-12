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
	mux.Handle("GET /api/v1/alarms/active", s.handlers.ActiveAlarms)
	mux.Handle("GET /api/v1/process/topology", s.handlers.ProcessTopology)
	mux.Handle("GET /api/v1/simulation/scenarios", s.handlers.Scenarios)
	mux.Handle("POST /api/v1/simulation/scenarios/{scenarioName}/start", s.handlers.StartScenario)
	mux.Handle("POST /api/v1/simulation/scenarios/stop", s.handlers.StopScenario)
	mux.Handle("POST /api/v1/simulation/reset", s.handlers.ResetSimulation)
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
