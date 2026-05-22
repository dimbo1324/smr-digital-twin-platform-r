package httpapi

import (
	"encoding/json"
	"net/http"
)

func DecodeJSONBody[T any](w http.ResponseWriter, r *http.Request, maxBytes int64, invalidMessage string) (T, bool) {
	var payload T
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		WriteError(w, r, http.StatusBadRequest, "MALFORMED_JSON", invalidMessage)
		return payload, false
	}
	return payload, true
}
