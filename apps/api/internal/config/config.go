package config

import (
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	defaultAppName             = "smr-twin-api"
	defaultEnvironment         = "development"
	defaultHTTPHost            = "0.0.0.0"
	defaultHTTPPort            = "8080"
	defaultLogLevel            = "info"
	defaultAllowedOrigins      = "http://localhost:5173,http://127.0.0.1:5173"
	defaultVersion             = "0.1.0"
	defaultSimulationBaseURL   = "http://localhost:8081"
	defaultSimulationTimeoutMS = "1500"
	defaultSimulationEnabled   = "true"
)

// Config contains runtime settings loaded from environment variables.
type Config struct {
	AppName           string
	Environment       string
	HTTPHost          string
	HTTPPort          string
	LogLevel          string
	AllowedOrigins    []string
	Version           string
	SimulationEnabled bool
	SimulationBaseURL string
	SimulationTimeout time.Duration
}

func Load() Config {
	return Config{
		AppName:           envString("API_APP_NAME", defaultAppName),
		Environment:       envString("API_ENV", defaultEnvironment),
		HTTPHost:          envString("API_HTTP_HOST", defaultHTTPHost),
		HTTPPort:          envString("API_HTTP_PORT", defaultHTTPPort),
		LogLevel:          envString("API_LOG_LEVEL", defaultLogLevel),
		AllowedOrigins:    envList("API_ALLOWED_ORIGINS", defaultAllowedOrigins),
		Version:           envString("API_VERSION", defaultVersion),
		SimulationEnabled: envBool("SIMULATION_ENABLED", defaultSimulationEnabled),
		SimulationBaseURL: envString("SIMULATION_BASE_URL", defaultSimulationBaseURL),
		SimulationTimeout: time.Duration(envInt("SIMULATION_TIMEOUT_MS", defaultSimulationTimeoutMS)) * time.Millisecond,
	}
}

func (c Config) Address() string {
	return net.JoinHostPort(c.HTTPHost, c.HTTPPort)
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

func envList(key, fallback string) []string {
	raw := envString(key, fallback)
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			values = append(values, value)
		}
	}

	return values
}

func envInt(key, fallback string) int {
	value := envString(key, fallback)
	parsed, err := strconv.Atoi(value)
	if err != nil {
		parsed, _ = strconv.Atoi(fallback)
	}
	return parsed
}

func envBool(key, fallback string) bool {
	value := strings.ToLower(envString(key, fallback))
	return value == "true" || value == "1" || value == "yes"
}
