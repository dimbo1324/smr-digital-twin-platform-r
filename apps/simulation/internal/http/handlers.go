package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/config"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/engine"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

const maxJSONBodyBytes = 1 << 20

type responseMeta struct {
	Timestamp      time.Time `json:"timestamp"`
	Source         string    `json:"source"`
	SimulationOnly bool      `json:"simulationOnly"`
	Count          int       `json:"count,omitempty"`
}

type response struct {
	Data any          `json:"data"`
	Meta responseMeta `json:"meta"`
}

type errorResponse struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
	Meta responseMeta `json:"meta"`
}

type Handler struct {
	cfg    config.Config
	engine *engine.Engine
}

func NewHandler(cfg config.Config, engine *engine.Engine) *Handler {
	return &Handler{cfg: cfg, engine: engine}
}

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":         "ok",
		"service":        h.cfg.AppName,
		"version":        h.cfg.Version,
		"environment":    h.cfg.Environment,
		"simulationOnly": true,
		"timestamp":      time.Now().UTC(),
	})
}

func (h *Handler) Status(w http.ResponseWriter, _ *http.Request) {
	writeData(w, h.engine.Status(), 0)
}

func (h *Handler) Assets(w http.ResponseWriter, _ *http.Request) {
	assets := h.engine.Assets()
	writeData(w, assets, len(assets))
}

func (h *Handler) LatestTelemetry(w http.ResponseWriter, _ *http.Request) {
	writeData(w, h.engine.Snapshot(), 1)
}

func (h *Handler) History(w http.ResponseWriter, r *http.Request) {
	window, err := parseWindow(r.URL.Query().Get("window"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_WINDOW", "Supported windows are 5m, 15m, 30m, and 1h")
		return
	}
	values := h.engine.History(window)
	writeData(w, values, len(values))
}

func (h *Handler) ControlStatus(w http.ResponseWriter, _ *http.Request) {
	writeData(w, h.engine.ControlStatus(), 0)
}

func (h *Handler) SetControlMode(w http.ResponseWriter, r *http.Request) {
	var request model.ModeChangeRequest
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Control mode request body is invalid JSON")
		return
	}

	status, err := h.engine.SetControlMode(request)
	if err != nil {
		var commandErr *engine.CommandError
		if errors.As(err, &commandErr) {
			writeError(w, commandErr.HTTPStatus, commandErr.Code, commandErr.Message)
			return
		}
		writeError(w, http.StatusInternalServerError, "CONTROL_MODE_FAILED", "Failed to update control mode")
		return
	}
	writeData(w, status, 0)
}

func (h *Handler) PIDStatus(w http.ResponseWriter, _ *http.Request) {
	writeData(w, h.engine.PIDStatus(), 0)
}

func (h *Handler) UpdatePIDConfig(w http.ResponseWriter, r *http.Request) {
	var request model.PIDConfigUpdateRequest
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "PID config request body is invalid JSON")
		return
	}

	status, err := h.engine.UpdatePIDConfig(request)
	if err != nil {
		var commandErr *engine.CommandError
		if errors.As(err, &commandErr) {
			writeError(w, commandErr.HTTPStatus, commandErr.Code, commandErr.Message)
			return
		}
		writeError(w, http.StatusInternalServerError, "PID_CONFIG_FAILED", "Failed to update PID configuration")
		return
	}
	writeData(w, status, 0)
}

func (h *Handler) ActiveAlarms(w http.ResponseWriter, _ *http.Request) {
	alarms := h.engine.ActiveAlarms()
	writeData(w, alarms, len(alarms))
}

func (h *Handler) AlarmHistory(w http.ResponseWriter, _ *http.Request) {
	alarms := h.engine.AlarmHistory()
	writeData(w, alarms, len(alarms))
}

