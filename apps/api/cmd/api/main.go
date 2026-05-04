package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/assets"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/config"
	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/http"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/platform/logger"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/system"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/telemetry"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg)

	assetRepository := assets.NewMemoryRepository()
	assetService := assets.NewService(assetRepository)
	assetHandler := assets.NewHandler(assetService, log)

	telemetryRepository := telemetry.NewMemoryRepository()
	telemetryService := telemetry.NewService(telemetryRepository)
	telemetryHandler := telemetry.NewHandler(telemetryService, log)

	systemService := system.NewService(system.ServiceConfig{
		Environment: cfg.Environment,
		Version:     cfg.Version,
	})
	systemHandler := system.NewHandler(systemService, log)

	server := httpapi.NewServer(cfg, log, httpapi.Handlers{
		SystemStatus:    systemHandler,
		Assets:          assetHandler,
		LatestTelemetry: telemetryHandler,
	})

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := server.Run(ctx); err != nil {
		log.Error("api_server_failed", slog.Any("error", err))
		os.Exit(1)
	}
}
