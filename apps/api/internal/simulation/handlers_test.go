package simulation

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
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

func TestTelemetryHistoryPropagatesSimulationSourceMeta(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/telemetry/history?window=15m", nil)
	gateway.TelemetryHistory(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	meta := payload["meta"].(map[string]any)
	if meta["source"] != "persistent_historian" {
		t.Fatalf("expected persistent_historian source, got %v", meta["source"])
	}
	data := payload["data"].([]any)
	if len(data) != 1 {
		t.Fatalf("expected one telemetry history snapshot, got %d", len(data))
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
	withDemoUser(request, "demo-supervisor")
	gateway.AcknowledgeAlarm(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["status"] != "ACKNOWLEDGED" {
		t.Fatalf("expected ACKNOWLEDGED, got %v", data["status"])
	}
	if data["acknowledgedBy"] != "Demo Supervisor" {
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
	withDemoUser(request, "demo-supervisor")
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
	withDemoUser(request, "demo-supervisor")
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

func TestControlStatusProxiesSimulation(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/control/status", nil)
	gateway.ControlStatus(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["mode"] != "MANUAL" {
		t.Fatalf("expected MANUAL mode, got %v", data["mode"])
	}
}

func TestSetControlModeProxiesRequest(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/control/mode", bytes.NewReader([]byte(`{"mode":"AUTO","reason":"test"}`)))
	withDemoUser(request, "demo-supervisor")
	gateway.SetControlMode(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["mode"] != "AUTO" {
		t.Fatalf("expected AUTO mode, got %v", data["mode"])
	}
	if data["updatedBy"] != "Demo Supervisor" {
		t.Fatalf("expected default updatedBy, got %v", data["updatedBy"])
	}
}

func TestSetControlModeInvalidModePreservesSimulationError(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/control/mode", bytes.NewReader([]byte(`{"mode":"REMOTE"}`)))
	withDemoUser(request, "demo-supervisor")
	gateway.SetControlMode(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	errPayload := payload["error"].(map[string]any)
	if errPayload["code"] != "INVALID_CONTROL_MODE" {
		t.Fatalf("expected INVALID_CONTROL_MODE, got %v", errPayload["code"])
	}
}

func TestPIDStatusProxiesSimulation(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/pid/status", nil)
	gateway.PIDStatus(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["controllerTag"] != "TIC-101" {
		t.Fatalf("expected TIC-101 PID status, got %v", data["controllerTag"])
	}
}

func TestHistorianStatusProxiesSimulation(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/historian/status", nil)
	gateway.HistorianStatus(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["status"] != "connected" {
		t.Fatalf("expected historian connected, got %v", data["status"])
	}
}

func TestHistorianStatusFallsBackWhenSimulationUnavailable(t *testing.T) {
	gateway := newTestGateway("http://127.0.0.1:1", true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/historian/status", nil)
	gateway.HistorianStatus(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	meta := payload["meta"].(map[string]any)
	if meta["degraded"] != true {
		t.Fatalf("expected degraded historian fallback, got %v", meta["degraded"])
	}
}

func TestMQTTStatusProxiesSimulation(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/mqtt/status", nil)
	gateway.MQTTStatus(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["status"] != "connected" {
		t.Fatalf("expected MQTT connected, got %v", data["status"])
	}
}

func TestMQTTStatusFallsBackWhenSimulationUnavailable(t *testing.T) {
	gateway := newTestGateway("http://127.0.0.1:1", true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/mqtt/status", nil)
	gateway.MQTTStatus(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected fallback status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	meta := payload["meta"].(map[string]any)
	if meta["degraded"] != true {
		t.Fatalf("expected degraded MQTT fallback, got %v", meta["degraded"])
	}
}

func TestUpdatePIDConfigProxiesRequest(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/pid/config", bytes.NewReader([]byte(`{"setpoint":288,"kp":1.1}`)))
	withDemoUser(request, "demo-engineer")
	gateway.UpdatePIDConfig(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	data := payload["data"].(map[string]any)
	if data["setpoint"] != float64(288) {
		t.Fatalf("expected setpoint 288, got %v", data["setpoint"])
	}
}

func TestUpdatePIDConfigInvalidPreservesSimulationError(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/pid/config", bytes.NewReader([]byte(`{"setpoint":500}`)))
	withDemoUser(request, "demo-engineer")
	gateway.UpdatePIDConfig(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	errPayload := payload["error"].(map[string]any)
	if errPayload["code"] != "INVALID_PID_CONFIG" {
		t.Fatalf("expected INVALID_PID_CONFIG, got %v", errPayload["code"])
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

func TestSubmitCommandArbitrationRejectionPreserved(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	body := []byte(`{"targetTag":"V-101","commandType":"CLOSE","payload":{"reason":"operator_demo"}}`)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/commands", bytes.NewReader(body))
	gateway.SubmitCommand(recorder, request)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d", recorder.Code)
	}
	payload := decodeMap(t, recorder.Body.Bytes())
	errPayload := payload["error"].(map[string]any)
	if errPayload["code"] != "CONTROL_MODE_AUTO" {
		t.Fatalf("expected CONTROL_MODE_AUTO, got %v", errPayload["code"])
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

func TestRBACForbiddenForProtectedActions(t *testing.T) {
	server := fakeSimulationServer()
	defer server.Close()
	gateway := newTestGateway(server.URL, true)

	tests := []struct {
		name       string
		request    *http.Request
		invoke     func(http.ResponseWriter, *http.Request)
		permission string
	}{
		{
			name:       "command",
			request:    httptest.NewRequest(http.MethodPost, "/api/v1/commands", bytes.NewReader([]byte(`{"targetTag":"V-101","commandType":"OPEN","payload":{"reason":"operator_demo"}}`))),
			invoke:     gateway.SubmitCommand,
			permission: "SEND_COMMAND",
		},
		{
			name:       "pid",
			request:    httptest.NewRequest(http.MethodPatch, "/api/v1/pid/config", bytes.NewReader([]byte(`{"setpoint":288}`))),
			invoke:     gateway.UpdatePIDConfig,
			permission: "UPDATE_PID_CONFIG",
		},
		{
			name:       "control",
			request:    httptest.NewRequest(http.MethodPost, "/api/v1/control/mode", bytes.NewReader([]byte(`{"mode":"AUTO"}`))),
			invoke:     gateway.SetControlMode,
			permission: "CHANGE_CONTROL_MODE",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			withDemoUser(tc.request, "demo-viewer")
			tc.invoke(recorder, tc.request)
			if recorder.Code != http.StatusForbidden {
				t.Fatalf("expected status 403, got %d", recorder.Code)
			}
			payload := decodeMap(t, recorder.Body.Bytes())
			errPayload := payload["error"].(map[string]any)
			if errPayload["code"] != "RBAC_FORBIDDEN" {
				t.Fatalf("expected RBAC_FORBIDDEN, got %v", errPayload["code"])
			}
			if errPayload["requiredPermission"] != tc.permission {
				t.Fatalf("expected permission %s, got %v", tc.permission, errPayload["requiredPermission"])
			}
			if errPayload["role"] != "VIEWER" {
				t.Fatalf("expected role VIEWER, got %v", errPayload["role"])
			}
		})
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
			_, _ = w.Write([]byte(`{"data":{"reactorPowerPct":72,"thermalPowerMw":216,"electricPowerMw":76,"primaryTemperatureC":286,"secondaryTemperatureC":222,"primaryPressureMPa":15.1,"secondaryPressureMPa":6.2,"coolantFlowPct":88,"steamGeneratorLevelPct":62,"turbineRpm":3600,"generatorLoadPct":71,"condenserVacuumKPa":88,"feedwaterFlowPct":76,"vibrationMmS":2.1,"radiationLevelUSvH":0.18,"availabilityPct":99,"efficiencyPct":35,"loopTemperatureC":286.4,"loopPressureMPa":15.1,"loopFlowKgS":118,"tankLevelPct":72,"valvePositionPct":64,"valveState":"STOPPED","pumpState":"RUNNING","pumpRpm":1800,"heatExchangerState":"Online","pidControllerMode":"MANUAL","timestamp":"2026-05-12T12:00:00Z","mode":"NORMAL","health":"OK","simulationOnly":true,"scenario":"normal"},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/telemetry/history":
			_, _ = w.Write([]byte(`{"data":[{"loopTemperatureC":286.4,"timestamp":"2026-05-12T12:00:00Z","simulationOnly":true}],"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"persistent_historian","simulationOnly":true,"count":1}}`))
		case r.URL.Path == "/api/v1/simulation/control/status":
			_, _ = w.Write([]byte(`{"data":{"controllerTag":"TIC-101","controlledVariableTag":"TT-101","manipulatedVariableTag":"V-101.POS","mode":"MANUAL","authority":"USER","enabled":true,"pidImplemented":false,"reason":"Operator manual control","updatedAt":"2026-05-12T12:00:00Z","updatedBy":"system","safetyDisclaimer":"Simulation-only interface. No real plant control."},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/control/mode":
			var request ModeChangeRequest
			_ = json.NewDecoder(r.Body).Decode(&request)
			if request.Mode == "REMOTE" {
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(`{"error":{"code":"INVALID_CONTROL_MODE","message":"mode must be MANUAL, AUTO, or DISABLED"},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
				return
			}
			_, _ = w.Write([]byte(`{"data":{"controllerTag":"TIC-101","controlledVariableTag":"TT-101","manipulatedVariableTag":"V-101.POS","mode":"` + request.Mode + `","authority":"PID","enabled":true,"pidImplemented":false,"reason":"test","updatedAt":"2026-05-12T12:00:00Z","updatedBy":"` + request.RequestedBy + `","safetyDisclaimer":"Simulation-only interface. No real plant control."},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/pid/status":
			_, _ = w.Write([]byte(`{"data":{"controllerTag":"TIC-101","mode":"MANUAL","authority":"USER","active":false,"pidImplemented":true,"processVariableTag":"TT-101","processValue":286.4,"setpoint":286,"manipulatedVariableTag":"V-101.POS","output":64,"outputMin":0,"outputMax":100,"kp":0.8,"ki":0.05,"kd":0.1,"error":-0.4,"pTerm":-0.32,"iTerm":0,"dTerm":0,"integral":0,"derivative":0,"saturated":false,"status":"Manual","updatedAt":"2026-05-12T12:00:00Z","safetyDisclaimer":"Simulation-only interface. No real plant control."},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/historian/status":
			_, _ = w.Write([]byte(`{"data":{"enabled":true,"mode":"persistent","status":"connected","database":"postgresql/timescaledb","writeIntervalMs":1000,"telemetrySampleMs":1000,"lastSuccessfulWriteAt":"2026-05-12T12:00:00Z","fallbackActive":false,"simulationOnly":true,"safetyDisclaimer":"The historian stores synthetic simulation data for demo, learning and portfolio purposes only."},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/mqtt/status":
			_, _ = w.Write([]byte(`{"data":{"enabled":true,"connected":true,"status":"connected","brokerUrl":"tcp://mqtt:1883","clientId":"smr-simulation-publisher","topicPrefix":"smr/site-001/unit-001","qos":0,"retain":false,"publishIntervalMs":1000,"lastConnectedAt":"2026-05-12T12:00:00Z","lastSuccessfulPublishAt":"2026-05-12T12:00:01Z","messagesPublished":12,"messagesFailed":0,"simulationOnly":true,"safetyDisclaimer":"MQTT topics contain synthetic simulation payloads only. The bridge is publish-only and cannot control equipment."},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
		case r.URL.Path == "/api/v1/simulation/pid/config":
			var request PIDConfigUpdateRequest
			_ = json.NewDecoder(r.Body).Decode(&request)
			if request.Setpoint != nil && *request.Setpoint > 310 {
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(`{"error":{"code":"INVALID_PID_CONFIG","message":"setpoint must be between 270 and 310 C"},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
				return
			}
			setpoint := 286.0
			if request.Setpoint != nil {
				setpoint = *request.Setpoint
			}
			kp := 0.8
			if request.Kp != nil {
				kp = *request.Kp
			}
			_, _ = w.Write([]byte(`{"data":{"controllerTag":"TIC-101","mode":"MANUAL","authority":"USER","active":false,"pidImplemented":true,"processVariableTag":"TT-101","processValue":286.4,"setpoint":` + strconv.FormatFloat(setpoint, 'f', -1, 64) + `,"manipulatedVariableTag":"V-101.POS","output":64,"outputMin":0,"outputMax":100,"kp":` + strconv.FormatFloat(kp, 'f', -1, 64) + `,"ki":0.05,"kd":0.1,"error":-0.4,"pTerm":-0.32,"iTerm":0,"dTerm":0,"integral":0,"derivative":0,"saturated":false,"status":"Manual","updatedAt":"2026-05-12T12:00:00Z","safetyDisclaimer":"Simulation-only interface. No real plant control."},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
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
			if request.CommandType == "CLOSE" {
				w.WriteHeader(http.StatusConflict)
				_, _ = w.Write([]byte(`{"error":{"code":"CONTROL_MODE_AUTO","message":"V-101 is controlled by AUTO mode. Switch TIC-101 to MANUAL before sending direct valve commands."},"meta":{"timestamp":"2026-05-12T12:00:00Z","source":"simulation","simulationOnly":true}}`))
				return
			}
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

func withDemoUser(r *http.Request, userID string) {
	r.Header.Set("X-Demo-User", userID)
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
