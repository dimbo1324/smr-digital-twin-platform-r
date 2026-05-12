package system

import (
	"log/slog"
	"net/http"

	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/http"
)

type Handler struct {
	service *Service
	logger  *slog.Logger
}

func NewHandler(service *Service, logger *slog.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	status, err := h.service.Status(r.Context())
	if err != nil {
		h.logger.ErrorContext(r.Context(), "system_status_failed", slog.Any("error", err))
		httpapi.WriteError(w, r, http.StatusInternalServerError, "SYSTEM_STATUS_FAILED", "Failed to read system status")
		return
	}

	httpapi.WriteData(w, r, http.StatusOK, status, httpapi.MetaOptions{})
}
