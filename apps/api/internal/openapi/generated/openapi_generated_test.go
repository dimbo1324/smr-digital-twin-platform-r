package generated

import (
	"context"
	"net/http"
	"testing"
)

func TestGeneratedClientBuildsJSONRequest(t *testing.T) {
	client := NewClient("http://127.0.0.1:8080/", nil)
	request, err := client.NewRequest(context.Background(), http.MethodPost, "/api/v1/scenarios/validate", ScenarioValidationRequest{
		Format:  "yaml",
		Content: "id: demo\n",
	})
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	if request.URL.String() != "http://127.0.0.1:8080/api/v1/scenarios/validate" {
		t.Fatalf("unexpected URL: %s", request.URL)
	}
	if request.Header.Get("Content-Type") != "application/json" {
		t.Fatalf("expected JSON content type")
	}
}
