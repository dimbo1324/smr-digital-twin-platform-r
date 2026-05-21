package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/config"
)

type Handlers struct {
	SystemStatus     http.Handler
	Assets           http.Handler
	LatestTelemetry  http.Handler
	TelemetryHistory http.Handler
	ControlStatus    http.Handler
	SetControlMode   http.Handler
	PIDStatus        http.Handler
	UpdatePIDConfig  http.Handler
	HistorianStatus  http.Handler
	MQTTStatus       http.Handler
	ActiveAlarms     http.Handler
	AlarmHistory     http.Handler
	AcknowledgeAlarm http.Handler
	Scenarios        http.Handler
	StartScenario    http.Handler
	StopScenario     http.Handler
	ResetSimulation  http.Handler
	SubmitCommand    http.Handler
	RecentCommands   http.Handler
	RecentEvents     http.Handler
}

type Server struct {
	cfg       config.Config
	logger    *slog.Logger
	startedAt time.Time
	server    *http.Server
	handlers  Handlers
}

func NewServer(cfg config.Config, logger *slog.Logger, handlers Handlers) *Server {
	srv := &Server{
		cfg:       cfg,
		logger:    logger,
		startedAt: time.Now().UTC(),
		handlers:  handlers,
	}

	srv.server = &http.Server{
		Addr:         cfg.Address(),
		Handler:      srv.Router(),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return srv
}

func (s *Server) Router() http.Handler {
	return chain(
		s.routes(),
		RequestID,
		RequestLogger(s.logger),
		Recoverer(s.logger),
		SecurityHeaders,
		CORS(s.cfg.AllowedOrigins),
	)
}

func (s *Server) Run(ctx context.Context) error {
	errCh := make(chan error, 1)

	go func() {
		s.logger.Info("api_server_starting", slog.String("addr", s.server.Addr))
		errCh <- s.server.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := s.server.Shutdown(shutdownCtx); err != nil {
			return err
		}

		if err := <-errCh; err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}

		s.logger.Info("api_server_stopped")
		return nil
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}

		return err
	}
}
