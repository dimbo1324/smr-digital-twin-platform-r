package httpapi

import (
	"encoding/json"
	"net/http"
	"time"
)

type ResponseMeta struct {
	RequestID string    `json:"requestId,omitempty"`
	Timestamp time.Time `json:"timestamp"`
	Count     int       `json:"count,omitempty"`
	Source    string    `json:"source,omitempty"`
}

type Response struct {
	Data any          `json:"data"`
	Meta ResponseMeta `json:"meta"`
}

type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error ErrorPayload `json:"error"`
	Meta  ResponseMeta `json:"meta"`
}

type MetaOptions struct {
	Count  int
	Source string
}

func WriteData(w http.ResponseWriter, r *http.Request, status int, data any, options MetaOptions) {
	writeJSON(w, status, Response{
		Data: data,
		Meta: ResponseMeta{
			RequestID: RequestIDFromContext(r.Context()),
			Timestamp: time.Now().UTC(),
			Count:     options.Count,
			Source:    options.Source,
		},
	})
}

func WriteError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	writeJSON(w, status, ErrorResponse{
		Error: ErrorPayload{
			Code:    code,
			Message: message,
		},
		Meta: ResponseMeta{
			RequestID: RequestIDFromContext(r.Context()),
			Timestamp: time.Now().UTC(),
		},
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
