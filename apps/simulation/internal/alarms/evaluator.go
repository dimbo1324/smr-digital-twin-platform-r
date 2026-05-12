package alarms

import (
	"sort"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

type Evaluator struct {
	rules  []rule
	active map[string]model.Alarm
}

func NewEvaluator() *Evaluator {
	return &Evaluator{
		rules:  defaultRules(),
		active: make(map[string]model.Alarm),
	}
}

func (e *Evaluator) Evaluate(snapshot model.TelemetrySnapshot) []model.Alarm {
	now := snapshot.Timestamp
	for _, rule := range e.rules {
		value := rule.value(snapshot)
		active := rule.isActive(value)
		alarm, exists := e.active[rule.code]

		if active {
			if !exists {
				alarm = model.Alarm{
					ID:        "alarm-" + rule.code,
					AssetID:   rule.assetID,
					Code:      rule.code,
					Title:     rule.title,
					Message:   rule.message,
					Severity:  rule.severity,
					Status:    model.AlarmStatusActive,
					Threshold: rule.threshold,
					Unit:      rule.unit,
					StartedAt: now,
				}
			}
			alarm.Value = value
			alarm.UpdatedAt = now
			alarm.ClearedAt = nil
			e.active[rule.code] = alarm
			continue
		}

		if exists && rule.isCleared(value) {
			delete(e.active, rule.code)
		}
	}

	return e.Active()
}

func (e *Evaluator) Active() []model.Alarm {
	alarms := make([]model.Alarm, 0, len(e.active))
	for _, alarm := range e.active {
		alarms = append(alarms, alarm)
	}

	sort.Slice(alarms, func(i, j int) bool {
		return alarms[i].Code < alarms[j].Code
	})

	return alarms
}

func (e *Evaluator) Reset() {
	e.active = make(map[string]model.Alarm)
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
