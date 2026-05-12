package simulation

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/assets"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/system"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/telemetry"
)

func TestLatestTelemetryReturnsSimulationDataWhenClientSucceeds(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/telemetry/latest", nil)
	gateway.LatestTelemetry(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	meta := payload["meta"].(map[string]any)
	if meta["source"] != "simulation" {
		t.Fatalf("expected simulation source, got %v", meta["source"])
	}
}

func TestLatestTelemetryFallsBackWhenSimulationUnavailable(t *testing.T) {
	gateway := newTestGateway("http://127.0.0.1:1", true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/telemetry/latest", nil)
	gateway.LatestTelemetry(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	meta := payload["meta"].(map[string]any)
	if meta["degraded"] != true {
		t.Fatalf("expected degraded fallback meta, got %v", meta["degraded"])
	}
}

func TestSystemStatusIncludesSimulationConnected(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/system/status", nil)
	gateway.SystemStatus(recorder, request)

	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["simulationConnected"] != true {
		t.Fatalf("expected simulationConnected true, got %v", data["simulationConnected"])
	}
}

func TestActiveAlarmsProxiesSimulationAlarms(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/alarms/active", nil)
	gateway.ActiveAlarms(recorder, request)

	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].([]any)
	if len(data) != 1 {
		t.Fatalf("expected 1 alarm, got %d", len(data))
	}
}

func TestScenarioStartEndpointProxiesRequest(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/simulation/scenarios/trip/start", nil)
	request.SetPathValue("scenarioName", "trip")
	gateway.StartScenario(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["activeScenario"] != "trip" {
		t.Fatalf("expected trip scenario, got %v", data["activeScenario"])
	}
}

func newTestGateway(baseURL string, enabled bool) *Gateway {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return NewGateway(
		NewClient(baseURL, 100*time.Millisecond, enabled),
		assets.NewService(assets.NewMemoryRepository()),
		telemetry.NewService(telemetry.NewMemoryRepository()),
		system.NewService(system.ServiceConfig{Environment: "test", Version: "0.1.0-test"}),
		logger,
	)
}

func fakeSimulationServer() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.URL.Path == "/api/v1/simulation/status":
			_, _ = w.Write([]byte(`{"data":{"running":true,"mode":"NORMAL","health":"OK","activeScenario":"normal","tickMs":1000,"historySize":3600,"snapshotCount":1,"lastSimulationTimestamp":"2026-05-12T12:00:00Z","simulationOnly":true},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/telemetry/latest":
			_, _ = w.Write([]byte(`{"data":{"reactorPowerPct":72,"thermalPowerMw":216,"electricPowerMw":76,"primaryTemperatureC":286,"secondaryTemperatureC":222,"primaryPressureMPa":15.1,"secondaryPressureMPa":6.2,"coolantFlowPct":88,"steamGeneratorLevelPct":62,"turbineRpm":3600,"generatorLoadPct":71,"condenserVacuumKPa":88,"feedwaterFlowPct":76,"vibrationMmS":2.1,"radiationLevelUSvH":0.18,"availabilityPct":99,"efficiencyPct":35,"timestamp":"2026-05-12T12:00:00Z","mode":"NORMAL","health":"OK","simulationOnly":true,"scenario":"normal"},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/alarms/active":
			_, _ = w.Write([]byte(`{"data":[{"id":"alarm-1","assetId":"primary-loop","code":"TEST","title":"Test","message":"Synthetic alarm","severity":"WARNING","status":"ACTIVE","value":1,"threshold":1,"unit":"%","startedAt":"2026-05-12T12:00:00Z","updatedAt":"2026-05-12T12:00:00Z"}],"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true,"count":1}}`))
		case r.URL.Path == "/api/v1/simulation/scenarios/trip/start":
			_, _ = w.Write([]byte(`{"data":{"running":true,"mode":"TRIP","health":"TRIP","activeScenario":"trip","tickMs":1000,"historySize":3600,"snapshotCount":1,"lastSimulationTimestamp":"2026-05-12T12:00:00Z","simulationOnly":true},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
}

func decodeMap(t *testing.T, data []byte) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return payload
}
