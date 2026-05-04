package assets

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
	assets, err := h.service.List(r.Context())
	if err != nil {
		h.logger.ErrorContext(r.Context(), "assets_list_failed", slog.Any("error", err))
		httpapi.WriteError(w, r, http.StatusInternalServerError, "ASSETS_LIST_FAILED", "Failed to list assets")
		return
	}

	httpapi.WriteData(w, r, http.StatusOK, assets, httpapi.MetaOptions{
		Count:  len(assets),
		Source: "memory",
	})
}
