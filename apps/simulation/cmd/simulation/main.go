package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/config"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/engine"
	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/http"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/logging"
)

func main() {
	cfg := config.Load()
	logger := logging.New(cfg)
	logger.Info("simulation_config_loaded", slog.Int("tick_ms", cfg.TickMS), slog.Int("history_size", cfg.HistorySize), slog.Int("alarm_event_history_size", cfg.AlarmEventHistorySize), slog.Int64("seed", cfg.Seed))

	simEngine := engine.New(engine.Config{TickInterval: cfg.TickInterval(), HistorySize: cfg.HistorySize, AlarmEventHistorySize: cfg.AlarmEventHistorySize, Seed: cfg.Seed}, logger)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

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
