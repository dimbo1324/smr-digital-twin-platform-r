package historian

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Enabled          bool
	Required         bool
	DatabaseURL      string
	MigrationsPath   string
	WriteInterval    time.Duration
	TelemetrySample  time.Duration
	MaxBatchSize     int
	OperationTimeout time.Duration
}

func LoadConfig() Config {
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	enabled := envBool("HISTORIAN_ENABLED", databaseURL != "")
	return Config{
		Enabled:          enabled,
		Required:         envBool("HISTORIAN_REQUIRED", false),
		DatabaseURL:      databaseURL,
		MigrationsPath:   envString("HISTORIAN_MIGRATIONS_PATH", "../../infra/db/migrations"),
		WriteInterval:    time.Duration(envInt("HISTORIAN_WRITE_INTERVAL_MS", 1000)) * time.Millisecond,
		TelemetrySample:  time.Duration(envInt("HISTORIAN_TELEMETRY_SAMPLE_MS", 1000)) * time.Millisecond,
		MaxBatchSize:     envInt("HISTORIAN_MAX_BATCH_SIZE", 500),
		OperationTimeout: time.Duration(envInt("HISTORIAN_OPERATION_TIMEOUT_MS", 500)) * time.Millisecond,
	}
}

func (c Config) WriteIntervalMS() int {
	return int(c.WriteInterval / time.Millisecond)
}

func (c Config) TelemetrySampleMS() int {
	return int(c.TelemetrySample / time.Millisecond)
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

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	switch strings.ToLower(value) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}
