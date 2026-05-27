package metrics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "api_http_requests_total",
			Help: "Total API HTTP requests by method, path, and status.",
		},
		[]string{"method", "path", "status"},
	)
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "api_http_request_duration_seconds",
			Help:    "API HTTP request duration by method and path.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)
	HTTPRequestsInFlight = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "api_http_requests_in_flight",
			Help: "API HTTP requests currently in flight.",
		},
	)
	RBACForbiddenTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "api_rbac_forbidden_total",
			Help: "Total demo RBAC denials by required permission and role.",
		},
		[]string{"required_permission", "role"},
	)
	SimulationProxyErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "api_simulation_proxy_errors_total",
			Help: "Total simulation proxy errors by code.",
		},
		[]string{"code"},
	)
)

func Handler() http.Handler {
	return promhttp.Handler()
}

func ObserveHTTPRequest(method, path string, status int, startedAt time.Time) {
	HTTPRequestsTotal.WithLabelValues(method, path, strconv.Itoa(status)).Inc()
	HTTPRequestDuration.WithLabelValues(method, path).Observe(time.Since(startedAt).Seconds())
}

func ObserveRBACForbidden(permission, role string) {
	RBACForbiddenTotal.WithLabelValues(permission, role).Inc()
}

func ObserveSimulationProxyError(code string) {
	if code == "" {
		code = "UNKNOWN"
	}
	SimulationProxyErrorsTotal.WithLabelValues(code).Inc()
}
