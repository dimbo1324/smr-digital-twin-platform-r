package engine

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/alarms"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

const (
	maxAcknowledgedByLen = 120
	maxAckCommentLen     = 500
)

type AlarmError struct {
	Code       string
	Message    string
	HTTPStatus int
}

func (e *AlarmError) Error() string {
	return e.Message
}

func (e *Engine) ActiveAlarms() []model.Alarm {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.evaluator.Active()
}

func (e *Engine) AlarmHistory() []model.Alarm {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.evaluator.History()
}

func (e *Engine) AcknowledgeAlarm(id string, request model.AlarmAcknowledgeRequest) (model.Alarm, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if id == "" {
		return model.Alarm{}, &AlarmError{Code: "ALARM_NOT_FOUND", Message: "Alarm was not found", HTTPStatus: http.StatusNotFound}
	}
	if len(request.AcknowledgedBy) > maxAcknowledgedByLen {
		return model.Alarm{}, &AlarmError{Code: "INVALID_PAYLOAD", Message: "acknowledgedBy must be 120 characters or fewer", HTTPStatus: http.StatusBadRequest}
	}
	if len(request.Comment) > maxAckCommentLen {
		return model.Alarm{}, &AlarmError{Code: "INVALID_PAYLOAD", Message: "comment must be 500 characters or fewer", HTTPStatus: http.StatusBadRequest}
	}

	now := time.Now().UTC()
	alarm, changed, err := e.evaluator.Acknowledge(id, request, now)
	if err != nil {
		if errors.Is(err, alarms.ErrAlarmCleared) {
			return model.Alarm{}, &AlarmError{Code: "ALARM_ALREADY_CLEARED", Message: "Alarm is already cleared", HTTPStatus: http.StatusConflict}
		}
		return model.Alarm{}, &AlarmError{Code: "ALARM_NOT_FOUND", Message: "Alarm was not found", HTTPStatus: http.StatusNotFound}
	}

	if changed {
		e.appendAlarmEventLocked(
			model.EventTypeAlarmAcknowledged,
			model.EventSeverityInfo,
			fmt.Sprintf("Alarm %s acknowledged by %s.", alarm.Code, alarm.AcknowledgedBy),
			alarm,
			now,
			map[string]string{"status": string(alarm.Status)},
		)
	}

	return alarm, nil
}

func (e *Engine) applyAlarmChangesLocked(changes []alarms.Change) {
	for _, change := range changes {
		switch change.Type {
		case alarms.ChangeActivated:
			e.appendAlarmEventLocked(
				model.EventTypeAlarmActivated,
				eventSeverityFromAlarm(change.Alarm.Severity),
				fmt.Sprintf("Alarm %s activated: %s", change.Alarm.Code, change.Alarm.Message),
				change.Alarm,
				change.Alarm.UpdatedAt,
				map[string]string{
					"status":    string(change.Alarm.Status),
					"ruleId":    change.Alarm.RuleID,
					"threshold": fmt.Sprintf("%.2f", change.Alarm.Threshold),
					"value":     fmt.Sprintf("%.2f", change.Alarm.LastValue),
				},
			)
		case alarms.ChangeCleared:
			clearedAt := change.Alarm.UpdatedAt
			if change.Alarm.ClearedAt != nil {
				clearedAt = *change.Alarm.ClearedAt
			}
			e.appendAlarmEventLocked(
				model.EventTypeAlarmCleared,
				model.EventSeverityInfo,
				fmt.Sprintf("Alarm %s cleared.", change.Alarm.Code),
				change.Alarm,
				clearedAt,
				map[string]string{
					"status": string(change.Alarm.Status),
					"ruleId": change.Alarm.RuleID,
					"value":  fmt.Sprintf("%.2f", change.Alarm.LastValue),
				},
			)
		}
	}
}

func eventSeverityFromAlarm(severity model.AlarmSeverity) model.EventSeverity {
	switch severity {
	case model.AlarmSeverityCritical:
		return model.EventSeverityCritical
	case model.AlarmSeverityAlarm, model.AlarmSeverityHigh:
		return model.EventSeverityError
	case model.AlarmSeverityWarning:
		return model.EventSeverityWarning
	default:
		return model.EventSeverityInfo
	}
}
