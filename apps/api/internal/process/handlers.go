package process

import (
	"net/http"

	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/http"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Topology(w http.ResponseWriter, r *http.Request) {
	topology := h.service.Topology(r.Context())
	httpapi.WriteData(w, r, http.StatusOK, topology, httpapi.MetaOptions{
		Source:   topology.Meta.Source,
		Count:    len(topology.Nodes),
		Degraded: !topology.Meta.SimulationConnected,
	})
}
