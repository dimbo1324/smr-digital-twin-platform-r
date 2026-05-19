package simulation

import (
	"bytes"
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
	data := payload["data"].([]any)
	if !containsTelemetryTag(data, "TT-101") {
		t.Fatal("expected process-loop telemetry tag TT-101")
	}
	if !containsTelemetryTag(data, "SMR-POWER") {
		t.Fatal("expected unit overview telemetry tag SMR-POWER")
	}
	if !containsTelemetryTag(data, "V-101.STATE") {
		t.Fatal("expected valve state telemetry tag V-101.STATE")
	}
	if !containsTelemetryTag(data, "P-101.RPM") {
		t.Fatal("expected pump speed telemetry tag P-101.RPM")
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
	if data["dataSource"] != "synthetic_simulation" {
		t.Fatalf("expected synthetic_simulation dataSource, got %v", data["dataSource"])
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

func TestAlarmHistoryProxiesSimulationHistory(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/alarms/history", nil)
	gateway.AlarmHistory(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].([]any)
	if len(data) != 1 {
		t.Fatalf("expected 1 historical alarm, got %d", len(data))
	}
}

func TestAcknowledgeAlarmProxiesRequest(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/alarms/alarm-1/acknowledge", bytes.NewReader([]byte(`{"comment":"seen"}`)))
	request.SetPathValue("alarmID", "alarm-1")
	gateway.AcknowledgeAlarm(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["status"] != "ACKNOWLEDGED" {
		t.Fatalf("expected ACKNOWLEDGED, got %v", data["status"])
	}
	if data["acknowledgedBy"] != "demo-operator" {
		t.Fatalf("expected default acknowledgedBy, got %v", data["acknowledgedBy"])
	}
}

func TestAcknowledgeAlarmNotFoundPreservesSimulationError(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/alarms/missing/acknowledge", bytes.NewReader([]byte(`{"acknowledgedBy":"demo"}`)))
	request.SetPathValue("alarmID", "missing")
	gateway.AcknowledgeAlarm(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	errPayload := payload["error"].(map[string]any)
	if errPayload["code"] != "ALARM_NOT_FOUND" {
		t.Fatalf("expected ALARM_NOT_FOUND, got %v", errPayload["code"])
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

func TestSubmitCommandProxiesRequest(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	body := []byte(`{"targetTag":"V-101","commandType":"OPEN","payload":{"reason":"operator_demo"}}`)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/commands", bytes.NewReader(body))
	gateway.SubmitCommand(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["targetTag"] != "V-101" {
		t.Fatalf("expected V-101 target, got %v", data["targetTag"])
	}
	if data["source"] != "frontend" {
		t.Fatalf("expected frontend source, got %v", data["source"])
	}
}

func TestSubmitCommandMalformedJSONReturns400(t *testing.T) {
	gateway := newTestGateway("http://127.0.0.1:1", true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/commands", bytes.NewReader([]byte(`{`)))
	gateway.SubmitCommand(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
}

func TestSubmitCommandSimulationUnavailableReturns502(t *testing.T) {
	gateway := newTestGateway("http://127.0.0.1:1", true)

	body := []byte(`{"targetTag":"V-101","commandType":"OPEN","payload":{"reason":"operator_demo"}}`)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/commands", bytes.NewReader(body))
	gateway.SubmitCommand(recorder, request)

	if recorder.Code != http.StatusBadGateway {
		t.Fatalf("expected status 502, got %d", recorder.Code)
	}
}

func TestRecentCommandsAndEventsProxy(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	commandRecorder := httptest.NewRecorder()
	gateway.RecentCommands(commandRecorder, httptest.NewRequest(http.MethodGet, "/api/v1/commands/recent?limit=1", nil))
	if commandRecorder.Code != http.StatusOK {
		t.Fatalf("expected commands status 200, got %d", commandRecorder.Code)
	}

	eventRecorder := httptest.NewRecorder()
	gateway.RecentEvents(eventRecorder, httptest.NewRequest(http.MethodGet, "/api/v1/events/recent?limit=1", nil))
	if eventRecorder.Code != http.StatusOK {
		t.Fatalf("expected events status 200, got %d", eventRecorder.Code)
	}
}

func TestRecentEndpointsRejectInvalidLimit(t *testing.T) {
	gateway := newTestGateway("http://127.0.0.1:1", true)

	commandRecorder := httptest.NewRecorder()
	gateway.RecentCommands(commandRecorder, httptest.NewRequest(http.MethodGet, "/api/v1/commands/recent?limit=bad", nil))
	if commandRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expected commands status 400, got %d", commandRecorder.Code)
	}

	eventRecorder := httptest.NewRecorder()
	gateway.RecentEvents(eventRecorder, httptest.NewRequest(http.MethodGet, "/api/v1/events/recent?limit=500", nil))
	if eventRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expected events status 400, got %d", eventRecorder.Code)
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
			_, _ = w.Write([]byte(`{"data":{"reactorPowerPct":72,"thermalPowerMw":216,"electricPowerMw":76,"primaryTemperatureC":286,"secondaryTemperatureC":222,"primaryPressureMPa":15.1,"secondaryPressureMPa":6.2,"coolantFlowPct":88,"steamGeneratorLevelPct":62,"turbineRpm":3600,"generatorLoadPct":71,"condenserVacuumKPa":88,"feedwaterFlowPct":76,"vibrationMmS":2.1,"radiationLevelUSvH":0.18,"availabilityPct":99,"efficiencyPct":35,"loopTemperatureC":286.4,"loopPressureMPa":15.1,"loopFlowKgS":118,"tankLevelPct":72,"valvePositionPct":64,"valveState":"STOPPED","pumpState":"RUNNING","pumpRpm":1800,"heatExchangerState":"Online","pidControllerMode":"Disabled","timestamp":"2026-05-12T12:00:00Z","mode":"NORMAL","health":"OK","simulationOnly":true,"scenario":"normal"},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/alarms/active":
			_, _ = w.Write([]byte(`{"data":[{"id":"alarm-1","ruleId":"TEST","assetId":"primary-loop","tag":"primary-loop","code":"TEST","title":"Test","message":"Synthetic alarm","severity":"WARNING","status":"ACTIVE","value":1,"lastValue":1,"threshold":1,"unit":"%","source":"alarm-evaluator","startedAt":"2026-05-12T12:00:00Z","activeAt":"2026-05-12T12:00:00Z","updatedAt":"2026-05-12T12:00:00Z"}],"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true,"count":1}}`))
		case r.URL.Path == "/api/v1/simulation/alarms/history":
			_, _ = w.Write([]byte(`{"data":[{"id":"alarm-history-1","ruleId":"TEST","assetId":"primary-loop","tag":"primary-loop","code":"TEST","title":"Test","message":"Synthetic cleared alarm","severity":"WARNING","status":"CLEARED","value":0,"lastValue":0,"threshold":1,"unit":"%","source":"alarm-evaluator","startedAt":"2026-05-12T12:00:00Z","activeAt":"2026-05-12T12:00:00Z","updatedAt":"2026-05-12T12:10:00Z","clearedAt":"2026-05-12T12:10:00Z"}],"meta":{"timestamp":"2026-05-12T12:10:00Z","source":"simulation","simulationOnly":true,"count":1}}`))
		case r.URL.Path == "/api/v1/simulation/alarms/alarm-1/acknowledge":
			var request AlarmAcknowledgeRequest
			_ = json.NewDecoder(r.Body).Decode(&request)
			_, _ = w.Write([]byte(`{"data":{"id":"alarm-1","ruleId":"TEST","assetId":"primary-loop","tag":"primary-loop","code":"TEST","title":"Test","message":"Synthetic alarm","severity":"WARNING","status":"ACKNOWLEDGED","value":1,"lastValue":1,"threshold":1,"unit":"%","source":"alarm-evaluator","startedAt":"2026-05-12T12:00:00Z","activeAt":"2026-05-12T12:00:00Z","updatedAt":"2026-05-12T12:01:00Z","acknowledgedAt":"2026-05-12T12:01:00Z","acknowledgedBy":"` + request.AcknowledgedBy + `"},"meta":{"timestamp":"2026-05-12T12:01:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/alarms/missing/acknowledge":
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(`{"error":{"code":"ALARM_NOT_FOUND","message":"Alarm was not found"},"meta":{"timestamp":"2026-05-12T12:01:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/scenarios/trip/start":
			_, _ = w.Write([]byte(`{"data":{"running":true,"mode":"TRIP","health":"TRIP","activeScenario":"trip","tickMs":1000,"historySize":3600,"snapshotCount":1,"lastSimulationTimestamp":"2026-05-12T12:00:00Z","simulationOnly":true},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/commands":
			var request CommandRequest
			_ = json.NewDecoder(r.Body).Decode(&request)
			_, _ = w.Write([]byte(`{"data":{"id":"cmd-1","targetTag":"` + request.TargetTag + `","commandType":"` + request.CommandType + `","source":"` + request.Source + `","requestedBy":"` + request.RequestedBy + `","payload":{"reason":"operator_demo"},"status":"IN_PROGRESS","requestedAt":"2026-05-12T12:00:00Z","acceptedAt":"2026-05-12T12:00:00Z","resultMessage":"Command accepted by simulation engine"},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/commands/recent":
			_, _ = w.Write([]byte(`{"data":[{"id":"cmd-1","targetTag":"V-101","commandType":"OPEN","source":"frontend","requestedBy":"demo-engineer","payload":{"reason":"operator_demo"},"status":"IN_PROGRESS","requestedAt":"2026-05-12T12:00:00Z","acceptedAt":"2026-05-12T12:00:00Z"}],"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true,"count":1}}`))
		case r.URL.Path == "/api/v1/simulation/events/recent":
			_, _ = w.Write([]byte(`{"data":[{"id":"evt-1","type":"COMMAND_ACCEPTED","source":"simulation","severity":"INFO","message":"Command accepted","targetTag":"V-101","commandId":"cmd-1","timestamp":"2026-05-12T12:00:00Z"},{"id":"evt-2","type":"ALARM_ACTIVATED","source":"alarm-evaluator","severity":"WARNING","message":"Alarm activated","targetTag":"primary-loop","alarmId":"alarm-1","timestamp":"2026-05-12T12:01:00Z"}],"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true,"count":2}}`))
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

func containsTelemetryTag(items []any, tag string) bool {
	for _, item := range items {
		point, ok := item.(map[string]any)
		if ok && point["tag"] == tag {
			return true
		}
	}

	return false
}
