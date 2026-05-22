package auth

import (
	"net/http"

	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/http"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Session(w http.ResponseWriter, r *http.Request) {
	httpapi.WriteData(w, r, http.StatusOK, FromRequest(r), httpapi.MetaOptions{Source: "demo"})
}

func (h *Handler) Users(w http.ResponseWriter, r *http.Request) {
	demoUsers := Users()
	httpapi.WriteData(w, r, http.StatusOK, demoUsers, httpapi.MetaOptions{Count: len(demoUsers), Source: "demo"})
}
