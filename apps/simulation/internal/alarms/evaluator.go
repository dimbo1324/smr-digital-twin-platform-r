package alarms

import (
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

const maxAlarmHistory = 200

var (
	ErrAlarmNotFound = errors.New("alarm not found")
	ErrAlarmCleared  = errors.New("alarm already cleared")
)

type ChangeType string

const (
	ChangeActivated    ChangeType = "activated"
	ChangeAcknowledged ChangeType = "acknowledged"
	ChangeCleared      ChangeType = "cleared"
)

type Change struct {
	Type  ChangeType
	Alarm model.Alarm
}

type Evaluator struct {
	rules   []rule
	active  map[string]model.Alarm
	history []model.Alarm
	seq     int64
}

func NewEvaluator() *Evaluator {
	return &Evaluator{
		rules:  defaultRules(),
		active: make(map[string]model.Alarm),
	}
}

func (e *Evaluator) Evaluate(snapshot model.TelemetrySnapshot) []Change {
	now := snapshot.Timestamp
	changes := make([]Change, 0)
	for _, rule := range e.rules {
		value := rule.value(snapshot)
		isActive := rule.isActive(value)
		alarm, exists := e.active[rule.code]

		if isActive {
			if !exists {
				e.seq++
				alarm = model.Alarm{
					ID:        fmt.Sprintf("alarm-%s-%d", rule.code, e.seq),
					RuleID:    rule.code,
					AssetID:   rule.assetID,
					Tag:       rule.assetID,
					Code:      rule.code,
					Title:     rule.title,
					Message:   rule.message,
					Severity:  rule.severity,
					Status:    model.AlarmStatusActive,
					Threshold: rule.threshold,
					Unit:      rule.unit,
					Source:    "alarm-evaluator",
					StartedAt: now,
					ActiveAt:  now,
					UpdatedAt: now,
					Metadata: map[string]string{
						"condition": rule.description(),
					},
				}
			}
			alarm.Value = value
			alarm.LastValue = value
			alarm.UpdatedAt = now
			if !exists {
				changes = append(changes, Change{Type: ChangeActivated, Alarm: alarm})
			}
			alarm.ClearedAt = nil
			e.active[rule.code] = alarm
			continue
		}

		if exists && rule.isCleared(value) {
			delete(e.active, rule.code)
			alarm.Value = value
			alarm.LastValue = value
			alarm.Status = model.AlarmStatusCleared
			alarm.UpdatedAt = now
			alarm.ClearedAt = &now
			e.appendHistory(alarm)
			changes = append(changes, Change{Type: ChangeCleared, Alarm: alarm})
		}
	}

	return changes
}

func (e *Evaluator) Active() []model.Alarm {
	alarms := make([]model.Alarm, 0, len(e.active))
	for _, alarm := range e.active {
		alarms = append(alarms, alarm)
	}

	sort.Slice(alarms, func(i, j int) bool {
		return alarms[i].StartedAt.After(alarms[j].StartedAt)
	})

	return alarms
}

func (e *Evaluator) History() []model.Alarm {
	alarms := make([]model.Alarm, len(e.history))
	copy(alarms, e.history)
	sort.Slice(alarms, func(i, j int) bool {
		return alarms[i].UpdatedAt.After(alarms[j].UpdatedAt)
	})
	return alarms
}

func (e *Evaluator) Acknowledge(id string, request model.AlarmAcknowledgeRequest, now time.Time) (model.Alarm, bool, error) {
	for code, alarm := range e.active {
		if alarm.ID != id {
			continue
		}
		if alarm.Status == model.AlarmStatusAcknowledged {
			return alarm, false, nil
		}
		if alarm.Status != model.AlarmStatusActive {
			return model.Alarm{}, false, ErrAlarmNotFound
		}
		ackTime := now
		if request.AcknowledgedBy == "" {
			request.AcknowledgedBy = "demo-operator"
		}
		alarm.Status = model.AlarmStatusAcknowledged
		alarm.AcknowledgedAt = &ackTime
		alarm.AcknowledgedBy = request.AcknowledgedBy
		if request.Comment != "" {
			if alarm.Metadata == nil {
				alarm.Metadata = map[string]string{}
			}
			alarm.Metadata["ackComment"] = request.Comment
		}
		alarm.UpdatedAt = ackTime
		e.active[code] = alarm
		return alarm, true, nil
	}

	for _, alarm := range e.history {
		if alarm.ID == id {
			return alarm, false, ErrAlarmCleared
		}
	}
	return model.Alarm{}, false, ErrAlarmNotFound
}

func (e *Evaluator) Reset() {
	e.active = make(map[string]model.Alarm)
	e.history = nil
	e.seq = 0
}

func (e *Evaluator) appendHistory(alarm model.Alarm) {
	e.history = append(e.history, alarm)
	if len(e.history) > maxAlarmHistory {
		e.history = e.history[len(e.history)-maxAlarmHistory:]
	}
}

func (r rule) isActive(value float64) bool {
	if r.high {
		return value >= r.threshold
	}
	return value <= r.threshold
}

func (r rule) isCleared(value float64) bool {
	if r.high {
		return value <= r.clearThreshold
	}
	return value >= r.clearThreshold
}

func (r rule) description() string {
	operator := ">="
	if !r.high {
		operator = "<="
	}
	return fmt.Sprintf("%s %s %.2f %s", r.code, operator, r.threshold, r.unit)
}
