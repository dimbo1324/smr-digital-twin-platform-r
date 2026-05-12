package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strconv"
	"sync/atomic"
	"time"
)

type contextKey string

const requestIDKey contextKey = "request_id"

var requestIDCounter uint64

type middleware func(http.Handler) http.Handler

func chain(handler http.Handler, middlewares ...middleware) http.Handler {
	for index := len(middlewares) - 1; index >= 0; index-- {
		handler = middlewares[index](handler)
	}
	return handler
}

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = "sim-" + strconv.FormatInt(time.Now().UTC().UnixNano(), 36) + "-" + strconv.FormatUint(atomic.AddUint64(&requestIDCounter, 1), 36)
		}
		w.Header().Set("X-Request-ID", requestID)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey, requestID)))
	})
}

func requestID(ctx context.Context) string {
	value, _ := ctx.Value(requestIDKey).(string)
	return value
}

func RequestLogger(logger *slog.Logger) middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(recorder, r)
			logger.InfoContext(r.Context(), "simulation_http_request",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", recorder.status),
				slog.Duration("duration", time.Since(start)),
				slog.String("request_id", requestID(r.Context())),
			)
		})
	}
}

func Recoverer(logger *slog.Logger) middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					logger.ErrorContext(r.Context(), "simulation_http_panic", slog.Any("panic", recovered), slog.String("stack", string(debug.Stack())))
					writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (r *statusRecorder) WriteHeader(status int) {
	if r.wroteHeader {
		return
	}
	r.status = status
	r.wroteHeader = true
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(data []byte) (int, error) {
	if !r.wroteHeader {
		r.WriteHeader(http.StatusOK)
	}
	return r.ResponseWriter.Write(data)
}
