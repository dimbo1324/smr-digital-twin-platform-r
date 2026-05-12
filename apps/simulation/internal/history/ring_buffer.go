package history

import (
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

type RingBuffer struct {
	items []model.TelemetrySnapshot
	next  int
	full  bool
}

func NewRingBuffer(size int) *RingBuffer {
	if size < 1 {
		size = 1
	}

	return &RingBuffer{
		items: make([]model.TelemetrySnapshot, 0, size),
	}
}

func (b *RingBuffer) Add(snapshot model.TelemetrySnapshot) {
	if len(b.items) < cap(b.items) {
		b.items = append(b.items, snapshot)
		return
	}

	b.items[b.next] = snapshot
	b.next = (b.next + 1) % cap(b.items)
	b.full = true
}

func (b *RingBuffer) Len() int {
	return len(b.items)
}

func (b *RingBuffer) Values() []model.TelemetrySnapshot {
	if !b.full {
		values := make([]model.TelemetrySnapshot, len(b.items))
		copy(values, b.items)
		return values
	}

	values := make([]model.TelemetrySnapshot, 0, len(b.items))
	values = append(values, b.items[b.next:]...)
	values = append(values, b.items[:b.next]...)
	return values
}

func (b *RingBuffer) Window(window time.Duration, now time.Time) []model.TelemetrySnapshot {
	cutoff := now.Add(-window)
	values := b.Values()
	filtered := make([]model.TelemetrySnapshot, 0, len(values))
	for _, snapshot := range values {
		if snapshot.Timestamp.Equal(cutoff) || snapshot.Timestamp.After(cutoff) {
			filtered = append(filtered, snapshot)
		}
	}

	return filtered
}
