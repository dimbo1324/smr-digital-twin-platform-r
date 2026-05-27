package engine

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/historian"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/metrics"
	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
)

const historianWriteQueueSize = 1024

type historianWriteJob struct {
	telemetry *model.TelemetrySnapshot
	command   *model.Command
	event     *model.Event
	alarm     *model.Alarm
}

type historianWriter struct {
	repo    historian.Repository
	timeout time.Duration
	logger  *slog.Logger

	jobs      chan historianWriteJob
	done      chan struct{}
	closeOnce sync.Once
	wg        sync.WaitGroup

	droppedWrites atomic.Int64
}

func newHistorianWriter(repo historian.Repository, timeout time.Duration, logger *slog.Logger) *historianWriter {
	if logger == nil {
		logger = slog.Default()
	}
	writer := &historianWriter{
		repo:    repo,
		timeout: timeout,
		logger:  logger,
		jobs:    make(chan historianWriteJob, historianWriteQueueSize),
		done:    make(chan struct{}),
	}
	writer.wg.Add(1)
	go writer.loop()
	return writer
}

func (w *historianWriter) EnqueueTelemetry(snapshot model.TelemetrySnapshot) {
	w.enqueue(historianWriteJob{telemetry: &snapshot})
}

func (w *historianWriter) EnqueueCommand(command model.Command) {
	w.enqueue(historianWriteJob{command: &command})
}

func (w *historianWriter) EnqueueEvent(event model.Event) {
	w.enqueue(historianWriteJob{event: &event})
}

func (w *historianWriter) EnqueueAlarm(alarm model.Alarm) {
	w.enqueue(historianWriteJob{alarm: &alarm})
}

func (w *historianWriter) DroppedWrites() int64 {
	return w.droppedWrites.Load()
}

func (w *historianWriter) QueueDepth() int64 {
	return int64(len(w.jobs))
}

func (w *historianWriter) Close() {
	w.closeOnce.Do(func() {
		close(w.done)
		w.wg.Wait()
	})
}

func (w *historianWriter) enqueue(job historianWriteJob) {
	select {
	case w.jobs <- job:
		metrics.SetHistorianQueue(w.QueueDepth(), w.DroppedWrites())
	default:
		dropped := w.droppedWrites.Add(1)
		metrics.SetHistorianQueue(w.QueueDepth(), dropped)
		if dropped == 1 || dropped%100 == 0 {
			w.logger.Warn("historian_write_queue_full", slog.Int64("dropped_writes", dropped))
		}
	}
}

func (w *historianWriter) loop() {
	defer w.wg.Done()
	for {
		select {
		case <-w.done:
			w.drain()
			return
		case job := <-w.jobs:
			w.write(job)
		}
	}
}

func (w *historianWriter) drain() {
	for {
		select {
		case job := <-w.jobs:
			w.write(job)
		default:
			return
		}
	}
}

func (w *historianWriter) write(job historianWriteJob) {
	ctx, cancel := context.WithTimeout(context.Background(), w.timeout)
	defer cancel()

	switch {
	case job.telemetry != nil:
		if err := w.repo.AppendTelemetrySnapshot(ctx, *job.telemetry); err != nil {
			metrics.ObserveHistorianWrite("telemetry", err)
			w.logger.Warn("historian_telemetry_write_failed", slog.Any("error", err))
		} else {
			metrics.ObserveHistorianWrite("telemetry", nil)
		}
	case job.command != nil:
		if err := w.repo.SaveCommand(ctx, *job.command); err != nil {
			metrics.ObserveHistorianWrite("command", err)
			w.logger.Warn("historian_command_write_failed", slog.String("command_id", job.command.ID), slog.Any("error", err))
		} else {
			metrics.ObserveHistorianWrite("command", nil)
		}
	case job.event != nil:
		if err := w.repo.SaveEvent(ctx, *job.event); err != nil {
			metrics.ObserveHistorianWrite("event", err)
			w.logger.Warn("historian_event_write_failed", slog.String("event_id", job.event.ID), slog.Any("error", err))
		} else {
			metrics.ObserveHistorianWrite("event", nil)
		}
	case job.alarm != nil:
		if err := w.repo.SaveAlarm(ctx, *job.alarm); err != nil {
			metrics.ObserveHistorianWrite("alarm", err)
			w.logger.Warn("historian_alarm_write_failed", slog.String("alarm_id", job.alarm.ID), slog.Any("error", err))
		} else {
			metrics.ObserveHistorianWrite("alarm", nil)
		}
	}
	metrics.SetHistorianQueue(w.QueueDepth(), w.DroppedWrites())
}
