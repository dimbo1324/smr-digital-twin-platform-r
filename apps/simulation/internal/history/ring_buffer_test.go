package history

import (
	"testing"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func TestRingBufferKeepsMaxSize(t *testing.T) {
	buffer := NewRingBuffer(2)
	now := time.Now()
	buffer.Add(model.TelemetrySnapshot{Timestamp: now})
	buffer.Add(model.TelemetrySnapshot{Timestamp: now.Add(time.Second)})
	buffer.Add(model.TelemetrySnapshot{Timestamp: now.Add(2 * time.Second)})

	if got := buffer.Len(); got != 2 {
		t.Fatalf("expected len 2, got %d", got)
	}
}

func TestHistoryWindowReturnsRecentSnapshots(t *testing.T) {
	buffer := NewRingBuffer(4)
	now := time.Now()
	buffer.Add(model.TelemetrySnapshot{Timestamp: now.Add(-20 * time.Minute)})
	buffer.Add(model.TelemetrySnapshot{Timestamp: now.Add(-10 * time.Minute)})
	buffer.Add(model.TelemetrySnapshot{Timestamp: now})

	values := buffer.Window(15*time.Minute, now)
	if len(values) != 2 {
		t.Fatalf("expected 2 recent snapshots, got %d", len(values))
	}
}
