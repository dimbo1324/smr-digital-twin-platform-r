package alarms

import (
	"fmt"
	"sort"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

type eventLog struct {
	events []model.AlarmEvent
	limit  int
	seq    int64
}

func newEventLog(limit int) *eventLog {
	if limit <= 0 {
		limit = 1000
	}
	return &eventLog{limit: limit}
}

func (l *eventLog) add(event model.AlarmEvent) model.AlarmEvent {
	l.seq++
	if event.ID == "" {
		event.ID = fmt.Sprintf("event-%06d", l.seq)
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	event.SimulationOnly = true

	l.events = append(l.events, event)
	if len(l.events) > l.limit {
		l.events = append([]model.AlarmEvent(nil), l.events[len(l.events)-l.limit:]...)
	}
	return event
}

func (l *eventLog) list(limit int) []model.AlarmEvent {
	if limit <= 0 || limit > len(l.events) {
		limit = len(l.events)
	}
	start := len(l.events) - limit
	result := make([]model.AlarmEvent, 0, limit)
	for _, event := range l.events[start:] {
		result = append(result, cloneEvent(event))
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result
}

func cloneEvent(event model.AlarmEvent) model.AlarmEvent {
	if event.Metadata != nil {
		metadata := make(map[string]any, len(event.Metadata))
		for key, value := range event.Metadata {
			metadata[key] = value
		}
		event.Metadata = metadata
	}
	return event
}

func eventFromAlarm(eventType model.AlarmEventType, alarm model.Alarm, message string, now time.Time) model.AlarmEvent {
	return model.AlarmEvent{
		AlarmID:        alarm.ID,
		Type:           eventType,
		AssetID:        alarm.AssetID,
		NodeID:         alarm.NodeID,
		Code:           alarm.Code,
		Severity:       alarm.Severity,
		Message:        message,
		CreatedAt:      now,
		SimulationOnly: true,
		Metadata: map[string]any{
			"value":           alarm.Value,
			"threshold":       alarm.Threshold,
			"unit":            alarm.Unit,
			"occurrenceCount": alarm.OccurrenceCount,
		},
	}
}
