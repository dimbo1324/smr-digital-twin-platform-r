package engine

import "github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"

func (e *Engine) persistTelemetryAsync(snapshot model.TelemetrySnapshot) {
	if e.historianWriter == nil {
		return
	}
	e.historianWriter.EnqueueTelemetry(snapshot)
}

func (e *Engine) persistCommandAsync(command model.Command) {
	if e.historianWriter == nil || command.ID == "" {
		return
	}
	e.historianWriter.EnqueueCommand(command)
}

func (e *Engine) persistEventAsync(event model.Event) {
	if e.historianWriter == nil || event.ID == "" {
		return
	}
	e.historianWriter.EnqueueEvent(event)
}

func (e *Engine) persistAlarmAsync(alarm model.Alarm) {
	if e.historianWriter == nil || alarm.ID == "" {
		return
	}
	e.historianWriter.EnqueueAlarm(alarm)
}
