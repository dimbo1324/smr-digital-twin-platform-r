package config

import (
	"net"
	"os"
	"strings"
)

const (
	defaultAppName        = "smr-twin-api"
	defaultEnvironment    = "development"
	defaultHTTPHost       = "0.0.0.0"
	defaultHTTPPort       = "8080"
	defaultLogLevel       = "info"
	defaultAllowedOrigins = "http://localhost:5173,http://127.0.0.1:5173"
	defaultVersion        = "0.1.0"
)

// Config contains runtime settings loaded from environment variables.
type Config struct {
	AppName        string
	Environment    string
	HTTPHost       string
	HTTPPort       string
	LogLevel       string
	AllowedOrigins []string
	Version        string
}

func Load() Config {
	return Config{
		AppName:        envString("API_APP_NAME", defaultAppName),
		Environment:    envString("API_ENV", defaultEnvironment),
		HTTPHost:       envString("API_HTTP_HOST", defaultHTTPHost),
		HTTPPort:       envString("API_HTTP_PORT", defaultHTTPPort),
		LogLevel:       envString("API_LOG_LEVEL", defaultLogLevel),
		AllowedOrigins: envList("API_ALLOWED_ORIGINS", defaultAllowedOrigins),
		Version:        envString("API_VERSION", defaultVersion),
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