func (h *Handler) AcknowledgeAlarm(w http.ResponseWriter, r *http.Request) {
	var request model.AlarmAcknowledgeRequest
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil && !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Alarm acknowledge request body is invalid JSON")
		return
	}

	alarm, err := h.engine.AcknowledgeAlarm(r.PathValue("alarmID"), request)
	if err != nil {
		var alarmErr *engine.AlarmError
		if errors.As(err, &alarmErr) {
			writeError(w, alarmErr.HTTPStatus, alarmErr.Code, alarmErr.Message)
			return
		}
		writeError(w, http.StatusInternalServerError, "ALARM_ACKNOWLEDGE_FAILED", "Failed to acknowledge alarm")
		return
	}

	writeData(w, alarm, 0)
}

func (h *Handler) Scenarios(w http.ResponseWriter, _ *http.Request) {
	scenarios := h.engine.Scenarios()
	writeData(w, scenarios, len(scenarios))
}

func (h *Handler) StartScenario(w http.ResponseWriter, r *http.Request) {
	name := model.ScenarioName(r.PathValue("scenarioName"))
	if err := h.engine.SetScenario(name); err != nil {
		if errors.Is(err, engine.ErrUnknownScenario) {
			writeError(w, http.StatusBadRequest, "INVALID_SCENARIO", "Unknown simulation scenario")
			return
		}
		writeError(w, http.StatusInternalServerError, "SCENARIO_START_FAILED", "Failed to start scenario")
		return
	}
	writeData(w, h.engine.Status(), 0)
}

func (h *Handler) StopScenario(w http.ResponseWriter, _ *http.Request) {
	_ = h.engine.ClearScenario()
	writeData(w, h.engine.Status(), 0)
}

func (h *Handler) Reset(w http.ResponseWriter, _ *http.Request) {
	h.engine.Reset()
	writeData(w, h.engine.Status(), 0)
}

func (h *Handler) SubmitCommand(w http.ResponseWriter, r *http.Request) {
	var request model.CommandRequest
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Command request body is invalid JSON")
		return
	}

	command, err := h.engine.SubmitCommand(request)
	if err != nil {
		var commandErr *engine.CommandError
		if errors.As(err, &commandErr) {
			writeError(w, commandErr.HTTPStatus, commandErr.Code, commandErr.Message)
			return
		}
		writeError(w, http.StatusInternalServerError, "COMMAND_FAILED", "Failed to process simulation command")
		return
	}

	writeData(w, command, 0)
}

func (h *Handler) RecentCommands(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseRecentLimit(w, r)
	if !ok {
		return
	}
	commands := h.engine.RecentCommandsLimited(limit)
	writeData(w, commands, len(commands))
}

func (h *Handler) RecentEvents(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseRecentLimit(w, r)
	if !ok {
		return
	}
	events := h.engine.RecentEventsLimited(limit)
	writeData(w, events, len(events))
}

func parseWindow(raw string) (time.Duration, error) {
	if raw == "" {
		return 15 * time.Minute, nil
	}
	switch raw {
	case "5m":
		return 5 * time.Minute, nil
	case "15m":
		return 15 * time.Minute, nil
	case "30m":
		return 30 * time.Minute, nil
	case "1h":
		return time.Hour, nil
	default:
		return 0, errors.New("invalid window")
	}
}

func parseRecentLimit(w http.ResponseWriter, r *http.Request) (int, bool) {
	raw := r.URL.Query().Get("limit")
	if raw == "" {
		return 0, true
	}
	limit, err := strconv.Atoi(raw)
	if err != nil || limit < 1 || limit > 200 {
		writeError(w, http.StatusBadRequest, "INVALID_LIMIT", "limit must be an integer between 1 and 200")
		return 0, false
	}
	return limit, true
}

func writeData(w http.ResponseWriter, data any, count int) {
	writeJSON(w, http.StatusOK, response{Data: data, Meta: responseMeta{Timestamp: time.Now().UTC(), Source: "simulation", SimulationOnly: true, Count: count}})
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	var payload errorResponse
	payload.Error.Code = code
	payload.Error.Message = message
	payload.Meta = responseMeta{Timestamp: time.Now().UTC(), Source: "simulation", SimulationOnly: true}
	writeJSON(w, status, payload)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
