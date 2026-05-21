package mqtt

import (
	"strings"
	"unicode"
)

const (
	TopicTelemetrySnapshot = "telemetry/snapshot"
	TopicEvents            = "events"
	TopicActiveAlarms      = "alarms/active"
	TopicCommandStatus     = "commands/status"
	TopicPIDStatus         = "control/tic-101/pid/status"
	TopicControlMode       = "control/tic-101/mode"
	TopicHistorianStatus   = "historian/status"
	TopicSystemStatus      = "system/status"
)

func BuildTopic(prefix, suffix string) string {
	return strings.Trim(strings.Trim(prefix, "/")+"/"+strings.Trim(suffix, "/"), "/")
}

func TelemetryTagTopic(prefix, tag string) string {
	return BuildTopic(prefix, "telemetry/tags/"+SanitizeTopicSegment(tag))
}

func SanitizeTopicSegment(value string) string {
	var builder strings.Builder
	lastDash := false
	for _, r := range strings.TrimSpace(value) {
		switch {
		case r == '.':
			builder.WriteRune('_')
			lastDash = false
		case r == '-' || r == '_' || unicode.IsLetter(r) || unicode.IsDigit(r):
			builder.WriteRune(r)
			lastDash = false
		default:
			if !lastDash {
				builder.WriteRune('-')
				lastDash = true
			}
		}
	}
	result := strings.Trim(builder.String(), "-_")
	if result == "" {
		return "unknown"
	}
	return result
}
