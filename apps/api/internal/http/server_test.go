package httpapi_test

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/assets"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/config"
	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/http"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/system"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/telemetry"
)

func TestHealthReturnsOK(t *testing.T) {
	router := newTestRouter()

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/health", nil)

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON response: %v", err)
	}

	if payload["status"] != "ok" {
		t.Fatalf("expected health status ok, got %v", payload["status"])
	}
}

func TestSystemStatusReturnsWrappedData(t *testing.T) {
	router := newTestRouter()

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/system/status", nil)

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	payload := decodeEnvelope(t, response.Body.Bytes())
	data, ok := payload["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}

	if data["mode"] != "simulation_only" {
		t.Fatalf("expected simulation_only mode, got %v", data["mode"])
	}
}

func TestAssetsReturnsNonEmptyData(t *testing.T) {
	router := newTestRouter()

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/assets", nil)

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	payload := decodeEnvelope(t, response.Body.Bytes())
	data, ok := payload["data"].([]any)
	if !ok {
		t.Fatalf("expected data array, got %T", payload["data"])
	}

	if len(data) == 0 {
		t.Fatal("expected non-empty assets data")
	}
}

func TestLatestTelemetryReturnsNonEmptyData(t *testing.T) {
	router := newTestRouter()

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/telemetry/latest", nil)

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	payload := decodeEnvelope(t, response.Body.Bytes())
	data, ok := payload["data"].([]any)
	if !ok {
		t.Fatalf("expected data array, got %T", payload["data"])
	}

	if len(data) == 0 {
		t.Fatal("expected non-empty telemetry data")
	}
}

func TestUnknownRouteReturnsJSON404(t *testing.T) {
	router := newTestRouter()

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/missing", nil)

	router.ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, response.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON response: %v", err)
	}

	if _, ok := payload["error"].(map[string]any); !ok {
		t.Fatalf("expected error object, got %T", payload["error"])
	}
}

func TestCORSAllowsDemoUserHeader(t *testing.T) {
	router := newTestRouter()

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/session", nil)
	request.Header.Set("Origin", "http://localhost:5173")
	request.Header.Set("Access-Control-Request-Headers", "X-Demo-User")

	router.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d", http.StatusNoContent, response.Code)
	}

	allowedHeaders := response.Header().Get("Access-Control-Allow-Headers")
	if !strings.Contains(allowedHeaders, "X-Demo-User") {
		t.Fatalf("expected X-Demo-User in CORS allow headers, got %q", allowedHeaders)
	}
}

func newTestRouter() http.Handler {
	cfg := config.Config{
		AppName:        "smr-twin-api",
		Environment:    "test",
		HTTPHost:       "127.0.0.1",
		HTTPPort:       "0",
		LogLevel:       "error",
		AllowedOrigins: []string{"http://localhost:5173"},
		Version:        "0.1.0-test",
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	assetService := assets.NewService(assets.NewMemoryRepository())
	telemetryService := telemetry.NewService(telemetry.NewMemoryRepository())
	systemService := system.NewService(system.ServiceConfig{
		Environment: cfg.Environment,
		Version:     cfg.Version,
	})

	server := httpapi.NewServer(cfg, logger, httpapi.Handlers{
		SystemStatus:     system.NewHandler(systemService, logger),
		Assets:           assets.NewHandler(assetService, logger),
		LatestTelemetry:  telemetry.NewHandler(telemetryService, logger),
		TelemetryHistory: emptyOKHandler(),
		ControlStatus:    emptyOKHandler(),
		SetControlMode:   emptyOKHandler(),
		PIDStatus:        emptyOKHandler(),
		UpdatePIDConfig:  emptyOKHandler(),
		HistorianStatus:  emptyOKHandler(),
		MQTTStatus:       emptyOKHandler(),
		ActiveAlarms:     emptyOKHandler(),
		AlarmHistory:     emptyOKHandler(),
		AcknowledgeAlarm: emptyOKHandler(),
		Scenarios:        emptyOKHandler(),
		StartScenario:    emptyOKHandler(),
		StopScenario:     emptyOKHandler(),
		ResetSimulation:  emptyOKHandler(),
		SubmitCommand:    emptyOKHandler(),
		RecentCommands:   emptyOKHandler(),
		RecentEvents:     emptyOKHandler(),
	})

	return server.Router()
}

func emptyOKHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
}

func decodeEnvelope(t *testing.T, data []byte) map[string]any {
	t.Helper()

	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		t.Fatalf("expected valid JSON response: %v", err)
	}

	return payload
}
