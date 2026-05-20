package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/config"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/engine"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/historian"
	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/http"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/logging"
)

func main() {
	cfg := config.Load()
	logger := logging.New(cfg)
	logger.Info("simulation_config_loaded", slog.Int("tick_ms", cfg.TickMS), slog.Int("history_size", cfg.HistorySize), slog.Int64("seed", cfg.Seed))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	historianCfg := historian.LoadConfig()
	var historianRepo historian.Repository
	historianStatus := historian.DisabledStatus(historianCfg)
	if historianCfg.Enabled {
		setupCtx, cancel := context.WithTimeout(ctx, historianCfg.OperationTimeout*10)
		repo, err := historian.NewPostgresRepository(setupCtx, historianCfg, logger)
		cancel()
		if err != nil {
			historianStatus = historian.UnavailableStatus(historianCfg, err.Error(), time.Now().UTC())
			logger.Warn("historian_unavailable_fallback_active", slog.Any("error", err))
			if historianCfg.Required {
				logger.Error("historian_required_failed", slog.Any("error", err))
				os.Exit(1)
			}
		} else {
			historianRepo = repo
			logger.Info("historian_connected", slog.String("database", "postgresql/timescaledb"))
		}
	}

	simEngine := engine.New(engine.Config{
		TickInterval:              cfg.TickInterval(),
		HistorySize:               cfg.HistorySize,
		Seed:                      cfg.Seed,
		Historian:                 historianRepo,
		HistorianStatus:           historianStatus,
		HistorianOperationTimeout: historianCfg.OperationTimeout,
		HistorianTelemetrySample:  historianCfg.TelemetrySample,
	}, logger)

	if err := simEngine.Start(ctx); err != nil {
		logger.Error("simulation_engine_failed", slog.Any("error", err))
		os.Exit(1)
	}
	defer func() { _ = simEngine.Stop(context.Background()) }()

	handler := httpapi.NewHandler(cfg, simEngine)
	server := httpapi.NewServer(cfg, logger, handler)
	if err := server.Run(ctx); err != nil {
		logger.Error("simulation_server_failed", slog.Any("error", err))
		os.Exit(1)
	}
}
