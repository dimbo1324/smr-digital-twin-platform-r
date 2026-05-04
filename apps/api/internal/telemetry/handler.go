package telemetry

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
	points, err := h.service.Latest(r.Context())
	if err != nil {
		h.logger.ErrorContext(r.Context(), "telemetry_latest_failed", slog.Any("error", err))
		httpapi.WriteError(w, r, http.StatusInternalServerError, "TELEMETRY_LATEST_FAILED", "Failed to read latest telemetry")
		return
	}

	httpapi.WriteData(w, r, http.StatusOK, points, httpapi.MetaOptions{
		Count:  len(points),
		Source: "memory",
	})
}
