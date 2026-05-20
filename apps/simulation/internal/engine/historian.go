package engine

import (
	"context"
	"log/slog"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

func (e *Engine) persistTelemetryAsync(snapshot model.TelemetrySnapshot) {
	if e.historian == nil {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), e.historianOperationTimeout)
		defer cancel()
		if err := e.historian.AppendTelemetrySnapshot(ctx, snapshot); err != nil {
			e.logger.Warn("historian_telemetry_write_failed", slog.Any("error", err))
		}
	}()
}

func (e *Engine) persistCommandAsync(command model.Command) {
	if e.historian == nil || command.ID == "" {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), e.historianOperationTimeout)
		defer cancel()
		if err := e.historian.SaveCommand(ctx, command); err != nil {
			e.logger.Warn("historian_command_write_failed", slog.String("command_id", command.ID), slog.Any("error", err))
		}
	}()
}

func (e *Engine) persistEventAsync(event model.Event) {
	if e.historian == nil || event.ID == "" {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), e.historianOperationTimeout)
		defer cancel()
		if err := e.historian.SaveEvent(ctx, event); err != nil {
			e.logger.Warn("historian_event_write_failed", slog.String("event_id", event.ID), slog.Any("error", err))
		}
	}()
}

func (e *Engine) persistAlarmAsync(alarm model.Alarm) {
	if e.historian == nil || alarm.ID == "" {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), e.historianOperationTimeout)
		defer cancel()
		if err := e.historian.SaveAlarm(ctx, alarm); err != nil {
			e.logger.Warn("historian_alarm_write_failed", slog.String("alarm_id", alarm.ID), slog.Any("error", err))
		}
	}()
}
