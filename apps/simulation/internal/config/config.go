package config

import (
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppName     string
	Environment string
	Host        string
	Port        string
	LogLevel    string
	TickMS      int
	HistorySize int
	Seed        int64
	Version     string
}

func Load() Config {
	return Config{
		AppName:     envString("SIM_APP_NAME", "smr-twin-simulation"),
		Environment: envString("SIM_ENV", "development"),
		Host:        envString("SIM_HOST", "0.0.0.0"),
		Port:        envString("SIM_PORT", "8081"),
		LogLevel:    envString("SIM_LOG_LEVEL", "info"),
		TickMS:      envInt("SIM_TICK_MS", 1000),
		HistorySize: envInt("SIM_HISTORY_SIZE", 3600),
		Seed:        int64(envInt("SIM_SEED", 42)),
		Version:     envString("SIM_VERSION", "0.1.0"),
	}
}

func (c Config) Address() string {
	return net.JoinHostPort(c.Host, c.Port)
}

func (c Config) TickInterval() time.Duration {
	return time.Duration(c.TickMS) * time.Millisecond
}

func (c Config) IsProduction() bool {
	return strings.EqualFold(c.Environment, "production")
}

func envString(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
