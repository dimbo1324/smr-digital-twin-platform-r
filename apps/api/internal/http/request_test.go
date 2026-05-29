package httpapi

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type decodeJSONTestPayload struct {
	Name string `json:"name"`
}

func TestDecodeJSONBodyRejectsMalformedJSON(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{`))

	_, ok := DecodeJSONBody[decodeJSONTestPayload](recorder, request, 1024, "bad json")

	if ok {
		t.Fatal("expected decode to fail")
	}
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
}

func TestDecodeJSONBodyRejectsUnknownFields(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"demo","extra":true}`))

	_, ok := DecodeJSONBody[decodeJSONTestPayload](recorder, request, 1024, "bad json")

	if ok {
		t.Fatal("expected decode to fail")
	}
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
}

func TestDecodeJSONBodyRejectsTrailingJSON(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"demo"} {"name":"second"}`))

	_, ok := DecodeJSONBody[decodeJSONTestPayload](recorder, request, 1024, "bad json")

	if ok {
		t.Fatal("expected decode to fail")
	}
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
}

func TestDecodeJSONBodyRejectsOversizedBody(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader([]byte(`{"name":"demo"}`)))

	_, ok := DecodeJSONBody[decodeJSONTestPayload](recorder, request, 4, "bad json")

	if ok {
		t.Fatal("expected decode to fail")
	}
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
}
