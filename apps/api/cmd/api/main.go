package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/assets"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/config"
	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/http"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/platform/logger"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/simulation"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/system"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/telemetry"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg)

	assetRepository := assets.NewMemoryRepository()
	assetService := assets.NewService(assetRepository)

	telemetryRepository := telemetry.NewMemoryRepository()
	telemetryService := telemetry.NewService(telemetryRepository)

	systemService := system.NewService(system.ServiceConfig{
		Environment: cfg.Environment,
		Version:     cfg.Version,
	})
	simulationClient := simulation.NewClient(cfg.SimulationBaseURL, cfg.SimulationTimeout, cfg.SimulationEnabled)
	gateway := simulation.NewGateway(simulationClient, assetService, telemetryService, systemService, log)

	server := httpapi.NewServer(cfg, log, httpapi.Handlers{
		SystemStatus:     http.HandlerFunc(gateway.SystemStatus),
		Assets:           http.HandlerFunc(gateway.Assets),
		LatestTelemetry:  http.HandlerFunc(gateway.LatestTelemetry),
		TelemetryHistory: http.HandlerFunc(gateway.TelemetryHistory),
		ControlStatus:    http.HandlerFunc(gateway.ControlStatus),
		SetControlMode:   http.HandlerFunc(gateway.SetControlMode),
		PIDStatus:        http.HandlerFunc(gateway.PIDStatus),
		UpdatePIDConfig:  http.HandlerFunc(gateway.UpdatePIDConfig),
		HistorianStatus:  http.HandlerFunc(gateway.HistorianStatus),
		MQTTStatus:       http.HandlerFunc(gateway.MQTTStatus),
		ActiveAlarms:     http.HandlerFunc(gateway.ActiveAlarms),
		AlarmHistory:     http.HandlerFunc(gateway.AlarmHistory),
		AcknowledgeAlarm: http.HandlerFunc(gateway.AcknowledgeAlarm),
		Scenarios:        http.HandlerFunc(gateway.Scenarios),
		StartScenario:    http.HandlerFunc(gateway.StartScenario),
		StopScenario:     http.HandlerFunc(gateway.StopScenario),
		ResetSimulation:  http.HandlerFunc(gateway.Reset),
		SubmitCommand:    http.HandlerFunc(gateway.SubmitCommand),
		RecentCommands:   http.HandlerFunc(gateway.RecentCommands),
		RecentEvents:     http.HandlerFunc(gateway.RecentEvents),
	})

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := server.Run(ctx); err != nil {
		log.Error("api_server_failed", slog.Any("error", err))
		os.Exit(1)
	}
}
