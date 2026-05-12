package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/config"
)

type Server struct {
	cfg     config.Config
	logger  *slog.Logger
	handler *Handler
	server  *http.Server
}

func NewServer(cfg config.Config, logger *slog.Logger, handler *Handler) *Server {
	s := &Server{cfg: cfg, logger: logger, handler: handler}
	s.server = &http.Server{
		Addr:         cfg.Address(),
		Handler:      s.Router(),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	return s
}

func (s *Server) Router() http.Handler {
	return chain(s.routes(), RequestID, RequestLogger(s.logger), Recoverer(s.logger))
}

func (s *Server) Run(ctx context.Context) error {
	errCh := make(chan error, 1)
	go func() {
		s.logger.Info("simulation_server_starting", slog.String("addr", s.server.Addr))
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
		s.logger.Info("simulation_server_stopped")
		return nil
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}
