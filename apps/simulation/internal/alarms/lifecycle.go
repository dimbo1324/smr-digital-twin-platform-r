package alarms

import (
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

type Manager struct {
	mu     sync.RWMutex
	rules  []rule
	alarms map[string]model.Alarm
	events *eventLog
	logger *slog.Logger
}

func NewManager(eventHistorySize int, logger *slog.Logger) *Manager {
	if logger == nil {
		logger = slog.Default()
	}
	return &Manager{
		rules:  defaultRules(),
		alarms: make(map[string]model.Alarm),
		events: newEventLog(eventHistorySize),
		logger: logger,
	}
}

func (m *Manager) Evaluate(snapshot model.TelemetrySnapshot) []model.Alarm {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := snapshot.Timestamp
	if now.IsZero() {
		now = time.Now().UTC()
	}

	for _, rule := range m.rules {
		value := rule.value(snapshot)
		conditionActive := rule.isActive(value)
		alarm, exists := m.alarms[rule.code]

		if conditionActive {
			if !exists {
				alarm = m.newAlarm(rule, value, now)
				m.alarms[rule.code] = alarm
				m.addEventLocked(eventFromAlarm(model.AlarmEventRaised, alarm, alarm.Message, now))
				m.logger.Info("alarm_raised", slog.String("alarm_id", alarm.ID), slog.String("code", alarm.Code), slog.String("severity", string(alarm.Severity)))
				continue
			}

			if alarm.Status == model.AlarmStatusCleared {
				alarm.Status = model.AlarmStatusActive
				alarm.StartedAt = now
				alarm.ClearedAt = nil
				alarm.AcknowledgedAt = nil
				alarm.AcknowledgedBy = ""
				alarm.AckNote = ""
				alarm.OccurrenceCount++
				m.addEventLocked(eventFromAlarm(model.AlarmEventReactivated, alarm, alarm.Message, now))
				m.logger.Info("alarm_reactivated", slog.String("alarm_id", alarm.ID), slog.String("code", alarm.Code))
			}

			alarm.Value = value
			alarm.Threshold = rule.threshold
			alarm.UpdatedAt = now
			alarm.SimulationOnly = true
			m.alarms[rule.code] = alarm
			continue
		}

		if exists && alarm.Status != model.AlarmStatusCleared && rule.isCleared(value) {
			clearedAt := now
			alarm.Value = value
			alarm.UpdatedAt = now
			alarm.ClearedAt = &clearedAt
			alarm.Status = model.AlarmStatusCleared
			m.alarms[rule.code] = alarm
			m.addEventLocked(eventFromAlarm(model.AlarmEventCleared, alarm, "Synthetic alarm condition returned to normal.", now))
			m.logger.Info("alarm_cleared", slog.String("alarm_id", alarm.ID), slog.String("code", alarm.Code))
		}
	}

	return m.activeLocked()
}

func (m *Manager) ActiveAlarms() []model.Alarm {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.activeLocked()
}

func (m *Manager) AllAlarms() []model.Alarm {
	m.mu.RLock()
	defer m.mu.RUnlock()
	alarms := make([]model.Alarm, 0, len(m.alarms))
	for _, alarm := range m.alarms {
		alarms = append(alarms, cloneAlarm(alarm))
	}
	sortAlarms(alarms)
	return alarms
}

func (m *Manager) Alarm(id string) (model.Alarm, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, alarm := range m.alarms {
		if alarm.ID == id {
			return cloneAlarm(alarm), true
		}
	}
	return model.Alarm{}, false
}

func (m *Manager) Events(limit int) []model.AlarmEvent {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.events.list(limit)
}

func (m *Manager) Acknowledge(alarmID, actor, note string) (model.Alarm, error) {
	note = strings.TrimSpace(note)
	if len(note) > 500 {
		return model.Alarm{}, ErrInvalidAcknowledgement
	}
	actor = strings.TrimSpace(actor)
	if actor == "" {
		actor = "demo-operator"
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	code, alarm, found := m.findByIDLocked(alarmID)
	if !found {
		return model.Alarm{}, ErrAlarmNotFound
	}
	if alarm.Status == model.AlarmStatusCleared {
		return model.Alarm{}, ErrAlarmAlreadyCleared
	}

	now := time.Now().UTC()
	alarm.Status = model.AlarmStatusAcknowledged
	alarm.UpdatedAt = now
	alarm.AcknowledgedAt = &now
	alarm.AcknowledgedBy = actor
	alarm.AckNote = note
	m.alarms[code] = alarm

	event := eventFromAlarm(model.AlarmEventAcknowledged, alarm, "Synthetic alarm acknowledged.", now)
	event.Actor = actor
	event.Note = note
	m.addEventLocked(event)
	m.logger.Info("alarm_acknowledged", slog.String("alarm_id", alarm.ID), slog.String("code", alarm.Code), slog.String("actor", actor))
	return cloneAlarm(alarm), nil
}

func (m *Manager) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.alarms = make(map[string]model.Alarm)
	m.addEventLocked(model.AlarmEvent{
		Type:           model.EventSimulationReset,
		Message:        "Synthetic simulation alarm state reset.",
		CreatedAt:      time.Now().UTC(),
		SimulationOnly: true,
	})
}

func (m *Manager) AddEvent(event model.AlarmEvent) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.addEventLocked(event)
}

func (m *Manager) activeLocked() []model.Alarm {
	alarms := make([]model.Alarm, 0, len(m.alarms))
	for _, alarm := range m.alarms {
		if alarm.Status == model.AlarmStatusActive || alarm.Status == model.AlarmStatusAcknowledged {
			alarms = append(alarms, cloneAlarm(alarm))
		}
	}
	sortAlarms(alarms)
	return alarms
}

func cloneAlarm(alarm model.Alarm) model.Alarm {
	if alarm.AcknowledgedAt != nil {
		value := *alarm.AcknowledgedAt
		alarm.AcknowledgedAt = &value
	}
	if alarm.ClearedAt != nil {
		value := *alarm.ClearedAt
		alarm.ClearedAt = &value
	}
	return alarm
}

func (m *Manager) findByIDLocked(id string) (string, model.Alarm, bool) {
	for code, alarm := range m.alarms {
		if alarm.ID == id {
			return code, alarm, true
		}
	}
	return "", model.Alarm{}, false
}

func (m *Manager) newAlarm(rule rule, value float64, now time.Time) model.Alarm {
	return model.Alarm{
		ID:              "alarm-" + rule.code,
		AssetID:         rule.assetID,
		NodeID:          rule.assetID,
		Code:            rule.code,
		Title:           rule.title,
		Message:         rule.message,
		Severity:        rule.severity,
		Status:          model.AlarmStatusActive,
		Value:           value,
		Threshold:       rule.threshold,
		Unit:            rule.unit,
		StartedAt:       now,
		UpdatedAt:       now,
		OccurrenceCount: 1,
		SimulationOnly:  true,
	}
}

func (m *Manager) addEventLocked(event model.AlarmEvent) {
	m.events.add(event)
}

func sortAlarms(alarms []model.Alarm) {
	sort.Slice(alarms, func(i, j int) bool {
		if alarms[i].UpdatedAt.Equal(alarms[j].UpdatedAt) {
			return alarms[i].Code < alarms[j].Code
		}
		return alarms[i].UpdatedAt.After(alarms[j].UpdatedAt)
	})
}
