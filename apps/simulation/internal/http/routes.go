package httpapi

import "net/http"

func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()
	h := s.handler

	mux.HandleFunc("GET /health", h.Health)
	mux.HandleFunc("GET /api/v1/simulation/status", h.Status)
	mux.HandleFunc("GET /api/v1/simulation/assets", h.Assets)
	mux.HandleFunc("GET /api/v1/simulation/telemetry/latest", h.LatestTelemetry)
	mux.HandleFunc("GET /api/v1/simulation/telemetry/history", h.History)
	mux.HandleFunc("GET /api/v1/simulation/control/status", h.ControlStatus)
	mux.HandleFunc("POST /api/v1/simulation/control/mode", h.SetControlMode)
	mux.HandleFunc("GET /api/v1/simulation/pid/status", h.PIDStatus)
	mux.HandleFunc("PATCH /api/v1/simulation/pid/config", h.UpdatePIDConfig)
	mux.HandleFunc("GET /api/v1/simulation/historian/status", h.HistorianStatus)
	mux.HandleFunc("GET /api/v1/simulation/alarms/active", h.ActiveAlarms)
	mux.HandleFunc("GET /api/v1/simulation/alarms/history", h.AlarmHistory)
	mux.HandleFunc("POST /api/v1/simulation/alarms/{alarmID}/acknowledge", h.AcknowledgeAlarm)
	mux.HandleFunc("GET /api/v1/simulation/scenarios", h.Scenarios)
	mux.HandleFunc("POST /api/v1/simulation/scenarios/{scenarioName}/start", h.StartScenario)
	mux.HandleFunc("POST /api/v1/simulation/scenarios/stop", h.StopScenario)
	mux.HandleFunc("POST /api/v1/simulation/reset", h.Reset)
	mux.HandleFunc("POST /api/v1/simulation/commands", h.SubmitCommand)
	mux.HandleFunc("GET /api/v1/simulation/commands/recent", h.RecentCommands)
	mux.HandleFunc("GET /api/v1/simulation/events/recent", h.RecentEvents)
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Route not found")
	})

	return mux
}
