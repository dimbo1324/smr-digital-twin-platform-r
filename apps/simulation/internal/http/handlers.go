package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/alarms"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/config"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/engine"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

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

func (h *Handler) ActiveAlarms(w http.ResponseWriter, _ *http.Request) {
	alarms := h.engine.ActiveAlarms()
	writeData(w, alarms, len(alarms))
}

func (h *Handler) Alarms(w http.ResponseWriter, _ *http.Request) {
	alarms := h.engine.Alarms()
	writeData(w, alarms, len(alarms))
}

func (h *Handler) AlarmEvents(w http.ResponseWriter, r *http.Request) {
	limit := parseLimit(r.URL.Query().Get("limit"), 100)
	events := h.engine.AlarmEvents(limit)
	writeData(w, events, len(events))
}

func (h *Handler) Alarm(w http.ResponseWriter, r *http.Request) {
	alarm, ok := h.engine.Alarm(r.PathValue("alarmId"))
	if !ok {
		writeError(w, http.StatusNotFound, "ALARM_NOT_FOUND", "Alarm not found")
		return
	}
	writeData(w, alarm, 1)
}

func (h *Handler) AcknowledgeAlarm(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Actor string `json:"actor"`
		Note  string `json:"note"`
	}
	if r.Body != nil {
		defer r.Body.Close()
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil && !errors.Is(err, io.EOF) {
			writeError(w, http.StatusBadRequest, "INVALID_ACKNOWLEDGEMENT", "Invalid acknowledgement request")
			return
		}
	}

	alarm, err := h.engine.AcknowledgeAlarm(r.PathValue("alarmId"), request.Actor, request.Note)
	if err != nil {
		switch {
		case errors.Is(err, alarms.ErrAlarmNotFound):
			writeError(w, http.StatusNotFound, "ALARM_NOT_FOUND", "Alarm not found")
		case errors.Is(err, alarms.ErrAlarmAlreadyCleared):
			writeError(w, http.StatusConflict, "ALARM_ALREADY_CLEARED", "Cleared alarm cannot be acknowledged")
		case errors.Is(err, alarms.ErrInvalidAcknowledgement):
			writeError(w, http.StatusBadRequest, "INVALID_ACKNOWLEDGEMENT", "Acknowledgement note is too long")
		default:
			writeError(w, http.StatusInternalServerError, "ALARM_ACKNOWLEDGE_FAILED", "Failed to acknowledge alarm")
		}
		return
	}
	writeData(w, map[string]model.Alarm{"alarm": alarm}, 1)
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

func parseLimit(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}
	if value > 1000 {
		return 1000
	}
	return value
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
