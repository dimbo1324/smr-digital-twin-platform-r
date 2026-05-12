package process

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestTopologyEndpointReturnsNodesEdgesAndMeta(t *testing.T) {
	handler := NewHandler(NewService(newFakeSimulation()))
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/process/topology", nil)

	handler.Topology(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var payload struct {
		Data ProcessTopologyResponse `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Data.Nodes) == 0 || len(payload.Data.Edges) == 0 {
		t.Fatalf("expected nodes and edges, got nodes=%d edges=%d", len(payload.Data.Nodes), len(payload.Data.Edges))
	}
	if !payload.Data.Meta.SimulationOnly {
		t.Fatal("expected simulationOnly meta")
	}
}
