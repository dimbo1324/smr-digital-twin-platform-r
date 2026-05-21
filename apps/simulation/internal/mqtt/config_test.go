package mqtt

import (
	"errors"
	"testing"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestLoadConfigDefaultsToDisabled(t *testing.T) {
	t.Setenv("MQTT_ENABLED", "")
	t.Setenv("MQTT_BROKER_URL", "")

	cfg := LoadConfig()
	if cfg.Enabled {
		t.Fatal("expected MQTT disabled by default")
	}
	if cfg.BrokerURL != "tcp://mqtt:1883" {
		t.Fatalf("expected local broker default, got %s", cfg.BrokerURL)
	}
	if cfg.TopicPrefix != "smr/site-001/unit-001" {
		t.Fatalf("expected default topic prefix, got %s", cfg.TopicPrefix)
	}
	if cfg.PublishInterval != time.Second {
		t.Fatalf("expected 1s publish interval, got %s", cfg.PublishInterval)
	}
}

func TestDisabledStatusIsSimulationOnly(t *testing.T) {
	status := DisabledStatus(Config{BrokerURL: "tcp://user:secret@mqtt:1883", ClientID: "test", TopicPrefix: "smr/site/unit"})

	if status.Enabled {
		t.Fatal("expected disabled status")
	}
	if status.Status != "disabled" {
		t.Fatalf("expected disabled status, got %s", status.Status)
	}
	if status.BrokerURL != "tcp://user:***@mqtt:1883" {
		t.Fatalf("expected sanitized broker URL, got %s", status.BrokerURL)
	}
	if !status.SimulationOnly {
		t.Fatal("expected simulationOnly true")
	}
}

func TestNoopPublisherDoesNotPanic(t *testing.T) {
	publisher := NewNoopPublisher(DisabledStatus(Config{}))
	publisher.PublishCommand(model.Command{})
	publisher.Close()
	if publisher.Status().Status != "disabled" {
		t.Fatalf("expected disabled noop status")
	}
}

func TestEnvelopeIsSimulationOnly(t *testing.T) {
	now := time.Date(2026, 5, 21, 12, 0, 0, 0, time.UTC)
	payload := envelope(Config{SiteID: "site-001", UnitID: "unit-001"}, "telemetry.snapshot", map[string]string{"tag": "TT-101"}, now)

	if payload.SchemaVersion != "1.0" {
		t.Fatalf("expected schema version 1.0, got %s", payload.SchemaVersion)
	}
	if !payload.SimulationOnly {
		t.Fatal("expected simulationOnly true")
	}
	if payload.Source != "simulation" {
		t.Fatalf("expected simulation source, got %s", payload.Source)
	}
	if payload.TopicType != "telemetry.snapshot" {
		t.Fatalf("expected telemetry topic type, got %s", payload.TopicType)
	}
}

func TestRecordFailureUpdatesStatusCounters(t *testing.T) {
	publisher := &Publisher{
		status: model.MQTTStatus{Enabled: true, Status: "connected", SimulationOnly: true},
	}

	publisher.recordFailure(errors.New("publish failed"))
	status := publisher.Status()

	if status.MessagesFailed != 1 {
		t.Fatalf("expected one failed message, got %d", status.MessagesFailed)
	}
	if status.Status != "degraded" {
		t.Fatalf("expected degraded status, got %s", status.Status)
	}
	if status.LastErrorMessage != "publish failed" {
		t.Fatalf("expected error message to be recorded, got %s", status.LastErrorMessage)
	}
}
