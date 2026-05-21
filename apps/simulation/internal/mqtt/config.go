package mqtt

import (
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

const safetyDisclaimer = "MQTT topics contain synthetic simulation payloads only. The bridge is publish-only and cannot control equipment."

type Config struct {
	Enabled         bool
	Required        bool
	BrokerURL       string
	ClientID        string
	TopicPrefix     string
	QoS             byte
	Retain          bool
	PublishInterval time.Duration
	ConnectTimeout  time.Duration
	WriteTimeout    time.Duration
	QueueSize       int
	SiteID          string
	UnitID          string
}

func LoadConfig() Config {
	return Config{
		Enabled:         envBool("MQTT_ENABLED", false),
		Required:        envBool("MQTT_REQUIRED", false),
		BrokerURL:       envString("MQTT_BROKER_URL", "tcp://mqtt:1883"),
		ClientID:        envString("MQTT_CLIENT_ID", "smr-simulation-publisher"),
		TopicPrefix:     strings.Trim(strings.TrimSpace(envString("MQTT_TOPIC_PREFIX", "smr/site-001/unit-001")), "/"),
		QoS:             byte(clampInt(envInt("MQTT_QOS", 0), 0, 2)),
		Retain:          envBool("MQTT_RETAIN", false),
		PublishInterval: time.Duration(envInt("MQTT_PUBLISH_INTERVAL_MS", 1000)) * time.Millisecond,
		ConnectTimeout:  time.Duration(envInt("MQTT_CONNECT_TIMEOUT_MS", 5000)) * time.Millisecond,
		WriteTimeout:    time.Duration(envInt("MQTT_WRITE_TIMEOUT_MS", 3000)) * time.Millisecond,
		QueueSize:       clampInt(envInt("MQTT_QUEUE_SIZE", 256), 1, 4096),
		SiteID:          envString("MQTT_SITE_ID", "site-001"),
		UnitID:          envString("MQTT_UNIT_ID", "unit-001"),
	}
}

func DisabledStatus(cfg Config) model.MQTTStatus {
	return model.MQTTStatus{
		Enabled:           false,
		Connected:         false,
		Status:            "disabled",
		BrokerURL:         sanitizeBrokerURL(cfg.BrokerURL),
		ClientID:          cfg.ClientID,
		TopicPrefix:       cfg.TopicPrefix,
		QoS:               int(cfg.QoS),
		Retain:            cfg.Retain,
		PublishIntervalMS: int(cfg.PublishInterval / time.Millisecond),
		SimulationOnly:    true,
		SafetyDisclaimer:  safetyDisclaimer,
	}
}

func UnavailableStatus(cfg Config, message string, now time.Time) model.MQTTStatus {
	return model.MQTTStatus{
		Enabled:           cfg.Enabled,
		Connected:         false,
		Status:            "unavailable",
		BrokerURL:         sanitizeBrokerURL(cfg.BrokerURL),
		ClientID:          cfg.ClientID,
		TopicPrefix:       cfg.TopicPrefix,
		QoS:               int(cfg.QoS),
		Retain:            cfg.Retain,
		PublishIntervalMS: int(cfg.PublishInterval / time.Millisecond),
		LastErrorAt:       &now,
		LastErrorMessage:  message,
		SimulationOnly:    true,
		SafetyDisclaimer:  safetyDisclaimer,
	}
}

func sanitizeBrokerURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.User == nil {
		return raw
	}
	username := parsed.User.Username()
	if _, hasPassword := parsed.User.Password(); hasPassword {
		result := parsed.Scheme + "://" + username + ":***@" + parsed.Host + parsed.EscapedPath()
		if parsed.RawQuery != "" {
			result += "?" + parsed.RawQuery
		}
		if parsed.Fragment != "" {
			result += "#" + parsed.Fragment
		}
		return result
	}
	return parsed.String()
}

func envString(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
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

func clampInt(value, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
