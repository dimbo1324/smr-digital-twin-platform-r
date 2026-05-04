package logger

import (
	"log/slog"
	"os"
	"strings"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/config"
)

func New(cfg config.Config) *slog.Logger {
	level := parseLevel(cfg.LogLevel)
	options := &slog.HandlerOptions{
		Level: level,
	}

	var handler slog.Handler
	if cfg.IsProduction() {
		handler = slog.NewJSONHandler(os.Stdout, options)
	} else {
		handler = slog.NewTextHandler(os.Stdout, options)
	}

	return slog.New(handler).With(
		slog.String("app", cfg.AppName),
		slog.String("env", cfg.Environment),
		slog.String("version", cfg.Version),
	)
}

func parseLevel(value string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
